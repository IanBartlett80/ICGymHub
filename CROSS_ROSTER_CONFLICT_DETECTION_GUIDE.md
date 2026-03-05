# Cross-Roster Conflict Detection Implementation Guide

**Date**: March 5, 2026  
**Purpose**: Enable conflict detection across multiple roster templates for the same date  
**Current Limitation**: Conflicts only detected within a single roster instance

---

## Table of Contents
1. [Problem Statement](#problem-statement)
2. [Current Architecture](#current-architecture)
3. [Required Changes](#required-changes)
4. [Implementation Steps](#implementation-steps)
5. [Testing Strategy](#testing-strategy)
6. [Rollback Plan](#rollback-plan)

---

## Problem Statement

### Scenario
- User creates "Monday Classes - Miami" roster template (venueId: miami-123)
- User creates "Monday Classes - Coomera" roster template (venueId: coomera-456)
- Coach John is assigned to:
  - Miami Monday 3:00 PM - 4:00 PM (via Template A)
  - Coomera Monday 3:00 PM - 4:00 PM (via Template B)

### Current Behavior
**No conflict detected** - Coach John appears available at both venues simultaneously because each template generates its roster independently with fresh conflict detection Maps.

### Desired Behavior
**Conflict detected** - System identifies Coach John cannot be in two places at once, even across different venues and roster templates.

---

## Current Architecture

### File: `src/lib/rosterGenerator.ts`

#### `generateDailyRoster` Function (lines 140-350)
```typescript
export async function generateDailyRoster(
  prisma: PrismaClient,
  input: GenerateDailyRosterInput
): Promise<GenerateDailyRosterResult> {
  // ... setup code ...
  
  // Line 155-163: Creates the roster record
  const roster = await prisma.roster.create({
    data: {
      clubId,
      venueId: venueId || null,
      scope: 'DAY',
      startDate: dayStart,
      endDate: dayEnd,
      status: 'DRAFT',
      generatedAt: new Date(),
      generatedById,
    },
  })

  // Line 167-169: Creates FRESH Maps (does not check existing rosters)
  const zoneSchedule = new Map<string, Array<{ start: Date; end: Date; sessionKey: string }>>()
  const coachSchedule = new Map<string, Array<{ start: Date; end: Date; sessionKey: string }>>()
  const conflicts: { sessionId: string; reason: string }[] = []
  
  // Lines 170-340: Iterates through selections, checks conflicts within THIS roster only
  for (const selection of selections) {
    // ... conflict detection only sees current roster's data ...
  }
}
```

**Key Issue**: `zoneSchedule` and `coachSchedule` Maps start empty - no awareness of other rosters.

#### `recalculateRosterConflicts` Function (lines 402-542)
```typescript
export async function recalculateRosterConflicts(
  prisma: PrismaClient,
  rosterId: string
): Promise<void> {
  // Line 406: Only fetches slots from ONE roster
  const slots = await prisma.rosterSlot.findMany({
    where: { rosterId }, // ← LIMITATION: Single roster only
    include: {
      session: { include: { coaches: true } },
      zone: true,
    },
    orderBy: { startsAt: 'asc' },
  })
  
  // Lines 420-482: Rebuilds schedules from those slots only
  const zoneSchedule = new Map<...>()
  const coachSchedule = new Map<...>()
  
  // ... conflict detection within single roster ...
}
```

**Key Issue**: `where: { rosterId }` limits query to single roster - no cross-roster awareness.

---

## Required Changes

### 1. Database Performance Index

**File**: `prisma/schema.prisma`

**Location**: Roster model (line 582)

**Change**:
```prisma
model Roster {
  id            String          @id @default(cuid())
  club          Club            @relation(fields: [clubId], references: [id], onDelete: Cascade)
  clubId        String
  venue         Venue?          @relation(fields: [venueId], references: [id], onDelete: Cascade)
  venueId       String?
  template      RosterTemplate? @relation(fields: [templateId], references: [id], onDelete: Cascade)
  templateId    String?
  scope         String
  dayOfWeek     String?
  startDate     DateTime
  endDate       DateTime
  status        String          @default("DRAFT")
  generatedAt   DateTime?
  generatedBy   User?           @relation("RosterGeneratedBy", fields: [generatedById], references: [id], onDelete: SetNull)
  generatedById String?

  slots RosterSlot[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([clubId])
  @@index([venueId])
  @@index([scope])
  @@index([startDate])
  @@index([clubId, startDate, endDate]) // ← NEW: Composite index for cross-roster queries
}
```

**Migration Command**:
```sql
CREATE INDEX "Roster_clubId_startDate_endDate_idx" ON "Roster"("clubId", "startDate", "endDate");
```

---

### 2. Modify `generateDailyRoster` Function

**File**: `src/lib/rosterGenerator.ts`

**Location**: Lines 155-169

**Before**:
```typescript
  const roster = await prisma.roster.create({
    data: {
      clubId,
      venueId: venueId || null,
      scope: 'DAY',
      startDate: dayStart,
      endDate: dayEnd,
      status: 'DRAFT',
      generatedAt: new Date(),
      generatedById,
    },
  })
  console.log('Created roster:', { id: roster.id, venueId: roster.venueId });

  const zoneSchedule = new Map<string, Array<{ start: Date; end: Date; sessionKey: string }>>()
  const coachSchedule = new Map<string, Array<{ start: Date; end: Date; sessionKey: string }>>()
  const conflicts: { sessionId: string; reason: string }[] = []
```

**After**:
```typescript
  const roster = await prisma.roster.create({
    data: {
      clubId,
      venueId: venueId || null,
      scope: 'DAY',
      startDate: dayStart,
      endDate: dayEnd,
      status: 'DRAFT',
      generatedAt: new Date(),
      generatedById,
    },
  })
  console.log('Created roster:', { id: roster.id, venueId: roster.venueId });

  // NEW: Fetch existing rosters for the same date to detect cross-roster conflicts
  const existingRosters = await prisma.roster.findMany({
    where: {
      clubId,
      startDate: { lte: dayEnd },
      endDate: { gte: dayStart },
      status: { in: ['DRAFT', 'PUBLISHED'] },
      id: { not: roster.id }, // Exclude the roster we just created
    },
    include: {
      slots: {
        include: {
          session: {
            include: {
              coaches: true,
            },
          },
          zone: true,
        },
      },
    },
  })
  console.log(`Cross-roster conflict check: Found ${existingRosters.length} existing rosters for this date`)

  const zoneSchedule = new Map<string, Array<{ start: Date; end: Date; sessionKey: string; venueId: string | null }>>()
  const coachSchedule = new Map<string, Array<{ start: Date; end: Date; sessionKey: string }>>()
  const conflicts: { sessionId: string; reason: string }[] = []

  // NEW: Pre-populate schedules with existing roster slots
  for (const existingRoster of existingRosters) {
    for (const slot of existingRoster.slots) {
      // Add to zone schedule
      const zoneEntries = zoneSchedule.get(slot.zoneId) || []
      zoneEntries.push({
        start: slot.startsAt,
        end: slot.endsAt,
        sessionKey: `existing-${slot.id}`,
        venueId: slot.venueId,
      })
      zoneSchedule.set(slot.zoneId, zoneEntries)

      // Add to coach schedule
      if (slot.session.coaches && slot.session.coaches.length > 0) {
        for (const coach of slot.session.coaches) {
          const coachEntries = coachSchedule.get(coach.id) || []
          coachEntries.push({
            start: slot.startsAt,
            end: slot.endsAt,
            sessionKey: `existing-${slot.id}`,
          })
          coachSchedule.set(coach.id, coachEntries)
        }
      }
    }
  }
  console.log(`Pre-populated schedules: ${zoneSchedule.size} zones, ${coachSchedule.size} coaches`)
```

**Impact**: New rosters will now check for conflicts against ALL existing rosters on the same date.

---

### 3. Update Zone Schedule Type

**File**: `src/lib/rosterGenerator.ts`

**Location**: Line 167 and throughout the function

**Change**: Update the zoneSchedule Map type to include venueId:

**Before**:
```typescript
Array<{ start: Date; end: Date; sessionKey: string }>
```

**After**:
```typescript
Array<{ start: Date; end: Date; sessionKey: string; venueId: string | null }>
```

**All locations needing update**:
- Line 167: Map declaration
- Line 220: When adding new slots
- Line 266: When checking conflicts

**Example at line 220**:
```typescript
// Before
zoneEntries.push({ start: startsAt, end: endsAt, sessionKey })

// After
zoneEntries.push({ start: startsAt, end: endsAt, sessionKey, venueId: venueId || null })
```

---

### 4. Modify `recalculateRosterConflicts` Function

**File**: `src/lib/rosterGenerator.ts`

**Location**: Lines 402-542

**Before**:
```typescript
export async function recalculateRosterConflicts(
  prisma: PrismaClient,
  rosterId: string
): Promise<void> {
  // Get all slots for this roster with their sessions and coaches
  const slots = await prisma.rosterSlot.findMany({
    where: { rosterId },
    include: {
      session: {
        include: {
          coaches: true,
        },
      },
      zone: true,
    },
    orderBy: { startsAt: 'asc' },
  })
  
  // ... rest of function ...
}
```

**After**:
```typescript
export async function recalculateRosterConflicts(
  prisma: PrismaClient,
  rosterId: string
): Promise<void> {
  // First, get the roster to find its date range and club
  const roster = await prisma.roster.findUnique({
    where: { id: rosterId },
    select: { 
      id: true,
      clubId: true, 
      startDate: true, 
      endDate: true 
    },
  })

  if (!roster) {
    console.error(`Roster ${rosterId} not found for conflict recalculation`)
    return
  }

  console.log(`Recalculating conflicts for roster ${rosterId} (${roster.startDate.toISOString()})`)

  // NEW: Get ALL rosters for this date (not just the current one)
  const allRostersForDate = await prisma.roster.findMany({
    where: {
      clubId: roster.clubId,
      startDate: { lte: roster.endDate },
      endDate: { gte: roster.startDate },
      status: { in: ['DRAFT', 'PUBLISHED'] },
    },
    select: { id: true },
  })

  console.log(`Found ${allRostersForDate.length} rosters for this date (including current)`)

  // NEW: Get ALL slots for ALL rosters on this date
  const allSlots = await prisma.rosterSlot.findMany({
    where: {
      rosterId: { in: allRostersForDate.map(r => r.id) },
    },
    include: {
      session: {
        include: {
          coaches: true,
        },
      },
      zone: true,
    },
    orderBy: { startsAt: 'asc' },
  })

  console.log(`Analyzing ${allSlots.length} total slots across all rosters for conflicts`)

  // Build schedules for zones and coaches from ALL rosters
  const zoneSchedule = new Map<string, Array<{ slotId: string; start: Date; end: Date; allowOverlap: boolean; zoneAllowsOverlap: boolean; venueId: string | null; rosterId: string }>>()
  const coachSchedule = new Map<string, Array<{ slotId: string; start: Date; end: Date; rosterId: string }>>()

  for (const slot of allSlots) {
    // Track zone usage with venue awareness
    const zoneEntries = zoneSchedule.get(slot.zoneId) || []
    zoneEntries.push({
      slotId: slot.id,
      start: slot.startsAt,
      end: slot.endsAt,
      allowOverlap: slot.allowOverlap,
      zoneAllowsOverlap: slot.zone.allowOverlap ?? false,
      venueId: slot.venueId,
      rosterId: slot.rosterId, // NEW: Track which roster this slot belongs to
    })
    zoneSchedule.set(slot.zoneId, zoneEntries)

    // Track coach usage
    if (slot.session.coaches && slot.session.coaches.length > 0) {
      for (const coach of slot.session.coaches) {
        const coachEntries = coachSchedule.get(coach.id) || []
        coachEntries.push({
          slotId: slot.id,
          start: slot.startsAt,
          end: slot.endsAt,
          rosterId: slot.rosterId, // NEW: Track which roster this slot belongs to
        })
        coachSchedule.set(coach.id, coachEntries)
      }
    }
  }

  // Detect conflicts across ALL slots
  const slotConflicts = new Map<string, { hasZoneConflict: boolean; hasCoachConflict: boolean }>()

  for (const slot of allSlots) {
    let hasZoneConflict = false
    let hasCoachConflict = false

    // Check zone conflicts
    const zoneEntries = zoneSchedule.get(slot.zoneId) || []
    for (const entry of zoneEntries) {
      // Skip self
      if (entry.slotId === slot.id) continue

      // NEW: Zone conflicts only matter within same venue (zones are venue-specific)
      if (entry.venueId !== slot.venueId) continue

      // Skip if overlaps are allowed
      if (entry.allowOverlap && slot.allowOverlap) continue
      if (entry.zoneAllowsOverlap) continue

      // Check time overlap
      const overlapStart = new Date(Math.max(entry.start.getTime(), slot.startsAt.getTime()))
      const overlapEnd = new Date(Math.min(entry.end.getTime(), slot.endsAt.getTime()))

      if (overlapStart < overlapEnd) {
        hasZoneConflict = true
        console.log(`Zone conflict detected: Slot ${slot.id} conflicts with ${entry.slotId} in zone ${slot.zoneId}`)
        break
      }
    }

    // Check coach conflicts
    if (slot.session.coaches && slot.session.coaches.length > 0) {
      for (const coach of slot.session.coaches) {
        const coachEntries = coachSchedule.get(coach.id) || []
        for (const entry of coachEntries) {
          // Skip self
          if (entry.slotId === slot.id) continue

          // NEW: Coach conflicts matter ACROSS venues (coach can't be in two places)
          // No venue check here - this is the key cross-roster conflict detection

          // Check time overlap
          const overlapStart = new Date(Math.max(entry.start.getTime(), slot.startsAt.getTime()))
          const overlapEnd = new Date(Math.min(entry.end.getTime(), slot.endsAt.getTime()))

          if (overlapStart < overlapEnd) {
            hasCoachConflict = true
            console.log(`Coach conflict detected: Slot ${slot.id} (roster ${slot.rosterId}) conflicts with ${entry.slotId} (roster ${entry.rosterId}) for coach ${coach.id}`)
            break
          }
        }
        if (hasCoachConflict) break
      }
    }

    slotConflicts.set(slot.id, { hasZoneConflict, hasCoachConflict })
  }

  // Update all slots with their conflict status
  const updatePromises: Promise<any>[] = []
  for (const slot of allSlots) {
    const conflict = slotConflicts.get(slot.id)
    if (!conflict) continue

    const conflictFlag = conflict.hasZoneConflict || conflict.hasCoachConflict
    let conflictType: string | null = null
    if (conflict.hasZoneConflict && conflict.hasCoachConflict) {
      conflictType = 'both'
    } else if (conflict.hasZoneConflict) {
      conflictType = 'zone'
    } else if (conflict.hasCoachConflict) {
      conflictType = 'coach'
    }

    // Only update if the conflict status changed
    if (slot.conflictFlag !== conflictFlag || slot.conflictType !== conflictType) {
      updatePromises.push(
        prisma.rosterSlot.update({
          where: { id: slot.id },
          data: { conflictFlag, conflictType },
        })
      )
    }
  }

  if (updatePromises.length > 0) {
    await Promise.all(updatePromises)
    console.log(`Updated conflict status for ${updatePromises.length} slots across ${allRostersForDate.length} rosters`)
  } else {
    console.log('No conflict status changes needed')
  }
}
```

**Impact**: Any roster update will now recalculate conflicts across ALL rosters for that date.

---

### 5. Update API Endpoints (No Changes Required)

The following API endpoints already call `recalculateRosterConflicts` and will automatically benefit from the changes:

- `/api/rosters/[id]/slots/[slotId]/assign-coach/route.ts` (line 80)
- `/api/rosters/[id]/slots/[slotId]/zone-order/route.ts` (line 120)

**No code changes needed** - they already trigger conflict recalculation.

---

### 6. Create Database Migration

**File**: Create new migration file

**Command**:
```bash
npx prisma migrate dev --name add_cross_roster_conflict_index
```

**Migration SQL** (auto-generated):
```sql
-- CreateIndex
CREATE INDEX "Roster_clubId_startDate_endDate_idx" ON "Roster"("clubId", "startDate", "endDate");
```

---

## Implementation Steps

### Phase 1: Database Setup (Low Risk)
1. ✅ Create migration for composite index
2. ✅ Run migration on production (non-breaking, just adds index)
3. ✅ Verify index created: `\d "Roster"` in psql

### Phase 2: Code Changes (Medium Risk)
4. ✅ Update `generateDailyRoster` function
   - Add existing roster query
   - Pre-populate schedules
   - Update Map type to include venueId
   - Update all Map.push() calls to include venueId
5. ✅ Update `recalculateRosterConflicts` function
   - Query all rosters for date
   - Build schedules from all slots
   - Update conflict detection logic
   - Update all affected slots

### Phase 3: Testing (Critical)
6. ✅ Test in development:
   - Create two roster templates for same day, different venues
   - Assign same coach to both at same time
   - Verify conflict detected
7. ✅ Test existing functionality:
   - Create single roster - should work as before
   - Update zone order - should recalculate correctly
   - Assign coaches - should detect conflicts
8. ✅ Performance test:
   - Create 10+ rosters for same date
   - Verify conflict detection still fast (<2 seconds)

### Phase 4: Deployment
9. ✅ Commit changes with descriptive message
10. ✅ Push to main branch
11. ✅ Verify Digital Ocean build succeeds
12. ✅ Monitor production logs for errors

---

## Testing Strategy

### Test Case 1: Cross-Venue Coach Conflict
**Setup**:
- Create "Monday Miami" roster template
- Create "Monday Coomera" roster template
- Both have class at 3:00 PM - 4:00 PM
- Assign Coach John to both

**Expected Result**:
- ❌ **Before**: No conflict, both rosters created successfully
- ✅ **After**: Coach conflict detected, both slots flagged with `conflictType: 'coach'`

### Test Case 2: Same-Venue Zone Conflict
**Setup**:
- Create single roster with two classes
- Both classes use Zone 1
- Time overlap: 3:00-4:00 PM and 3:30-4:30 PM

**Expected Result**:
- ✅ **Before**: Zone conflict detected
- ✅ **After**: Zone conflict still detected (no regression)

### Test Case 3: Different-Venue Zone Usage (No Conflict)
**Setup**:
- Create "Monday Miami" roster with Zone 1 at 3:00 PM
- Create "Monday Coomera" roster with Zone 1 at 3:00 PM
- Zones are venue-specific (different physical locations)

**Expected Result**:
- ✅ **Before**: No conflict
- ✅ **After**: No conflict (zones are venue-specific, correctly ignored)

### Test Case 4: Reassign Coach After Initial Assignment
**Setup**:
- Create two rosters with same coach
- Edit one roster to remove the coach
- Verify conflict cleared on both rosters

**Expected Result**:
- ✅ Conflict appears when assigned to both
- ✅ Conflict clears when removed from one

### Test Case 5: Performance Test
**Setup**:
- Create 20 rosters for same Monday
- Each roster has 10 classes
- Total: 200 slots to check

**Expected Result**:
- ✅ Conflict recalculation completes in <3 seconds
- ✅ No timeout errors
- ✅ No memory issues

---

## Rollback Plan

### If Build Fails
1. **Immediate**: Revert commit
   ```bash
   git revert HEAD
   git push origin main
   ```
2. Digital Ocean will auto-deploy previous version
3. No data loss (migration only added index)

### If Conflicts Show Incorrectly
1. **Temporary Fix**: User can ignore conflict flags manually
2. **Code Fix**: Adjust conflict detection logic
3. **Data Fix**: Run recalculation on all rosters:
   ```typescript
   // Emergency script
   const allRosters = await prisma.roster.findMany()
   for (const roster of allRosters) {
     await recalculateRosterConflicts(prisma, roster.id)
   }
   ```

### If Performance Issues
1. Add `take: 100` limit to existing roster query
2. Consider adding `status: 'PUBLISHED'` filter (ignore drafts)
3. Implement queue-based conflict checking for large clubs

---

## Edge Cases to Consider

### Edge Case 1: Midnight Boundaries
**Scenario**: Class from 11:00 PM Monday to 1:00 AM Tuesday

**Handling**: 
- Query uses `startDate: { lte: dayEnd }, endDate: { gte: dayStart }`
- Will correctly find rosters that span midnight
- Conflict detection uses actual datetime comparison

### Edge Case 2: Timezone Handling
**Scenario**: Club in Australia/Sydney timezone

**Handling**:
- All dates stored as UTC in PostgreSQL
- Conflict logic uses Date objects (timezone-aware)
- No changes needed - existing logic correct

### Edge Case 3: Overlapping Rosters
**Scenario**: 
- Weekly roster for "All Week" (startDate: Monday, endDate: Sunday)
- Daily roster for "Tuesday Only" (startDate: Tuesday, endDate: Tuesday)

**Handling**:
- Query correctly finds both rosters
- Conflict detection compares slot times, not roster dates
- Works correctly with existing time overlap logic

### Edge Case 4: Deleted Rosters
**Scenario**: Roster deleted while conflicts being recalculated

**Handling**:
- Use transaction if needed
- Add null checks in recalculation function
- Already handled: `if (!roster) return`

### Edge Case 5: Multiple Clubs on Same Database
**Scenario**: Two different clubs in the database

**Handling**:
- Query filters by `clubId`
- Conflicts never cross club boundaries
- Existing code already correct

---

## Performance Monitoring

### Metrics to Watch

| Metric | Before | Expected After | Alert Threshold |
|--------|--------|----------------|-----------------|
| `generateDailyRoster` execution time | 500ms | 800ms | >2000ms |
| `recalculateRosterConflicts` execution time | 200ms | 500ms | >3000ms |
| Database query count per roster | 15 | 18 | >50 |
| Memory usage | 50MB | 60MB | >200MB |

### Query Optimization

**New query**:
```sql
SELECT * FROM "Roster"
WHERE "clubId" = $1 
  AND "startDate" <= $2 
  AND "endDate" >= $3
  AND "status" IN ('DRAFT', 'PUBLISHED')
ORDER BY "startDate" ASC;
```

**Expected index usage**: `Roster_clubId_startDate_endDate_idx` (new composite index)

**Explain Plan** (should show):
```
Index Scan using Roster_clubId_startDate_endDate_idx
  Filter: (status IN ('DRAFT', 'PUBLISHED'))
```

---

## Success Criteria

- ✅ Coach conflicts detected across different roster templates
- ✅ Zone conflicts still detected within same venue
- ✅ Zone usage correctly separated by venue
- ✅ No performance degradation (queries <2s)
- ✅ No breaking changes to existing functionality
- ✅ All existing rosters continue to work
- ✅ Build succeeds on Digital Ocean
- ✅ No console errors in production logs

---

## Appendix: Code Snippets

### A. Testing Script for Development

Create `scripts/test-cross-roster-conflicts.ts`:

```typescript
import { PrismaClient } from '@prisma/client'
import { generateDailyRoster } from '../src/lib/rosterGenerator'

const prisma = new PrismaClient()

async function testCrossRosterConflicts() {
  const clubId = 'YOUR_CLUB_ID'
  const coachId = 'YOUR_COACH_ID'
  const zoneId1 = 'YOUR_ZONE_ID_1'
  const venueId1 = 'MIAMI_VENUE_ID'
  const venueId2 = 'COOMERA_VENUE_ID'
  
  const testDate = new Date('2026-03-10T00:00:00Z')
  
  console.log('Creating first roster (Miami)...')
  const roster1 = await generateDailyRoster(prisma, {
    clubId,
    venueId: venueId1,
    dayStart: testDate,
    dayEnd: new Date('2026-03-10T23:59:59Z'),
    generatedById: 'test-user',
    selections: [{
      templateId: 'miami-template-id',
      zoneIds: [zoneId1],
      startTime: '15:00',
      rotationMinutes: 60,
    }],
  })
  
  console.log('Creating second roster (Coomera) with same coach...')
  const roster2 = await generateDailyRoster(prisma, {
    clubId,
    venueId: venueId2,
    dayStart: testDate,
    dayEnd: new Date('2026-03-10T23:59:59Z'),
    generatedById: 'test-user',
    selections: [{
      templateId: 'coomera-template-id',
      zoneIds: [zoneId1],
      startTime: '15:00',
      rotationMinutes: 60,
    }],
  })
  
  // Check conflicts
  const slotsWithConflicts = await prisma.rosterSlot.findMany({
    where: {
      OR: [
        { rosterId: roster1.rosterId },
        { rosterId: roster2.rosterId },
      ],
      conflictFlag: true,
    },
  })
  
  console.log(`Found ${slotsWithConflicts.length} slots with conflicts`)
  console.log('Conflict details:', slotsWithConflicts)
  
  if (slotsWithConflicts.length > 0) {
    console.log('✅ SUCCESS: Cross-roster conflicts detected!')
  } else {
    console.log('❌ FAILURE: No conflicts detected across rosters')
  }
}

testCrossRosterConflicts()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

### B. SQL Query to Find Existing Conflicts

```sql
-- Find all slots with conflicts
SELECT 
  rs.id,
  rs."rosterId",
  rs."conflictType",
  r."startDate",
  v.name as venue_name,
  z.name as zone_name
FROM "RosterSlot" rs
JOIN "Roster" r ON rs."rosterId" = r.id
LEFT JOIN "Venue" v ON rs."venueId" = v.id
LEFT JOIN "Zone" z ON rs."zoneId" = z.id
WHERE rs."conflictFlag" = true
ORDER BY r."startDate", rs."startsAt";
```

### C. Recalculate All Conflicts Script

```typescript
import { PrismaClient } from '@prisma/client'
import { recalculateRosterConflicts } from '../src/lib/rosterGenerator'

const prisma = new PrismaClient()

async function recalculateAllConflicts() {
  const rosters = await prisma.roster.findMany({
    where: {
      status: { in: ['DRAFT', 'PUBLISHED'] },
    },
    orderBy: { startDate: 'desc' },
  })
  
  console.log(`Recalculating conflicts for ${rosters.length} rosters...`)
  
  let completed = 0
  for (const roster of rosters) {
    await recalculateRosterConflicts(prisma, roster.id)
    completed++
    if (completed % 10 === 0) {
      console.log(`Progress: ${completed}/${rosters.length}`)
    }
  }
  
  console.log('✅ All conflicts recalculated')
}

recalculateAllConflicts()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

---

## Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-03-05 | 1.0 | Initial implementation guide created | System |

---

**END OF IMPLEMENTATION GUIDE**

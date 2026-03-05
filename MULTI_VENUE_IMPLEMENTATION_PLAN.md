# Multi-Venue Implementation Plan for GymHub

## Executive Summary

This document outlines a comprehensive plan to add multi-venue functionality to GymHub, allowing gymnastics clubs to manage operations across multiple physical locations. The implementation will be done in phases to ensure zero downtime and data integrity for the production environment.

---

## Current State Analysis

### Existing Architecture
- **Tenant Model**: `Club` (single organization)
- **Physical Zones**: `Zone` (areas within a facility - e.g., "Floor Area", "Beam Area")
- **Data Isolation**: All data scoped to `clubId`

### Key Entities Requiring Venue Association
1. **Rosters & Class Rostering**: `RosterTemplate`, `Roster`, `RosterSlot`, `ClassSession`
2. **Injury Management**: `InjuryFormTemplate`, `InjurySubmission`
3. **Equipment Management**: `Equipment`, `SafetyIssue`, `MaintenanceTask`, `RepairQuoteRequest`
4. **Compliance**: `ComplianceCategory`, `ComplianceItem`
5. **Supporting Entities**: `Zone`, `Coach`, `Gymsport`

### Data Model Hierarchy
```
Club (Organization)
├── Venues (Physical Locations) - **NEW**
│   ├── Zones (Areas within a venue)
│   ├── Equipment (Venue-specific apparatus)
│   ├── Rosters (Venue-specific scheduling)
│   ├── Injuries (Venue-specific incidents)
│   └── Compliance (Venue-specific requirements)
├── Coaches (Can work across venues)
├── Users (Can access all club venues)
└── Gymsports (Club-wide sports definitions)
```

---

## Implementation Strategy

### Phase 1: Database Schema Changes (CRITICAL)
**Estimated Time**: 2-3 hours  
**Risk Level**: HIGH - Production database modification  
**Downtime Required**: None (online migration)

#### 1.1 Create Venue Model

```prisma
model Venue {
  id          String   @id @default(cuid())
  club        Club     @relation(fields: [clubId], references: [id], onDelete: Cascade)
  clubId      String
  
  // Venue Information
  name        String   // e.g., "Main Facility", "North Campus"
  slug        String   // URL-friendly identifier
  address     String?
  city        String?
  state       String?
  postalCode  String?
  phone       String?
  timezone    String   @default("Australia/Sydney")
  
  // Status
  isDefault   Boolean  @default(false) // First/primary venue
  active      Boolean  @default(true)
  
  // Relations
  zones                Zone[]
  equipment            Equipment[]
  rosters              Roster[]
  rosterTemplates      RosterTemplate[]
  rosterSlots          RosterSlot[]
  classSessions        ClassSession[]
  injuryFormTemplates  InjuryFormTemplate[]
  injurySubmissions    InjurySubmission[]
  maintenanceLogs      MaintenanceLog[]
  equipmentUsage       EquipmentUsage[]
  safetyIssues         SafetyIssue[]
  maintenanceTasks     MaintenanceTask[]
  repairQuoteRequests  RepairQuoteRequest[]
  complianceCategories ComplianceCategory[]
  complianceItems      ComplianceItem[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([clubId, slug])
  @@index([clubId])
  @@index([active])
}
```

#### 1.2 Add `venueId` to All Relevant Models

**Models Requiring Update**:
- `Zone` - Add `venueId` (nullable initially, required after migration)
- `Equipment` - Add `venueId` (nullable initially, required after migration) ✓ Already has `zoneId`, add direct venue link
- `RosterTemplate` - Add `venueId` (nullable initially, required after migration)
- `Roster` - Add `venueId` (nullable initially, required after migration)
- `RosterSlot` - Add `venueId` (nullable initially, required after migration)
- `ClassSession` - Add `venueId` (nullable initially, required after migration)
- `InjuryFormTemplate` - Add `venueId` (nullable initially, required after migration)
- `InjurySubmission` - Add `venueId` (nullable initially, required after migration)
- `MaintenanceLog` - Add `venueId` (nullable initially, required after migration)
- `EquipmentUsage` - Add `venueId` (nullable initially, required after migration)
- `SafetyIssue` - Add `venueId` (nullable initially, required after migration)
- `MaintenanceTask` - Add `venueId` (nullable initially, required after migration)
- `RepairQuoteRequest` - Add `venueId` (nullable initially, required after migration)
- `ComplianceCategory` - Add `venueId` (nullable initially, required after migration)
- `ComplianceItem` - Add `venueId` (nullable initially, required after migration)

#### 1.3 Migration Strategy - Zero Downtime

**Step 1**: Add Venue model and nullable `venueId` fields
```sql
-- This migration adds the new fields WITHOUT breaking existing code
-- All venueId fields are nullable during transition
```

**Step 2**: Create default venue for each existing club
```sql
-- Data migration script to run AFTER schema is deployed
-- Creates "Main Facility" venue for each club
-- Links all existing data to this default venue
```

**Step 3**: Update application code to use venues (See Phase 2)

**Step 4**: Make `venueId` required (future migration after all code updated)
```sql
-- Final migration to enforce venueId requirement
-- Run only after Phase 2 & 3 are complete
```

---

### Phase 2: Backend API Updates
**Estimated Time**: 6-8 hours  
**Risk Level**: MEDIUM - Breaking changes to API

#### 2.1 Create Venue Management APIs

**New API Endpoints**:
```typescript
// Venue CRUD
POST   /api/venues                    // Create venue
GET    /api/venues                    // List all venues for club
GET    /api/venues/[id]               // Get venue details
PATCH  /api/venues/[id]               // Update venue
DELETE /api/venues/[id]               // Delete venue (with validation)
PATCH  /api/venues/[id]/set-default   // Set as default venue
```

**Validation Rules**:
- Cannot delete venue if it has associated data (rosters, equipment, etc.)
- At least one active venue required per club
- One default venue per club
- Slug must be unique within club

#### 2.2 Update Existing APIs - Add Venue Filtering

**Roster APIs** ([src/app/api/rosters/](src/app/api/rosters/)):
- Add `venueId` to create/update endpoints
- Add venue filtering to list endpoints
- Update query parameters: `?venueId=xxx`

**Equipment APIs** ([src/app/api/equipment/](src/app/api/equipment/)):
- Add `venueId` to all CRUD operations
- Filter equipment lists by venue
- Update zone assignment validation (zone must be in same venue)

**Injury APIs** ([src/app/api/injury-submissions/](src/app/api/injury-submissions/)):
- Add `venueId` to injury submissions
- Filter submissions by venue
- Update injury form templates to be venue-specific

**Compliance APIs** ([src/app/api/compliance/](src/app/api/compliance/)):
- Add `venueId` to categories and items
- Allow filtering by venue
- Support cross-venue compliance items (optional venueId)

**Safety Issues APIs** ([src/app/api/safety-issues/](src/app/api/safety-issues/)):
- Add `venueId` filtering
- Update equipment lookups to respect venue

**Maintenance APIs** ([src/app/api/maintenance-tasks/](src/app/api/maintenance-tasks/)):
- Add `venueId` filtering
- Venue-specific task scheduling

#### 2.3 Update Authentication Context

Add venue context to user sessions:
```typescript
// src/lib/auth.ts
interface UserSessionData {
  id: string
  clubId: string
  currentVenueId?: string  // NEW: User's currently selected venue
  // ... existing fields
}
```

---

### Phase 3: Frontend UI Updates
**Estimated Time**: 8-10 hours  
**Risk Level**: MEDIUM - UI/UX changes

#### 3.1 Venue Selector Component

Create a global venue selector in the dashboard:

**Location**: Add to `DashboardLayout.tsx`

```tsx
// New VenueSelector Component
<select 
  className="venue-selector"
  value={currentVenueId}
  onChange={handleVenueChange}
>
  <option value="all">All Venues</option>
  {venues.map(v => (
    <option key={v.id} value={v.id}>{v.name}</option>
  ))}
</select>
```

**Behavior**:
- Persists selection in localStorage
- Updates all filtered data when changed
- Shows "All Venues" option for aggregated views
- Prominent position in header/sidebar

#### 3.2 Venue Management Pages

**New Dashboard Section**: `/dashboard/admin-config/venues`

Pages to create:
- `venues/page.tsx` - List all venues
- `venues/create/page.tsx` - Create new venue
- `venues/[id]/edit/page.tsx` - Edit venue details
- `venues/[id]/page.tsx` - Venue detail view with stats

**Features**:
- Display venue count and active status
- Show data summary (# of rosters, equipment, injuries per venue)
- Set default venue
- Archive/activate venues

#### 3.3 Update Existing Pages - Add Venue Context

**Class Rostering** ([src/app/dashboard/class-rostering/page.tsx](src/app/dashboard/class-rostering/page.tsx)):
```tsx
// Add venue filter to state
const [selectedVenueId, setSelectedVenueId] = useState<string>('all')

// Update API calls to include venueId
const fetchSlots = async () => {
  const params = new URLSearchParams({
    templateIds: selectedTemplates.join(','),
    startDate: weekStart,
    endDate: weekEnd,
    ...(selectedVenueId !== 'all' && { venueId: selectedVenueId })
  })
  // ...
}
```

**Equipment Management** ([src/app/dashboard/equipment/](src/app/dashboard/equipment/)):
- Add venue selector to equipment list
- Update create/edit forms to require venue selection
- Filter zones by selected venue
- Show venue name in equipment cards

**Injury Reports** ([src/app/dashboard/injury-reports/](src/app/dashboard/injury-reports/)):
- Add venue selector
- Filter submissions by venue
- Show venue in submission details
- Update form templates to be venue-specific

**Compliance Manager** ([src/app/dashboard/compliance-manager/](src/app/dashboard/compliance-manager/)):
- Add venue selector
- Filter categories and items by venue
- Option to create club-wide (cross-venue) items
- Show venue in item details

**Roster Reports** ([src/app/dashboard/roster-reports/](src/app/dashboard/roster-reports/)):
- Add venue breakdown
- Support multi-venue reports
- Export by venue

**Safety Issues** ([src/app/dashboard/safety-issues/](src/app/dashboard/safety-issues/)):
- Filter by venue
- Show venue in issue list
- Venue-specific issue tracking

#### 3.4 Navigation Updates

Update `ClubManagementSubNav.tsx`, `EquipmentManagementSubNav.tsx`, etc.:
- Add "Venues" link to admin section
- Show current venue in breadcrumbs
- Venue-aware navigation

---

### Phase 4: Data Migration Scripts
**Estimated Time**: 2-3 hours  
**Risk Level**: HIGH - Production data modification

#### 4.1 Migration Script Components

**Script Location**: `prisma/migrations/YYYYMMDDHHMMSS_add_multi_venue_support/migration.sql`

**Migration Steps**:

```sql
-- 1. Create Venue table
CREATE TABLE "Venue" (
  -- schema from Phase 1
);

-- 2. Create default venue for each club
INSERT INTO "Venue" (id, "clubId", name, slug, address, city, state, "postalCode", phone, timezone, "isDefault", active, "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  id as "clubId",
  'Main Facility' as name,
  'main-facility' as slug,
  address,
  city,
  state,
  "postalCode",
  phone,
  timezone,
  true as "isDefault",
  true as active,
  NOW() as "createdAt",
  NOW() as "updatedAt"
FROM "Club";

-- 3. Add venueId columns (nullable initially)
ALTER TABLE "Zone" ADD COLUMN "venueId" TEXT;
ALTER TABLE "Equipment" ADD COLUMN "venueId" TEXT;
-- ... repeat for all tables

-- 4. Link existing data to default venue
UPDATE "Zone" z
SET "venueId" = v.id
FROM "Venue" v
WHERE z."clubId" = v."clubId" AND v."isDefault" = true;

UPDATE "Equipment" e
SET "venueId" = v.id
FROM "Venue" v
WHERE e."clubId" = v."clubId" AND v."isDefault" = true;

-- ... repeat for all tables

-- 5. Add foreign key constraints
ALTER TABLE "Zone" 
  ADD CONSTRAINT "Zone_venueId_fkey" 
  FOREIGN KEY ("venueId") 
  REFERENCES "Venue"(id) 
  ON DELETE CASCADE;

-- ... repeat for all tables

-- 6. Create indexes
CREATE INDEX "Venue_clubId_idx" ON "Venue"("clubId");
CREATE INDEX "Venue_active_idx" ON "Venue"("active");
CREATE INDEX "Zone_venueId_idx" ON "Zone"("venueId");
-- ... repeat for all tables
```

#### 4.2 Rollback Strategy

**Rollback Script**: `prisma/migrations/YYYYMMDDHHMMSS_add_multi_venue_support/rollback.sql`

```sql
-- Remove foreign key constraints
ALTER TABLE "Zone" DROP CONSTRAINT "Zone_venueId_fkey";
-- ... repeat

-- Drop venueId columns
ALTER TABLE "Zone" DROP COLUMN "venueId";
-- ... repeat

-- Drop Venue table
DROP TABLE "Venue";
```

---

### Phase 5: Testing & Validation
**Estimated Time**: 4-5 hours  
**Risk Level**: LOW

#### 5.1 Unit Tests

Create tests for:
- Venue CRUD operations
- Default venue enforcement
- Venue deletion validation
- Cross-venue data isolation
- Venue filtering in queries

#### 5.2 Integration Tests

Test scenarios:
- Create club with multiple venues
- Move equipment between venues
- Filter rosters by venue
- Create cross-venue reports
- Venue-specific injury submissions
- Venue-specific compliance items

#### 5.3 User Acceptance Testing

Test flows:
- Club with single venue (existing behavior)
- Club with multiple venues
- Switching between venues
- Creating data in different venues
- Reporting across venues
- Equipment transfer scenarios

---

## Deployment Plan

### Pre-Deployment Checklist

- [ ] Database backup created
- [ ] Migration scripts tested on staging database
- [ ] Rollback script verified
- [ ] Application code deployed to staging
- [ ] All tests passing
- [ ] Performance testing completed
- [ ] Documentation updated

### Deployment Steps (Production)

#### Step 1: Deploy Schema Changes (30 minutes)
```bash
# Connect to Digital Ocean console
doctl apps console <app-id>

# Run migrations
npx prisma migrate deploy

# Verify migration
npx prisma db execute --stdin <<< "
  SELECT c.name as club_name, v.name as venue_name, v.\"isDefault\"
  FROM \"Club\" c
  JOIN \"Venue\" v ON v.\"clubId\" = c.id
  ORDER BY c.name;
"
```

#### Step 2: Deploy Application Code (15 minutes)
```bash
# Push to main branch (auto-deploys on Digital Ocean)
git push origin main

# Monitor deployment
doctl apps logs <app-id> --follow
```

#### Step 3: Post-Deployment Validation (30 minutes)
- [ ] Verify all clubs have default venue
- [ ] Test venue selector in UI
- [ ] Test roster filtering by venue
- [ ] Test equipment management with venues
- [ ] Test injury submission with venue assignment
- [ ] Check for any console errors
- [ ] Verify existing data still accessible

#### Step 4: Monitor & Support (24 hours)
- Monitor error logs
- Check for any slowdowns
- Be ready to rollback if issues arise
- Support user questions about new feature

---

## Risk Mitigation

### High-Risk Areas

1. **Data Migration Failure**
   - **Mitigation**: Test on database copy first
   - **Rollback**: Automated rollback script ready
   - **Recovery**: Database backup before migration

2. **API Breaking Changes**
   - **Mitigation**: Backward compatible venueId (optional initially)
   - **Rollback**: Feature flag to disable venue filtering
   - **Recovery**: Quick hotfix deployment ready

3. **Performance Degradation**
   - **Mitigation**: Indexes on all venueId columns
   - **Monitoring**: Query performance metrics
   - **Recovery**: Additional indexes as needed

4. **User Confusion**
   - **Mitigation**: Clear UI labels and help text
   - **Documentation**: User guide for venue management
   - **Recovery**: Support team briefing

---

## Known Issue Fix

### Current Error: "Cannot read properties of null (reading 'name')"

**Location**: [src/app/dashboard/class-rostering/page.tsx](src/app/dashboard/class-rostering/page.tsx#L260-L270)

**Root Cause**: Some roster slots have `session.template` as `null`

**Fix Required**:
```tsx
// Before (line 267):
title: `${slot.session.template!.name} - ${slot.zoneName}`,

// After:
title: `${slot.session.template?.name || 'Unknown Class'} - ${slot.zoneName}`,
```

**Related Files to Fix**:
- [src/app/dashboard/class-rostering/page.tsx](src/app/dashboard/class-rostering/page.tsx)
- [src/app/dashboard/rosters/[id]/page.tsx](src/app/dashboard/rosters/[id]/page.tsx) (already handles this correctly)
- [src/app/dashboard/roster-reports/page.tsx](src/app/dashboard/roster-reports/page.tsx) (already handles this correctly)

---

## Timeline Summary

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Database Schema | 2-3 hours | None |
| Phase 2: Backend APIs | 6-8 hours | Phase 1 complete |
| Phase 3: Frontend UI | 8-10 hours | Phase 2 complete |
| Phase 4: Data Migration | 2-3 hours | Phase 1 complete |
| Phase 5: Testing | 4-5 hours | Phases 2-4 complete |
| **Total Estimated Time** | **22-29 hours** | |

**Deployment Window**: Off-peak hours (late evening/weekend)  
**Expected Downtime**: 0 minutes (online migration)

---

## Post-Implementation Features

### Future Enhancements (Not in Initial Scope)

1. **Venue Transfer Tools**
   - Move equipment between venues
   - Transfer coaches between venues
   - Bulk data operations

2. **Venue-Specific Permissions**
   - Users can be restricted to specific venues
   - Venue administrators
   - Cross-venue reporting permissions

3. **Venue Analytics**
   - Utilization rates per venue
   - Equipment cost tracking by venue
   - Injury rates by venue
   - Compliance status by venue

4. **Venue Cloning**
   - Duplicate venue configuration
   - Copy roster templates between venues
   - Share compliance templates

---

## Success Criteria

✅ **Must Have**:
- [ ] All existing data migrated to default venue
- [ ] Venue selector visible and functional in dashboard
- [ ] All rosters, equipment, injuries, compliance filtered by venue
- [ ] No data loss or corruption
- [ ] No breaking changes for existing users
- [ ] Zero downtime deployment

✅ **Should Have**:
- [ ] Intuitive UI for venue management
- [ ] Clear venue indicators throughout the app
- [ ] Comprehensive error handling
- [ ] User documentation

✅ **Nice to Have**:
- [ ] Venue-based reporting and analytics
- [ ] Venue transfer tools
- [ ] Venue cloning capabilities

---

## Support Documentation

### User Guide Topics Needed

1. **Introduction to Multi-Venue Support**
   - What are venues?
   - When to use multiple venues
   - How venues organize your data

2. **Managing Venues**
   - Creating a new venue
   - Editing venue details
   - Setting the default venue
   - Archiving unused venues

3. **Working with Venue-Specific Data**
   - Switching between venues
   - Creating rosters for a specific venue
   - Managing equipment by venue
   - Viewing cross-venue reports

4. **Best Practices**
   - Naming conventions for venues
   - Organizing equipment across venues
   - Coach scheduling across venues
   - Compliance tracking per venue

---

## Technical Debt & Cleanup

### Items to Address Post-Launch

1. **Make venueId Required**
   - Currently nullable for migration
   - Should be required after all code updated
   - Run follow-up migration

2. **Optimize Venue Queries**
   - Review N+1 query issues
   - Add query caching where appropriate
   - Optimize venue selector loading

3. **Refactor Shared Components**
   - Extract venue filtering logic
   - Create reusable venue selector hook
   - Standardize venue context usage

---

## Questions for Stakeholder

Before proceeding with implementation, please confirm:

1. **Venue Naming**: What should the default venue be called? ("Main Facility", "Primary Location", etc.)
2. **Venue Limits**: Should there be a maximum number of venues per club?
3. **Cross-Venue Data**: Should coaches be able to work across multiple venues? (Assumed: YES)
4. **Reporting**: Do you need aggregated reporting across all venues? (Assumed: YES)
5. **Permissions**: Should venue-specific access control be included in Phase 1? (Recommended: NO - add later)
6. **Deployment Window**: Preferred date/time for production deployment?
7. **User Communication**: How should existing users be notified of this change?

---

## Conclusion

This implementation plan provides a comprehensive, zero-downtime approach to adding multi-venue support to GymHub. The phased approach ensures:

- **Data Integrity**: No data loss during migration
- **Backward Compatibility**: Existing functionality preserved
- **User Experience**: Intuitive venue management
- **Production Safety**: Tested rollback procedures
- **Future Scalability**: Foundation for venue-based features

**Recommendation**: Proceed with Phase 1 (database schema) and Phase 4 (data migration) first, then deploy Phases 2-3 together after thorough testing.

---

*Document Version*: 1.0  
*Created*: March 4, 2026  
*Last Updated*: March 4, 2026  
*Status*: Pending Approval

# Venue Implementation Guide

## ⚠️ Production Environment Context

**CRITICAL: This is a PRODUCTION site with LIVE data**

- **Application**: Hosted on Digital Ocean App Platform
- **Database**: PostgreSQL hosted on Digital Ocean Managed Database
- **Database Name**: `icgymhub_production`
- **Connection**: All migrations run directly against production database
- **No Local Database**: All operations execute on the production server

### Before Starting a New Session

When you start a new VS Code session, the AI agent will need the following information:

**Required Database Connection Details:**
```
DATABASE_URL format:
postgresql://[username]:[password]@[host]:[port]/[database]?sslmode=require

Specific details needed:
- Database Host: icgymhub-db-do-user-25561005-0.m.db.ondigitalocean.com
- Database Port: 25060
- Database User: doadmin
- Database Password: [Request from user - starts with AVNS_]
- Database Name: icgymhub_production
```

**Verification Commands:**
```bash
# Verify database connection
PGPASSWORD='[password]' psql -h [host] -p [port] -U doadmin -d icgymhub_production -c "SELECT current_database();"

# Check existing migrations
npx prisma migrate status

# Verify Venue table exists
PGPASSWORD='[password]' psql -h [host] -p [port] -U doadmin -d icgymhub_production -c "SELECT COUNT(*) FROM \"Venue\";"
```

---

## Overview: Venue Integration Pattern

This guide documents how to add multi-venue support to features in ICGymHub. The pattern was successfully implemented for **Class Rostering** and needs to be applied to:

1. ✅ **Class Rostering** (COMPLETED)
2. ⏳ **Injury Management**
3. ⏳ **Equipment Management**
4. ⏳ **Compliance Management**

---

## Implementation Pattern (5-Step Process)

### Step 1: Database Schema Updates

**What to do:**
- Add `venueId` field to relevant models in `prisma/schema.prisma`
- Add foreign key relationship to Venue model
- Add index on venueId for query performance
- Update Venue model relations

**Example from Class Rostering:**

```prisma
model ClassTemplate {
  id        String   @id @default(cuid())
  // ... existing fields ...
  
  // Add venue support
  venue     Venue?   @relation(fields: [venueId], references: [id])
  venueId   String?
  
  // ... other fields ...
  
  @@index([venueId])
}

// Update Venue model
model Venue {
  // ... existing fields ...
  
  // Add new relation
  classTemplates       ClassTemplate[]
  
  // ... other relations ...
}
```

**Models that need venueId:**

**Injury Management:**
- `InjuryFormTemplate` (form templates are venue-specific)
- `InjurySubmission` (submissions tied to venue)

**Equipment Management:**
- `Equipment` (already has venueId ✅)
- `MaintenanceLog` (maintenance happens at specific venue)
- `EquipmentUsage` (usage tracked per venue)
- `SafetyIssue` (safety issues at specific venue)
- `MaintenanceTask` (tasks at specific venue)

**Compliance Management:**
- `ComplianceCategory` (categories can be venue-specific)
- `ComplianceItem` (items at specific venue)

### Step 2: Create Database Migration

**What to do:**
- Create a new migration with descriptive name
- Add ALTER TABLE statements to add venueId columns
- Link existing records to default venue (if needed)
- Add foreign key constraints with CASCADE delete
- Add indexes for performance

**Migration Template:**

```sql
-- Migration: [YYYYMMDDHHMMSS]_add_venue_to_[feature_name]

-- Add venueId to [ModelName]
ALTER TABLE "[ModelName]" ADD COLUMN "venueId" TEXT;

-- Link existing records to default venue (optional - if you want all existing records assigned)
UPDATE "[ModelName]" 
SET "venueId" = (
  SELECT id FROM "Venue" 
  WHERE "clubId" = "[ModelName]"."clubId" 
    AND "isDefault" = true 
  LIMIT 1
)
WHERE "venueId" IS NULL;

-- Add foreign key constraint
ALTER TABLE "[ModelName]" 
  ADD CONSTRAINT "[ModelName]_venueId_fkey" 
  FOREIGN KEY ("venueId") 
  REFERENCES "Venue"("id") 
  ON DELETE CASCADE 
  ON UPDATE CASCADE;

-- Add index for performance
CREATE INDEX "[ModelName]_venueId_idx" ON "[ModelName]"("venueId");
```

**Commands to run:**

```bash
# Create migration
npx prisma migrate dev --name add_venue_to_[feature_name]

# For production (after testing)
npx prisma migrate deploy

# Regenerate Prisma client
npx prisma generate

# Force regenerate if types don't update
rm -rf node_modules/.prisma && rm -rf node_modules/@prisma/client && npx prisma generate
```

### Step 3: Update API Endpoints

**What to do:**
- Add venueId to GET query filtering
- Add venueId to POST/PATCH schemas (zod validation)
- Add venueId to create/update operations
- Add venueId to response data (include in queries)

**Example API Updates:**

**GET Endpoint (List/Filter):**
```typescript
// GET /api/[resource]
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const venueId = searchParams.get('venueId')
  
  const items = await prisma.[model].findMany({
    where: {
      clubId: user.clubId,
      ...(venueId && { venueId }), // Filter by venue if provided
    },
    include: {
      venue: true, // Include venue in response
      // ... other relations
    },
  })
  
  return NextResponse.json({ items })
}
```

**POST Endpoint (Create):**
```typescript
// POST /api/[resource]
const schema = z.object({
  // ... existing fields ...
  venueId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = schema.safeParse(body)
  
  const { venueId, ...otherFields } = parsed.data
  
  const newItem = await prisma.[model].create({
    data: {
      ...otherFields,
      venueId: venueId || null,
      clubId: user.clubId,
    },
  })
  
  return NextResponse.json(newItem)
}
```

**PATCH Endpoint (Update):**
```typescript
// PATCH /api/[resource]/[id]
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()
  
  const { venueId, ...otherFields } = body
  
  const updated = await prisma.[model].update({
    where: { id },
    data: {
      ...otherFields,
      venueId: venueId || null,
    },
  })
  
  return NextResponse.json(updated)
}
```

**APIs to Update:**

**Injury Management:**
- `/api/injury-forms/route.ts` (templates)
- `/api/injury-forms/[id]/route.ts`
- `/api/injury-submissions/route.ts`
- `/api/injury-submissions/[id]/route.ts`

**Equipment Management:** (may already have venueId in some)
- `/api/equipment/route.ts`
- `/api/equipment/[id]/route.ts`
- `/api/maintenance-logs/route.ts`
- `/api/safety-issues/route.ts`
- `/api/maintenance-tasks/route.ts`

**Compliance Management:**
- `/api/compliance/categories/route.ts`
- `/api/compliance/items/route.ts`
- `/api/compliance/items/[id]/route.ts`

### Step 4: Update UI Forms

**What to do:**
- Import VenueSelector component
- Add selectedVenue state (if filtering)
- Add venueId to formData state
- Add VenueSelector field to form UI
- Update form reset handlers
- Update edit handlers to load existing venueId

**Example Form Updates:**

```typescript
// 1. Import VenueSelector
import VenueSelector from '@/components/VenueSelector'

// 2. Add to formData state
const [formData, setFormData] = useState({
  // ... existing fields ...
  venueId: null as string | null,
})

// 3. Add to form UI (usually after name field)
<div>
  <label className="block text-sm font-medium mb-1">Venue</label>
  <VenueSelector
    selectedVenue={formData.venueId}
    onVenueChange={(venueId) => setFormData({ ...formData, venueId })}
    showAllOption={false}
  />
</div>

// 4. Update form reset handler
const resetForm = () => {
  setFormData({
    // ... existing reset values ...
    venueId: null,
  })
}

// 5. Update edit handler
const handleEdit = (item: Item) => {
  setFormData({
    // ... existing field mappings ...
    venueId: (item as any).venueId || null,
  })
}

// 6. For list/dashboard pages, add venue filter
const [selectedVenue, setSelectedVenue] = useState<string | null>(null)

// In fetch function
const fetchItems = async () => {
  const venueParam = selectedVenue ? `?venueId=${selectedVenue}` : ''
  const res = await fetch(`/api/[resource]${venueParam}`)
  // ...
}

// Add to useEffect dependencies
useEffect(() => {
  fetchItems()
}, [selectedVenue])

// Add VenueSelector to page header
<VenueSelector
  selectedVenue={selectedVenue}
  onVenueChange={setSelectedVenue}
  showAllOption={true} // For filtering, allow "All Venues"
/>
```

**Forms to Update:**

**Injury Management:**
- `/src/app/dashboard/injury-management/templates/page.tsx` (form templates)
- `/src/app/dashboard/injury-report/page.tsx` (submission form)
- `/src/app/dashboard/injury-management/submissions/page.tsx` (list with filter)

**Equipment Management:**
- `/src/app/dashboard/equipment/page.tsx`
- `/src/app/dashboard/equipment/all/page.tsx`
- `/src/components/EquipmentForm.tsx`
- Safety issue forms
- Maintenance task forms

**Compliance Management:**
- `/src/app/dashboard/compliance/page.tsx`
- Category forms
- Item forms

### Step 5: Update Related Logic & Filtering

**What to do:**
- Update any filtering/query logic to respect venues
- Update dashboards to show venue-specific data
- Update analytics to aggregate by venue
- Update conflict detection (if applicable)

**Example - Dashboard Filtering:**

```typescript
// Add venue filter to dashboard
const [selectedVenue, setSelectedVenue] = useState<string | null>(null)

// Update data fetch
const fetchData = async () => {
  const venueParam = selectedVenue ? `?venueId=${selectedVenue}` : ''
  const res = await fetch(`/api/dashboard/analytics${venueParam}`)
  // ...
}

// Add VenueSelector to UI
<div className="mb-4">
  <label className="block text-sm font-medium mb-1">Filter by Venue</label>
  <VenueSelector
    selectedVenue={selectedVenue}
    onVenueChange={setSelectedVenue}
    showAllOption={true}
  />
</div>
```

**Areas to Check:**

**Injury Management:**
- Dashboard analytics showing injury counts per venue
- Submission lists filtered by venue
- Email notifications should include venue context

**Equipment Management:**
- Equipment lists filtered by venue
- Maintenance schedules per venue
- Safety issue dashboards per venue
- Analytics showing equipment status by venue

**Compliance Management:**
- Compliance dashboard showing items per venue
- Reminders/notifications should specify venue
- Reports filtered by venue

---

## Detailed Implementation by Feature

### Injury Management

**Schema Changes Needed:**

```prisma
model InjuryFormTemplate {
  id          String   @id @default(cuid())
  // ... existing fields ...
  venue       Venue?   @relation(fields: [venueId], references: [id])
  venueId     String?
  
  @@index([venueId])
}

model InjurySubmission {
  id          String   @id @default(cuid())
  // ... existing fields ...
  venue       Venue?   @relation(fields: [venueId], references: [id])
  venueId     String?
  
  @@index([venueId])
}

// Update Venue model
model Venue {
  // ... existing ...
  injuryFormTemplates  InjuryFormTemplate[]
  injurySubmissions    InjurySubmission[]
}
```

**Migration Name:**
`20260306000001_add_venue_to_injury_management`

**APIs to Update:**
- `/api/injury-forms/*`
- `/api/injury-submissions/*`
- `/api/injury-submissions/public/[publicUrl]/route.ts` (include venue in public submission)

**Forms to Update:**
- Template creation/edit forms
- Submission forms (both admin and public)
- List/dashboard pages with filtering

**Special Considerations:**
- Public submission forms should auto-select venue (if applicable)
- Email notifications should include venue information
- Dashboard analytics should show injury trends per venue

### Equipment Management

**Schema Changes Needed:**

```prisma
// Equipment already has venueId ✅ - verify it exists

model MaintenanceLog {
  id          String   @id @default(cuid())
  // ... existing fields ...
  venue       Venue?   @relation(fields: [venueId], references: [id])
  venueId     String?
  
  @@index([venueId])
}

model EquipmentUsage {
  id          String   @id @default(cuid())
  // ... existing fields ...
  venue       Venue?   @relation(fields: [venueId], references: [id])
  venueId     String?
  
  @@index([venueId])
}

model SafetyIssue {
  id          String   @id @default(cuid())
  // ... existing fields ...
  venue       Venue?   @relation(fields: [venueId], references: [id])
  venueId     String?
  
  @@index([venueId])
}

model MaintenanceTask {
  id          String   @id @default(cuid())
  // ... existing fields ...
  venue       Venue?   @relation(fields: [venueId], references: [id])
  venueId     String?
  
  @@index([venueId])
}

// Update Venue model
model Venue {
  // ... existing ...
  maintenanceLogs      MaintenanceLog[]
  equipmentUsage       EquipmentUsage[]
  safetyIssues         SafetyIssue[]
  maintenanceTasks     MaintenanceTask[]
}
```

**Migration Name:**
`20260306000002_add_venue_to_equipment_logs_and_tasks`

**Note:** Equipment model likely already has venueId. Verify with:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Equipment' AND column_name = 'venueId';
```

**APIs to Update:**
- `/api/equipment/*` (verify venueId support)
- `/api/maintenance-logs/*`
- `/api/equipment-usage/*`
- `/api/safety-issues/*`
- `/api/maintenance-tasks/*`
- `/api/equipment/analytics/*` (add venue filtering)

**Forms to Update:**
- Equipment creation/edit (verify VenueSelector exists)
- Maintenance log forms
- Safety issue forms
- Maintenance task forms
- All list/dashboard pages

**Special Considerations:**
- Equipment analytics should show data per venue
- Maintenance schedules should be venue-specific
- When equipment is linked to venueId, related logs should inherit same venueId
- Zone-based equipment tracking should respect venues

### Compliance Management

**Schema Changes Needed:**

```prisma
model ComplianceCategory {
  id          String   @id @default(cuid())
  // ... existing fields ...
  venue       Venue?   @relation(fields: [venueId], references: [id])
  venueId     String?
  
  @@index([venueId])
}

model ComplianceItem {
  id          String   @id @default(cuid())
  // ... existing fields ...
  venue       Venue?   @relation(fields: [venueId], references: [id])
  venueId     String?
  
  @@index([venueId])
}

// Update Venue model
model Venue {
  // ... existing ...
  complianceCategories ComplianceCategory[]
  complianceItems      ComplianceItem[]
}
```

**Migration Name:**
`20260306000003_add_venue_to_compliance_management`

**APIs to Update:**
- `/api/compliance/categories/*`
- `/api/compliance/items/*`
- `/api/compliance/analytics/*`

**Forms to Update:**
- Category creation/edit forms
- Item creation/edit forms
- Compliance dashboard with venue filtering
- Reports and analytics pages

**Special Considerations:**
- Categories might be club-wide OR venue-specific (consider if both options needed)
- Items should definitely be venue-specific
- Reminders/notifications should include venue context
- Recurring items should track venue
- Dashboard should show compliance status per venue

---

## Testing Checklist

After implementing venue support for each feature:

### Database Level
- [ ] Migration applied successfully to production
- [ ] Foreign key constraints working (cascade delete)
- [ ] Indexes created on venueId columns
- [ ] Existing data migrated/linked correctly (if applicable)
- [ ] Prisma client regenerated with new types

### API Level
- [ ] GET endpoints filter by venueId parameter
- [ ] POST endpoints accept venueId in request body
- [ ] PATCH endpoints update venueId correctly
- [ ] DELETE cascades work properly
- [ ] venueId included in response data
- [ ] No TypeScript errors in API files

### UI Level
- [ ] VenueSelector appears in all relevant forms
- [ ] Creating new items saves venueId correctly
- [ ] Editing existing items shows current venue
- [ ] Form reset clears venueId
- [ ] List/dashboard filters by venue
- [ ] "All Venues" option works for filtering
- [ ] No TypeScript errors in UI components

### Business Logic
- [ ] Analytics aggregate by venue correctly
- [ ] Notifications include venue information
- [ ] Filtering/searching respects venue boundaries
- [ ] Reports show venue-specific data
- [ ] No data leakage between venues

### User Experience
- [ ] Venue selection is intuitive
- [ ] Default venue behavior makes sense
- [ ] Venue labels are clear and consistent
- [ ] Performance is acceptable (queries optimized)

---

## Common Issues & Solutions

### Issue: Prisma Client Types Not Updating

**Symptoms:**
- TypeScript errors: "Property 'venue' does not exist"
- TypeScript errors: "Property 'venueId' does not exist"

**Solution:**
```bash
# Force regenerate Prisma client
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma/client
npx prisma generate

# Restart TypeScript server in VS Code
# Cmd+Shift+P (Mac) or Ctrl+Shift+P (Windows/Linux)
# Type: "TypeScript: Restart TS Server"
```

### Issue: Migration Fails on Production

**Symptoms:**
- Foreign key constraint violation
- Column already exists

**Solution:**
```bash
# Check migration status
npx prisma migrate status

# If migration partially applied, may need to roll back or fix manually
# Check what exists in database
PGPASSWORD='[password]' psql -h [host] -p [port] -U doadmin -d icgymhub_production \
  -c "SELECT column_name FROM information_schema.columns WHERE table_name = '[TableName]';"

# If needed, mark migration as applied without running
npx prisma migrate resolve --applied [migration_name]
```

### Issue: Existing Data Has No Venue

**Symptoms:**
- Items created before venue support have venueId = null

**Solution:**
```sql
-- Option 1: Link to default venue for each club
UPDATE "[ModelName]" 
SET "venueId" = (
  SELECT id FROM "Venue" 
  WHERE "clubId" = "[ModelName]"."clubId" 
    AND "isDefault" = true 
  LIMIT 1
)
WHERE "venueId" IS NULL;

-- Option 2: Leave as null and allow filtering "All Venues" to show null items
-- This is often better for backwards compatibility
```

### Issue: VenueSelector Not Showing Venues

**Symptoms:**
- Dropdown is empty

**Solution:**
- Check VenueSelector component is fetching venues correctly
- Verify user's club has venues created
- Check network tab for API errors
- Verify `/api/venues` endpoint returns data

### Issue: Form Submit Doesn't Save venueId

**Symptoms:**
- Item created but venueId is null in database

**Solution:**
- Verify venueId is in formData state
- Check API schema includes venueId validation
- Verify API endpoint creates record with venueId
- Check browser console for JavaScript errors

---

## Reference Implementation (Class Rostering)

The complete implementation for Class Rostering can be referenced:

**Migration:**
- `prisma/migrations/20260306000000_add_venue_to_class_templates/migration.sql`

**Schema:**
- `prisma/schema.prisma` (ClassTemplate, Zone, RosterTemplate models)

**APIs:**
- `/src/app/api/classes/route.ts`
- `/src/app/api/classes/[id]/route.ts`
- `/src/app/api/zones/route.ts`
- `/src/app/api/rosters/generate/route.ts`
- `/src/app/api/rosters/combined/route.ts`

**Forms:**
- `/src/app/dashboard/roster-config/zones/page.tsx`
- `/src/app/dashboard/roster-config/classes/page.tsx`
- `/src/app/dashboard/rosters/create/page.tsx`
- `/src/app/dashboard/class-rostering/page.tsx`

**Components:**
- `/src/components/VenueSelector.tsx` (reusable component)

---

## Questions to Ask User Before Starting

When starting implementation in a new session, ask:

1. **Database Connection:**
   - "What is the DATABASE_URL connection string?" (should include password)
   - OR "What is the database password for doadmin user?" (starts with AVNS_)

2. **Feature Priority:**
   - "Which feature should we implement venue support for first?"
     - Injury Management
     - Equipment Management  
     - Compliance Management

3. **Data Migration Strategy:**
   - "Should existing records (created before venue support) be:"
     - Linked to the default venue automatically?
     - Left with venueId = null (shown in "All Venues" filter)?

4. **Venue Requirement:**
   - "Should venue selection be required when creating new records, or optional?"

5. **Scope Verification:**
   - "Are there any specific forms or pages within [chosen feature] that should NOT have venue support?"

---

## Implementation Order Recommendations

**Recommended Order:**
1. **Equipment Management** (some models may already have venueId)
2. **Injury Management** (moderate complexity)
3. **Compliance Management** (most complex due to recurring items)

**Rationale:**
- Equipment Management likely has partial venue support already
- Injury Management is standalone and less interconnected
- Compliance Management has more complex business rules to consider

---

## Final Notes

- **Always test in production context** - there is no local/dev environment
- **Commit frequently** with clear messages
- **Verify migrations** apply cleanly before proceeding to code changes
- **Regenerate Prisma client** after every schema change
- **Test forms thoroughly** - create, edit, delete, filter
- **Check analytics** to ensure venue filtering works correctly

**Success Criteria:**
- ✅ Users can assign venues to all relevant entities
- ✅ Users can filter views by venue
- ✅ Analytics show venue-specific data
- ✅ No data leakage between venues
- ✅ Existing functionality still works
- ✅ No TypeScript compilation errors
- ✅ Production deployment succeeds

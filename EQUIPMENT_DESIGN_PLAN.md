# Equipment Management System - Design Plan

**Created:** January 26, 2026
**Purpose:** Comprehensive design document for Equipment tracking and management system
**Status:** Planning Phase - DO NOT WIPE DATABASE

## Overview
The Equipment Management System will track gym equipment inventory, maintenance schedules, condition status, and usage history without removing any existing data.

---

## Database Schema Design

### Equipment Table (NEW)
```prisma
model Equipment {
  id              String    @id @default(cuid())
  name            String
  category        String    // e.g., "Mats", "Bars", "Beams", "Vault", "Rings", "Trampoline"
  serialNumber    String?   @unique
  purchaseDate    DateTime?
  purchaseCost    Decimal?  @db.Decimal(10, 2)
  condition       String    @default("Good") // "Excellent", "Good", "Fair", "Poor", "Out of Service"
  location        String?   // Storage location or zone
  zoneId          String?
  zone            Zone?     @relation(fields: [zoneId], references: [id])
  
  // Maintenance tracking
  lastMaintenance DateTime?
  nextMaintenance DateTime?
  maintenanceNotes String?  @db.Text
  
  // Usage tracking
  inUse           Boolean   @default(false)
  currentClass    String?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  maintenanceLogs MaintenanceLog[]
  usageHistory    EquipmentUsage[]
  
  @@index([category])
  @@index([condition])
  @@index([zoneId])
}
```

### MaintenanceLog Table (NEW)
```prisma
model MaintenanceLog {
  id              String    @id @default(cuid())
  equipmentId     String
  equipment       Equipment @relation(fields: [equipmentId], references: [id], onDelete: Cascade)
  
  maintenanceType String    // "Routine", "Repair", "Inspection", "Replacement"
  description     String    @db.Text
  performedBy     String?
  cost            Decimal?  @db.Decimal(10, 2)
  performedAt     DateTime  @default(now())
  
  createdAt       DateTime  @default(now())
  
  @@index([equipmentId])
  @@index([performedAt])
}
```

### EquipmentUsage Table (NEW)
```prisma
model EquipmentUsage {
  id              String    @id @default(cuid())
  equipmentId     String
  equipment       Equipment @relation(fields: [equipmentId], references: [id], onDelete: Cascade)
  
  classId         String?
  class           Class?    @relation(fields: [classId], references: [id], onDelete: SetNull)
  
  coachId         String?
  coach           Coach?    @relation(fields: [coachId], references: [id], onDelete: SetNull)
  
  usedFrom        DateTime
  usedUntil       DateTime?
  notes           String?   @db.Text
  
  createdAt       DateTime  @default(now())
  
  @@index([equipmentId])
  @@index([classId])
  @@index([usedFrom])
}
```

### Updates to Existing Tables

#### Zone Model - Add Equipment Relation
```prisma
// Add to existing Zone model:
equipment       Equipment[]
```

#### Class Model - Add Equipment Usage Relation
```prisma
// Add to existing Class model:
equipmentUsage  EquipmentUsage[]
```

#### Coach Model - Add Equipment Usage Relation
```prisma
// Add to existing Coach model:
equipmentUsage  EquipmentUsage[]
```

---

## API Endpoints Design

### Equipment CRUD Operations

#### GET /api/equipment
- **Purpose:** List all equipment with filtering and pagination
- **Query Params:**
  - `category` (optional): Filter by category
  - `condition` (optional): Filter by condition
  - `zoneId` (optional): Filter by zone
  - `inUse` (optional): Filter by usage status
  - `search` (optional): Search by name or serial number
  - `page` (optional): Page number
  - `limit` (optional): Items per page
- **Returns:** Array of equipment with pagination metadata

#### GET /api/equipment/[id]
- **Purpose:** Get single equipment details with maintenance history
- **Returns:** Equipment object with related maintenanceLogs and usageHistory

#### POST /api/equipment
- **Purpose:** Create new equipment
- **Body:** Equipment data
- **Returns:** Created equipment object

#### PUT /api/equipment/[id]
- **Purpose:** Update equipment details
- **Body:** Updated equipment data
- **Returns:** Updated equipment object

#### DELETE /api/equipment/[id]
- **Purpose:** Delete equipment (cascade deletes logs)
- **Returns:** Success confirmation

### Maintenance Operations

#### GET /api/equipment/[id]/maintenance
- **Purpose:** Get maintenance history for specific equipment
- **Returns:** Array of maintenance logs

#### POST /api/equipment/[id]/maintenance
- **Purpose:** Add maintenance log entry
- **Body:** Maintenance log data
- **Returns:** Created maintenance log

#### GET /api/equipment/maintenance-due
- **Purpose:** Get all equipment due for maintenance
- **Query Params:**
  - `days` (optional): Days ahead to check (default: 7)
- **Returns:** Array of equipment needing maintenance

### Usage Tracking

#### POST /api/equipment/[id]/checkout
- **Purpose:** Mark equipment as in use
- **Body:** `{ classId?, coachId?, notes? }`
- **Returns:** Updated equipment and usage record

#### POST /api/equipment/[id]/checkin
- **Purpose:** Mark equipment as returned
- **Body:** `{ notes? }`
- **Returns:** Updated equipment and completed usage record

#### GET /api/equipment/[id]/usage-history
- **Purpose:** Get usage history for specific equipment
- **Query Params:**
  - `startDate` (optional)
  - `endDate` (optional)
- **Returns:** Array of usage records

### Analytics & Reports

#### GET /api/equipment/analytics/overview
- **Purpose:** Get equipment statistics
- **Returns:** 
  - Total equipment count
  - Count by category
  - Count by condition
  - Currently in use count
  - Maintenance due count

#### GET /api/equipment/analytics/costs
- **Purpose:** Get cost analysis
- **Query Params:**
  - `startDate` (optional)
  - `endDate` (optional)
- **Returns:** Purchase and maintenance costs breakdown

---

## UI Components Design

### Dashboard Integration

#### Equipment Dashboard Page
**Path:** `/dashboard/equipment`
- Overview statistics cards
- Quick filters (category, condition, availability)
- Equipment list/grid view toggle
- Search functionality
- Add new equipment button

#### Components Structure

##### EquipmentList Component
```typescript
interface EquipmentListProps {
  filters?: {
    category?: string;
    condition?: string;
    zoneId?: string;
    inUse?: boolean;
  };
  view?: 'list' | 'grid';
}
```

##### EquipmentCard Component
```typescript
interface EquipmentCardProps {
  equipment: Equipment;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onCheckout: (id: string) => void;
  onCheckin: (id: string) => void;
}
```

##### EquipmentForm Component
```typescript
interface EquipmentFormProps {
  equipment?: Equipment; // undefined for create, populated for edit
  onSubmit: (data: EquipmentFormData) => void;
  onCancel: () => void;
}
```

##### MaintenanceLog Component
```typescript
interface MaintenanceLogProps {
  equipmentId: string;
  logs: MaintenanceLog[];
  onAddLog: (log: MaintenanceLogData) => void;
}
```

##### EquipmentAnalytics Component
```typescript
interface EquipmentAnalyticsProps {
  dateRange?: { startDate: Date; endDate: Date };
}
```

### Navigation Updates

Add to DashboardLayout navigation:
```typescript
{
  name: 'Equipment',
  href: '/dashboard/equipment',
  icon: WrenchIcon, // or suitable icon
  subItems: [
    { name: 'All Equipment', href: '/dashboard/equipment' },
    { name: 'Maintenance Due', href: '/dashboard/equipment/maintenance' },
    { name: 'Analytics', href: '/dashboard/equipment/analytics' },
  ]
}
```

---

## Implementation Plan (SAFE - NO DATABASE WIPE)

### Phase 1: Database Migration (ADDITIVE ONLY)
1. ✅ Create new migration file (do NOT reset database)
2. ✅ Add Equipment, MaintenanceLog, EquipmentUsage models
3. ✅ Add relations to existing Zone, Class, Coach models
4. ✅ Run migration: `npx prisma migrate dev --name add_equipment_tables`
5. ✅ Verify existing data is intact

### Phase 2: API Implementation
1. Create `/api/equipment/route.ts` (GET, POST)
2. Create `/api/equipment/[id]/route.ts` (GET, PUT, DELETE)
3. Create `/api/equipment/[id]/maintenance/route.ts`
4. Create `/api/equipment/[id]/checkout/route.ts`
5. Create `/api/equipment/[id]/checkin/route.ts`
6. Create `/api/equipment/[id]/usage-history/route.ts`
7. Create `/api/equipment/maintenance-due/route.ts`
8. Create `/api/equipment/analytics/overview/route.ts`
9. Create `/api/equipment/analytics/costs/route.ts`

### Phase 3: UI Components
1. Create base components:
   - `EquipmentCard.tsx`
   - `EquipmentList.tsx`
   - `EquipmentForm.tsx`
   - `MaintenanceLog.tsx`
   - `EquipmentAnalytics.tsx`
2. Create dashboard pages:
   - `/dashboard/equipment/page.tsx`
   - `/dashboard/equipment/maintenance/page.tsx`
   - `/dashboard/equipment/analytics/page.tsx`
3. Update DashboardLayout navigation

### Phase 4: Testing & Validation
1. Test all CRUD operations
2. Test maintenance logging
3. Test checkout/checkin workflow
4. Test analytics calculations
5. Verify existing functionality unaffected

### Phase 5: Documentation
1. Update README.md with equipment features
2. Create user guide for equipment management
3. Document API endpoints
4. Create seed data examples

---

## Data Validation Rules

### Equipment
- `name`: Required, min 1 char, max 100 chars
- `category`: Required, one of predefined categories
- `serialNumber`: Optional, unique if provided
- `purchaseDate`: Optional, cannot be in future
- `purchaseCost`: Optional, must be >= 0
- `condition`: Required, one of: "Excellent", "Good", "Fair", "Poor", "Out of Service"

### MaintenanceLog
- `maintenanceType`: Required, one of: "Routine", "Repair", "Inspection", "Replacement"
- `description`: Required, min 10 chars
- `cost`: Optional, must be >= 0
- `performedAt`: Required, cannot be in future

### EquipmentUsage
- `usedFrom`: Required
- `usedUntil`: Optional, must be after usedFrom if provided
- Either `classId` or `coachId` should be provided

---

## Equipment Categories

Predefined categories:
- Mats
- Bars (Uneven, Parallel, Horizontal)
- Beams
- Vault Equipment
- Rings
- Trampoline
- Floor Equipment
- Safety Equipment
- Training Aids
- Other

---

## Condition States

1. **Excellent** - Like new, no visible wear
2. **Good** - Minor wear, fully functional
3. **Fair** - Moderate wear, functional but needs attention
4. **Poor** - Significant wear, limited functionality
5. **Out of Service** - Not safe for use, needs repair or replacement

---

## Maintenance Schedule Recommendations

- **Daily Inspection Items**: Safety mats, landing areas
- **Weekly Maintenance**: Wipe down equipment, check bolts/connections
- **Monthly Inspection**: Detailed condition assessment
- **Quarterly Maintenance**: Professional inspection, deep cleaning
- **Annual Maintenance**: Comprehensive safety audit

---

## Integration Points

### With Roster System
- Display available equipment when planning rosters
- Auto-checkout equipment when class starts
- Auto-checkin when class ends

### With Zones
- Equipment assigned to specific zones
- Zone capacity considers equipment availability

### With Notifications
- Alert when equipment maintenance is due
- Notify when equipment condition changes to Poor/Out of Service

---

## Future Enhancements (Post-MVP)

1. QR code scanning for quick checkout/checkin
2. Equipment reservation system
3. Automated maintenance scheduling
4. Equipment lifecycle predictions
5. Cost per usage calculations
6. Mobile app for equipment management
7. Photo uploads for equipment condition documentation
8. Integration with external equipment management systems

---

## Notes & Considerations

- **DO NOT WIPE DATABASE**: All migrations must be additive only
- Existing data in Zone, Class, and Coach tables must remain intact
- Equipment system should be optional - existing functionality must work without it
- Consider soft deletes for audit trail
- Maintenance logs should never be deleted (cascade soft delete only)
- Usage history provides valuable analytics - retain indefinitely

---

## Rollback Plan

If issues occur during implementation:
1. Migration can be rolled back using: `npx prisma migrate reset` (only if no production data!)
2. For production: Create reverse migration to drop tables
3. Remove API routes
4. Remove UI components
5. Revert navigation changes

**IMPORTANT:** Test thoroughly in development before production deployment!

---

## Sign-off Checklist

- [ ] Database schema reviewed and approved
- [ ] API endpoints designed and documented
- [ ] UI/UX mockups reviewed
- [ ] Security considerations addressed
- [ ] Performance impact assessed
- [ ] Testing strategy defined
- [ ] Migration tested on copy of production data
- [ ] Rollback plan documented and tested


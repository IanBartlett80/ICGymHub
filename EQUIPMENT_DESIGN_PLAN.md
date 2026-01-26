# Equipment Management System - Design Plan

**Created:** January 26, 2026
**Purpose:** Comprehensive design document for Equipment tracking and management system
**Status:** Planning Phase - DO NOT WIPE DATABASE

## Overview
The Equipment Management System will track gym equipment inventory, maintenance schedules, condition status, and usage history without removing any existing data.

### Key Features
1. **Zone-Based Organization** - Equipment organized by gym zones (similar to fire safety inspection reports)
2. **QR Code System** - Print QR codes for each zone that staff can scan to view and report on equipment
3. **Mobile Safety Reporting** - Quick issue reporting via QR code scanning
4. **Maintenance Tracking** - Schedule and track maintenance tasks
5. **Safety Issue Management** - Track critical defects, non-critical defects, recommendations, and informational notes
6. **Photo Documentation** - Upload photos for safety issues and maintenance tasks
7. **Digital Signatures** - Sign-off on completed maintenance and resolved issues

---

## Zone-Based Dashboard Design

### Dashboard Landing Page (Zone View)
The main equipment dashboard will display a **zone-centric view** similar to fire safety inspection reports:

- **Zone Cards** - Each zone displays:
  - Zone name and description
  - **Overall Zone Status Badge** (color-coded):
    - 🟢 **NO DEFECTS DETECTED** (Green) - No active safety issues or overdue maintenance
    - 🟡 **NON-CRITICAL ISSUES** (Amber/Yellow) - Has non-critical defects, recommendations, or upcoming maintenance
    - 🟠 **REQUIRES ATTENTION** (Orange) - Has overdue maintenance or non-conformances
    - 🔴 **CRITICAL DEFECTS** (Red) - Has critical safety issues requiring immediate action
  - Equipment count in zone
  - Active safety issues count (by severity)
  - Pending maintenance tasks count
  - QR code (click to enlarge/print)
  - Quick action buttons (View Equipment, Print QR, Report Issue)

- **Zone Filter Bar** - Filter zones by:
  - Status (No Defects, Non-Critical, Requires Attention, Critical)
  - Active issues
  - Maintenance due
  - All zones

- **Print All QR Codes** - Bulk print QR codes for all zones

### Zone Status Calculation Logic

**Status calculated from BOTH:**
1. **Safety Issues** (SafetyIssue table) - Staff-reported defects
2. **Maintenance Notes** (MaintenanceLog + MaintenanceTask tables) - Scheduled/completed maintenance

**Status Priority (highest to lowest):**
1. **CRITICAL DEFECTS** (Red) - At least one of:
   - Safety issue with type "CRITICAL" and status OPEN
   - Equipment with condition "Out of Service"
   - Maintenance task marked as "CRITICAL" priority and overdue
   
2. **REQUIRES ATTENTION** (Orange) - Has:
   - Safety issues with type "NON_CRITICAL" and status OPEN
   - Overdue maintenance tasks (due date passed)
   - Non-conformance safety issues
   - Equipment with condition "Poor"
   - Maintenance logs indicating equipment needs repair
   
3. **NON-CRITICAL ISSUES** (Amber/Yellow) - Has:
   - Recommendations (safety issues)
   - Informational notes (safety issues)
   - Upcoming maintenance tasks (due within 7 days)
   - Equipment with condition "Fair"
   
4. **NO DEFECTS DETECTED** (Green) - Default state when:
   - No open safety issues
   - No overdue maintenance tasks
   - No upcoming maintenance due soon
   - All equipment in "Good" or "Excellent" condition

**Status Updates:**
- Recalculated automatically when:
  - Safety issues created/updated/resolved
  - Maintenance tasks created/updated/completed
  - Equipment condition changed
  - Maintenance logs added
- Displayed on zone cards, zone detail pages, and in analytics
- Can filter zones by status in dashboard

### Admin Dashboard Drill-Down Workflow

**Level 1: Equipment Analytics Landing Page** (`/dashboard/equipment`)
- Zone grid view with status badges
- Click zone card → Drill down to Level 2

**Level 2: Zone Detail Page** (`/dashboard/equipment/zones/[id]`)
- Zone header with status badge and statistics
- **Safety Issues Tab** (default):
  - All safety issues for this zone (all equipment)
  - Filter by: Status, Issue Type, Priority, Equipment
  - Sort by: Date, Priority, Status
  - Click issue → View/Edit/Resolve modal
- **Equipment List Tab**:
  - All equipment in this zone
  - Each equipment shows:
    - Name, category, condition
    - Active issues count badge
    - Last maintenance date
    - Status indicator
  - Click equipment → Drill down to Level 3
- **Maintenance Tasks Tab**:
  - All maintenance tasks for equipment in this zone
  - Filter by status, equipment, due date
  - Click task → View/Edit/Complete modal
- **Zone Analytics Tab**:
  - Equipment count by category
  - Safety issues over time (chart)
  - Maintenance costs
  - Average equipment condition

**Level 3: Equipment Detail Page** (`/dashboard/equipment/items/[id]`)
- Equipment header with all details (name, category, serial, purchase info, condition)
- **Equipment Actions**: Edit Details, Change Condition, Delete
- **Safety Issues Section**:
  - All safety issues for THIS equipment
  - Timeline view (newest first)
  - Each issue shows full details, photos, resolution if resolved
  - Click issue → Expand for resolution workflow
- **Maintenance History Section**:
  - All maintenance logs for THIS equipment (MaintenanceLog table)
  - Timeline view with type badges (Routine, Repair, Inspection, Replacement)
  - Each log shows: Date, Type, Performed by, Cost, Description
  - **"+ Add Maintenance Log"** button
- **Maintenance Tasks Section**:
  - Scheduled/pending maintenance tasks for THIS equipment
  - Each task shows: Title, Due date, Status, Priority
  - Click task → Complete/Edit workflow
  - **"+ Schedule Maintenance"** button
- **Usage History Section**:
  - When equipment was used (classes, coaches, dates)
  - Helps track wear and tear patterns
- **Equipment Lifecycle Timeline** (visual):
  - Purchase date
  - All maintenance events
  - All safety issues
  - Condition changes
  - Current status

### Admin Issue Resolution Workflow

**When admin clicks on a Safety Issue:**

**Issue Detail Modal/Page:**
- Full issue details display:
  - Issue type, priority, status badges
  - Equipment affected
  - Title and full description
  - Reported by, email, date
  - All photos in gallery view
  - Current status and any status change history

**Resolution Options** (based on issue type and equipment condition):

1. **Mark In Progress**
   - Status → IN_PROGRESS
   - Optional: Assign to technician
   - Optional: Add internal notes
   - Optional: Set expected resolution date

2. **Repair Equipment**
   - Status → IN_PROGRESS
   - Create linked Maintenance Task:
     - Task type: REPAIR
     - Description from safety issue
     - Assign to technician
     - Set due date and priority
   - When task completed → Can resolve issue

3. **Replace Equipment**
   - Status → IN_PROGRESS
   - Mark current equipment as "Out of Service"
   - Create replacement workflow:
     - Option 1: Link to existing replacement equipment
     - Option 2: Create new equipment record (replacement)
     - Transfer zone assignment
   - Add maintenance log: "Equipment replaced due to [issue]"
   - When replacement complete → Resolve issue

4. **Resolve Issue** (Issue fixed)
   - **Resolution Form**:
     - Resolution type (required):
       - Repaired
       - Replaced
       - No action needed (false alarm)
       - Deferred (explain why)
     - Resolution notes (required): What was done
     - Resolved by name (required)
     - Resolution date (auto-filled, can edit)
     - Resolution cost (optional)
     - After photos (optional): Upload photos of resolved state
   - Status → RESOLVED
   - Update equipment condition if changed
   - Create MaintenanceLog entry if repair/replacement done
   - Send notification to reporter (if email provided)

5. **Close Without Action**
   - For Informational notes or Recommendations that don't require action
   - Status → CLOSED
   - Require notes explaining why no action taken

6. **Reject/Invalid**
   - For duplicate or invalid submissions
   - Status → REJECTED
   - Require notes

**Equipment Replacement Workflow Detail:**

When "Replace Equipment" selected:

**Step 1: Mark Original Equipment**
- Condition → "Out of Service"
- Add flag: `replacedBy: [newEquipmentId]` (after replacement created)
- Add flag: `replacementReason: [safetyIssueId]`

**Step 2: Create/Link Replacement**
- **Option A: Link Existing Equipment**
  - Search existing equipment
  - Select replacement
  - Update zone assignment
  - Link: `replacementFor: [oldEquipmentId]`
  
- **Option B: Create New Equipment**
  - Pre-fill form with original equipment details
  - Update serial number, purchase date, etc.
  - Auto-set: `replacementFor: [oldEquipmentId]`
  - Auto-assign to same zone
  - Condition: "Excellent" or "Good"

**Step 3: Transfer/Update Records**
- Original equipment:
  - Keep all maintenance logs (history)
  - Keep all safety issues (history)
  - Mark as inactive/archived
  - `active: false`
  - `retiredDate: now()`
- Replacement equipment:
  - Link to original in notes
  - Fresh maintenance schedule

**Step 4: Complete Resolution**
- Add MaintenanceLog to BOTH:
  - Original: "Equipment replaced due to [issue]"
  - Replacement: "Installed as replacement for [original name]"
- Resolve safety issue with notes
- Update zone status (recalculate)

**Admin Dashboard Shortcuts:**
- **"Quick Resolve"** button on issue cards (for simple cases)
- **Bulk Actions**: Select multiple issues → Assign, Update Status
- **Filter Presets**: "Needs Attention", "In Progress", "Critical Only", "My Assigned"

---

### QR Code Workflow

#### 1. QR Code Generation
- Each zone gets a unique QR code containing: `https://[club-domain]/zone-equipment/[zonePublicId]`
- QR codes can be printed individually or in bulk
- Print format: Zone name, QR code, last updated date

#### 2. Scanning Experience (Public URL - No Login Required)
- Staff scans QR code → Opens public page showing:
  
  **Zone Overview Section:**
  - Zone name and description
  - Overall zone safety status badge (color-coded)
  - Statistics: Total equipment, Open issues, Resolved issues
  
  **Active Safety Issues Section** (Top of page - Most Important):
  - List of ALL submitted safety issues for this zone (all equipment)
  - Sorted by: Open issues first, then by date (newest first)
  - Each issue card shows:
    - Issue type badge (Critical, Non-critical, etc.) with color
    - Equipment name affected
    - Title and brief description
    - Status badge (OPEN, IN_PROGRESS, RESOLVED)
    - Reported by and date
    - Thumbnail of first photo (if any)
    - Click to expand for full details
  - **"+ Report New Safety Issue"** button (prominent, fixed at bottom on mobile)
  
  **Equipment in Zone Section** (Expandable/Collapsible):
  - List of all equipment in zone with:
    - Equipment name and category
    - Condition status badge
    - Last maintenance date
    - Active safety issues count for this equipment
    - Click equipment to see its full history
  
  **Resolved Issues Section** (Collapsible, shows last 10):
  - Previously resolved issues with resolution notes
  - Resolved date and resolved by name
  - Click "View All Resolved" to see complete history

#### 3. Safety Issue Reporting (Mobile-Optimized)
- Click "+ Report New Safety Issue" → Open form:
  - **Issue Type** (required): 
    - Critical Defect (red) - Equipment inoperable/dangerous
    - Non-critical Defect (orange) - Impaired but usable
    - Non-conformance (amber) - Missing info/incorrect feature
    - Recommendation (yellow) - Improvement suggestion
    - Informational (blue) - General comment
  - **Equipment Selection** (required): Dropdown of equipment in zone + "General Zone Issue" option
  - **Title** (required): Brief issue summary (max 100 chars)
  - **Description** (required): Detailed description (min 20 chars)
  - **Reporter Name** (required)
  - **Reporter Email** (optional): For follow-up communication
  - **Photos** (optional): Upload up to 5 photos
    - Camera button for direct photo capture on mobile
    - File upload for existing photos
    - Image preview before submit
  - **Priority** (auto-set based on issue type, can override): Critical, High, Medium, Low
  - Submit button
  
- **After Submission:**
  - Success message with issue ID
  - New issue appears at TOP of Active Safety Issues list
  - Page scrolls to show the new issue
  - Option to "Report Another Issue" or "Done"

#### 4. Maintenance Task Reporting
- Click "Report Maintenance Needed" → Open form:
  - **Task Type** (required): Routine, Inspection, Repair, Replacement, Cleaning
  - **Equipment Selection** (required)
  - **Title** (required)
  - **Description** (required)
  - **Reporter Name** (required)
  - **Photos** (optional)
  - **Suggested Due Date** (optional)
  - Submit button

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

#### Zone Model - Add Equipment Relation and QR Support
```prisma
// Add to existing Zone model:
equipment          Equipment[]
publicId           String?   @unique  // Public ID for QR code URLs (non-guessable)
qrCodeLastPrinted  DateTime? // Track when QR code was last printed
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

### QR Code Management

#### GET /api/zones/[id]/qr-code
- **Purpose:** Generate QR code for zone
- **Returns:** QR code image (SVG or PNG)

#### POST /api/zones/batch-qr-codes
- **Purpose:** Generate QR codes for multiple zones
- **Body:** `{ zoneIds: string[] }`
- **Returns:** ZIP file with all QR code images and printable PDF

#### GET /api/zones/[id]/printable-qr
- **Purpose:** Get printable QR code page (HTML)
- **Returns:** HTML page with zone name, QR code, instructions

### Public Zone Equipment (No Auth Required)

#### GET /zone-equipment/[publicId]
- **Purpose:** Public page showing zone's equipment (accessed via QR code)
- **Returns:** HTML page with equipment list and report buttons

#### GET /api/public/zone-equipment/[publicId]
- **Purpose:** Get zone equipment data AND all safety issues for public view
- **Returns:** Zone info with status badge, equipment list, safety issues (sanitized - no sensitive data)
  ```json
  {
    "zone": {
      "id": "...",
      "name": "Main Gymnasium",
      "description": "...",
      "status": "NO_DEFECTS_DETECTED",
      "statusColor": "green"
    },
    "equipment": [...],
    "safetyIssues": {
      "open": [
        {
          "id": "...",
          "issueType": "CRITICAL",
          "title": "...",
          "description": "...",
          "equipmentName": "...",
          "status": "OPEN",
          "priority": "CRITICAL",
          "reportedBy": "...",
          "reportedAt": "...",
          "photos": ["..."]
        }
      ],
      "resolved": [...] // Last 10 resolved issues
    },
    "statistics": {
      "totalEquipment": 15,
      "criticalIssues": 0,
      "activeIssues": 0,
      "resolvedIssues": 23,
      "overdueMaintenanceTasks": 0
    }
  }
  ```

#### GET /api/public/zone-equipment/[publicId]/equipment/[equipmentId]
- **Purpose:** Get single equipment detail with its issues and maintenance from public QR page
- **Returns:** Equipment details, safety issues, recent maintenance logs

### Safety Issue Reporting

#### POST /api/public/safety-issues
- **Purpose:** Submit safety issue report (no auth required)
- **Body:** Safety issue data with equipment ID, zone public ID
- **Returns:** Created safety issue with confirmation

#### GET /api/safety-issues
- **Purpose:** List all safety issues (admin only)
- **Query Params:**
  - `status` (optional): Filter by status
  - `issueType` (optional): Filter by type
  - `priority` (optional): Filter by priority
  - `equipmentId` (optional): Filter by equipment
  - `zoneId` (optional): Filter by zone
- **Returns:** Array of safety issues

#### GET /api/safety-issues/[id]
- **Purpose:** Get single safety issue details
- **Returns:** Safety issue with photos and resolution info

#### PUT /api/safety-issues/[id]
- **Purpose:** Update safety issue (status, priority, resolution)
- **Body:** Updated safety issue data
- **Returns:** Updated safety issue

#### POST /api/safety-issues/[id]/resolve
- **Purpose:** Mark safety issue as resolved with full resolution details
- **Body:** 
  ```json
  {
    "resolutionType": "REPAIRED" | "REPLACED" | "NO_ACTION" | "DEFERRED",
    "resolvedBy": "string",
    "resolutionNotes": "string",
    "resolutionCost": "string (optional)",
    "afterPhotos": ["file uploads (optional)"],
    "equipmentConditionUpdate": "Good" | "Excellent" (optional),
    "createMaintenanceLog": boolean,
    "replacementEquipmentId": "string (if resolutionType = REPLACED)"
  }
  ```
- **Returns:** Updated safety issue with resolution data

#### POST /api/safety-issues/[id]/mark-in-progress
- **Purpose:** Mark issue as in progress and optionally create maintenance task
- **Body:**
  ```json
  {
    "assignedTo": "string (optional)",
    "internalNotes": "string (optional)",
    "expectedResolutionDate": "date (optional)",
    "createMaintenanceTask": boolean
  }
  ```
- **Returns:** Updated safety issue and created maintenance task (if requested)

#### POST /api/safety-issues/[id]/close
- **Purpose:** Close issue without action (for informational/recommendations)
- **Body:** `{ "closedBy": "string", "closureNotes": "string" }`
- **Returns:** Updated safety issue

#### POST /api/equipment/[id]/replace
- **Purpose:** Mark equipment for replacement and create replacement workflow
- **Body:**
  ```json
  {
    "reason": "string",
    "safetyIssueId": "string (optional - if triggered by safety issue)",
    "replacementType": "EXISTING" | "NEW",
    "replacementEquipmentId": "string (if EXISTING)",
    "newEquipmentData": { ... } // (if NEW)
  }
  ```
- **Returns:** Updated original equipment + replacement equipment

#### GET /api/zones/[id]/equipment
- **Purpose:** Get all equipment in a zone with issue counts (admin view)
- **Returns:** Equipment list with safety issue counts and maintenance status

#### GET /api/equipment/[id]/full-history
- **Purpose:** Get complete equipment history for drill-down view
- **Returns:**
  ```json
  {
    "equipment": { ... },
    "safetyIssues": [...],
    "maintenanceLogs": [...],
    "maintenanceTasks": [...],
    "usageHistory": [...],
    "timeline": [
      { "date": "...", "type": "purchase|maintenance|issue|condition_change", "details": "..." }
    ]
  }
  ```

#### POST /api/safety-issues/[id]/photos
- **Purpose:** Upload photos for safety issue
- **Body:** FormData with image files
- **Returns:** Updated safety issue with photo URLs

### Maintenance Task Management

#### POST /api/public/maintenance-tasks
- **Purpose:** Submit maintenance task request (no auth required)
- **Body:** Maintenance task data
- **Returns:** Created maintenance task

#### GET /api/maintenance-tasks
- **Purpose:** List all maintenance tasks (admin only)
- **Query Params:**
  - `status` (optional): Filter by status
  - `taskType` (optional): Filter by type
  - `equipmentId` (optional): Filter by equipment
  - `dueDateBefore` (optional): Filter by due date
- **Returns:** Array of maintenance tasks

#### PUT /api/maintenance-tasks/[id]
- **Purpose:** Update maintenance task
- **Body:** Updated task data
- **Returns:** Updated maintenance task

#### POST /api/maintenance-tasks/[id]/complete
- **Purpose:** Mark task as completed
- **Body:** `{ completedBy: string, notes: string, cost: string }`
- **Returns:** Updated maintenance task

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

##### ZoneDashboard Component (NEW PRIMARY VIEW)
```typescript
interface ZoneDashboardProps {
  zones: Zone[];
  filters?: {
    hasActiveIssues?: boolean;
    hasMaintenanceDue?: boolean;
  };
}
// Displays zone cards with equipment counts, issue counts, QR codes
```

##### ZoneCard Component
```typescript
interface ZoneCardProps {
  zone: Zone;
  equipmentCount: number;
  activeIssuesCount: number;
  maintenanceTasksCount: number;
  onViewEquipment: (zoneId: string) => void;
  onPrintQR: (zoneId: string) => void;
  onReportIssue: (zoneId: string) => void;
}
```

##### QRCodeGenerator Component
```typescript
interface QRCodeGeneratorProps {
  zoneId: string;
  zoneName: string;
  size?: number;
  format?: 'svg' | 'png';
  showPrintButton?: boolean;
}
```

##### PublicZoneEquipment Component (Mobile-Optimized, No Auth)
```typescript
interface PublicZoneEquipmentProps {
  zonePublicId: string;
  // Displays zone status, active issues list, equipment list, and report buttons
}
```

##### PublicZoneIssueList Component (Mobile-Optimized)
```typescript
interface PublicZoneIssueListProps {
  issues: SafetyIssue[];
  zonePublicId: string;
  onViewIssue: (issueId: string) => void;
  // Shows all issues for zone, sorted with open issues first
}
```

##### PublicIssueCard Component
```typescript
interface PublicIssueCardProps {
  issue: SafetyIssue;
  expandable?: boolean;
  // Displays issue with type badge, equipment name, status, photos
}
```

##### SafetyIssueForm Component (Mobile-Optimized)
```typescript
interface SafetyIssueFormProps {
  zonePublicId?: string;
  equipmentId?: string;
  equipmentList?: Equipment[];
  onSubmit: (data: SafetyIssueFormData) => Promise<void>;
  onCancel: () => void;
}
```

##### SafetyIssueList Component
```typescript
interface SafetyIssueListProps {
  issues: SafetyIssue[];
  onResolve: (id: string) => void;
  onUpdate: (id: string, data: Partial<SafetyIssue>) => void;
}
```

##### SafetyIssueCard Component
```typescript
interface SafetyIssueCardProps {
  issue: SafetyIssue;
  onResolve: (id: string) => void;
  onViewDetails: (id: string) => void;
  // Shows badge, photos, status, priority
}
```

##### MaintenanceTaskForm Component
```typescript
interface MaintenanceTaskFormProps {
  zonePublicId?: string;
  equipmentId?: string;
  equipmentList?: Equipment[];
  task?: MaintenanceTask;
  onSubmit: (data: MaintenanceTaskFormData) => Promise<void>;
  onCancel: () => void;
}
```

##### MaintenanceTaskList Component
```typescript
interface MaintenanceTaskListProps {
  tasks: MaintenanceTask[];
  onComplete: (id: string) => void;
  onUpdate: (id: string, data: Partial<MaintenanceTask>) => void;
}
```

##### ZoneDetailPage Component
```typescript
interface ZoneDetailPageProps {
  zoneId: string;
  // Tabbed interface: Safety Issues, Equipment, Maintenance Tasks, Analytics
}
```

##### EquipmentDetailPage Component
```typescript
interface EquipmentDetailPageProps {
  equipmentId: string;
  // Shows full equipment details, safety issues, maintenance history, usage
}
```

##### EquipmentTimeline Component
```typescript
interface EquipmentTimelineProps {
  equipmentId: string;
  events: TimelineEvent[];
  // Visual timeline of all equipment events (purchase, maintenance, issues, etc.)
}
```

##### IssueResolutionModal Component
```typescript
interface IssueResolutionModalProps {
  issue: SafetyIssue;
  equipment: Equipment;
  onResolve: (resolutionData: ResolutionFormData) => Promise<void>;
  onMarkInProgress: (data: InProgressData) => Promise<void>;
  onClose: () => void;
  // Multi-step resolution workflow with repair/replace options
}
```

##### EquipmentReplacementModal Component
```typescript
interface EquipmentReplacementModalProps {
  originalEquipment: Equipment;
  safetyIssueId?: string;
  onComplete: (replacementData: ReplacementData) => Promise<void>;
  onCancel: () => void;
  // Two-path workflow: link existing or create new replacement
}
```

##### PhotoUpload Component
```typescript
interface PhotoUploadProps {
  maxPhotos?: number; // default: 5
  onPhotosChange: (photos: File[]) => void;
  existingPhotos?: string[]; // URLs of existing photos
}
```

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
2. ✅ Add Equipment, MaintenanceLog, EquipmentUsage, SafetyIssue, MaintenanceTask models
3. ✅ Add relations to existing Zone, Class, Coach models
4. ✅ Run migration: `npx prisma migrate dev --name add_equipment_tables`
5. ✅ Verify existing data is intact
6. ⏳ Add publicId to Zone model (new migration)
7. ⏳ Generate publicIds for existing zones

### Phase 2A: Core Equipment API (Backend Foundation)
1. Create `/api/equipment/route.ts` (GET, POST)
2. Create `/api/equipment/[id]/route.ts` (GET, PUT, DELETE)
3. Create `/api/equipment/[id]/maintenance/route.ts`
4. Create `/api/equipment/analytics/overview/route.ts`

### Phase 2B: Zone QR Code System (Priority)
1. Create `/api/zones/[id]/qr-code/route.ts` (Generate QR code)
2. Create `/api/zones/batch-qr-codes/route.ts` (Bulk QR generation)
3. Create `/api/zones/[id]/printable-qr/route.ts` (Printable page)
4. Update Zone model to include publicId and qrCodeLastPrinted
5. Create utility function to generate unique publicIds

### Phase 2C: Public Safety Reporting APIs (No Auth Required)
1. Create `/api/public/zone-equipment/[publicId]/route.ts` (Get zone equipment)
2. Create `/api/public/safety-issues/route.ts` (Submit safety issue)
3. Create `/api/public/maintenance-tasks/route.ts` (Submit maintenance request)
4. Create photo upload handler for public submissions

### Phase 2D: Admin Safety & Maintenance APIs (Auth Required)
1. Create `/api/safety-issues/route.ts` (GET list)
2. Create `/api/safety-issues/[id]/route.ts` (GET, PUT)
3. Create `/api/safety-issues/[id]/resolve/route.ts` (POST)
4. Create `/api/safety-issues/[id]/photos/route.ts` (POST)
5. Create `/api/maintenance-tasks/route.ts` (GET list)
6. Create `/api/maintenance-tasks/[id]/route.ts` (GET, PUT)
7. Create `/api/maintenance-tasks/[id]/complete/route.ts` (POST)

### Phase 3A: Public Pages (Mobile-First, No Auth)
1. Create `/zone-equipment/[publicId]/page.tsx` (QR landing page with issues list)
2. Create public components:
   - `PublicZoneIssueList.tsx` (shows all zone issues)
   - `PublicIssueCard.tsx` (expandable issue display)
   - `PublicZoneEquipment.tsx` (zone overview with stats)
3. Create public safety issue reporting form (mobile-optimized)
4. Create public maintenance request form (mobile-optimized)
5. Create photo upload component with camera integration
6. Test on mobile devices (QR scan workflow)

### Phase 3B: Admin Dashboard - Zone View (Primary)
1. Create base components:
   - `ZoneDashboard.tsx` (main zone grid view)
   - `ZoneCard.tsx` (individual zone card with stats)
   - `QRCodeGenerator.tsx` (QR code display/print)
   - `ZoneStatusBadge.tsx` (color-coded status)
2. Create dashboard pages:
   - `/dashboard/equipment/page.tsx` (Zone-based landing page)
   - `/dashboard/equipment/zones/[id]/page.tsx` (Zone detail with tabs)
3. Create QR code print functionality
4. Update DashboardLayout navigation

### Phase 3C: Admin Dashboard - Equipment Drill-Down
1. Create components:
   - `EquipmentDetailPage.tsx` (Level 3 drill-down)
   - `EquipmentTimeline.tsx` (visual lifecycle timeline)
   - `EquipmentHeader.tsx` (details and actions)
2. Create pages:
   - `/dashboard/equipment/items/[id]/page.tsx` (Equipment detail)
3. Integrate safety issues, maintenance logs, usage history sections

### Phase 3D: Admin Dashboard - Safety & Maintenance
1. Create components:
   - `SafetyIssueList.tsx` (filterable list)
   - `SafetyIssueCard.tsx` (issue display)
   - `SafetyIssueDetails.tsx` (full issue view)
   - `IssueResolutionModal.tsx` (resolution workflow)
   - `MaintenanceTaskList.tsx`
   - `MaintenanceTaskCard.tsx`
   - `PhotoGallery.tsx` (before/after photos)
2. Create dashboard pages:
   - `/dashboard/equipment/safety-issues/page.tsx` (all issues)
   - `/dashboard/equipment/maintenance-tasks/page.tsx` (all tasks)
3. Create resolution/completion workflows

### Phase 3E: Admin Dashboard - Equipment Replacement
1. Create components:
   - `EquipmentReplacementModal.tsx` (replacement workflow)
   - `EquipmentSearchSelector.tsx` (find existing equipment)
   - `EquipmentForm.tsx` (create new equipment)
2. Implement replacement logic:
   - Mark original as inactive
   - Create/link replacement
   - Transfer zone assignment
   - Update maintenance logs
   - Resolve related safety issue

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

## Current Scope (Implemented in MVP)

1. ✅ QR code scanning for zone equipment viewing and reporting
2. ✅ Photo uploads for safety issues and maintenance tasks
3. ✅ Mobile-optimized reporting interface
4. ✅ Safety issue categorization and tracking
5. ✅ Maintenance task management

## Future Enhancements (Post-MVP)

1. Equipment reservation system
2. Automated maintenance scheduling (recurring tasks)
3. Equipment lifecycle predictions (AI-based)
4. Cost per usage calculations
5. Native mobile app (iOS/Android)
6. Digital signatures for sign-off
7. Integration with external equipment management systems
8. Barcode scanning (in addition to QR)
9. NFC tag support for equipment
10. Warranty tracking and alerts
11. Equipment checkout/checkin workflow
12. Real-time notifications for critical issues
13. Export reports to PDF (like fire safety reports)
14. Equipment history timeline view
15. Maintenance cost forecasting

---

## Notes & Considerations

- **DO NOT WIPE DATABASE**: All migrations must be additive only
- Existing data in Zone, Class, and Coach tables must remain intact
- Equipment system should be optional - existing functionality must work without it
- Consider soft deletes for audit trail
- Maintenance logs should never be deleted (cascade soft delete only)
- Usage history provides valuable analytics - retain indefinitely

### QR Code System Notes
- **Public URLs**: Zone equipment URLs are public (no auth) to allow easy staff reporting
- **Security**: Use non-guessable publicIds (cuid) for zones to prevent URL enumeration
- **Rate Limiting**: Implement rate limiting on public endpoints to prevent abuse
- **Data Sanitization**: Public APIs should not expose sensitive club data

### Photo Storage Notes
- **Storage Location**: Store photos in `/public/equipment-photos/[clubId]/[issueOrTaskId]/`
- **File Naming**: Use timestamp + random string for uniqueness
- **File Size Limits**: Max 5MB per photo, max 5 photos per submission
- **Formats**: Accept JPG, PNG, HEIC, WebP
- **Compression**: Auto-compress on upload to reduce storage
- **Thumbnails**: Generate thumbnails for gallery view

### Mobile Optimization Notes
- Public forms must be mobile-first (most users will scan QR on phone)
- Large touch targets for buttons (min 44px)
- Camera integration for photo uploads
- Offline support consideration (future: save drafts locally)
- Progressive Web App (PWA) potential for installation

### Issue Type Mapping (from Fire Safety Reports)
- **Critical Defect** → Priority: CRITICAL, Status: OPEN, requires immediate attention
- **Non-critical Defect** → Priority: HIGH, can be scheduled
- **Non-conformance** → Priority: MEDIUM, informational/corrective
- **Recommendation** → Priority: LOW, improvement suggestion
- **Informational Note** → Priority: LOW, general comment

### Zone Status Color Scheme
- 🟢 **Green (NO DEFECTS DETECTED)** - #10B981 (Tailwind green-500)
  - All clear, no issues or overdue maintenance
- 🟡 **Amber/Yellow (NON-CRITICAL ISSUES)** - #F59E0B (Tailwind amber-500)
  - Minor issues or upcoming maintenance
- 🟠 **Orange (REQUIRES ATTENTION)** - #F97316 (Tailwind orange-500)
  - Overdue maintenance or non-conformances
- 🔴 **Red (CRITICAL DEFECTS)** - #EF4444 (Tailwind red-500)
  - Critical safety issues requiring immediate action

**Badge Display:**
- Use Tailwind classes: `bg-green-100 text-green-800`, `bg-amber-100 text-amber-800`, etc.
- Include icon: CheckCircleIcon (green), ExclamationTriangleIcon (amber/orange), XCircleIcon (red)
- Show status text in uppercase for emphasis

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


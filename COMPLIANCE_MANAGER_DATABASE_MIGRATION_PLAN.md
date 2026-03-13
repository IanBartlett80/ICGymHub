# 🗄️ Compliance Manager Database Migration Plan

**Project:** ICGymHub Compliance Manager Enhancement  
**Date:** March 13, 2026  
**Status:** Ready for Implementation  
**Database:** PostgreSQL (DigitalOcean Managed)  
**ORM:** Prisma 5.22.0  

---

## ⚠️ CRITICAL SAFETY NOTICE

**This is a PRODUCTION DATABASE with LIVE DATA.**

All migrations must follow these safety protocols:
- ✅ **Additive only** - No data loss
- ✅ **Backward compatible** - Maintain existing functionality during rollout
- ✅ **Reversible** - Every migration has a rollback plan
- ✅ **Tested** - Verify on dev/staging before production
- ✅ **Backed up** - Full backup before each migration
- ✅ **Zero downtime** - Deploy during low-traffic windows

---

## 📋 Migration Overview

### Phase 0: Critical Bug Fixes (COMPLETED)
✅ **No schema changes required** - API code fixes only

### Phase 1: Core Enhancements (Weeks 3-6)
- Add status tracking fields
- Add flag/alert system fields
- Add assignment & watcher tables
- Add soft delete fields

### Phase 2: Advanced Features (Weeks 7-12)
- Add file management table
- Add workflow & approval tables
- Add category hierarchy
- Add recurring instance management

### Phase 3: Integration (Weeks 13-14)
- Add cross-module relationship fields
- Add integration tracking

### Phase 4: Intelligence (Weeks 15-18)
- Add analytics fields
- Add AI/ML fields

---

## 🔧 SCHEMA CHANGES BY PHASE

---

## PHASE 1: CORE ENHANCEMENTS

### Migration 1.1: Enhanced Status & Priority Fields

**Migration Name:** `add_status_priority_fields`  
**Risk:** 🟢 Low - Additive only  
**Estimated Duration:** 2 minutes

```prisma
model ComplianceItem {
  // ... existing fields ...
  
  // Enhanced status (keeping current 'status' field for backward compatibility)
  priority          String   @default("MEDIUM")  // CRITICAL, HIGH, MEDIUM, LOW
  isFlagged         Boolean  @default(false)
  flagType          String?   // CRITICAL, HIGH_PRIORITY, NEEDS_REVIEW, INFORMATION, BLOCKED
  flagReason        String?   @db.Text
  flaggedAt         DateTime?
  flaggedById       String?
  flaggedBy         User?    @relation("ComplianceItemFlaggedBy", fields: [flaggedById], references: [id], onDelete: SetNull)
  flagResolvedAt    DateTime?
  flagResolvedById  String?
  flagResolvedBy    User?    @relation("ComplianceItemFlagResolvedBy", fields: [flagResolvedById], references: [id], onDelete: SetNull)
  
  // Soft delete
  isDeleted         Boolean  @default(false)
  deletedAt         DateTime?
  deletedById       String?
  deletedBy         User?    @relation("ComplianceItemDeletedBy", fields: [deletedById], references: [id], onDelete: SetNull)
  
  // Audit tracking
  lastStatusChange  DateTime?
  verifiedAt        DateTime?
  verifiedById      String?
  verifiedBy        User?    @relation("ComplianceItemVerifiedBy", fields: [verifiedById], references: [id], onDelete: SetNull)
  
  @@index([priority])
  @@index([isFlagged])
  @@index([isDeleted])
}
```

**SQL Migration (generated automatically by Prisma):**
```sql
-- Add new columns with safe defaults
ALTER TABLE "ComplianceItem" 
  ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN "isFlagged" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "flagType" TEXT,
  ADD COLUMN "flagReason" TEXT,
  ADD COLUMN "flaggedAt" TIMESTAMP(3),
  ADD COLUMN "flaggedById" TEXT,
  ADD COLUMN "flagResolvedAt" TIMESTAMP(3),
  ADD COLUMN "flagResolvedById" TEXT,
  ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "deletedById" TEXT,
  ADD COLUMN "lastStatusChange" TIMESTAMP(3),
  ADD COLUMN "verifiedAt" TIMESTAMP(3),
  ADD COLUMN "verifiedById" TEXT;

-- Add indexes
CREATE INDEX "ComplianceItem_priority_idx" ON "ComplianceItem"("priority");
CREATE INDEX "ComplianceItem_isFlagged_idx" ON "ComplianceItem"("isFlagged");
CREATE INDEX "ComplianceItem_isDeleted_idx" ON "ComplianceItem"("isDeleted");

-- Add foreign key constraints
ALTER TABLE "ComplianceItem" 
  ADD CONSTRAINT "ComplianceItem_flaggedById_fkey" 
  FOREIGN KEY ("flaggedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ComplianceItem" 
  ADD CONSTRAINT "ComplianceItem_flagResolvedById_fkey" 
  FOREIGN KEY ("flagResolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ComplianceItem" 
  ADD CONSTRAINT "ComplianceItem_deletedById_fkey" 
  FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ComplianceItem" 
  ADD CONSTRAINT "ComplianceItem_verifiedById_fkey" 
  FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

**Rollback Plan:**
```sql
-- Remove foreign key constraints
ALTER TABLE "ComplianceItem" DROP CONSTRAINT IF EXISTS "ComplianceItem_flaggedById_fkey";
ALTER TABLE "ComplianceItem" DROP CONSTRAINT IF EXISTS "ComplianceItem_flagResolvedById_fkey";
ALTER TABLE "ComplianceItem" DROP CONSTRAINT IF EXISTS "ComplianceItem_deletedById_fkey";
ALTER TABLE "ComplianceItem" DROP CONSTRAINT IF EXISTS "ComplianceItem_verifiedById_fkey";

-- Remove indexes
DROP INDEX IF EXISTS "ComplianceItem_priority_idx";
DROP INDEX IF EXISTS "ComplianceItem_isFlagged_idx";
DROP INDEX IF EXISTS "ComplianceItem_isDeleted_idx";

-- Remove columns
ALTER TABLE "ComplianceItem" 
  DROP COLUMN "priority",
  DROP COLUMN "isFlagged",
  DROP COLUMN "flagType",
  DROP COLUMN "flagReason",
  DROP COLUMN "flaggedAt",
  DROP COLUMN "flaggedById",
  DROP COLUMN "flagResolvedAt",
  DROP COLUMN "flagResolvedById",
  DROP COLUMN "isDeleted",
  DROP COLUMN "deletedAt",
  DROP COLUMN "deletedById",
  DROP COLUMN "lastStatusChange",
  DROP COLUMN "verifiedAt",
  DROP COLUMN "verifiedById";
```

**Testing Checklist:**
- [ ] Backup production database
- [ ] Run migration on dev environment
- [ ] Verify existing items still load correctly
- [ ] Verify new items can be created
- [ ] Check API endpoints return expected data
- [ ] Run on staging
- [ ] Monitor for 24 hours
- [ ] Deploy to production during low-traffic window

---

### Migration 1.2: Assignment & Watcher System

**Migration Name:** `add_assignment_watcher_tables`  
**Risk:** 🟢 Low - New tables only  
**Estimated Duration:** 3 minutes

```prisma
model ComplianceAssignment {
  id           String   @id @default(cuid())
  itemId       String
  userId       String
  role         String   // PRIMARY, SECONDARY, REVIEWER
  assignedAt   DateTime @default(now())
  assignedById String
  
  item         ComplianceItem @relation("ComplianceItemAssignments", fields: [itemId], references: [id], onDelete: Cascade)
  user         User           @relation("UserComplianceAssignments", fields: [userId], references: [id], onDelete: Cascade)
  assignedBy   User           @relation("UserAssignedComplianceTasks", fields: [assignedById], references: [id], onDelete: Cascade)
  
  @@unique([itemId, userId, role])
  @@index([itemId])
  @@index([userId])
  @@index([assignedById])
}

model ComplianceWatcher {
  id        String   @id @default(cuid())
  itemId    String
  userId    String
  watchedAt DateTime @default(now())
  
  item      ComplianceItem @relation("ComplianceItemWatchers", fields: [itemId], references: [id], onDelete: Cascade)
  user      User           @relation("UserWatchedComplianceItems", fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([itemId, userId])
  @@index([itemId])
  @@index([userId])
}

// Update ComplianceItem model
model ComplianceItem {
  // ... existing fields ...
  
  assignments    ComplianceAssignment[] @relation("ComplianceItemAssignments")
  watchers       ComplianceWatcher[]    @relation("ComplianceItemWatchers")
}
```

**SQL Migration:**
```sql
-- Create ComplianceAssignment table
CREATE TABLE "ComplianceAssignment" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedById" TEXT NOT NULL,

    CONSTRAINT "ComplianceAssignment_pkey" PRIMARY KEY ("id")
);

-- Create ComplianceWatcher table
CREATE TABLE "ComplianceWatcher" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "watchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceWatcher_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints
CREATE UNIQUE INDEX "ComplianceAssignment_itemId_userId_role_key" 
  ON "ComplianceAssignment"("itemId", "userId", "role");
CREATE UNIQUE INDEX "ComplianceWatcher_itemId_userId_key" 
  ON "ComplianceWatcher"("itemId", "userId");

-- Create indexes
CREATE INDEX "ComplianceAssignment_itemId_idx" ON "ComplianceAssignment"("itemId");
CREATE INDEX "ComplianceAssignment_userId_idx" ON "ComplianceAssignment"("userId");
CREATE INDEX "ComplianceAssignment_assignedById_idx" ON "ComplianceAssignment"("assignedById");
CREATE INDEX "ComplianceWatcher_itemId_idx" ON "ComplianceWatcher"("itemId");
CREATE INDEX "ComplianceWatcher_userId_idx" ON "ComplianceWatcher"("userId");

-- Add foreign keys
ALTER TABLE "ComplianceAssignment" 
  ADD CONSTRAINT "ComplianceAssignment_itemId_fkey" 
  FOREIGN KEY ("itemId") REFERENCES "ComplianceItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ComplianceAssignment" 
  ADD CONSTRAINT "ComplianceAssignment_userId_fkey" 
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ComplianceAssignment" 
  ADD CONSTRAINT "ComplianceAssignment_assignedById_fkey" 
  FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ComplianceWatcher" 
  ADD CONSTRAINT "ComplianceWatcher_itemId_fkey" 
  FOREIGN KEY ("itemId") REFERENCES "ComplianceItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ComplianceWatcher" 
  ADD CONSTRAINT "ComplianceWatcher_userId_fkey" 
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

**Rollback Plan:**
```sql
DROP TABLE IF EXISTS "ComplianceWatcher";
DROP TABLE IF EXISTS "ComplianceAssignment";
```

---

### Migration 1.3: Status Change History

**Migration Name:** `add_status_history_table`  
**Risk:** 🟢 Low - New table, audit purposes  
**Estimated Duration:** 2 minutes

```prisma
model ComplianceStatusChange {
  id         String   @id @default(cuid())
  itemId     String
  fromStatus String
  toStatus   String
  changedAt  DateTime @default(now())
  changedById String
  reason     String?  @db.Text
  
  item       ComplianceItem @relation("ComplianceStatusHistory", fields: [itemId], references: [id], onDelete: Cascade)
  changedBy  User           @relation("StatusChanges", fields: [changedById], references: [id], onDelete: Cascade)
  
  @@index([itemId])
  @@index([changedById])
  @@index([changedAt])
}

// Update ComplianceItem
model ComplianceItem {
  // ... existing fields ...
  statusHistory ComplianceStatusChange[] @relation("ComplianceStatusHistory")
}
```

---

## PHASE 2: ADVANCED FEATURES

### Migration 2.1: File Management System

**Migration Name:** `add_compliance_file_table`  
**Risk:** 🟢 Low - Replaces JSON field with proper table  
**Estimated Duration:** 5 minutes (includes data migration)

```prisma
model ComplianceFile {
  id           String   @id @default(cuid())
  itemId       String
  name         String
  url          String
  size         Int?
  mimeType     String?
  uploadedAt   DateTime @default(now())
  uploadedById String
  version      Int      @default(1)
  parentFileId String?  // For versioning
  description  String?
  
  item         ComplianceItem  @relation("ComplianceFiles", fields: [itemId], references: [id], onDelete: Cascade)
  uploadedBy   User            @relation("UploadedComplianceFiles", fields: [uploadedById], references: [id], onDelete: Cascade)
  parent       ComplianceFile? @relation("FileVersions", fields: [parentFileId], references: [id], onDelete: SetNull)
  versions     ComplianceFile[] @relation("FileVersions")
  
  @@index([itemId])
  @@index([uploadedById])
  @@index([parentFileId])
}

// Update ComplianceItem
model ComplianceItem {
  // ... existing fields ...
  // Keep fileLinks for backward compatibility during transition
  files        ComplianceFile[] @relation("ComplianceFiles")
}
```

**Data Migration Script:**
```typescript
// scripts/migrate-compliance-files.ts
import { prisma } from '../src/lib/prisma'

async function migrateFileLinks() {
  const items = await prisma.complianceItem.findMany({
    where: {
      fileLinks: {
        not: null
      }
    }
  })

  for (const item of items) {
    if (!item.fileLinks) continue
    
    try {
      const links = JSON.parse(item.fileLinks)
      if (!Array.isArray(links)) continue
      
      for (const link of links) {
        await prisma.complianceFile.create({
          data: {
            itemId: item.id,
            name: link.name || link.url,
            url: link.url,
            uploadedById: item.createdById || item.ownerId, // Fallback to creator
            version: 1
          }
        })
      }
      
      console.log(`Migrated ${links.length} files for item ${item.id}`)
    } catch (error) {
      console.error(`Failed to migrate files for item ${item.id}:`, error)
    }
  }
  
  console.log(`Migration complete. Migrated files for ${items.length} items.`)
}

migrateFileLinks()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

---

### Migration 2.2: Workflow & Approval System

**Migration Name:** `add_workflow_approval_tables`  
**Risk:** 🟡 Medium - Complex relationships  
**Estimated Duration:** 5 minutes

```prisma
model ComplianceWorkflow {
  id          String   @id @default(cuid())
  clubId      String
  name        String
  description String?  @db.Text
  steps       String   @db.Text  // JSON array of workflow steps
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdById String
  
  club        Club               @relation("ClubComplianceWorkflows", fields: [clubId], references: [id], onDelete: Cascade)
  createdBy   User               @relation("CreatedWorkflows", fields: [createdById], references: [id], onDelete: Cascade)
  items       ComplianceItem[]   @relation("ItemWorkflows")
  categories  ComplianceCategory[] @relation("CategoryWorkflows")
  
  @@index([clubId])
  @@index([isActive])
}

model ComplianceApproval {
  id          String   @id @default(cuid())
  itemId      String
  step        Int
  approverId  String
  status      String   // PENDING, APPROVED, REJECTED, DELEGATED
  approvedAt  DateTime?
  comments    String?  @db.Text
  createdAt   DateTime @default(now())
  
  item        ComplianceItem @relation("ItemApprovals", fields: [itemId], references: [id], onDelete: Cascade)
  approver    User           @relation("ApprovalTasks", fields: [approverId], references: [id], onDelete: Cascade)
  
  @@index([itemId, step])
  @@index([approverId])
  @@index([status])
}

// Update ComplianceItem
model ComplianceItem {
  // ... existing fields ...
  workflowId    String?
  currentStep   Int?
  
  workflow      ComplianceWorkflow? @relation("ItemWorkflows", fields: [workflowId], references: [id], onDelete: SetNull)
  approvals     ComplianceApproval[] @relation("ItemApprovals")
}

// Update ComplianceCategory
model ComplianceCategory {
  // ... existing fields ...
  defaultWorkflowId String?
  defaultWorkflow   ComplianceWorkflow? @relation("CategoryWorkflows", fields: [defaultWorkflowId], references: [id], onDelete: SetNull)
}
```

---

### Migration 2.3: Category Hierarchy & Templates

**Migration Name:** `add_category_enhancements`  
**Risk:** 🟢 Low - Additive fields  
**Estimated Duration:** 3 minutes

```prisma
model ComplianceCategory {
  // ... existing fields ...
  
  // Hierarchy
  parentId         String?
  parent           ComplianceCategory?  @relation("CategoryHierarchy", fields: [parentId], references: [id], onDelete: SetNull)
  children         ComplianceCategory[] @relation("CategoryHierarchy")
  sortOrder        Int                  @default(0)
  
  // Visual & UX
  color            String?   // Hex color code
  icon             String?   // Icon name or emoji
  
  // Category settings
  defaultPriority  String    @default("MEDIUM")
  requiredFields   String?   @db.Text  // JSON array of required field names
  template         String?   @db.Text  // Markdown template for description
  
  // Risk management
  riskLevel        String    @default("MEDIUM")  // CRITICAL, HIGH, MEDIUM, LOW
  complianceTarget Float     @default(95.0)       // Target compliance percentage
  
  // Enhanced metadata
  isActive         Boolean   @default(true)
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  
  @@index([clubId, parentId])
  @@index([isActive])
  @@index([sortOrder])
}
```

---

### Migration 2.4: Enhanced Recurring Item System

**Migration Name:** `add_recurring_instance_management`  
**Risk:** 🟡 Medium - Changes recurring logic  
**Estimated Duration:** 5 minutes

```prisma
model ComplianceItem {
  // ... existing fields ...
  
  // Enhanced recurring fields
  isRecurring         Boolean  @default(false)
  isTemplate          Boolean  @default(false)  // True if this is the parent template
  instanceNumber      Int?                       // Which occurrence (1st, 2nd, 3rd)
  parentItemId        String?
  recurrenceInterval  Int?                       // Every N days/weeks/months
  recurrenceEndDate   DateTime?                  // Stop recurring after this date
  recurrenceCount     Int?                       // Or after N occurrences
  nextInstanceDate    DateTime?                  // When to generate next instance
  
  // Relationships
  parent              ComplianceItem?  @relation("RecurringInstances", fields: [parentItemId], references: [id], onDelete: Cascade)
  instances           ComplianceItem[] @relation("RecurringInstances")
  
  @@index([parentItemId])
  @@index([isTemplate])
  @@index([nextInstanceDate])
}
```

**Data Migration for Existing Recurring Items:**
```typescript
// Convert existing recurring items to template-based system
async function convertRecurringItems() {
  const recurringItems = await prisma.complianceItem.findMany({
    where: {
      recurringSchedule: {
        not: 'NONE'
      }
    }
  })

  for (const item of recurringItems) {
    // Mark as both recurring and template
    await prisma.complianceItem.update({
      where: { id: item.id },
      data: {
        isRecurring: true,
        isTemplate: true,
        instanceNumber: null  // Templates don't have instance numbers
      }
    })
  }
  
  console.log(`Converted ${recurringItems.length} items to new recurring system`)
}
```

---

## PHASE 3: INTEGRATION FIELDS

### Migration 3.1: Cross-Module Relationships

**Migration Name:** `add_integration_fields`  
**Risk:** 🟢 Low - Optional foreign keys  
**Estimated Duration:** 3 minutes

```prisma
model ComplianceItem {
  // ... existing fields ...
  
  // Equipment integration
  equipmentId       String?
  equipment         Equipment? @relation("EquipmentCompliance", fields: [equipmentId], references: [id], onDelete: SetNull)
  
  // Injury/Incident integration
  injurySubmissionId String?
  injurySubmission   InjurySubmission? @relation("IncidentCompliance", fields: [injurySubmissionId], references: [id], onDelete: SetNull)
  
  // Staff member integration (for certifications)
  staffMemberId     String?
  
  // Zone integration (for zone-specific compliance)
  zoneId            String?
  zone              Zone? @relation("ZoneCompliance", fields: [zoneId], references: [id], onDelete: SetNull)
  
  @@index([equipmentId])
  @@index([injurySubmissionId])
  @@index([staffMemberId])
  @@index([zoneId])
}
```

---

## PHASE 4: ANALYTICS & AI FIELDS

### Migration 4.1: Analytics & ML Fields

**Migration Name:** `add_analytics_ml_fields`  
**Risk:** 🟢 Low - Analytics only  
**Estimated Duration:** 2 minutes

```prisma
model ComplianceItem {
  // ... existing fields ...
  
  // Analytics
  estimatedEffort   Int?      // Estimated hours to complete
  actualEffort      Int?      // Actual hours spent
  completionCount   Int       @default(0)  // How many times completed (for recurring)
  avgCompletionTime Int?      // Average days to complete
  
  // ML/AI fields
  riskScore         Float?    @default(0)    // 0-100, ML-based risk of non-completion
  predictedDueDate  DateTime?                 // AI-predicted actual completion date
  autoGenerated     Boolean   @default(false) // True if auto-created by system
  generationSource  String?                   // 'EQUIPMENT', 'INJURY', 'STAFF_CERT', etc.
  
  // User engagement tracking
  viewCount         Int       @default(0)
  lastViewedAt      DateTime?
  lastViewedById    String?
  
  @@index([riskScore])
  @@index([autoGenerated])
}
```

---

## 🔄 MIGRATION EXECUTION PLAN

### Pre-Migration Checklist
- [ ] Full database backup to S3/DigitalOcean Spaces
- [ ] Test migration on development environment
- [ ] Test migration on staging environment
- [ ] Verify all existing features work with new schema
- [ ] Document rollback procedures
- [ ] Schedule during low-traffic window (2-4 AM local time)
- [ ] Notify team of maintenance window

### Migration Schedule

**Week 3-4: Phase 1 Migrations**
- Day 1: Migration 1.1 (Status & Priority)
- Day 3: Migration 1.2 (Assignments & Watchers  )
- Day 5: Migration 1.3 (Status History)

**Week 7-8: Phase 2 Migrations**
- Day 1: Migration 2.1 (File Management)
- Day 3: Migration 2.2 (Workflows)
- Day 5: Migration 2.3 (Category Enhancements)

**Week 9: Phase 2 Continued**
- Day 1: Migration 2.4 (Recurring Instances)

**Week 13: Phase 3 Migrations**
- Day 1: Migration 3.1 (Integration Fields)

**Week 15: Phase 4 Migrations**
- Day 1: Migration 4.1 (Analytics & ML)

### Post-Migration Checklist
- [ ] Verify migration completed successfully
- [ ] Run data integrity checks
- [ ] Test all API endpoints
- [ ] Test frontend functionality
- [ ] Monitor error logs for 24 hours
- [ ] Confirm no performance degradation
- [ ] Update API documentation

---

## 🔧 PRISMA MIGRATION COMMANDS

### Create Migration
```bash
# Generate migration file
npx prisma migrate dev --name add_status_priority_fields --create-only

# Review generated SQL
cat prisma/migrations/XXXXXX_add_status_priority_fields/migration.sql

# Apply migration to dev
npx prisma migrate dev

# Test thoroughly...

# Deploy to production
npx prisma migrate deploy
```

### Rollback Emergency Procedure
```bash
# If migration fails, immediate rollback:

# 1. Mark migration as rolled back
psql $DATABASE_URL -c "UPDATE _prisma_migrations SET rolled_back_at = NOW() WHERE migration_name = 'XXXXXX_add_status_priority_fields';"

# 2. Run rollback SQL script
psql $DATABASE_URL -f rollback_scripts/rollback_add_status_priority_fields.sql

# 3. Restore from backup if needed
pg_restore -h HOST -U USER -d DATABASE latest_backup.sql

# 4. Verify application works
curl https://icgymhub.com/api/health
```

---

## 📊 ESTIMATED DATABASE SIZE IMPACT

### Current Size (estimated)
- ComplianceItem: ~1000 rows × 2KB = 2MB
- ComplianceCategory: ~20 rows × 1KB = 20KB
- **Total**: ~2-3 MB

### After All Migrations (estimated)
- ComplianceItem: ~1000 rows × 4KB = 4MB (doubled with new fields)
- ComplianceCategory: ~50 rows × 2KB = 100KB (with hierarchy)
- ComplianceAssignment: ~2000 rows × 500 bytes = 1MB
- ComplianceWatcher: ~500 rows × 500 bytes = 250KB
- ComplianceFile: ~5000 rows × 1KB = 5MB
- ComplianceStatusChange: ~10000 rows × 500 bytes = 5MB
- ComplianceWorkflow: ~10 rows × 2KB = 20KB
- ComplianceApproval: ~1000 rows × 1KB = 1MB
- **Total**: ~16-20 MB

**Impact:** Minimal - well within database limits

---

## 🔒 BACKWARD COMPATIBILITY STRATEGY

### During Transition Period

1. **Keep existing fields**: Don't remove `fileLinks`, `status`, etc. immediately
2. **Dual writes**: Write to both old and new fields/tables
3. **Gradual migration**: Migrate data in batches
4. **Feature flags**: Enable new features gradually
5. **API versioning**: Support both old and new API contracts

### Example: File Links Transition
```typescript
// API returns both formats during transition
{
  item: {
    fileLinks: [...],  // Old format (JSON string)
    files: [...],      // New format (relation)
  }
}

// Frontend uses new format if available, falls back to old
const files = item.files?.length > 0 ? item.files : parseFileLinks(item.fileLinks)
```

---

## ✅ SUCCESS METRICS

### Technical Metrics
- Zero data loss
- <5% query performance degradation
- All existing features functional
- All tests passing

### User Metrics
- No user-visible errors
- No increase in support tickets
- Improved feature usage
- Positive feedback

---

## 📚 ADDITIONAL MIGRATION SCRIPTS

### Script: Auto-Flag Overdue Items
```typescript
// scripts/auto-flag-overdue-items.ts
// Run nightly to flag overdue items

import { prisma } from '../src/lib/prisma'

async function flagOverdueItems() {
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  
  // Flag items overdue by 7+ days as CRITICAL
  const criticalItems = await prisma.complianceItem.updateMany({
    where: {
      deadlineDate: { lt: sevenDaysAgo },
      status: { not: 'COMPLETED' },
      isFlagged: false
    },
    data: {
      isFlagged: true,
      flagType: 'CRITICAL',
      flagReason: 'Automatically flagged: Overdue by 7+ days',
      flaggedAt: now
    }
  })
  
  // Flag items 1-7 days overdue as HIGH_PRIORITY
  const highPriorityItems = await prisma.complianceItem.updateMany({
    where: {
      deadlineDate: { 
        gte: sevenDaysAgo,
        lt: now 
      },
      status: { not: 'COMPLETED' },
      isFlagged: false
    },
    data: {
      isFlagged: true,
      flagType: 'HIGH_PRIORITY',
      flagReason: 'Automatically flagged: Overdue',
      flaggedAt: now
    }
  })
  
  console.log(`Flagged ${criticalItems.count} critical and ${highPriorityItems.count} high priority items`)
}
```

---

## 🎯 FINAL SCHEMA OVERVIEW

After all migrations, the compliance system will have:

- ✅ **ComplianceItem** - Enhanced with 30+ new fields
- ✅ **ComplianceCategory** - Hierarchical with templates
- ✅ **ComplianceAssignment** - Multi-user assignment
- ✅ **ComplianceWatcher** - Observer pattern
- ✅ **ComplianceFile** - Proper file management
- ✅ **ComplianceStatusChange** - Complete audit trail
- ✅ **ComplianceWorkflow** - Approval workflows
- ✅ **ComplianceApproval** - Multi-step approvals

**Total New Tables:** 6  
**Enhanced Tables:** 2  
**Total Fields Added:** ~70  
**New Indexes:** ~25  
**New Foreign Keys:** ~20  

---

**Document Status:** Ready for Implementation  
**Next Action:** Review and approve migration plan  
**Owner:** Database Team / Backend Lead  
**Approval Required:** Technical Lead, CTO

---

*This migration plan ensures zero downtime, zero data loss, and complete backward compatibility while enabling world-class compliance management features.*

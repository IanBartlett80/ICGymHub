-- CreateTable: Venue
CREATE TABLE "Venue" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "phone" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Australia/Sydney',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Venue_clubId_slug_key" ON "Venue"("clubId", "slug");
CREATE INDEX "Venue_clubId_idx" ON "Venue"("clubId");
CREATE INDEX "Venue_active_idx" ON "Venue"("active");

-- AddForeignKey
ALTER TABLE "Venue" ADD CONSTRAINT "Venue_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Add venueId columns (nullable for now)
ALTER TABLE "Zone" ADD COLUMN "venueId" TEXT;
ALTER TABLE "Equipment" ADD COLUMN "venueId" TEXT;
ALTER TABLE "RosterTemplate" ADD COLUMN "venueId" TEXT;
ALTER TABLE "Roster" ADD COLUMN "venueId" TEXT;
ALTER TABLE "RosterSlot" ADD COLUMN "venueId" TEXT;
ALTER TABLE "ClassSession" ADD COLUMN "venueId" TEXT;
ALTER TABLE "InjuryFormTemplate" ADD COLUMN "venueId" TEXT;
ALTER TABLE "InjurySubmission" ADD COLUMN "venueId" TEXT;
ALTER TABLE "MaintenanceLog" ADD COLUMN "venueId" TEXT;
ALTER TABLE "EquipmentUsage" ADD COLUMN "venueId" TEXT;
ALTER TABLE "SafetyIssue" ADD COLUMN "venueId" TEXT;
ALTER TABLE "MaintenanceTask" ADD COLUMN "venueId" TEXT;
ALTER TABLE "RepairQuoteRequest" ADD COLUMN "venueId" TEXT;
ALTER TABLE "ComplianceCategory" ADD COLUMN "venueId" TEXT;
ALTER TABLE "ComplianceItem" ADD COLUMN "venueId" TEXT;

-- Data Migration: Create default venue for each club
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
FROM "Club"
WHERE NOT EXISTS (
  SELECT 1 FROM "Venue" WHERE "Venue"."clubId" = "Club".id
);

-- Data Migration: Link all existing data to default venue
UPDATE "Zone" z
SET "venueId" = v.id
FROM "Venue" v
WHERE z."clubId" = v."clubId" 
  AND v."isDefault" = true
  AND z."venueId" IS NULL;

UPDATE "Equipment" e
SET "venueId" = v.id
FROM "Venue" v
WHERE e."clubId" = v."clubId" 
  AND v."isDefault" = true
  AND e."venueId" IS NULL;

UPDATE "RosterTemplate" rt
SET "venueId" = v.id
FROM "Venue" v
WHERE rt."clubId" = v."clubId" 
  AND v."isDefault" = true
  AND rt."venueId" IS NULL;

UPDATE "Roster" r
SET "venueId" = v.id
FROM "Venue" v
WHERE r."clubId" = v."clubId" 
  AND v."isDefault" = true
  AND r."venueId" IS NULL;

UPDATE "RosterSlot" rs
SET "venueId" = v.id
FROM "Venue" v
WHERE rs."clubId" = v."clubId" 
  AND v."isDefault" = true
  AND rs."venueId" IS NULL;

UPDATE "ClassSession" cs
SET "venueId" = v.id
FROM "Venue" v
WHERE cs."clubId" = v."clubId" 
  AND v."isDefault" = true
  AND cs."venueId" IS NULL;

UPDATE "InjuryFormTemplate" ift
SET "venueId" = v.id
FROM "Venue" v
WHERE ift."clubId" = v."clubId" 
  AND v."isDefault" = true
  AND ift."venueId" IS NULL;

UPDATE "InjurySubmission" isub
SET "venueId" = v.id
FROM "Venue" v
WHERE isub."clubId" = v."clubId" 
  AND v."isDefault" = true
  AND isub."venueId" IS NULL;

UPDATE "MaintenanceLog" ml
SET "venueId" = v.id
FROM "Venue" v
WHERE ml."clubId" = v."clubId" 
  AND v."isDefault" = true
  AND ml."venueId" IS NULL;

UPDATE "EquipmentUsage" eu
SET "venueId" = v.id
FROM "Venue" v
WHERE eu."clubId" = v."clubId" 
  AND v."isDefault" = true
  AND eu."venueId" IS NULL;

UPDATE "SafetyIssue" si
SET "venueId" = v.id
FROM "Venue" v
WHERE si."clubId" = v."clubId" 
  AND v."isDefault" = true
  AND si."venueId" IS NULL;

UPDATE "MaintenanceTask" mt
SET "venueId" = v.id
FROM "Venue" v
WHERE mt."clubId" = v."clubId" 
  AND v."isDefault" = true
  AND mt."venueId" IS NULL;

UPDATE "RepairQuoteRequest" rqr
SET "venueId" = v.id
FROM "Venue" v
WHERE rqr."clubId" = v."clubId" 
  AND v."isDefault" = true
  AND rqr."venueId" IS NULL;

UPDATE "ComplianceCategory" cc
SET "venueId" = v.id
FROM "Venue" v
WHERE cc."clubId" = v."clubId" 
  AND v."isDefault" = true
  AND cc."venueId" IS NULL;

UPDATE "ComplianceItem" ci
SET "venueId" = v.id
FROM "Venue" v
WHERE ci."clubId" = v."clubId" 
  AND v."isDefault" = true
  AND ci."venueId" IS NULL;

-- Add Foreign Keys for venueId columns
ALTER TABLE "Zone" ADD CONSTRAINT "Zone_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RosterTemplate" ADD CONSTRAINT "RosterTemplate_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Roster" ADD CONSTRAINT "Roster_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RosterSlot" ADD CONSTRAINT "RosterSlot_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InjuryFormTemplate" ADD CONSTRAINT "InjuryFormTemplate_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InjurySubmission" ADD CONSTRAINT "InjurySubmission_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaintenanceLog" ADD CONSTRAINT "MaintenanceLog_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EquipmentUsage" ADD CONSTRAINT "EquipmentUsage_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SafetyIssue" ADD CONSTRAINT "SafetyIssue_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaintenanceTask" ADD CONSTRAINT "MaintenanceTask_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RepairQuoteRequest" ADD CONSTRAINT "RepairQuoteRequest_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceCategory" ADD CONSTRAINT "ComplianceCategory_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceItem" ADD CONSTRAINT "ComplianceItem_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create Indexes for venueId columns
CREATE INDEX "Zone_venueId_idx" ON "Zone"("venueId");
CREATE INDEX "Equipment_venueId_idx" ON "Equipment"("venueId");
CREATE INDEX "RosterTemplate_venueId_idx" ON "RosterTemplate"("venueId");
CREATE INDEX "Roster_venueId_idx" ON "Roster"("venueId");
CREATE INDEX "RosterSlot_venueId_idx" ON "RosterSlot"("venueId");
CREATE INDEX "ClassSession_venueId_idx" ON "ClassSession"("venueId");
CREATE INDEX "InjuryFormTemplate_venueId_idx" ON "InjuryFormTemplate"("venueId");
CREATE INDEX "InjurySubmission_venueId_idx" ON "InjurySubmission"("venueId");
CREATE INDEX "MaintenanceLog_venueId_idx" ON "MaintenanceLog"("venueId");
CREATE INDEX "EquipmentUsage_venueId_idx" ON "EquipmentUsage"("venueId");
CREATE INDEX "SafetyIssue_venueId_idx" ON "SafetyIssue"("venueId");
CREATE INDEX "MaintenanceTask_venueId_idx" ON "MaintenanceTask"("venueId");
CREATE INDEX "RepairQuoteRequest_venueId_idx" ON "RepairQuoteRequest"("venueId");
CREATE INDEX "ComplianceCategory_venueId_idx" ON "ComplianceCategory"("venueId");
CREATE INDEX "ComplianceItem_venueId_idx" ON "ComplianceItem"("venueId");

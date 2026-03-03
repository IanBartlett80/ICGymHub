-- Add recurring schedule and owner fields to ComplianceItem
ALTER TABLE "ComplianceItem" ADD COLUMN "ownerName" TEXT;
ALTER TABLE "ComplianceItem" ADD COLUMN "ownerEmail" TEXT;
ALTER TABLE "ComplianceItem" ADD COLUMN "recurringSchedule" TEXT NOT NULL DEFAULT 'NONE';

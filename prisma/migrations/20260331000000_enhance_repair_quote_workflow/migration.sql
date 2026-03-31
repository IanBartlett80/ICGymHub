-- AlterTable: Add ICB Solutions workflow fields to RepairQuoteRequest
-- These are all additive, nullable columns - safe for production

ALTER TABLE "RepairQuoteRequest" ADD COLUMN IF NOT EXISTS "secureToken" TEXT;
ALTER TABLE "RepairQuoteRequest" ADD COLUMN IF NOT EXISTS "statusHistory" TEXT;
ALTER TABLE "RepairQuoteRequest" ADD COLUMN IF NOT EXISTS "icbAcknowledgedAt" TIMESTAMP(3);
ALTER TABLE "RepairQuoteRequest" ADD COLUMN IF NOT EXISTS "icbAcknowledgedBy" TEXT;
ALTER TABLE "RepairQuoteRequest" ADD COLUMN IF NOT EXISTS "icbNotes" TEXT;
ALTER TABLE "RepairQuoteRequest" ADD COLUMN IF NOT EXISTS "requestReference" TEXT;

-- CreateIndex: Unique index on secureToken for ICB portal access
CREATE UNIQUE INDEX IF NOT EXISTS "RepairQuoteRequest_secureToken_key" ON "RepairQuoteRequest"("secureToken");

-- CreateIndex: Index on secureToken for fast lookups
CREATE INDEX IF NOT EXISTS "RepairQuoteRequest_secureToken_idx" ON "RepairQuoteRequest"("secureToken");

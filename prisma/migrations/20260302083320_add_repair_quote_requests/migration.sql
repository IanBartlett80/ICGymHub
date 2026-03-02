-- CreateTable
CREATE TABLE "RepairQuoteRequest" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "safetyIssueId" TEXT,
    "requestedById" TEXT NOT NULL,
    "issueDescription" TEXT NOT NULL,
    "urgency" TEXT NOT NULL DEFAULT 'MEDIUM',
    "preferredRepairDate" TIMESTAMP(3),
    "estimatedBudget" TEXT,
    "contactPerson" TEXT NOT NULL,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "additionalNotes" TEXT,
    "specialRequirements" TEXT,
    "photos" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "emailSentAt" TIMESTAMP(3),
    "quoteAmount" TEXT,
    "quoteReceivedAt" TIMESTAMP(3),
    "quoteReceivedFrom" TEXT,
    "quoteNotes" TEXT,
    "repairCompletedAt" TIMESTAMP(3),
    "repairCompletedBy" TEXT,
    "finalCost" TEXT,
    "completionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepairQuoteRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RepairQuoteRequest_clubId_idx" ON "RepairQuoteRequest"("clubId");

-- CreateIndex
CREATE INDEX "RepairQuoteRequest_equipmentId_idx" ON "RepairQuoteRequest"("equipmentId");

-- CreateIndex
CREATE INDEX "RepairQuoteRequest_safetyIssueId_idx" ON "RepairQuoteRequest"("safetyIssueId");

-- CreateIndex
CREATE INDEX "RepairQuoteRequest_requestedById_idx" ON "RepairQuoteRequest"("requestedById");

-- CreateIndex
CREATE INDEX "RepairQuoteRequest_status_idx" ON "RepairQuoteRequest"("status");

-- CreateIndex
CREATE INDEX "RepairQuoteRequest_urgency_idx" ON "RepairQuoteRequest"("urgency");

-- CreateIndex
CREATE INDEX "RepairQuoteRequest_createdAt_idx" ON "RepairQuoteRequest"("createdAt");

-- AddForeignKey
ALTER TABLE "RepairQuoteRequest" ADD CONSTRAINT "RepairQuoteRequest_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairQuoteRequest" ADD CONSTRAINT "RepairQuoteRequest_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairQuoteRequest" ADD CONSTRAINT "RepairQuoteRequest_safetyIssueId_fkey" FOREIGN KEY ("safetyIssueId") REFERENCES "SafetyIssue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairQuoteRequest" ADD CONSTRAINT "RepairQuoteRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

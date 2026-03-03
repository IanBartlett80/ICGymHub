-- CreateTable
CREATE TABLE "ComplianceCategory" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceItem" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "categoryId" TEXT,
    "ownerId" TEXT,
    "createdById" TEXT,
    "completedById" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "deadlineDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "reminderSchedule" TEXT,
    "nextReminderDate" TIMESTAMP(3),
    "lastReminderSent" TIMESTAMP(3),
    "remindersSent" TEXT,
    "fileLinks" TEXT,
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceCategory_clubId_name_key" ON "ComplianceCategory"("clubId", "name");

-- CreateIndex
CREATE INDEX "ComplianceCategory_clubId_idx" ON "ComplianceCategory"("clubId");

-- CreateIndex
CREATE INDEX "ComplianceCategory_isActive_idx" ON "ComplianceCategory"("isActive");

-- CreateIndex
CREATE INDEX "ComplianceItem_clubId_idx" ON "ComplianceItem"("clubId");

-- CreateIndex
CREATE INDEX "ComplianceItem_categoryId_idx" ON "ComplianceItem"("categoryId");

-- CreateIndex
CREATE INDEX "ComplianceItem_ownerId_idx" ON "ComplianceItem"("ownerId");

-- CreateIndex
CREATE INDEX "ComplianceItem_status_idx" ON "ComplianceItem"("status");

-- CreateIndex
CREATE INDEX "ComplianceItem_deadlineDate_idx" ON "ComplianceItem"("deadlineDate");

-- CreateIndex
CREATE INDEX "ComplianceItem_nextReminderDate_idx" ON "ComplianceItem"("nextReminderDate");

-- AddForeignKey
ALTER TABLE "ComplianceCategory" ADD CONSTRAINT "ComplianceCategory_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceItem" ADD CONSTRAINT "ComplianceItem_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceItem" ADD CONSTRAINT "ComplianceItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ComplianceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceItem" ADD CONSTRAINT "ComplianceItem_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceItem" ADD CONSTRAINT "ComplianceItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceItem" ADD CONSTRAINT "ComplianceItem_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

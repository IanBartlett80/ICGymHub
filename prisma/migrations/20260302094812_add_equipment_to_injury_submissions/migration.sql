-- AlterTable
ALTER TABLE "InjurySubmission" ADD COLUMN "zoneId" TEXT,
ADD COLUMN "equipmentId" TEXT,
ADD COLUMN "equipmentMaintenanceSnapshot" TEXT,
ADD COLUMN "equipmentSafetySnapshot" TEXT;

-- CreateIndex
CREATE INDEX "InjurySubmission_zoneId_idx" ON "InjurySubmission"("zoneId");

-- CreateIndex
CREATE INDEX "InjurySubmission_equipmentId_idx" ON "InjurySubmission"("equipmentId");

-- AddForeignKey
ALTER TABLE "InjurySubmission" ADD CONSTRAINT "InjurySubmission_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InjurySubmission" ADD CONSTRAINT "InjurySubmission_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

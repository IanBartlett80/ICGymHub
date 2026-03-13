-- AlterTable
ALTER TABLE "ComplianceItem" ADD COLUMN "parentItemId" TEXT,
ADD COLUMN "isTemplate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "instanceNumber" INTEGER;

-- CreateIndex
CREATE INDEX "ComplianceItem_parentItemId_idx" ON "ComplianceItem"("parentItemId");

-- AddForeignKey
ALTER TABLE "ComplianceItem" ADD CONSTRAINT "ComplianceItem_parentItemId_fkey" FOREIGN KEY ("parentItemId") REFERENCES "ComplianceItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "ClassTemplate" ADD COLUMN "venueId" TEXT;

-- Link existing ClassTemplates to default venue for their club
UPDATE "ClassTemplate" ct
SET "venueId" = (
  SELECT v.id 
  FROM "Venue" v 
  WHERE v."clubId" = ct."clubId" 
  AND v."isDefault" = true 
  LIMIT 1
);

-- CreateIndex
CREATE INDEX "ClassTemplate_venueId_idx" ON "ClassTemplate"("venueId");

-- AddForeignKey
ALTER TABLE "ClassTemplate" ADD CONSTRAINT "ClassTemplate_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

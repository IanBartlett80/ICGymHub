-- AlterTable
ALTER TABLE "Venue" ADD COLUMN "publicId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Venue_publicId_key" ON "Venue"("publicId");

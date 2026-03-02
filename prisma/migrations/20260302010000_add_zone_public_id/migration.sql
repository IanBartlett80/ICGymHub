-- AlterTable
ALTER TABLE "Zone" ADD COLUMN "publicId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Zone_publicId_key" ON "Zone"("publicId");

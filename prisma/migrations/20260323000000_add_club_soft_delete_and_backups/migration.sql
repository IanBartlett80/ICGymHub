-- AlterTable
ALTER TABLE "Club" ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "deletionScheduledFor" TIMESTAMP(3),
ADD COLUMN "deletedBy" TEXT;

-- CreateTable
CREATE TABLE "ClubBackup" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "backupType" TEXT NOT NULL DEFAULT 'MANUAL',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "fileUrl" TEXT,
    "fileSize" INTEGER,
    "recordCount" INTEGER,
    "includesImages" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ClubBackup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Club_deletedAt_idx" ON "Club"("deletedAt");

-- CreateIndex
CREATE INDEX "Club_deletionScheduledFor_idx" ON "Club"("deletionScheduledFor");

-- CreateIndex
CREATE INDEX "ClubBackup_clubId_idx" ON "ClubBackup"("clubId");

-- CreateIndex
CREATE INDEX "ClubBackup_status_idx" ON "ClubBackup"("status");

-- CreateIndex
CREATE INDEX "ClubBackup_createdAt_idx" ON "ClubBackup"("createdAt");

-- AddForeignKey
ALTER TABLE "ClubBackup" ADD CONSTRAINT "ClubBackup_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

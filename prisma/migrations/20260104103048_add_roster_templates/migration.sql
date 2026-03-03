-- CreateTable
CREATE TABLE "RosterTemplate" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "activeDays" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RosterTemplate_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RosterTemplate_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RosterTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- AlterTable
ALTER TABLE "Roster" ADD COLUMN "templateId" TEXT;
ALTER TABLE "Roster" ADD COLUMN "dayOfWeek" TEXT;
ALTER TABLE "Roster" ADD CONSTRAINT "Roster_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "RosterTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "RosterTemplate_clubId_idx" ON "RosterTemplate"("clubId");
CREATE INDEX "RosterTemplate_status_idx" ON "RosterTemplate"("status");

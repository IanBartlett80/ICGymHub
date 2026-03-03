-- CreateTable
CREATE TABLE "Gymsport" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isPredefined" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Gymsport_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Gymsport_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CoachGymsport" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "gymsportId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CoachGymsport_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CoachGymsport_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CoachGymsport_gymsportId_fkey" FOREIGN KEY ("gymsportId") REFERENCES "Gymsport" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CoachAvailability" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "dayOfWeek" TEXT NOT NULL,
    "startTimeLocal" TEXT NOT NULL,
    "endTimeLocal" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CoachAvailability_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CoachAvailability_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- AlterTable
ALTER TABLE "ClassTemplate" ADD COLUMN "gymsportId" TEXT;
ALTER TABLE "ClassTemplate" ADD CONSTRAINT "ClassTemplate_gymsportId_fkey" FOREIGN KEY ("gymsportId") REFERENCES "Gymsport" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Gymsport_clubId_idx" ON "Gymsport"("clubId");
CREATE UNIQUE INDEX "Gymsport_clubId_name_key" ON "Gymsport"("clubId", "name");
CREATE INDEX "CoachGymsport_coachId_idx" ON "CoachGymsport"("coachId");
CREATE INDEX "CoachGymsport_gymsportId_idx" ON "CoachGymsport"("gymsportId");
CREATE UNIQUE INDEX "CoachGymsport_coachId_gymsportId_key" ON "CoachGymsport"("coachId", "gymsportId");
CREATE INDEX "CoachAvailability_coachId_idx" ON "CoachAvailability"("coachId");
CREATE INDEX "CoachAvailability_dayOfWeek_idx" ON "CoachAvailability"("dayOfWeek");
CREATE INDEX "ClassTemplate_gymsportId_idx" ON "ClassTemplate"("gymsportId");

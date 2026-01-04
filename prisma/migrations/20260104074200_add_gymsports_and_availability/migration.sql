-- CreateTable
CREATE TABLE "Gymsport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isPredefined" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Gymsport_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CoachGymsport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coachId" TEXT NOT NULL,
    "gymsportId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CoachGymsport_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CoachGymsport_gymsportId_fkey" FOREIGN KEY ("gymsportId") REFERENCES "Gymsport" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CoachAvailability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coachId" TEXT NOT NULL,
    "dayOfWeek" TEXT NOT NULL,
    "startTimeLocal" TEXT NOT NULL,
    "endTimeLocal" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CoachAvailability_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ClassTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gymsportId" TEXT,
    "level" TEXT NOT NULL,
    "lengthMinutes" INTEGER NOT NULL,
    "defaultRotationMinutes" INTEGER NOT NULL,
    "allowOverlap" BOOLEAN NOT NULL DEFAULT false,
    "activeDays" TEXT NOT NULL,
    "startTimeLocal" TEXT NOT NULL,
    "endTimeLocal" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClassTemplate_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClassTemplate_gymsportId_fkey" FOREIGN KEY ("gymsportId") REFERENCES "Gymsport" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ClassTemplate" ("activeDays", "allowOverlap", "clubId", "createdAt", "defaultRotationMinutes", "endTimeLocal", "id", "lengthMinutes", "level", "name", "notes", "startTimeLocal", "updatedAt") SELECT "activeDays", "allowOverlap", "clubId", "createdAt", "defaultRotationMinutes", "endTimeLocal", "id", "lengthMinutes", "level", "name", "notes", "startTimeLocal", "updatedAt" FROM "ClassTemplate";
DROP TABLE "ClassTemplate";
ALTER TABLE "new_ClassTemplate" RENAME TO "ClassTemplate";
CREATE INDEX "ClassTemplate_clubId_idx" ON "ClassTemplate"("clubId");
CREATE INDEX "ClassTemplate_gymsportId_idx" ON "ClassTemplate"("gymsportId");
CREATE UNIQUE INDEX "ClassTemplate_clubId_name_key" ON "ClassTemplate"("clubId", "name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Gymsport_clubId_idx" ON "Gymsport"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "Gymsport_clubId_name_key" ON "Gymsport"("clubId", "name");

-- CreateIndex
CREATE INDEX "CoachGymsport_coachId_idx" ON "CoachGymsport"("coachId");

-- CreateIndex
CREATE INDEX "CoachGymsport_gymsportId_idx" ON "CoachGymsport"("gymsportId");

-- CreateIndex
CREATE UNIQUE INDEX "CoachGymsport_coachId_gymsportId_key" ON "CoachGymsport"("coachId", "gymsportId");

-- CreateIndex
CREATE INDEX "CoachAvailability_coachId_idx" ON "CoachAvailability"("coachId");

-- CreateIndex
CREATE INDEX "CoachAvailability_dayOfWeek_idx" ON "CoachAvailability"("dayOfWeek");

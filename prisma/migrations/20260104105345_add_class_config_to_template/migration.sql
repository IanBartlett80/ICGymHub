/*
  Warnings:

  - Added the required column `classConfig` to the `RosterTemplate` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RosterTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "activeDays" TEXT NOT NULL,
    "classConfig" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RosterTemplate_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RosterTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_RosterTemplate" ("activeDays", "clubId", "createdAt", "createdById", "endDate", "id", "name", "startDate", "status", "updatedAt") SELECT "activeDays", "clubId", "createdAt", "createdById", "endDate", "id", "name", "startDate", "status", "updatedAt" FROM "RosterTemplate";
DROP TABLE "RosterTemplate";
ALTER TABLE "new_RosterTemplate" RENAME TO "RosterTemplate";
CREATE INDEX "RosterTemplate_clubId_idx" ON "RosterTemplate"("clubId");
CREATE INDEX "RosterTemplate_status_idx" ON "RosterTemplate"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

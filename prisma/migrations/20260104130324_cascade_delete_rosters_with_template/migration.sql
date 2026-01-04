-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Roster" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "templateId" TEXT,
    "scope" TEXT NOT NULL,
    "dayOfWeek" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "generatedAt" DATETIME,
    "generatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Roster_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Roster_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "RosterTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Roster_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Roster" ("clubId", "createdAt", "dayOfWeek", "endDate", "generatedAt", "generatedById", "id", "scope", "startDate", "status", "templateId", "updatedAt") SELECT "clubId", "createdAt", "dayOfWeek", "endDate", "generatedAt", "generatedById", "id", "scope", "startDate", "status", "templateId", "updatedAt" FROM "Roster";
DROP TABLE "Roster";
ALTER TABLE "new_Roster" RENAME TO "Roster";
CREATE INDEX "Roster_clubId_idx" ON "Roster"("clubId");
CREATE INDEX "Roster_scope_idx" ON "Roster"("scope");
CREATE INDEX "Roster_startDate_idx" ON "Roster"("startDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

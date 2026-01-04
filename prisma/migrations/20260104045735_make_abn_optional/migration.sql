-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Club" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "abn" TEXT,
    "domain" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "timezone" TEXT NOT NULL DEFAULT 'Australia/Sydney',
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Club" ("abn", "address", "city", "createdAt", "domain", "id", "name", "phone", "postalCode", "slug", "state", "status", "timezone", "updatedAt", "website") SELECT "abn", "address", "city", "createdAt", "domain", "id", "name", "phone", "postalCode", "slug", "state", "status", "timezone", "updatedAt", "website" FROM "Club";
DROP TABLE "Club";
ALTER TABLE "new_Club" RENAME TO "Club";
CREATE UNIQUE INDEX "Club_name_key" ON "Club"("name");
CREATE UNIQUE INDEX "Club_slug_key" ON "Club"("slug");
CREATE UNIQUE INDEX "Club_abn_key" ON "Club"("abn");
CREATE UNIQUE INDEX "Club_domain_key" ON "Club"("domain");
CREATE INDEX "Club_status_idx" ON "Club"("status");
CREATE INDEX "Club_domain_idx" ON "Club"("domain");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateTable
CREATE TABLE "Zone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "allowOverlap" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Zone_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Coach" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accreditationLevel" TEXT,
    "membershipNumber" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "importedFromCsv" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Coach_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClassTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
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
    CONSTRAINT "ClassTemplate_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TemplateAllowedZone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    CONSTRAINT "TemplateAllowedZone_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ClassTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TemplateAllowedZone_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TemplateCoach" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    CONSTRAINT "TemplateCoach_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ClassTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TemplateCoach_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClassSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "templateId" TEXT,
    "date" DATETIME NOT NULL,
    "startTimeLocal" TEXT NOT NULL,
    "endTimeLocal" TEXT NOT NULL,
    "rotationMinutes" INTEGER NOT NULL,
    "allowOverlap" BOOLEAN NOT NULL DEFAULT false,
    "assignedZoneSequence" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "conflictFlag" BOOLEAN NOT NULL DEFAULT false,
    "generatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClassSession_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClassSession_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ClassTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ClassSession_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SessionAllowedZone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    CONSTRAINT "SessionAllowedZone_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ClassSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SessionAllowedZone_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SessionCoach" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    CONSTRAINT "SessionCoach_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ClassSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SessionCoach_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Roster" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "generatedAt" DATETIME,
    "generatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Roster_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Roster_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RosterSlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "conflictFlag" BOOLEAN NOT NULL DEFAULT false,
    "allowOverlap" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RosterSlot_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RosterSlot_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "Roster" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RosterSlot_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ClassSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RosterSlot_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CoachImportJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalRows" INTEGER,
    "importedRows" INTEGER,
    "errorText" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CoachImportJob_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RosterExport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "exportType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "targetEmails" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RosterExport_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Zone_clubId_idx" ON "Zone"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "Zone_clubId_name_key" ON "Zone"("clubId", "name");

-- CreateIndex
CREATE INDEX "Coach_clubId_idx" ON "Coach"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "Coach_clubId_email_key" ON "Coach"("clubId", "email");

-- CreateIndex
CREATE INDEX "ClassTemplate_clubId_idx" ON "ClassTemplate"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassTemplate_clubId_name_key" ON "ClassTemplate"("clubId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateAllowedZone_templateId_zoneId_key" ON "TemplateAllowedZone"("templateId", "zoneId");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateCoach_templateId_coachId_key" ON "TemplateCoach"("templateId", "coachId");

-- CreateIndex
CREATE INDEX "ClassSession_clubId_idx" ON "ClassSession"("clubId");

-- CreateIndex
CREATE INDEX "ClassSession_templateId_idx" ON "ClassSession"("templateId");

-- CreateIndex
CREATE INDEX "ClassSession_date_idx" ON "ClassSession"("date");

-- CreateIndex
CREATE UNIQUE INDEX "SessionAllowedZone_sessionId_zoneId_key" ON "SessionAllowedZone"("sessionId", "zoneId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionCoach_sessionId_coachId_key" ON "SessionCoach"("sessionId", "coachId");

-- CreateIndex
CREATE INDEX "Roster_clubId_idx" ON "Roster"("clubId");

-- CreateIndex
CREATE INDEX "Roster_scope_idx" ON "Roster"("scope");

-- CreateIndex
CREATE INDEX "Roster_startDate_idx" ON "Roster"("startDate");

-- CreateIndex
CREATE INDEX "RosterSlot_clubId_idx" ON "RosterSlot"("clubId");

-- CreateIndex
CREATE INDEX "RosterSlot_rosterId_idx" ON "RosterSlot"("rosterId");

-- CreateIndex
CREATE INDEX "RosterSlot_sessionId_idx" ON "RosterSlot"("sessionId");

-- CreateIndex
CREATE INDEX "RosterSlot_zoneId_idx" ON "RosterSlot"("zoneId");

-- CreateIndex
CREATE INDEX "RosterSlot_startsAt_idx" ON "RosterSlot"("startsAt");

-- CreateIndex
CREATE INDEX "CoachImportJob_clubId_idx" ON "CoachImportJob"("clubId");

-- CreateIndex
CREATE INDEX "CoachImportJob_status_idx" ON "CoachImportJob"("status");

-- CreateIndex
CREATE INDEX "RosterExport_clubId_idx" ON "RosterExport"("clubId");

-- CreateIndex
CREATE INDEX "RosterExport_status_idx" ON "RosterExport"("status");

-- AlterTable
ALTER TABLE "Roster" DROP CONSTRAINT IF EXISTS "Roster_templateId_fkey";
ALTER TABLE "Roster" ADD CONSTRAINT "Roster_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "RosterTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

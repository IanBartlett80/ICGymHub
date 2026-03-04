-- AlterTable: Change ClassSession.templateId foreign key to CASCADE delete
-- When a ClassTemplate is deleted, all associated ClassSessions should also be deleted
-- This prevents orphaned sessions with null templates

ALTER TABLE "ClassSession" DROP CONSTRAINT IF EXISTS "ClassSession_templateId_fkey";

ALTER TABLE "ClassSession" 
  ADD CONSTRAINT "ClassSession_templateId_fkey" 
  FOREIGN KEY ("templateId") 
  REFERENCES "ClassTemplate"("id") 
  ON DELETE CASCADE 
  ON UPDATE CASCADE;

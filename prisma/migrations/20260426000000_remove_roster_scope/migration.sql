-- DropIndex
DROP INDEX IF EXISTS "Roster_scope_idx";

-- AlterTable
ALTER TABLE "Roster" DROP COLUMN "scope";

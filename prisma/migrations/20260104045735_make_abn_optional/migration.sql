-- Make ABN optional (PostgreSQL)
ALTER TABLE "Club" ALTER COLUMN "abn" DROP NOT NULL;

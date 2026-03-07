-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN "lastCheckedDate" TIMESTAMP(3),
ADD COLUMN "lastCheckStatus" TEXT,
ADD COLUMN "lastCheckedBy" TEXT;

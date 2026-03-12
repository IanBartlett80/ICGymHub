-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN     "installationDate" TIMESTAMP(3),
ADD COLUMN     "supplier" TEXT,
ADD COLUMN     "invoiceRef" TEXT,
ADD COLUMN     "warrantyExpiryDate" TIMESTAMP(3),
ADD COLUMN     "endOfLifeDate" TIMESTAMP(3);

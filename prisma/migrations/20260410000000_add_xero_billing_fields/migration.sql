-- AlterTable: Add Xero billing fields to Club
ALTER TABLE "Club" ADD COLUMN "xeroContactId" TEXT;
ALTER TABLE "Club" ADD COLUMN "xeroRepeatingInvoiceId" TEXT;
ALTER TABLE "Club" ADD COLUMN "paymentStatus" TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE "Club" ADD COLUMN "paymentAgreedAt" TIMESTAMP(3);
ALTER TABLE "Club" ADD COLUMN "paymentCancelledAt" TIMESTAMP(3);
ALTER TABLE "Club" ADD COLUMN "trialEndsAt" TIMESTAMP(3);
ALTER TABLE "Club" ADD COLUMN "monthlyRateAud" INTEGER NOT NULL DEFAULT 100;

-- CreateTable: XeroToken for OAuth token storage
CREATE TABLE "XeroToken" (
    "id" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "XeroToken_pkey" PRIMARY KEY ("id")
);

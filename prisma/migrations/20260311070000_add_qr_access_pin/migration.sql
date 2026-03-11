-- Add QR Access PIN fields to Club model
ALTER TABLE "Club" ADD COLUMN "qrAccessPin" TEXT;
ALTER TABLE "Club" ADD COLUMN "qrPinResetToken" TEXT;
ALTER TABLE "Club" ADD COLUMN "qrPinResetTokenExpiry" TIMESTAMP(3);
ALTER TABLE "Club" ADD COLUMN "qrPinUpdatedAt" TIMESTAMP(3);

-- Add unique constraint for reset token
CREATE UNIQUE INDEX "Club_qrPinResetToken_key" ON "Club"("qrPinResetToken");

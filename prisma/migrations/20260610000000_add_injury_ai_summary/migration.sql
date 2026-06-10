-- AlterTable: Add AI-generated summary fields to InjurySubmission (additive, nullable, non-destructive)
ALTER TABLE "InjurySubmission" ADD COLUMN "aiSummary" TEXT;
ALTER TABLE "InjurySubmission" ADD COLUMN "aiSummaryGeneratedAt" TIMESTAMP(3);

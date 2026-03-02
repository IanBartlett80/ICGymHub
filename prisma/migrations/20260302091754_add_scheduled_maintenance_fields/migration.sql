-- AlterTable
ALTER TABLE "MaintenanceTask" ADD COLUMN "assignedToName" TEXT,
ADD COLUMN "assignedToEmail" TEXT,
ADD COLUMN "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "recurrencePattern" TEXT,
ADD COLUMN "recurrenceInterval" INTEGER,
ADD COLUMN "recurrenceDay" INTEGER,
ADD COLUMN "recurrenceDayOfWeek" TEXT,
ADD COLUMN "recurrenceEndDate" TIMESTAMP(3),
ADD COLUMN "parentTaskId" TEXT,
ADD COLUMN "reminderDays" TEXT,
ADD COLUMN "lastReminderSent" TIMESTAMP(3),
ADD COLUMN "nextReminderDate" TIMESTAMP(3),
ADD COLUMN "remindersSent" TEXT;

-- CreateIndex
CREATE INDEX "MaintenanceTask_isRecurring_idx" ON "MaintenanceTask"("isRecurring");

-- CreateIndex
CREATE INDEX "MaintenanceTask_nextReminderDate_idx" ON "MaintenanceTask"("nextReminderDate");

-- CreateIndex
CREATE INDEX "MaintenanceTask_assignedToEmail_idx" ON "MaintenanceTask"("assignedToEmail");

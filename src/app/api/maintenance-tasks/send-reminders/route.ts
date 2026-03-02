import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

// GET /api/maintenance-tasks/send-reminders - Check and send maintenance reminders
// This endpoint should be called by a cron job or scheduled task
export async function GET(request: NextRequest) {
  try {
    // Optional: Add authentication for cron jobs using a secret token
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET || 'dev-cron-secret';
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find tasks that need reminders sent
    const tasksNeedingReminders = await prisma.maintenanceTask.findMany({
      where: {
        status: {
          in: ['PENDING', 'IN_PROGRESS'],
        },
        assignedToEmail: {
          not: null,
        },
        reminderDays: {
          not: null,
        },
        nextReminderDate: {
          lte: today,
        },
        dueDate: {
          gte: today, // Only send reminders for tasks not yet due
        },
      },
      include: {
        equipment: {
          include: {
            zone: true,
          },
        },
        club: true,
      },
    });

    const results = {
      checked: tasksNeedingReminders.length,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const task of tasksNeedingReminders) {
      try {
        // Parse reminder days
        const reminderDays = JSON.parse(task.reminderDays || '[]') as number[];
        if (reminderDays.length === 0) continue;

        // Calculate days until due
        const dueDate = new Date(task.dueDate!);
        dueDate.setHours(0, 0, 0, 0);
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Check if today matches one of the reminder days
        if (!reminderDays.includes(daysUntilDue)) {
          continue;
        }

        // Parse existing sent reminders
        const sentReminders = JSON.parse(task.remindersSent || '[]') as Array<{
          date: string;
          daysBefore: number;
        }>;

        // Check if we already sent this reminder
        const alreadySent = sentReminders.some(
          r => r.daysBefore === daysUntilDue && 
               new Date(r.date).toDateString() === today.toDateString()
        );

        if (alreadySent) {
          continue;
        }

        // Send email reminder
        const subject = `Maintenance Reminder: ${task.title} - Due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`;
        
        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f59e0b; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">Maintenance Reminder</h1>
            </div>
            
            <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 16px; font-weight: bold;">
                  ⚠️ This task is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}
                </p>
              </div>

              <h2 style="color: #1f2937; margin-top: 0;">${task.title}</h2>
              
              <div style="margin: 20px 0;">
                <p style="color: #6b7280; margin: 5px 0;"><strong>Equipment:</strong> ${task.equipment.name}</p>
                ${task.equipment.zone ? `<p style="color: #6b7280; margin: 5px 0;"><strong>Zone:</strong> ${task.equipment.zone.name}</p>` : ''}
                <p style="color: #6b7280; margin: 5px 0;"><strong>Task Type:</strong> ${task.taskType}</p>
                <p style="color: #6b7280; margin: 5px 0;"><strong>Priority:</strong> <span style="color: ${
                  task.priority === 'HIGH' ? '#dc2626' : 
                  task.priority === 'MEDIUM' ? '#f59e0b' : '#10b981'
                }; font-weight: bold;">${task.priority}</span></p>
                <p style="color: #6b7280; margin: 5px 0;"><strong>Due Date:</strong> ${new Date(task.dueDate!).toLocaleDateString('en-AU', { 
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</p>
              </div>

              <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #1f2937;">Description:</h3>
                <p style="color: #4b5563; white-space: pre-wrap;">${task.description}</p>
              </div>

              ${task.notes ? `
                <div style="background-color: #eff6ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #1e40af;">Additional Notes:</h3>
                  <p style="color: #1e40af; white-space: pre-wrap;">${task.notes}</p>
                </div>
              ` : ''}

              ${task.isRecurring ? `
                <div style="background-color: #f0fdf4; padding: 15px; border-radius: 6px; margin: 20px 0;">
                  <p style="color: #166534; margin: 0;">
                    🔄 This is a recurring task (${task.recurrencePattern}${task.recurrenceInterval && task.recurrenceInterval > 1 ? ` - every ${task.recurrenceInterval}` : ''})
                  </p>
                </div>
              ` : ''}

              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 14px; margin: 5px 0;"><strong>Club:</strong> ${task.club.name}</p>
                <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">
                  This is an automated reminder. Please complete this maintenance task before the due date.
                </p>
              </div>
            </div>
          </div>
        `;

        await sendEmail({
          to: task.assignedToEmail!,
          subject,
          htmlContent,
        });

        // Update task with sent reminder
        sentReminders.push({
          date: today.toISOString(),
          daysBefore: daysUntilDue,
        });

        // Find next reminder date
        const remainingReminders = reminderDays.filter(days => days < daysUntilDue);
        let nextReminder = null;
        if (remainingReminders.length > 0) {
          const nextReminderDays = Math.max(...remainingReminders);
          const nextDate = new Date(dueDate);
          nextDate.setDate(nextDate.getDate() - nextReminderDays);
          nextReminder = nextDate;
        }

        await prisma.maintenanceTask.update({
          where: { id: task.id },
          data: {
            remindersSent: JSON.stringify(sentReminders),
            lastReminderSent: today,
            nextReminderDate: nextReminder,
          },
        });

        results.sent++;
      } catch (error: any) {
        console.error(`Failed to send reminder for task ${task.id}:`, error);
        results.failed++;
        results.errors.push(`Task ${task.id}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Maintenance reminder check error:', error);
    return NextResponse.json(
      { error: 'Failed to process maintenance reminders' },
      { status: 500 }
    );
  }
}

// POST /api/maintenance-tasks/send-reminders - Manually trigger reminder check
export async function POST(request: NextRequest) {
  return GET(request);
}

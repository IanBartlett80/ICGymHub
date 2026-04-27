import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail, getLogoHeaderHtml } from '@/lib/email';

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
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f4f4f4;">
            <table role="presentation" style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:40px 0;text-align:center;">
                  <table role="presentation" style="width:600px;margin:0 auto;background-color:#ffffff;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
                    ${getLogoHeaderHtml()}
                    <tr>
                      <td style="padding:30px;text-align:center;background-color:#f59e0b;">
                        <h1 style="margin:0;color:#ffffff;font-size:24px;">Maintenance Reminder</h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:30px;">
                        <div style="background-color:#fef3c7;border-left:4px solid #f59e0b;padding:15px;margin-bottom:20px;">
                          <p style="margin:0;font-size:16px;font-weight:bold;color:#92400e;">
                            ⚠️ This task is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}
                          </p>
                        </div>

                        <h2 style="color:#1f2937;margin-top:0;">${task.title}</h2>
                        
                        <table style="width:100%;margin:20px 0;font-size:14px;">
                          <tr><td style="padding:6px 8px;color:#6b7280;width:35%;"><strong>Equipment</strong></td><td style="padding:6px 8px;color:#333;">${task.equipment.name}</td></tr>
                          ${task.equipment.zone ? `<tr><td style="padding:6px 8px;color:#6b7280;"><strong>Zone</strong></td><td style="padding:6px 8px;color:#333;">${task.equipment.zone.name}</td></tr>` : ''}
                          <tr><td style="padding:6px 8px;color:#6b7280;"><strong>Task Type</strong></td><td style="padding:6px 8px;color:#333;">${task.taskType}</td></tr>
                          <tr><td style="padding:6px 8px;color:#6b7280;"><strong>Priority</strong></td><td style="padding:6px 8px;color:${
                            task.priority === 'HIGH' ? '#dc2626' : 
                            task.priority === 'MEDIUM' ? '#f59e0b' : '#10b981'
                          };font-weight:bold;">${task.priority}</td></tr>
                          <tr><td style="padding:6px 8px;color:#6b7280;"><strong>Due Date</strong></td><td style="padding:6px 8px;color:#333;">${new Date(task.dueDate!).toLocaleDateString('en-AU', { 
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}</td></tr>
                        </table>

                        <div style="background-color:#f9fafb;padding:15px;border-radius:6px;margin:20px 0;">
                          <h3 style="margin-top:0;color:#1f2937;">Description</h3>
                          <p style="color:#4b5563;white-space:pre-wrap;margin:0;">${task.description}</p>
                        </div>

                        ${task.notes ? `
                          <div style="background-color:#eff6ff;padding:15px;border-radius:6px;margin:20px 0;">
                            <h3 style="margin-top:0;color:#1e40af;">Additional Notes</h3>
                            <p style="color:#1e40af;white-space:pre-wrap;margin:0;">${task.notes}</p>
                          </div>
                        ` : ''}

                        ${task.isRecurring ? `
                          <div style="background-color:#f0fdf4;padding:15px;border-radius:6px;margin:20px 0;">
                            <p style="color:#166534;margin:0;">
                              🔄 This is a recurring task (${task.recurrencePattern}${task.recurrenceInterval && task.recurrenceInterval > 1 ? ` - every ${task.recurrenceInterval}` : ''})
                            </p>
                          </div>
                        ` : ''}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:20px 30px;background-color:#f9fafb;border-radius:0 0 8px 8px;text-align:center;">
                        <p style="margin:0 0 4px;font-size:13px;color:#6b7280;"><strong>Club:</strong> ${task.club.name}</p>
                        <p style="margin:0;font-size:12px;color:#9ca3af;">This is an automated reminder from GymHub. Please complete this task before the due date.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
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

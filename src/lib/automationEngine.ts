import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

interface AutomationCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'notEquals' | 'isEmpty' | 'isNotEmpty';
  value: any;
}

interface TriggerConditions {
  trigger: 'ON_SUBMIT' | 'ON_STATUS_CHANGE';
  conditions?: AutomationCondition[];
  logic?: 'AND' | 'OR';
}

interface AutomationAction {
  type: 'SEND_EMAIL' | 'SET_PRIORITY' | 'ASSIGN_USER' | 'CREATE_NOTIFICATION' | 'SET_STATUS';
  config: any;
}

interface AutomationActions {
  actions: AutomationAction[];
}

/**
 * Evaluate if a condition matches the submission data
 */
function evaluateCondition(
  condition: AutomationCondition,
  submissionData: any,
  submission: any
): boolean {
  let actualValue: any;

  // Check if it's a special field (status, priority, etc.)
  if (condition.field === '_status') {
    actualValue = submission.status;
  } else if (condition.field === '_priority') {
    actualValue = submission.priority;
  } else {
    // Find the field value in submission data
    const fieldData = submissionData.find((d: any) => d.fieldId === condition.field);
    if (!fieldData) return condition.operator === 'isEmpty';
    
    const parsedValue = JSON.parse(fieldData.value);
    actualValue = parsedValue.value;
  }

  // Evaluate based on operator
  switch (condition.operator) {
    case 'equals':
      return actualValue == condition.value;
    case 'notEquals':
      return actualValue != condition.value;
    case 'contains':
      return String(actualValue).toLowerCase().includes(String(condition.value).toLowerCase());
    case 'greaterThan':
      return Number(actualValue) > Number(condition.value);
    case 'lessThan':
      return Number(actualValue) < Number(condition.value);
    case 'isEmpty':
      return !actualValue || actualValue === '';
    case 'isNotEmpty':
      return actualValue && actualValue !== '';
    default:
      return false;
  }
}

/**
 * Evaluate if all/any conditions match
 */
function evaluateConditions(
  conditions: AutomationCondition[],
  logic: 'AND' | 'OR',
  submissionData: any,
  submission: any
): boolean {
  if (!conditions || conditions.length === 0) return true;

  if (logic === 'AND') {
    return conditions.every((cond) => evaluateCondition(cond, submissionData, submission));
  } else {
    return conditions.some((cond) => evaluateCondition(cond, submissionData, submission));
  }
}

/**
 * Replace variables in email template
 */
function replaceVariables(template: string, submissionData: any, submission: any): string {
  let result = template;

  // Replace submission variables
  result = result.replace(/\{submission\.id\}/g, submission.id);
  result = result.replace(/\{submission\.status\}/g, submission.status);
  result = result.replace(/\{submission\.priority\}/g, submission.priority || 'Not Set');
  result = result.replace(/\{submission\.submittedAt\}/g, new Date(submission.submittedAt).toLocaleString());

  // Replace field variables
  submissionData.forEach((data: any) => {
    const fieldValue = JSON.parse(data.value);
    const fieldLabel = data.field.label;
    const fieldId = data.fieldId;
    
    result = result.replace(new RegExp(`\\{field\\.${fieldId}\\}`, 'g'), fieldValue.displayValue || fieldValue.value);
    result = result.replace(new RegExp(`\\{field\\.${fieldLabel}\\}`, 'g'), fieldValue.displayValue || fieldValue.value);
  });

  return result;
}

/**
 * Execute automation actions
 */
async function executeActions(
  actions: AutomationActions,
  submission: any,
  submissionData: any,
  automation: any
): Promise<void> {
  for (const action of actions.actions) {
    try {
      switch (action.type) {
        case 'SEND_EMAIL':
          await executeSendEmail(action, submission, submissionData, automation);
          break;
        case 'SET_PRIORITY':
          await executeSetPriority(action, submission);
          break;
        case 'ASSIGN_USER':
          await executeAssignUser(action, submission);
          break;
        case 'CREATE_NOTIFICATION':
          await executeCreateNotification(action, submission, submissionData);
          break;
        case 'SET_STATUS':
          await executeSetStatus(action, submission);
          break;
      }
    } catch (error) {
      console.error(`Error executing action ${action.type}:`, error);
    }
  }
}

/**
 * Send email action
 */
async function executeSendEmail(
  action: AutomationAction,
  submission: any,
  submissionData: any,
  automation: any
): Promise<void> {
  const recipients = JSON.parse(automation.emailRecipients || '[]');
  const subject = replaceVariables(automation.emailSubject || 'New Injury Report', submissionData, submission);
  const body = replaceVariables(automation.emailTemplate || 'A new injury report has been submitted.', submissionData, submission);

  // Resolve dynamic recipients (field references)
  const resolvedRecipients: string[] = [];
  for (const recipient of recipients) {
    if (recipient.startsWith('field:')) {
      const fieldId = recipient.replace('field:', '');
      const fieldData = submissionData.find((d: any) => d.fieldId === fieldId);
      if (fieldData) {
        const parsedValue = JSON.parse(fieldData.value);
        if (parsedValue.value && parsedValue.value.includes('@')) {
          resolvedRecipients.push(parsedValue.value);
        }
      }
    } else {
      resolvedRecipients.push(recipient);
    }
  }

  // Send emails
  for (const recipient of resolvedRecipients) {
    await sendEmail({
      to: recipient,
      subject,
      html: body,
    });
  }
}

/**
 * Set priority action
 */
async function executeSetPriority(action: AutomationAction, submission: any): Promise<void> {
  await prisma.injurySubmission.update({
    where: { id: submission.id },
    data: { priority: action.config.priority },
  });

  await prisma.injurySubmissionAudit.create({
    data: {
      submissionId: submission.id,
      action: 'PRIORITY_SET_BY_AUTOMATION',
      oldValue: submission.priority,
      newValue: action.config.priority,
    },
  });
}

/**
 * Assign user action
 */
async function executeAssignUser(action: AutomationAction, submission: any): Promise<void> {
  await prisma.injurySubmission.update({
    where: { id: submission.id },
    data: {
      assignedToUserId: action.config.userId,
      assignedAt: new Date(),
    },
  });

  await prisma.injurySubmissionAudit.create({
    data: {
      submissionId: submission.id,
      action: 'ASSIGNED_BY_AUTOMATION',
      oldValue: submission.assignedToUserId,
      newValue: action.config.userId,
    },
  });

  // Create notification
  await prisma.injuryNotification.create({
    data: {
      clubId: submission.clubId,
      userId: action.config.userId,
      submissionId: submission.id,
      type: 'ASSIGNMENT',
      title: 'Injury Report Assigned (Automated)',
      message: 'You have been automatically assigned to review an injury report.',
      actionUrl: `/dashboard/injury-reports/${submission.id}`,
    },
  });
}

/**
 * Create notification action
 */
async function executeCreateNotification(
  action: AutomationAction,
  submission: any,
  submissionData: any
): Promise<void> {
  const title = replaceVariables(action.config.title || 'Injury Report Notification', submissionData, submission);
  const message = replaceVariables(action.config.message || 'A new injury report requires attention.', submissionData, submission);

  // Get all admins in the club or specific users
  const userIds = action.config.userIds || [];
  
  if (userIds.length === 0) {
    // Send to all admins
    const admins = await prisma.user.findMany({
      where: {
        clubId: submission.clubId,
        isActive: true,
      },
      select: { id: true },
    });
    userIds.push(...admins.map((u) => u.id));
  }

  // Create notifications
  for (const userId of userIds) {
    await prisma.injuryNotification.create({
      data: {
        clubId: submission.clubId,
        userId,
        submissionId: submission.id,
        type: 'NEW_SUBMISSION',
        title,
        message,
        priority: action.config.priority || 'NORMAL',
        actionUrl: `/dashboard/injury-reports/${submission.id}`,
      },
    });
  }
}

/**
 * Set status action
 */
async function executeSetStatus(action: AutomationAction, submission: any): Promise<void> {
  await prisma.injurySubmission.update({
    where: { id: submission.id },
    data: { status: action.config.status },
  });

  await prisma.injurySubmissionAudit.create({
    data: {
      submissionId: submission.id,
      action: 'STATUS_SET_BY_AUTOMATION',
      oldValue: submission.status,
      newValue: action.config.status,
    },
  });
}

/**
 * Main function to trigger automations for a submission
 */
export async function triggerAutomations(
  submissionId: string,
  trigger: 'ON_SUBMIT' | 'ON_STATUS_CHANGE'
): Promise<void> {
  try {
    // Get submission with all data
    const submission = await prisma.injurySubmission.findUnique({
      where: { id: submissionId },
      include: {
        data: {
          include: {
            field: true,
          },
        },
        template: {
          include: {
            automations: {
              where: { active: true },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!submission) {
      console.error('Submission not found:', submissionId);
      return;
    }

    // Get relevant automations
    const automations = submission.template.automations;

    for (const automation of automations) {
      try {
        const triggerConditions: TriggerConditions = JSON.parse(automation.triggerConditions);

        // Check if trigger matches
        if (triggerConditions.trigger !== trigger) continue;

        // Evaluate conditions
        const conditionsMet = evaluateConditions(
          triggerConditions.conditions || [],
          triggerConditions.logic || 'AND',
          submission.data,
          submission
        );

        if (conditionsMet) {
          // Execute actions
          const actions: AutomationActions = JSON.parse(automation.actions);
          await executeActions(actions, submission, submission.data, automation);

          // Update automation stats
          await prisma.injuryFormAutomation.update({
            where: { id: automation.id },
            data: {
              lastExecuted: new Date(),
              executionCount: { increment: 1 },
            },
          });
        }
      } catch (error) {
        console.error(`Error processing automation ${automation.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error triggering automations:', error);
  }
}

/**
 * Check for escalations (run periodically via cron)
 */
export async function checkEscalations(): Promise<void> {
  try {
    // Get all active automations with escalation enabled
    const automations = await prisma.injuryFormAutomation.findMany({
      where: {
        active: true,
        escalationEnabled: true,
      },
      include: {
        template: {
          include: {
            submissions: {
              where: {
                status: { in: ['NEW', 'UNDER_REVIEW'] },
              },
              include: {
                data: {
                  include: {
                    field: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    for (const automation of automations) {
      for (const submission of automation.template.submissions) {
        const hoursSinceSubmission =
          (Date.now() - new Date(submission.submittedAt).getTime()) / (1000 * 60 * 60);

        if (hoursSinceSubmission >= (automation.escalationHours || 24)) {
          // Check if escalation conditions match
          const triggerConditions: TriggerConditions = JSON.parse(automation.triggerConditions);
          const conditionsMet = evaluateConditions(
            triggerConditions.conditions || [],
            triggerConditions.logic || 'AND',
            submission.data,
            submission
          );

          if (conditionsMet) {
            // Execute escalation actions
            const escalationActions: AutomationActions = JSON.parse(
              automation.escalationActions || '{"actions":[]}'
            );
            await executeActions(escalationActions, submission, submission.data, automation);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking escalations:', error);
  }
}

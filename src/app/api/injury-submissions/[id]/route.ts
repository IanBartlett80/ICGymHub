import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/apiAuth';
import { triggerAutomations } from '@/lib/automationEngine';

function isSchemaDriftError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('does not exist') ||
      message.includes('unknown column') ||
      message.includes('unknown field') ||
      message.includes('column') ||
      message.includes('table')
    );
  }
  return false;
}

// GET /api/injury-submissions/[id] - Get a specific submission
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    let submission: any;
    try {
      submission = await prisma.injurySubmission.findFirst({
        where: {
          id: id,
          clubId: authResult.user.clubId,
        },
        include: {
          template: {
            include: {
              sections: {
                include: {
                  fields: {
                    orderBy: { order: 'asc' },
                  },
                },
                orderBy: { order: 'asc' },
              },
            },
          },
          zone: {
            select: {
              id: true,
              name: true,
            },
          },
          equipment: {
            select: {
              id: true,
              name: true,
              serialNumber: true,
              category: true,
              condition: true,
            },
          },
          data: {
            include: {
              field: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          comments: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
          auditLog: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    } catch (fullQueryError) {
      if (!isSchemaDriftError(fullQueryError)) {
        throw fullQueryError;
      }

      const fallbackSubmission = await prisma.injurySubmission.findFirst({
        where: {
          id: id,
          clubId: authResult.user.clubId,
        },
        select: {
          id: true,
          status: true,
          priority: true,
          submittedAt: true,
          submitterInfo: true,
          template: {
            include: {
              sections: {
                include: {
                  fields: {
                    orderBy: { order: 'asc' },
                  },
                },
                orderBy: { order: 'asc' },
              },
            },
          },
          assignedTo: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          data: {
            include: {
              field: true,
            },
          },
        },
      });

      submission = fallbackSubmission
        ? {
            ...fallbackSubmission,
            zone: null,
            equipment: null,
            comments: [],
            auditLog: [],
          }
        : null;
    }

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    return NextResponse.json({ submission });
  } catch (error) {
    console.error('Error fetching injury submission:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch submission',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// PATCH /api/injury-submissions/[id] - Update submission (status, assignment, priority)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const body = await req.json();
    const { status, assignedToUserId, priority } = body;

    // Verify ownership
    const existing = await prisma.injurySubmission.findFirst({
      where: {
        id: id,
        clubId: authResult.user.clubId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Update submission
    const updateData: any = {};
    const auditLogs: any[] = [];

    if (status && status !== existing.status) {
      updateData.status = status;
      auditLogs.push({
        submissionId: id,
        userId: authResult.user.id,
        action: 'STATUS_CHANGED',
        oldValue: existing.status,
        newValue: status,
      });
    }

    if (assignedToUserId !== undefined && assignedToUserId !== existing.assignedToUserId) {
      updateData.assignedToUserId = assignedToUserId;
      updateData.assignedAt = assignedToUserId ? new Date() : null;
      auditLogs.push({
        submissionId: id,
        userId: authResult.user.id,
        action: 'ASSIGNED',
        oldValue: existing.assignedToUserId,
        newValue: assignedToUserId,
      });

      // Create notification for assigned user
      if (assignedToUserId) {
        await prisma.injuryNotification.create({
          data: {
            clubId: authResult.user.clubId,
            userId: assignedToUserId,
            submissionId: id,
            type: 'ASSIGNMENT',
            title: 'New Injury Report Assigned',
            message: `You have been assigned to review an injury report.`,
            actionUrl: `/dashboard/injury-reports/${id}`,
          },
        });
      }
    }

    if (priority && priority !== existing.priority) {
      updateData.priority = priority;
      auditLogs.push({
        submissionId: id,
        userId: authResult.user.id,
        action: 'PRIORITY_CHANGED',
        oldValue: existing.priority,
        newValue: priority,
      });
    }

    const submission = await prisma.injurySubmission.update({
      where: { id: id },
      data: updateData,
      include: {
        assignedTo: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    // Create audit logs
    if (auditLogs.length > 0) {
      await prisma.injurySubmissionAudit.createMany({
        data: auditLogs,
      });
      
      // Trigger automations if status changed
      if (status && status !== existing.status) {
        await triggerAutomations(id, 'ON_STATUS_CHANGE');
      }
    }

    return NextResponse.json({ submission });
  } catch (error) {
    console.error('Error updating injury submission:', error);
    return NextResponse.json(
      { error: 'Failed to update submission' },
      { status: 500 }
    );
  }
}

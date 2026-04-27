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
              venueId: true,
              venue: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          venue: {
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
              lastCheckedDate: true,
              lastCheckStatus: true,
              lastCheckedBy: true,
              photoUrl: true,
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

    // Resolve raw IDs to friendly names for venue/zone/equipment fields
    // This handles old submissions where displayValue was stored as the raw ID
    if (submission.data && submission.data.length > 0) {
      const cuidRegex = /^c[a-z0-9]{20,}$/;
      const idsToResolve: string[] = [];

      for (const d of submission.data) {
        try {
          const parsed = JSON.parse(d.value);
          const val = parsed.value || parsed.displayValue;
          if (typeof val === 'string' && cuidRegex.test(val)) {
            idsToResolve.push(val);
          }
        } catch {}
      }

      if (idsToResolve.length > 0) {
        const [venues, zones, equipmentItems] = await Promise.all([
          prisma.venue.findMany({ where: { id: { in: idsToResolve } }, select: { id: true, name: true } }),
          prisma.zone.findMany({ where: { id: { in: idsToResolve } }, select: { id: true, name: true } }),
          prisma.equipment.findMany({ where: { id: { in: idsToResolve } }, select: { id: true, name: true } }),
        ]);
        const nameMap = new Map<string, string>();
        for (const v of venues) nameMap.set(v.id, v.name);
        for (const z of zones) nameMap.set(z.id, z.name);
        for (const e of equipmentItems) nameMap.set(e.id, e.name);

        if (nameMap.size > 0) {
          for (const d of submission.data) {
            try {
              const parsed = JSON.parse(d.value);
              const val = parsed.value;
              if (typeof val === 'string' && nameMap.has(val)) {
                parsed.displayValue = nameMap.get(val);
                d.value = JSON.stringify(parsed);
              }
            } catch {}
          }
        }
      }
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
    const { status, assignedToUserId, assignedToName, priority } = body;

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
    
    if (assignedToName !== undefined && assignedToName !== existing.assignedToName) {
      updateData.assignedToName = assignedToName || null;
      auditLogs.push({
        submissionId: id,
        userId: authResult.user.id,
        action: 'ASSIGNED',
        oldValue: existing.assignedToName,
        newValue: assignedToName,
      });
    }

    if (assignedToUserId !== undefined && assignedToUserId !== existing.assignedToUserId) {
      updateData.assignedToUserId = assignedToUserId;
      updateData.assignedAt = assignedToUserId ? new Date() : null;
      auditLogs.push({
        submissionId: id,
        userId: authResult.user.id,
        action: 'ASSIGNED_USER',
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

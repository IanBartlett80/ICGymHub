import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/apiAuth';

// GET /api/injury-submissions - List all submissions for a club
export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const templateId = searchParams.get('templateId');
    const assignedToMe = searchParams.get('assignedToMe') === 'true';
    const priority = searchParams.get('priority');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const where: any = {
      clubId: authResult.user.clubId,
    };

    if (status) where.status = status;
    if (templateId) where.templateId = templateId;
    if (assignedToMe) where.assignedToUserId = authResult.user.id;
    if (priority) where.priority = priority;
    if (from || to) {
      where.submittedAt = {};
      if (from) where.submittedAt.gte = new Date(from);
      if (to) where.submittedAt.lte = new Date(to);
    }

    const submissions = await prisma.injurySubmission.findMany({
      where,
      include: {
        template: {
          select: {
            id: true,
            name: true,
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
            field: {
              select: {
                id: true,
                label: true,
                fieldType: true,
              },
            },
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    // Extract athlete, coach, and class information from submission data
    const enrichedSubmissions = submissions.map((submission) => {
      let athleteName = null;
      let coachName = null;
      let className = null;
      let programName = null;

      submission.data.forEach((dataItem) => {
        const value = typeof dataItem.value === 'string' ? JSON.parse(dataItem.value) : dataItem.value;
        const displayValue = value.displayValue || value.value || value;

        if (dataItem.field.label === 'Athlete Name') {
          athleteName = displayValue;
        } else if (dataItem.field.label === 'Supervising Coach') {
          coachName = displayValue;
        } else if (dataItem.field.label === 'Class') {
          className = displayValue;
        } else if (dataItem.field.label === 'Program') {
          programName = displayValue;
        }
      });

      return {
        id: submission.id,
        status: submission.status,
        priority: submission.priority,
        submittedAt: submission.submittedAt,
        template: submission.template,
        assignedTo: submission.assignedTo,
        athleteName,
        coachName,
        className,
        programName,
        _count: submission._count,
      };
    });

    return NextResponse.json({ submissions: enrichedSubmissions });
  } catch (error) {
    console.error('Error fetching injury submissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
}

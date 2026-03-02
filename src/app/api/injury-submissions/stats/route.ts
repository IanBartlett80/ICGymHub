import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/apiAuth';

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

// GET /api/injury-submissions/stats - Get dashboard statistics
export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const dateFilter: any = {};
    if (from || to) {
      if (from) dateFilter.gte = new Date(from);
      if (to) dateFilter.lte = new Date(to);
    }

    const where = {
      clubId: authResult.user.clubId,
      ...(Object.keys(dateFilter).length > 0 && { submittedAt: dateFilter }),
    };

    let statusCounts: Array<{ status: string; _count: number }> = [];
    let priorityCounts: Array<{ priority: string | null; _count: number }> = [];
    let templateCounts: Array<{ templateId: string | null; _count: number }> = [];

    try {
      const groupedStatus = await prisma.injurySubmission.groupBy({
        by: ['status'],
        where,
        _count: true,
      });
      statusCounts = groupedStatus.map((s) => ({ status: s.status, _count: s._count }));

      const groupedPriority = await prisma.injurySubmission.groupBy({
        by: ['priority'],
        where: {
          ...where,
          priority: { not: null },
        },
        _count: true,
      });
      priorityCounts = groupedPriority.map((p) => ({ priority: p.priority, _count: p._count }));

      const groupedTemplate = await prisma.injurySubmission.groupBy({
        by: ['templateId'],
        where,
        _count: true,
      });
      templateCounts = groupedTemplate.map((t) => ({ templateId: t.templateId, _count: t._count }));
    } catch (groupError) {
      if (!isSchemaDriftError(groupError)) {
        throw groupError;
      }

      const fallbackRows = await prisma.injurySubmission.findMany({
        where,
        select: {
          status: true,
          templateId: true,
          submittedAt: true,
        },
      });

      const statusMap = new Map<string, number>();
      const templateMap = new Map<string, number>();

      for (const row of fallbackRows) {
        statusMap.set(row.status, (statusMap.get(row.status) || 0) + 1);
        const templateKey = row.templateId || '__null__';
        templateMap.set(templateKey, (templateMap.get(templateKey) || 0) + 1);
      }

      statusCounts = Array.from(statusMap.entries()).map(([status, count]) => ({
        status,
        _count: count,
      }));

      templateCounts = Array.from(templateMap.entries()).map(([templateId, count]) => ({
        templateId: templateId === '__null__' ? null : templateId,
        _count: count,
      }));

      priorityCounts = [];
    }

    // Get template names
    const templates = await prisma.injuryFormTemplate.findMany({
      where: {
        clubId: authResult.user.clubId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    // Get submissions over time (daily)
    const submissions = await prisma.injurySubmission.findMany({
      where,
      select: {
        submittedAt: true,
      },
    });

    // Group by date
    const submissionsByDate: { [key: string]: number } = {};
    submissions.forEach((s) => {
      const date = s.submittedAt.toISOString().split('T')[0];
      submissionsByDate[date] = (submissionsByDate[date] || 0) + 1;
    });

    // Total submissions
    const totalSubmissions = submissions.length;

    // Average response time (time from submission to first status change)
    let responseTimes: number[] = [];
    try {
      const submissionsWithAudit = await prisma.injurySubmission.findMany({
        where,
        include: {
          auditLog: {
            where: {
              action: 'STATUS_CHANGED',
              oldValue: 'NEW',
            },
            take: 1,
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });

      responseTimes = submissionsWithAudit
        .filter(s => s.auditLog.length > 0)
        .map(s => {
          const submittedAt = new Date(s.submittedAt).getTime();
          const firstResponse = new Date(s.auditLog[0].createdAt).getTime();
          return (firstResponse - submittedAt) / (1000 * 60 * 60);
        });
    } catch (auditError) {
      if (!isSchemaDriftError(auditError)) {
        throw auditError;
      }
      responseTimes = [];
    }

    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    return NextResponse.json({
      totalSubmissions,
      statusCounts: statusCounts.map((s) => ({
        status: s.status,
        count: s._count,
      })),
      priorityCounts: priorityCounts.map((p) => ({
        priority: p.priority,
        count: p._count,
      })),
      templateCounts: templateCounts.map((t) => {
        const template = templates.find((tpl) => tpl.id === t.templateId);
        return {
          templateId: t.templateId,
          templateName: template?.name || 'Unknown',
          count: t._count,
        };
      }),
      submissionsByDate,
      avgResponseTimeHours: avgResponseTime,
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch statistics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/apiAuth';

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

    // Get counts by status
    const statusCounts = await prisma.injurySubmission.groupBy({
      by: ['status'],
      where,
      _count: true,
    });

    // Get counts by priority
    const priorityCounts = await prisma.injurySubmission.groupBy({
      by: ['priority'],
      where: {
        ...where,
        priority: { not: null },
      },
      _count: true,
    });

    // Get counts by template
    const templateCounts = await prisma.injurySubmission.groupBy({
      by: ['templateId'],
      where,
      _count: true,
    });

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
    // Note: Using simple calculation instead of complex SQL for SQLite compatibility
    const submissionsWithAudit = await prisma.injurySubmission.findMany({
      where: {
        clubId: authResult.user.clubId,
        ...dateFilter,
      },
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

    const responseTimes = submissionsWithAudit
      .filter(s => s.auditLog.length > 0)
      .map(s => {
        const submittedAt = new Date(s.submittedAt).getTime();
        const firstResponse = new Date(s.auditLog[0].createdAt).getTime();
        return (firstResponse - submittedAt) / (1000 * 60 * 60); // hours
      });

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
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}

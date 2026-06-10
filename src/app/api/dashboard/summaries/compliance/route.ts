import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/apiAuth';
import { buildAISummary, SummaryMetric } from '@/lib/aiSummary';

// GET /api/dashboard/summaries/compliance
// AI overview of compliance items overdue and those due in the next 7 days.
// Metrics are computed deterministically.
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const clubId = auth.user.clubId;
    const now = new Date();
    const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const baseOpen = { clubId, isTemplate: false, status: { not: 'COMPLETED' } as const };

    const [
      overdueCount,
      dueIn7Count,
      dueIn30Count,
      openTotal,
      completedThisMonth,
      overdueItems,
      dueSoonItems,
    ] = await Promise.all([
      prisma.complianceItem.count({ where: { ...baseOpen, deadlineDate: { lt: now } } }),
      prisma.complianceItem.count({
        where: { ...baseOpen, deadlineDate: { gte: now, lte: sevenDaysOut } },
      }),
      prisma.complianceItem.count({
        where: { ...baseOpen, deadlineDate: { gte: now, lte: thirtyDaysOut } },
      }),
      prisma.complianceItem.count({ where: baseOpen }),
      prisma.complianceItem.count({
        where: { clubId, isTemplate: false, status: 'COMPLETED', completedAt: { gte: firstOfMonth } },
      }),
      prisma.complianceItem.findMany({
        where: { ...baseOpen, deadlineDate: { lt: now } },
        orderBy: { deadlineDate: 'asc' },
        take: 10,
        select: {
          title: true,
          deadlineDate: true,
          ownerName: true,
          category: { select: { name: true } },
        },
      }),
      prisma.complianceItem.findMany({
        where: { ...baseOpen, deadlineDate: { gte: now, lte: sevenDaysOut } },
        orderBy: { deadlineDate: 'asc' },
        take: 10,
        select: {
          title: true,
          deadlineDate: true,
          ownerName: true,
          category: { select: { name: true } },
        },
      }),
    ]);

    const metrics: SummaryMetric[] = [
      { label: 'overdue', value: overdueCount, tone: overdueCount > 0 ? 'red' : 'green' },
      { label: 'due in 7 days', value: dueIn7Count, tone: dueIn7Count > 0 ? 'amber' : 'green' },
      { label: 'open items', value: openTotal, tone: 'neutral' },
      { label: 'due in 30 days', value: dueIn30Count, tone: 'neutral' },
      { label: 'completed this month', value: completedThisMonth, tone: 'green' },
    ];

    const fmtItem = (i: {
      title: string;
      deadlineDate: Date;
      ownerName: string | null;
      category: { name: string } | null;
    }) => {
      const days = Math.round((new Date(i.deadlineDate).getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      const when = days < 0 ? `${Math.abs(days)} day(s) overdue` : days === 0 ? 'due today' : `due in ${days} day(s)`;
      const owner = i.ownerName ? `owner ${i.ownerName}` : 'no owner assigned';
      const cat = i.category?.name ? `[${i.category.name}] ` : '';
      return `- ${cat}${i.title} — ${when}, ${owner}`;
    };

    const facts = [
      `Compliance snapshot for ${now.toDateString()}.`,
      ``,
      `Overdue items: ${overdueCount}.`,
      `Due in next 7 days: ${dueIn7Count}.`,
      `Due in next 30 days: ${dueIn30Count}.`,
      `Total open items: ${openTotal}. Completed this month: ${completedThisMonth}.`,
      ``,
      `Overdue items:`,
      overdueItems.length > 0 ? overdueItems.map(fmtItem).join('\n') : '- None.',
      ``,
      `Due within 7 days:`,
      dueSoonItems.length > 0 ? dueSoonItems.map(fmtItem).join('\n') : '- None.',
    ].join('\n');

    const summary = await buildAISummary({
      system:
        'You are a compliance-management assistant for a gymnastics club. ' +
        'Write a concise overview (3–5 short bullet points, plain text, no markdown headings) for an admin. ' +
        'Lead with anything overdue (most overdue first), then the items coming due in the next 7 days, noting owners where given. ' +
        'Flag items with no owner assigned. Only use the numbers and facts provided; never invent data. If nothing is overdue or due soon, say so briefly.',
      facts,
      metrics,
    });

    return NextResponse.json(summary);
  } catch (err) {
    console.error('Compliance AI summary failed:', err);
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
}

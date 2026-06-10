import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/apiAuth';
import { generateNarrative } from '@/lib/analytics/ai';
import type { Kpi, InsightAction, SeriesPoint } from '@/lib/analytics/types';

// GET /api/analytics/compliance?venueId=...
// Deterministic compliance analytics: completion rates, category risk matrix,
// owner performance and upcoming deadlines, narrated by AI.
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const clubId = auth.user.clubId;
    const { searchParams } = new URL(req.url);
    const venueId = searchParams.get('venueId');
    const venueFilter = venueId && venueId !== 'all' ? { venueId } : {};

    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const baseItem = { clubId, isTemplate: false, ...venueFilter };
    const baseOpen = { ...baseItem, status: { not: 'COMPLETED' } as const };

    const [
      openTotal,
      overdue,
      dueSoon7,
      dueSoon30,
      completedTotal,
      completedThisMonth,
      noOwnerOverdue,
      categories,
      openByCategory,
      overdueByCategory,
      ownerOpenRows,
      ownerOverdueRows,
      upcomingItems,
      completedTrendRows,
      createdTrendRows,
    ] = await Promise.all([
      prisma.complianceItem.count({ where: baseOpen }),
      prisma.complianceItem.count({ where: { ...baseOpen, deadlineDate: { lt: now } } }),
      prisma.complianceItem.count({ where: { ...baseOpen, deadlineDate: { gte: now, lte: in7 } } }),
      prisma.complianceItem.count({ where: { ...baseOpen, deadlineDate: { gte: now, lte: in30 } } }),
      prisma.complianceItem.count({ where: { ...baseItem, status: 'COMPLETED' } }),
      prisma.complianceItem.count({ where: { ...baseItem, status: 'COMPLETED', completedAt: { gte: firstOfMonth } } }),
      prisma.complianceItem.count({ where: { ...baseOpen, deadlineDate: { lt: now }, ownerName: null } }),
      prisma.complianceCategory.findMany({ where: { clubId }, select: { id: true, name: true } }),
      prisma.complianceItem.groupBy({ by: ['categoryId'], where: baseOpen, _count: { _all: true } }),
      prisma.complianceItem.groupBy({
        by: ['categoryId'],
        where: { ...baseOpen, deadlineDate: { lt: now } },
        _count: { _all: true },
      }),
      prisma.complianceItem.groupBy({ by: ['ownerName'], where: baseOpen, _count: { _all: true } }),
      prisma.complianceItem.groupBy({
        by: ['ownerName'],
        where: { ...baseOpen, deadlineDate: { lt: now } },
        _count: { _all: true },
      }),
      prisma.complianceItem.findMany({
        where: { ...baseOpen, deadlineDate: { gte: now, lte: in30 } },
        orderBy: { deadlineDate: 'asc' },
        take: 12,
        select: { title: true, deadlineDate: true, ownerName: true, category: { select: { name: true } } },
      }),
      prisma.complianceItem.findMany({
        where: { ...baseItem, status: 'COMPLETED', completedAt: { gte: sixMonthsAgo } },
        select: { completedAt: true },
      }),
      prisma.complianceItem.findMany({
        where: { ...baseItem, createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true },
      }),
    ]);

    const totalTracked = completedTotal + openTotal;
    const completionRate = totalTracked > 0 ? Math.round((completedTotal / totalTracked) * 100) : 100;

    const kpis: Kpi[] = [
      { key: 'rate', label: 'Completion rate', value: `${completionRate}%`, tone: completionRate >= 90 ? 'green' : completionRate >= 70 ? 'amber' : 'red' },
      { key: 'overdue', label: 'Overdue', value: overdue, tone: overdue > 0 ? 'red' : 'green', hint: `${noOwnerOverdue} with no owner` },
      { key: 'due7', label: 'Due in 7 days', value: dueSoon7, tone: dueSoon7 > 0 ? 'amber' : 'green' },
      { key: 'due30', label: 'Due in 30 days', value: dueSoon30, tone: 'neutral' },
      { key: 'open', label: 'Open items', value: openTotal, tone: 'neutral' },
      { key: 'month', label: 'Completed this month', value: completedThisMonth, tone: 'green' },
    ];

    const catName = new Map(categories.map((c) => [c.id, c.name]));
    const overdueByCat = new Map<string | null, number>();
    for (const r of overdueByCategory) overdueByCat.set(r.categoryId, r._count._all);
    const categoryRisk = openByCategory
      .map((r) => ({
        category: r.categoryId ? catName.get(r.categoryId) || 'Uncategorised' : 'Uncategorised',
        open: r._count._all,
        overdue: overdueByCat.get(r.categoryId) || 0,
      }))
      .sort((a, b) => b.overdue - a.overdue || b.open - a.open);

    const overdueByOwner = new Map<string | null, number>();
    for (const r of ownerOverdueRows) overdueByOwner.set(r.ownerName, r._count._all);
    const ownerPerformance = ownerOpenRows
      .map((r) => ({
        owner: r.ownerName || 'Unassigned',
        open: r._count._all,
        overdue: overdueByOwner.get(r.ownerName) || 0,
      }))
      .sort((a, b) => b.overdue - a.overdue || b.open - a.open)
      .slice(0, 10);

    const upcoming = upcomingItems.map((i) => ({
      title: i.title,
      ownerName: i.ownerName,
      category: i.category?.name || null,
      deadlineDate: i.deadlineDate,
      daysUntil: Math.round((new Date(i.deadlineDate).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
    }));

    // Trend: completed vs created per month for last 6 months.
    const trendMap = new Map<string, { completed: number; created: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      trendMap.set(d.toLocaleString('en-US', { month: 'short', year: '2-digit' }), { completed: 0, created: 0 });
    }
    const bump = (date: Date, key: 'completed' | 'created') => {
      const k = new Date(date).toLocaleString('en-US', { month: 'short', year: '2-digit' });
      const b = trendMap.get(k);
      if (b) b[key] += 1;
    };
    completedTrendRows.forEach((r) => r.completedAt && bump(r.completedAt, 'completed'));
    createdTrendRows.forEach((r) => bump(r.createdAt, 'created'));
    const completionTrend: SeriesPoint[] = Array.from(trendMap.entries()).map(([period, v]) => ({
      period,
      completed: v.completed,
      created: v.created,
    }));

    const actions: InsightAction[] = [];
    if (overdue > 0)
      actions.push({
        severity: noOwnerOverdue > 0 ? 'critical' : 'warning',
        title: `${overdue} item${overdue > 1 ? 's' : ''} overdue`,
        detail: noOwnerOverdue > 0 ? `${noOwnerOverdue} have no owner assigned` : undefined,
        href: '/dashboard/compliance-manager',
      });
    const worstCat = categoryRisk.find((c) => c.overdue > 0);
    if (worstCat)
      actions.push({ severity: 'warning', title: `"${worstCat.category}" has ${worstCat.overdue} overdue`, href: '/dashboard/compliance-manager' });
    if (dueSoon7 > 0)
      actions.push({ severity: 'info', title: `${dueSoon7} item${dueSoon7 > 1 ? 's' : ''} due within 7 days`, href: '/dashboard/compliance-manager' });
    if (actions.length === 0) actions.push({ severity: 'info', title: 'Compliance is on track', detail: 'Nothing overdue or imminently due.' });

    const facts = [
      `Compliance analytics for ${now.toDateString()}.`,
      `Completion rate: ${completionRate}% (${completedTotal} completed, ${openTotal} open).`,
      `Overdue: ${overdue} (${noOwnerOverdue} with no owner). Due in 7 days: ${dueSoon7}. Due in 30 days: ${dueSoon30}.`,
      ``,
      `Category risk (open / overdue):`,
      categoryRisk.length > 0 ? categoryRisk.slice(0, 6).map((c) => `- ${c.category}: ${c.open} open, ${c.overdue} overdue`).join('\n') : '- None.',
      ``,
      `Owner load (open / overdue):`,
      ownerPerformance.length > 0 ? ownerPerformance.slice(0, 6).map((o) => `- ${o.owner}: ${o.open} open, ${o.overdue} overdue`).join('\n') : '- None.',
    ].join('\n');

    const narrative = await generateNarrative(
      'You are a compliance analytics assistant for a gymnastics club. ' +
        'Write a concise analysis (3-5 short bullet points, plain text, no markdown headings). ' +
        'Lead with overdue risk and any owner or category that stands out, then the completion-rate trend, then one recommendation. ' +
        'Flag items with no owner. Only use the numbers provided; never invent data.',
      facts
    );

    return NextResponse.json({
      kpis,
      completionTrend,
      categoryRisk,
      ownerPerformance,
      upcoming,
      insight: { narrative, actions, aiEnabled: Boolean(process.env.OPENAI_API_KEY), generatedAt: new Date().toISOString() },
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Compliance analytics failed:', err);
    return NextResponse.json({ error: 'Failed to load compliance analytics' }, { status: 500 });
  }
}

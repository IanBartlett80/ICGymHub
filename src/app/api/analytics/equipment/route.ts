import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/apiAuth';
import { generateNarrative } from '@/lib/analytics/ai';
import type { Kpi, InsightAction, SeriesPoint, Bucket } from '@/lib/analytics/types';

// GET /api/analytics/equipment?venueId=...
// Deterministic equipment & safety analytics: condition mix, out-of-service and
// maintenance load, open safety issues by type, per-venue health and upcoming
// maintenance. AI only narrates the computed facts.
const CONDITION_TONE: Record<string, Bucket['tone']> = {
  Excellent: 'green',
  Good: 'green',
  Fair: 'amber',
  Poor: 'red',
  'Out of Service': 'red',
};

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
    const in90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const equipBase = { clubId, ...venueFilter, active: true } as const;
    const safetyBase = { clubId, ...venueFilter } as const;
    const openSafetyWhere = { ...safetyBase, status: { not: 'RESOLVED' } } as const;
    const openMaintWhere = { clubId, ...venueFilter, status: { not: 'COMPLETED' } } as const;

    const [
      activeEquip,
      conditionRows,
      categoryRows,
      openSafety,
      criticalSafety,
      safetyTypeRows,
      safetyTrendRows,
      overdueMaint,
      dueSoonMaint,
      maintStatusRows,
      warrantyExpiring90,
      venues,
      equipByVenueRows,
      oosByVenueRows,
      safetyByVenueRows,
      overdueMaintByVenueRows,
      upcomingMaint,
    ] = await Promise.all([
      prisma.equipment.count({ where: equipBase }),
      prisma.equipment.groupBy({ by: ['condition'], where: equipBase, _count: { _all: true } }),
      prisma.equipment.groupBy({ by: ['category'], where: equipBase, _count: { _all: true } }),
      prisma.safetyIssue.count({ where: openSafetyWhere }),
      prisma.safetyIssue.count({ where: { ...openSafetyWhere, priority: 'CRITICAL' } }),
      prisma.safetyIssue.groupBy({ by: ['issueType'], where: openSafetyWhere, _count: { _all: true } }),
      prisma.safetyIssue.findMany({
        where: { ...safetyBase, createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true, resolvedAt: true },
      }),
      prisma.maintenanceTask.count({ where: { ...openMaintWhere, dueDate: { lt: now } } }),
      prisma.maintenanceTask.count({ where: { ...openMaintWhere, dueDate: { gte: now, lte: in7 } } }),
      prisma.maintenanceTask.groupBy({ by: ['status'], where: { clubId, ...venueFilter }, _count: { _all: true } }),
      prisma.equipment.count({ where: { ...equipBase, warrantyExpiryDate: { gte: now, lte: in90 } } }),
      prisma.venue.findMany({ where: { clubId, active: true }, select: { id: true, name: true } }),
      prisma.equipment.groupBy({ by: ['venueId'], where: equipBase, _count: { _all: true } }),
      prisma.equipment.groupBy({ by: ['venueId'], where: { ...equipBase, condition: 'Out of Service' }, _count: { _all: true } }),
      prisma.safetyIssue.groupBy({ by: ['venueId'], where: openSafetyWhere, _count: { _all: true } }),
      prisma.maintenanceTask.groupBy({ by: ['venueId'], where: { ...openMaintWhere, dueDate: { lt: now } }, _count: { _all: true } }),
      prisma.maintenanceTask.findMany({
        where: { ...openMaintWhere, dueDate: { gte: now, lte: in30 } },
        orderBy: { dueDate: 'asc' },
        take: 12,
        select: { title: true, dueDate: true, priority: true, equipment: { select: { name: true } } },
      }),
    ]);

    // ---- Condition mix ----
    const conditionCount = new Map<string, number>();
    for (const r of conditionRows) conditionCount.set(r.condition || 'Unspecified', r._count._all);
    const outOfService = conditionCount.get('Out of Service') || 0;
    const needsAttention = (conditionCount.get('Fair') || 0) + (conditionCount.get('Poor') || 0) + outOfService;
    const conditionBreakdown: Bucket[] = conditionRows
      .map((r) => ({ label: r.condition || 'Unspecified', value: r._count._all, tone: CONDITION_TONE[r.condition || ''] || 'neutral' }))
      .sort((a, b) => b.value - a.value);

    const categoryBreakdown = categoryRows
      .map((r) => ({ category: r.category || 'Uncategorised', count: r._count._all }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const kpis: Kpi[] = [
      { key: 'active', label: 'Active equipment', value: activeEquip, tone: 'neutral' },
      { key: 'oos', label: 'Out of service', value: outOfService, tone: outOfService > 0 ? 'red' : 'green' },
      { key: 'attention', label: 'Needs attention', value: needsAttention, tone: needsAttention > 0 ? 'amber' : 'green', hint: 'Fair / Poor / OOS' },
      { key: 'safety', label: 'Open safety issues', value: openSafety, tone: criticalSafety > 0 ? 'red' : openSafety > 0 ? 'amber' : 'green', hint: `${criticalSafety} critical` },
      { key: 'overdue', label: 'Maintenance overdue', value: overdueMaint, tone: overdueMaint > 0 ? 'red' : dueSoonMaint > 0 ? 'amber' : 'green', hint: `${dueSoonMaint} due in 7 days` },
      { key: 'warranty', label: 'Warranty expiring', value: warrantyExpiring90, tone: warrantyExpiring90 > 0 ? 'amber' : 'green', hint: 'next 90 days' },
    ];

    // ---- Safety issues by type ----
    const safetyByType: Bucket[] = safetyTypeRows
      .map((r) => ({ label: r.issueType || 'Unspecified', value: r._count._all, tone: 'amber' as const }))
      .sort((a, b) => b.value - a.value);

    // ---- Maintenance status mix ----
    const MAINT_TONE: Record<string, Bucket['tone']> = { PENDING: 'amber', IN_PROGRESS: 'amber', COMPLETED: 'green' };
    const maintStatus: Bucket[] = maintStatusRows
      .map((r) => ({ label: (r.status || 'Unknown').replace(/_/g, ' '), value: r._count._all, tone: MAINT_TONE[r.status] || 'neutral' }))
      .sort((a, b) => b.value - a.value);

    // ---- Safety trend (6 months) ----
    const trendMap = new Map<string, { reported: number; resolved: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      trendMap.set(d.toLocaleString('en-US', { month: 'short', year: '2-digit' }), { reported: 0, resolved: 0 });
    }
    for (const r of safetyTrendRows) {
      const k = new Date(r.createdAt).toLocaleString('en-US', { month: 'short', year: '2-digit' });
      const b = trendMap.get(k);
      if (b) b.reported += 1;
      if (r.resolvedAt) {
        const rk = new Date(r.resolvedAt).toLocaleString('en-US', { month: 'short', year: '2-digit' });
        const rb = trendMap.get(rk);
        if (rb) rb.resolved += 1;
      }
    }
    const safetyTrend: SeriesPoint[] = Array.from(trendMap.entries()).map(([period, v]) => ({
      period,
      reported: v.reported,
      resolved: v.resolved,
    }));

    // ---- Per-venue health ----
    const toMap = (rows: { venueId: string | null; _count: { _all: number } }[]) => {
      const m = new Map<string, number>();
      for (const r of rows) if (r.venueId) m.set(r.venueId, r._count._all);
      return m;
    };
    const vEquip = toMap(equipByVenueRows);
    const vOos = toMap(oosByVenueRows);
    const vSafety = toMap(safetyByVenueRows);
    const vOverdue = toMap(overdueMaintByVenueRows);
    const venueHealth = venues
      .map((v) => {
        const equip = vEquip.get(v.id) || 0;
        const oos = vOos.get(v.id) || 0;
        const safety = vSafety.get(v.id) || 0;
        const overdue = vOverdue.get(v.id) || 0;
        const riskScore = oos * 4 + safety * 3 + overdue * 3;
        return { venueName: v.name, equipment: equip, outOfService: oos, openSafety: safety, overdueMaintenance: overdue, riskScore };
      })
      .filter((v) => v.equipment > 0 || v.openSafety > 0 || v.overdueMaintenance > 0)
      .sort((a, b) => b.riskScore - a.riskScore);

    const upcoming = upcomingMaint.map((m) => ({
      title: m.title,
      equipment: m.equipment?.name || null,
      priority: m.priority,
      dueDate: m.dueDate,
      daysUntil: m.dueDate ? Math.round((new Date(m.dueDate).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)) : null,
    }));

    // ---- Prioritised actions ----
    const actions: InsightAction[] = [];
    if (criticalSafety > 0)
      actions.push({ severity: 'critical', title: `${criticalSafety} critical safety issue${criticalSafety > 1 ? 's' : ''} open`, href: '/dashboard/safety-issues' });
    if (outOfService > 0)
      actions.push({ severity: 'critical', title: `${outOfService} item${outOfService > 1 ? 's' : ''} out of service`, href: '/dashboard/equipment' });
    if (overdueMaint > 0)
      actions.push({ severity: 'warning', title: `${overdueMaint} maintenance task${overdueMaint > 1 ? 's' : ''} overdue`, href: '/dashboard/equipment/maintenance' });
    if (openSafety - criticalSafety > 0)
      actions.push({ severity: 'warning', title: `${openSafety - criticalSafety} non-critical safety issue${openSafety - criticalSafety > 1 ? 's' : ''} open`, href: '/dashboard/safety-issues' });
    if (warrantyExpiring90 > 0)
      actions.push({ severity: 'info', title: `${warrantyExpiring90} item${warrantyExpiring90 > 1 ? 's' : ''} with warranty expiring in 90 days` });
    if (dueSoonMaint > 0)
      actions.push({ severity: 'info', title: `${dueSoonMaint} maintenance task${dueSoonMaint > 1 ? 's' : ''} due within 7 days`, href: '/dashboard/equipment/maintenance' });
    if (actions.length === 0) actions.push({ severity: 'info', title: 'Equipment fleet is healthy', detail: 'No out-of-service items or overdue maintenance.' });

    const facts = [
      `Equipment & safety analytics for ${now.toDateString()}.`,
      `Fleet: ${activeEquip} active items, ${outOfService} out of service, ${needsAttention} needing attention (Fair/Poor/OOS).`,
      `Safety: ${openSafety} open issues (${criticalSafety} critical).`,
      `Maintenance: ${overdueMaint} overdue, ${dueSoonMaint} due within 7 days. Warranty expiring (90d): ${warrantyExpiring90}.`,
      ``,
      `Condition mix: ${conditionBreakdown.map((c) => `${c.label} ${c.value}`).join(', ') || 'none'}.`,
      `Safety issue types: ${safetyByType.map((s) => `${s.label} ${s.value}`).join(', ') || 'none'}.`,
      ``,
      `Venue health (equipment / out-of-service / open safety / overdue maintenance):`,
      venueHealth.length > 0 ? venueHealth.slice(0, 5).map((v) => `- ${v.venueName}: ${v.equipment} / ${v.outOfService} / ${v.openSafety} / ${v.overdueMaintenance}`).join('\n') : '- None.',
    ].join('\n');

    const narrative = await generateNarrative(
      'You are an equipment and safety analytics assistant for a gymnastics club director. ' +
        'Write a concise analysis (3-5 short bullet points, plain text, no markdown headings). ' +
        'Lead with the most urgent safety or out-of-service risk, name the venue that stands out, comment on maintenance backlog, then one recommendation. ' +
        'Only use the numbers provided; never invent data.',
      facts
    );

    return NextResponse.json({
      kpis,
      conditionBreakdown,
      categoryBreakdown,
      safetyByType,
      maintStatus,
      safetyTrend,
      venueHealth,
      upcoming,
      insight: { narrative, actions, aiEnabled: Boolean(process.env.OPENAI_API_KEY), generatedAt: new Date().toISOString() },
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Equipment analytics failed:', err);
    return NextResponse.json({ error: 'Failed to load equipment analytics' }, { status: 500 });
  }
}

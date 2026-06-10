import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/apiAuth';
import { generateNarrative } from '@/lib/analytics/ai';
import type { Kpi, InsightAction, SeriesPoint, Bucket } from '@/lib/analytics/types';

// GET /api/analytics/injuries?venueId=...
// Deterministic injuries & incidents analytics: open/critical load, resolution
// performance, trend, status/priority mix, venue/zone/equipment hotspots and a
// day-of-week pattern. AI only narrates the computed facts.
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
    const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const base = { clubId, ...venueFilter, archived: false } as const;
    const openWhere = { ...base, status: { notIn: ['RESOLVED', 'CLOSED'] } } as const;
    const resolvedWhere = { ...base, status: { in: ['RESOLVED', 'CLOSED'] } } as const;

    const [
      total,
      open,
      criticalOpen,
      new30d,
      resolvedTotal,
      unassignedOpen,
      statusRows,
      priorityRows,
      venueRows,
      criticalVenueRows,
      openVenueRows,
      zoneRows,
      equipmentRows,
      venues,
      zones,
      equipment,
      trendRows,
      resolvedForTime,
    ] = await Promise.all([
      prisma.injurySubmission.count({ where: base }),
      prisma.injurySubmission.count({ where: openWhere }),
      prisma.injurySubmission.count({ where: { ...openWhere, priority: { in: ['CRITICAL', 'HIGH'] } } }),
      prisma.injurySubmission.count({ where: { ...base, submittedAt: { gte: last30 } } }),
      prisma.injurySubmission.count({ where: resolvedWhere }),
      prisma.injurySubmission.count({ where: { ...openWhere, assignedToUserId: null } }),
      prisma.injurySubmission.groupBy({ by: ['status'], where: base, _count: { _all: true } }),
      prisma.injurySubmission.groupBy({ by: ['priority'], where: base, _count: { _all: true } }),
      prisma.injurySubmission.groupBy({ by: ['venueId'], where: base, _count: { _all: true } }),
      prisma.injurySubmission.groupBy({ by: ['venueId'], where: { ...base, priority: { in: ['CRITICAL', 'HIGH'] } }, _count: { _all: true } }),
      prisma.injurySubmission.groupBy({ by: ['venueId'], where: openWhere, _count: { _all: true } }),
      prisma.injurySubmission.groupBy({ by: ['zoneId'], where: base, _count: { _all: true } }),
      prisma.injurySubmission.groupBy({ by: ['equipmentId'], where: base, _count: { _all: true } }),
      prisma.venue.findMany({ where: { clubId, active: true }, select: { id: true, name: true } }),
      prisma.zone.findMany({ where: { clubId }, select: { id: true, name: true } }),
      prisma.equipment.findMany({ where: { clubId }, select: { id: true, name: true } }),
      prisma.injurySubmission.findMany({
        where: { ...base, submittedAt: { gte: sixMonthsAgo } },
        select: { submittedAt: true, priority: true },
      }),
      prisma.injurySubmission.findMany({
        where: { ...resolvedWhere, resolvedAt: { gte: last90 } },
        select: { submittedAt: true, resolvedAt: true },
      }),
    ]);

    const resolutionRate = total > 0 ? Math.round((resolvedTotal / total) * 100) : 0;

    // Average resolution time (hours) over the last 90 days.
    let avgResolutionHours = 0;
    if (resolvedForTime.length > 0) {
      const totalHours = resolvedForTime.reduce((sum, r) => {
        if (!r.resolvedAt) return sum;
        return sum + (new Date(r.resolvedAt).getTime() - new Date(r.submittedAt).getTime()) / (1000 * 60 * 60);
      }, 0);
      avgResolutionHours = Math.round((totalHours / resolvedForTime.length) * 10) / 10;
    }

    const kpis: Kpi[] = [
      { key: 'total', label: 'Total incidents', value: total, tone: 'neutral', hint: `${new30d} in last 30 days` },
      { key: 'open', label: 'Open incidents', value: open, tone: open > 0 ? 'amber' : 'green', hint: `${unassignedOpen} unassigned` },
      { key: 'critical', label: 'High / critical open', value: criticalOpen, tone: criticalOpen > 0 ? 'red' : 'green' },
      { key: 'rate', label: 'Resolution rate', value: `${resolutionRate}%`, tone: resolutionRate >= 80 ? 'green' : resolutionRate >= 50 ? 'amber' : 'red' },
      { key: 'avg', label: 'Avg resolution', value: avgResolutionHours >= 48 ? `${Math.round(avgResolutionHours / 24)}d` : `${avgResolutionHours}h`, tone: 'neutral', hint: 'last 90 days' },
      { key: 'resolved', label: 'Resolved (all time)', value: resolvedTotal, tone: 'green' },
    ];

    // ---- Status & priority distribution ----
    const STATUS_TONE: Record<string, Bucket['tone']> = {
      NEW: 'amber',
      UNDER_REVIEW: 'amber',
      RESOLVED: 'green',
      CLOSED: 'neutral',
    };
    const statusBreakdown: Bucket[] = statusRows
      .map((r) => ({ label: (r.status || 'Unknown').replace(/_/g, ' '), value: r._count._all, tone: STATUS_TONE[r.status] || 'neutral' }))
      .sort((a, b) => b.value - a.value);

    const PRIORITY_TONE: Record<string, Bucket['tone']> = {
      CRITICAL: 'red',
      HIGH: 'red',
      MEDIUM: 'amber',
      LOW: 'green',
      NONE: 'neutral',
    };
    const priorityBreakdown: Bucket[] = priorityRows
      .map((r) => ({
        label: r.priority ? r.priority.charAt(0) + r.priority.slice(1).toLowerCase() : 'Not set',
        value: r._count._all,
        tone: r.priority ? PRIORITY_TONE[r.priority] || 'neutral' : 'neutral',
      }))
      .sort((a, b) => b.value - a.value);

    // ---- Venue breakdown ----
    const toMap = (rows: { venueId: string | null; _count: { _all: number } }[]) => {
      const m = new Map<string, number>();
      for (const r of rows) if (r.venueId) m.set(r.venueId, r._count._all);
      return m;
    };
    const vTotal = toMap(venueRows);
    const vCrit = toMap(criticalVenueRows);
    const vOpen = toMap(openVenueRows);
    const venueBreakdown = venues
      .map((v) => ({
        venueName: v.name,
        total: vTotal.get(v.id) || 0,
        open: vOpen.get(v.id) || 0,
        critical: vCrit.get(v.id) || 0,
      }))
      .filter((v) => v.total > 0)
      .sort((a, b) => b.critical - a.critical || b.open - a.open || b.total - a.total);

    // ---- Zone hotspots & equipment-linked incidents ----
    const zoneName = new Map(zones.map((z) => [z.id, z.name]));
    const zoneHotspots = zoneRows
      .filter((r) => r.zoneId)
      .map((r) => ({ zone: zoneName.get(r.zoneId as string) || 'Unknown', count: r._count._all }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const equipName = new Map(equipment.map((e) => [e.id, e.name]));
    const equipmentInjuries = equipmentRows
      .filter((r) => r.equipmentId)
      .map((r) => ({ equipment: equipName.get(r.equipmentId as string) || 'Unknown', count: r._count._all }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // ---- Trend (6 months) ----
    const trendMap = new Map<string, { total: number; critical: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      trendMap.set(d.toLocaleString('en-US', { month: 'short', year: '2-digit' }), { total: 0, critical: 0 });
    }
    // ---- Day-of-week pattern (6 months) ----
    const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dowCount = new Map<string, number>(DAYS.map((d) => [d, 0]));
    for (const row of trendRows) {
      const d = new Date(row.submittedAt);
      const key = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      const b = trendMap.get(key);
      if (b) {
        b.total += 1;
        if (row.priority === 'CRITICAL' || row.priority === 'HIGH') b.critical += 1;
      }
      const dow = DAYS[(d.getDay() + 6) % 7]; // getDay: 0=Sun -> map to Mon-first
      dowCount.set(dow, (dowCount.get(dow) || 0) + 1);
    }
    const trend: SeriesPoint[] = Array.from(trendMap.entries()).map(([period, v]) => ({
      period,
      incidents: v.total,
      critical: v.critical,
    }));
    const dayOfWeek: SeriesPoint[] = DAYS.map((day) => ({ period: day, incidents: dowCount.get(day) || 0 }));

    // ---- Prioritised actions ----
    const actions: InsightAction[] = [];
    if (criticalOpen > 0)
      actions.push({
        severity: 'critical',
        title: `${criticalOpen} high/critical incident${criticalOpen > 1 ? 's' : ''} unresolved`,
        href: '/dashboard/injury-reports/submissions',
      });
    if (unassignedOpen > 0)
      actions.push({
        severity: 'warning',
        title: `${unassignedOpen} open incident${unassignedOpen > 1 ? 's' : ''} unassigned`,
        detail: 'Assign an owner so nothing is missed.',
        href: '/dashboard/injury-reports/submissions',
      });
    const worstVenue = venueBreakdown.find((v) => v.critical > 0) || venueBreakdown[0];
    if (worstVenue && (worstVenue.critical > 0 || worstVenue.open > 0))
      actions.push({
        severity: worstVenue.critical > 0 ? 'warning' : 'info',
        title: `${worstVenue.venueName} has the highest incident load`,
        detail: `${worstVenue.open} open, ${worstVenue.critical} high/critical`,
      });
    if (zoneHotspots[0] && zoneHotspots[0].count > 1)
      actions.push({ severity: 'info', title: `"${zoneHotspots[0].zone}" is the top incident zone`, detail: `${zoneHotspots[0].count} incidents linked` });
    if (actions.length === 0) actions.push({ severity: 'info', title: 'No urgent incident risks', detail: 'Open and critical loads are healthy.' });

    const facts = [
      `Injuries & incidents analytics for ${now.toDateString()}.`,
      `Totals: ${total} incidents, ${open} open (${criticalOpen} high/critical), ${unassignedOpen} unassigned. ${new30d} new in last 30 days.`,
      `Resolution: ${resolutionRate}% resolved overall, average resolution time ${avgResolutionHours} hours over last 90 days.`,
      ``,
      `Status mix: ${statusBreakdown.map((s) => `${s.label} ${s.value}`).join(', ') || 'none'}.`,
      `Priority mix: ${priorityBreakdown.map((p) => `${p.label} ${p.value}`).join(', ') || 'none'}.`,
      ``,
      `Venue load (total / open / critical):`,
      venueBreakdown.length > 0 ? venueBreakdown.slice(0, 5).map((v) => `- ${v.venueName}: ${v.total} / ${v.open} / ${v.critical}`).join('\n') : '- None.',
      ``,
      `Top incident zones: ${zoneHotspots.slice(0, 5).map((z) => `${z.zone} (${z.count})`).join(', ') || 'none'}.`,
      `Equipment-linked incidents: ${equipmentInjuries.slice(0, 5).map((e) => `${e.equipment} (${e.count})`).join(', ') || 'none'}.`,
    ].join('\n');

    const narrative = await generateNarrative(
      'You are a safety analytics assistant for a gymnastics club director. ' +
        'Write a concise analysis (3-5 short bullet points, plain text, no markdown headings). ' +
        'Lead with the most urgent open/critical risk, name the venue or zone that stands out, comment on resolution speed, then one recommendation. ' +
        'Only use the numbers provided; never invent data.',
      facts
    );

    return NextResponse.json({
      kpis,
      trend,
      statusBreakdown,
      priorityBreakdown,
      venueBreakdown,
      zoneHotspots,
      equipmentInjuries,
      dayOfWeek,
      insight: { narrative, actions, aiEnabled: Boolean(process.env.OPENAI_API_KEY), generatedAt: new Date().toISOString() },
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Injury analytics failed:', err);
    return NextResponse.json({ error: 'Failed to load injury analytics' }, { status: 500 });
  }
}

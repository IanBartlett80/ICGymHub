import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/apiAuth';
import { generateNarrative } from '@/lib/analytics/ai';
import type { Kpi, InsightAction, SeriesPoint, Bucket } from '@/lib/analytics/types';

// GET /api/analytics/rosters?venueId=...
// Coach utilisation, conflict patterns and accreditation coverage across a
// rolling window (last 90 days + next 30 days).
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
    const windowStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const sessionWindow = { clubId, ...venueFilter, date: { gte: windowStart, lte: windowEnd } };
    const slotWindow = { clubId, ...venueFilter, startsAt: { gte: windowStart, lte: windowEnd } };

    const [
      totalSessions,
      totalSlots,
      conflictSlots,
      upcomingConflicts,
      conflictTypeRows,
      coachSessionRows,
      activeCoaches,
      gymsports,
      coachGymsportRows,
      conflictTrendRows,
    ] = await Promise.all([
      prisma.classSession.count({ where: sessionWindow }),
      prisma.rosterSlot.count({ where: slotWindow }),
      prisma.rosterSlot.count({ where: { ...slotWindow, conflictFlag: true } }),
      prisma.rosterSlot.count({ where: { clubId, ...venueFilter, conflictFlag: true, startsAt: { gte: now } } }),
      prisma.rosterSlot.groupBy({ by: ['conflictType'], where: { ...slotWindow, conflictFlag: true }, _count: { _all: true } }),
      prisma.sessionCoach.groupBy({
        by: ['coachId'],
        where: { session: sessionWindow },
        _count: { _all: true },
      }),
      prisma.coach.findMany({
        where: { clubId, active: true },
        select: { id: true, name: true, accreditationLevel: true },
      }),
      prisma.gymsport.findMany({ where: { clubId, active: true }, select: { id: true, name: true } }),
      prisma.coachGymsport.findMany({
        where: { coach: { clubId, active: true } },
        select: { gymsportId: true, coachId: true },
      }),
      prisma.rosterSlot.findMany({
        where: { clubId, ...venueFilter, startsAt: { gte: sixMonthsAgo } },
        select: { startsAt: true, conflictFlag: true },
      }),
    ]);

    const conflictRate = totalSlots > 0 ? Math.round((conflictSlots / totalSlots) * 100) : 0;

    // Coach utilisation
    const sessionCountByCoach = new Map<string, number>();
    for (const r of coachSessionRows) sessionCountByCoach.set(r.coachId, r._count._all);
    const coachUtilization = activeCoaches
      .map((c) => ({
        coach: c.name,
        sessions: sessionCountByCoach.get(c.id) || 0,
        accreditation: c.accreditationLevel || '—',
      }))
      .sort((a, b) => b.sessions - a.sessions);
    const idleCoaches = coachUtilization.filter((c) => c.sessions === 0).map((c) => c.coach);
    const activeCount = activeCoaches.length;
    const workingCount = activeCount - idleCoaches.length;
    const avgSessions = workingCount > 0
      ? Math.round((coachSessionRows.reduce((s, r) => s + r._count._all, 0) / workingCount) * 10) / 10
      : 0;

    // Accreditation coverage — gymsports covered by fewer than 2 active coaches are a risk.
    const coachesPerGymsport = new Map<string, number>();
    for (const r of coachGymsportRows) coachesPerGymsport.set(r.gymsportId, (coachesPerGymsport.get(r.gymsportId) || 0) + 1);
    const accreditationCoverage = gymsports
      .map((g) => {
        const coaches = coachesPerGymsport.get(g.id) || 0;
        return { gymsport: g.name, coaches, atRisk: coaches < 2 };
      })
      .sort((a, b) => a.coaches - b.coaches);
    const singleCoverGymsports = accreditationCoverage.filter((g) => g.atRisk).length;

    // Conflict types
    const conflictByType: Bucket[] = conflictTypeRows
      .map((r) => ({ label: r.conflictType || 'Unspecified', value: r._count._all, tone: 'amber' as const }))
      .sort((a, b) => b.value - a.value);

    // Conflict trend (last 6 months)
    const trendMap = new Map<string, { conflicts: number; total: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      trendMap.set(d.toLocaleString('en-US', { month: 'short', year: '2-digit' }), { conflicts: 0, total: 0 });
    }
    for (const r of conflictTrendRows) {
      const k = new Date(r.startsAt).toLocaleString('en-US', { month: 'short', year: '2-digit' });
      const b = trendMap.get(k);
      if (b) {
        b.total += 1;
        if (r.conflictFlag) b.conflicts += 1;
      }
    }
    const conflictTrend: SeriesPoint[] = Array.from(trendMap.entries()).map(([period, v]) => ({
      period,
      conflicts: v.conflicts,
      total: v.total,
    }));

    const kpis: Kpi[] = [
      { key: 'sessions', label: 'Sessions (window)', value: totalSessions, tone: 'neutral', hint: 'last 90d + next 30d' },
      { key: 'conflictRate', label: 'Conflict rate', value: `${conflictRate}%`, tone: conflictRate > 10 ? 'red' : conflictRate > 0 ? 'amber' : 'green', hint: `${conflictSlots} slots` },
      { key: 'upcoming', label: 'Upcoming conflicts', value: upcomingConflicts, tone: upcomingConflicts > 0 ? 'amber' : 'green' },
      { key: 'coaches', label: 'Active coaches', value: activeCount, tone: 'neutral', hint: `${idleCoaches.length} idle` },
      { key: 'avg', label: 'Avg sessions / coach', value: avgSessions, tone: 'neutral' },
      { key: 'cover', label: 'Single-cover gymsports', value: singleCoverGymsports, tone: singleCoverGymsports > 0 ? 'red' : 'green', hint: '< 2 coaches' },
    ];

    const actions: InsightAction[] = [];
    if (upcomingConflicts > 0)
      actions.push({
        severity: 'warning',
        title: `${upcomingConflicts} unresolved conflict${upcomingConflicts > 1 ? 's' : ''} in upcoming rosters`,
        detail: 'Use AI Resolve on the affected rosters.',
        href: '/dashboard/rosters',
      });
    if (singleCoverGymsports > 0)
      actions.push({
        severity: 'critical',
        title: `${singleCoverGymsports} gymsport${singleCoverGymsports > 1 ? 's' : ''} covered by fewer than 2 coaches`,
        detail: accreditationCoverage.filter((g) => g.atRisk).slice(0, 3).map((g) => g.gymsport).join(', '),
        href: '/dashboard/admin-config/coaches',
      });
    if (idleCoaches.length > 0)
      actions.push({
        severity: 'info',
        title: `${idleCoaches.length} active coach${idleCoaches.length > 1 ? 'es' : ''} with no sessions`,
        detail: idleCoaches.slice(0, 4).join(', '),
        href: '/dashboard/admin-config/coaches',
      });
    if (actions.length === 0) actions.push({ severity: 'info', title: 'Rostering is healthy', detail: 'No conflicts or coverage gaps detected.' });

    const facts = [
      `Roster & coaching analytics for ${now.toDateString()} (window: last 90 days + next 30 days).`,
      `Sessions: ${totalSessions}. Roster slots: ${totalSlots}, of which ${conflictSlots} are in conflict (${conflictRate}%). Upcoming unresolved conflicts: ${upcomingConflicts}.`,
      `Coaches: ${activeCount} active, ${idleCoaches.length} idle, average ${avgSessions} sessions per working coach.`,
      `Accreditation: ${singleCoverGymsports} gymsport(s) covered by fewer than 2 active coaches.`,
      ``,
      `Conflict types:`,
      conflictByType.length > 0 ? conflictByType.map((c) => `- ${c.label}: ${c.value}`).join('\n') : '- None.',
      ``,
      `Single-cover gymsports:`,
      accreditationCoverage.filter((g) => g.atRisk).length > 0
        ? accreditationCoverage.filter((g) => g.atRisk).map((g) => `- ${g.gymsport}: ${g.coaches} coach(es)`).join('\n')
        : '- None.',
    ].join('\n');

    const narrative = await generateNarrative(
      'You are a rostering and workforce analytics assistant for a gymnastics club. ' +
        'Write a concise analysis (3-5 short bullet points, plain text, no markdown headings). ' +
        'Lead with conflict risk and any single-coverage gymsport (a staffing single point of failure), then coach utilisation balance, then one recommendation. ' +
        'Only use the numbers provided; never invent data.',
      facts
    );

    return NextResponse.json({
      kpis,
      conflictByType,
      coachUtilization,
      idleCoaches,
      accreditationCoverage,
      conflictTrend,
      insight: { narrative, actions, aiEnabled: Boolean(process.env.OPENAI_API_KEY), generatedAt: new Date().toISOString() },
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Roster analytics failed:', err);
    return NextResponse.json({ error: 'Failed to load roster analytics' }, { status: 500 });
  }
}

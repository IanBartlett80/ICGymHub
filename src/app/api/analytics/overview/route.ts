import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/apiAuth';
import { generateNarrative } from '@/lib/analytics/ai';
import type { Kpi, InsightAction, Tone, SeriesPoint } from '@/lib/analytics/types';

// GET /api/analytics/overview
// Cross-domain command centre: deterministic Safety & Operations score, headline
// KPIs across injuries / equipment / compliance / rosters, per-venue risk and a
// prioritised action list. AI only narrates the computed facts.
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const clubId = auth.user.clubId;
    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const openInjuryWhere = {
      clubId,
      archived: false,
      status: { notIn: ['RESOLVED', 'CLOSED'] },
    } as const;
    const openComplianceWhere = { clubId, isTemplate: false, status: { not: 'COMPLETED' } } as const;
    const openMaintenanceWhere = { clubId, status: { not: 'COMPLETED' } } as const;
    const openSafetyWhere = { clubId, status: { not: 'RESOLVED' } } as const;

    const [
      openInjuries,
      criticalOpenInjuries,
      newInjuries30d,
      totalEquipment,
      needsAttentionEquipment,
      outOfServiceEquipment,
      openSafetyIssues,
      criticalOpenSafetyIssues,
      overdueMaintenance,
      dueSoonMaintenance,
      overdueCompliance,
      dueSoonCompliance,
      openCompliance,
      conflictSlots,
      venues,
      injuriesByVenue,
      criticalInjuriesByVenue,
      safetyByVenue,
      overdueMaintByVenue,
      injuryTrendRows,
    ] = await Promise.all([
      prisma.injurySubmission.count({ where: openInjuryWhere }),
      prisma.injurySubmission.count({ where: { ...openInjuryWhere, priority: { in: ['CRITICAL', 'HIGH'] } } }),
      prisma.injurySubmission.count({ where: { clubId, archived: false, submittedAt: { gte: last30 } } }),
      prisma.equipment.count({ where: { clubId, active: true } }),
      prisma.equipment.count({ where: { clubId, active: true, condition: { in: ['Fair', 'Poor', 'Out of Service'] } } }),
      prisma.equipment.count({ where: { clubId, active: true, condition: 'Out of Service' } }),
      prisma.safetyIssue.count({ where: openSafetyWhere }),
      prisma.safetyIssue.count({ where: { ...openSafetyWhere, priority: 'CRITICAL' } }),
      prisma.maintenanceTask.count({ where: { ...openMaintenanceWhere, dueDate: { lt: now } } }),
      prisma.maintenanceTask.count({ where: { ...openMaintenanceWhere, dueDate: { gte: now, lte: in7 } } }),
      prisma.complianceItem.count({ where: { ...openComplianceWhere, deadlineDate: { lt: now } } }),
      prisma.complianceItem.count({ where: { ...openComplianceWhere, deadlineDate: { gte: now, lte: in7 } } }),
      prisma.complianceItem.count({ where: openComplianceWhere }),
      prisma.rosterSlot.count({ where: { clubId, conflictFlag: true, startsAt: { gte: now } } }),
      prisma.venue.findMany({ where: { clubId, active: true }, select: { id: true, name: true } }),
      prisma.injurySubmission.groupBy({ by: ['venueId'], where: openInjuryWhere, _count: { _all: true } }),
      prisma.injurySubmission.groupBy({
        by: ['venueId'],
        where: { ...openInjuryWhere, priority: { in: ['CRITICAL', 'HIGH'] } },
        _count: { _all: true },
      }),
      prisma.safetyIssue.groupBy({ by: ['venueId'], where: openSafetyWhere, _count: { _all: true } }),
      prisma.maintenanceTask.groupBy({
        by: ['venueId'],
        where: { ...openMaintenanceWhere, dueDate: { lt: now } },
        _count: { _all: true },
      }),
      prisma.injurySubmission.findMany({
        where: { clubId, archived: false, submittedAt: { gte: sixMonthsAgo } },
        select: { submittedAt: true, priority: true },
      }),
    ]);

    // ---- Deterministic Safety & Operations Score (0-100) ----
    // Start at 100 and subtract weighted penalties for live risk, capped at 0.
    const penalties =
      criticalOpenInjuries * 6 +
      (openInjuries - criticalOpenInjuries) * 1.5 +
      criticalOpenSafetyIssues * 6 +
      (openSafetyIssues - criticalOpenSafetyIssues) * 1.5 +
      outOfServiceEquipment * 4 +
      overdueMaintenance * 3 +
      overdueCompliance * 4 +
      conflictSlots * 2;
    const score = Math.max(0, Math.min(100, Math.round(100 - penalties)));
    const scoreTone: Tone = score >= 85 ? 'green' : score >= 65 ? 'amber' : 'red';

    const kpis: Kpi[] = [
      {
        key: 'injuries',
        label: 'Open incidents',
        value: openInjuries,
        tone: criticalOpenInjuries > 0 ? 'red' : openInjuries > 0 ? 'amber' : 'green',
        hint: `${criticalOpenInjuries} critical/high`,
      },
      {
        key: 'safety',
        label: 'Open safety issues',
        value: openSafetyIssues,
        tone: criticalOpenSafetyIssues > 0 ? 'red' : openSafetyIssues > 0 ? 'amber' : 'green',
        hint: `${criticalOpenSafetyIssues} critical`,
      },
      {
        key: 'equipment',
        label: 'Equipment needing attention',
        value: needsAttentionEquipment,
        tone: outOfServiceEquipment > 0 ? 'red' : needsAttentionEquipment > 0 ? 'amber' : 'green',
        hint: `${outOfServiceEquipment} out of service`,
      },
      {
        key: 'maintenance',
        label: 'Maintenance overdue',
        value: overdueMaintenance,
        tone: overdueMaintenance > 0 ? 'red' : dueSoonMaintenance > 0 ? 'amber' : 'green',
        hint: `${dueSoonMaintenance} due in 7 days`,
      },
      {
        key: 'compliance',
        label: 'Compliance overdue',
        value: overdueCompliance,
        tone: overdueCompliance > 0 ? 'red' : dueSoonCompliance > 0 ? 'amber' : 'green',
        hint: `${dueSoonCompliance} due in 7 days`,
      },
      {
        key: 'rosters',
        label: 'Roster conflicts (upcoming)',
        value: conflictSlots,
        tone: conflictSlots > 0 ? 'amber' : 'green',
        hint: 'unresolved class clashes',
      },
    ];

    // ---- Per-venue risk index ----
    const byVenueMap = (rows: { venueId: string | null; _count: { _all: number } }[]) => {
      const m = new Map<string, number>();
      for (const r of rows) if (r.venueId) m.set(r.venueId, r._count._all);
      return m;
    };
    const vInjury = byVenueMap(injuriesByVenue);
    const vCritInjury = byVenueMap(criticalInjuriesByVenue);
    const vSafety = byVenueMap(safetyByVenue);
    const vMaint = byVenueMap(overdueMaintByVenue);

    const venueRisk = venues
      .map((v) => {
        const ci = vCritInjury.get(v.id) || 0;
        const oi = vInjury.get(v.id) || 0;
        const si = vSafety.get(v.id) || 0;
        const om = vMaint.get(v.id) || 0;
        const riskScore = ci * 6 + (oi - ci) * 1.5 + si * 3 + om * 3;
        return {
          venueId: v.id,
          venueName: v.name,
          openIncidents: oi,
          openSafetyIssues: si,
          overdueMaintenance: om,
          riskScore: Math.round(riskScore),
        };
      })
      .sort((a, b) => b.riskScore - a.riskScore);

    // ---- Incident trend (last 6 months) ----
    const trendMap = new Map<string, { total: number; critical: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      trendMap.set(d.toLocaleString('en-US', { month: 'short', year: '2-digit' }), { total: 0, critical: 0 });
    }
    for (const row of injuryTrendRows) {
      const d = new Date(row.submittedAt);
      const key = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      const bucket = trendMap.get(key);
      if (bucket) {
        bucket.total += 1;
        if (row.priority === 'CRITICAL' || row.priority === 'HIGH') bucket.critical += 1;
      }
    }
    const trend: SeriesPoint[] = Array.from(trendMap.entries()).map(([period, v]) => ({
      period,
      incidents: v.total,
      critical: v.critical,
    }));

    // ---- Prioritised actions (deterministic) ----
    const actions: InsightAction[] = [];
    if (criticalOpenSafetyIssues > 0)
      actions.push({
        severity: 'critical',
        title: `${criticalOpenSafetyIssues} critical safety issue${criticalOpenSafetyIssues > 1 ? 's' : ''} open`,
        detail: 'Equipment flagged critical is still unresolved.',
        href: '/dashboard/safety-issues',
      });
    if (criticalOpenInjuries > 0)
      actions.push({
        severity: 'critical',
        title: `${criticalOpenInjuries} high/critical incident${criticalOpenInjuries > 1 ? 's' : ''} unresolved`,
        href: '/dashboard/injury-reports/submissions',
      });
    if (outOfServiceEquipment > 0)
      actions.push({
        severity: 'critical',
        title: `${outOfServiceEquipment} item${outOfServiceEquipment > 1 ? 's' : ''} out of service`,
        href: '/dashboard/equipment',
      });
    if (overdueCompliance > 0)
      actions.push({
        severity: 'warning',
        title: `${overdueCompliance} compliance item${overdueCompliance > 1 ? 's' : ''} overdue`,
        href: '/dashboard/compliance-manager',
      });
    if (overdueMaintenance > 0)
      actions.push({
        severity: 'warning',
        title: `${overdueMaintenance} maintenance task${overdueMaintenance > 1 ? 's' : ''} overdue`,
        href: '/dashboard/equipment/maintenance',
      });
    if (conflictSlots > 0)
      actions.push({
        severity: 'warning',
        title: `${conflictSlots} roster conflict${conflictSlots > 1 ? 's' : ''} upcoming`,
        detail: 'Use AI Resolve on the affected rosters.',
        href: '/dashboard/rosters',
      });
    if (dueSoonCompliance > 0)
      actions.push({
        severity: 'info',
        title: `${dueSoonCompliance} compliance item${dueSoonCompliance > 1 ? 's' : ''} due within 7 days`,
        href: '/dashboard/compliance-manager',
      });
    if (actions.length === 0)
      actions.push({ severity: 'info', title: 'No urgent risks detected', detail: 'All key indicators are healthy.' });

    const facts = [
      `Club operations snapshot for ${now.toDateString()}.`,
      `Safety & Operations Score: ${score}/100 (${scoreTone}).`,
      ``,
      `Incidents: ${openInjuries} open (${criticalOpenInjuries} high/critical), ${newInjuries30d} new in last 30 days.`,
      `Equipment: ${totalEquipment} active, ${needsAttentionEquipment} needing attention, ${outOfServiceEquipment} out of service.`,
      `Safety issues: ${openSafetyIssues} open (${criticalOpenSafetyIssues} critical).`,
      `Maintenance: ${overdueMaintenance} overdue, ${dueSoonMaintenance} due within 7 days.`,
      `Compliance: ${overdueCompliance} overdue, ${dueSoonCompliance} due within 7 days, ${openCompliance} open total.`,
      `Rosters: ${conflictSlots} unresolved conflicts in upcoming rosters.`,
      ``,
      `Highest-risk venues:`,
      venueRisk.length > 0
        ? venueRisk
            .slice(0, 5)
            .map(
              (v) =>
                `- ${v.venueName}: risk ${v.riskScore} (${v.openIncidents} incidents, ${v.openSafetyIssues} safety, ${v.overdueMaintenance} overdue maintenance)`
            )
            .join('\n')
        : '- No venues configured.',
    ].join('\n');

    const narrative = await generateNarrative(
      'You are the executive operations assistant for a gymnastics club director. ' +
        'Write a brief command-centre briefing (3-5 short bullet points, plain text, no markdown headings). ' +
        'Lead with the single most urgent risk, name the most at-risk venue if one stands out, then summarise overall health and one positive note if warranted. ' +
        'Only use the numbers provided; never invent data.',
      facts
    );

    return NextResponse.json({
      score,
      scoreTone,
      kpis,
      trend,
      venueRisk,
      insight: {
        narrative,
        actions,
        aiEnabled: Boolean(process.env.OPENAI_API_KEY),
        generatedAt: new Date().toISOString(),
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Analytics overview failed:', err);
    return NextResponse.json({ error: 'Failed to load overview' }, { status: 500 });
  }
}

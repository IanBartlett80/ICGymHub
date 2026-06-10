/**
 * Builds compact, PII-free, club-scoped analytics aggregates. Used both as
 * grounding context for the "Ask Your Data" assistant and as the data source
 * for branded analytics PDF exports. Only aggregated counts and venue names are
 * included — never member, coach or submitter personal data.
 */
import { prisma } from '@/lib/prisma';

export interface ClubMetrics {
  generatedAt: string;
  venues: { id: string; name: string }[];
  injuries: {
    open: number;
    critical: number;
    new30d: number;
    resolved30d: number;
    statusBreakdown: { label: string; value: number }[];
    byVenue: { label: string; value: number }[];
  };
  equipment: {
    active: number;
    conditionBreakdown: { label: string; value: number }[];
  };
  safety: { open: number; critical: number };
  maintenance: { overdue: number; due7: number };
  compliance: {
    open: number;
    overdue: number;
    due7: number;
    completed: number;
    completionRate: number;
  };
  rosters: {
    sessions: number;
    conflictSlots: number;
    upcomingConflicts: number;
    activeCoaches: number;
  };
}

export async function getClubMetrics(clubId: string): Promise<ClubMetrics> {
  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const windowStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const openInjuryWhere = { clubId, archived: false, status: { notIn: ['RESOLVED', 'CLOSED'] } } as const;
  const openComplianceWhere = { clubId, isTemplate: false, status: { not: 'COMPLETED' } } as const;
  const openMaintenanceWhere = { clubId, status: { not: 'COMPLETED' } } as const;
  const openSafetyWhere = { clubId, status: { not: 'RESOLVED' } } as const;

  const [
    openInjuries,
    criticalInjuries,
    newInjuries30d,
    resolvedInjuries30d,
    injuriesByStatus,
    totalEquipment,
    equipmentByCondition,
    openSafety,
    criticalSafety,
    overdueMaint,
    dueMaint7,
    overdueCompliance,
    dueCompliance7,
    openCompliance,
    completedCompliance,
    conflictSlots,
    upcomingConflicts,
    totalSessions,
    activeCoaches,
    venues,
    injuriesByVenue,
  ] = await Promise.all([
    prisma.injurySubmission.count({ where: openInjuryWhere }),
    prisma.injurySubmission.count({ where: { ...openInjuryWhere, priority: { in: ['CRITICAL', 'HIGH'] } } }),
    prisma.injurySubmission.count({ where: { clubId, archived: false, submittedAt: { gte: last30 } } }),
    prisma.injurySubmission.count({ where: { clubId, status: { in: ['RESOLVED', 'CLOSED'] }, resolvedAt: { gte: last30 } } }),
    prisma.injurySubmission.groupBy({ by: ['status'], where: { clubId, archived: false }, _count: { _all: true } }),
    prisma.equipment.count({ where: { clubId, active: true } }),
    prisma.equipment.groupBy({ by: ['condition'], where: { clubId, active: true }, _count: { _all: true } }),
    prisma.safetyIssue.count({ where: openSafetyWhere }),
    prisma.safetyIssue.count({ where: { ...openSafetyWhere, priority: 'CRITICAL' } }),
    prisma.maintenanceTask.count({ where: { ...openMaintenanceWhere, dueDate: { lt: now } } }),
    prisma.maintenanceTask.count({ where: { ...openMaintenanceWhere, dueDate: { gte: now, lte: in7 } } }),
    prisma.complianceItem.count({ where: { ...openComplianceWhere, deadlineDate: { lt: now } } }),
    prisma.complianceItem.count({ where: { ...openComplianceWhere, deadlineDate: { gte: now, lte: in7 } } }),
    prisma.complianceItem.count({ where: openComplianceWhere }),
    prisma.complianceItem.count({ where: { clubId, isTemplate: false, status: 'COMPLETED' } }),
    prisma.rosterSlot.count({ where: { clubId, conflictFlag: true, startsAt: { gte: windowStart, lte: windowEnd } } }),
    prisma.rosterSlot.count({ where: { clubId, conflictFlag: true, startsAt: { gte: now } } }),
    prisma.classSession.count({ where: { clubId, date: { gte: windowStart, lte: windowEnd } } }),
    prisma.coach.count({ where: { clubId, active: true } }),
    prisma.venue.findMany({ where: { clubId, active: true }, select: { id: true, name: true } }),
    prisma.injurySubmission.groupBy({ by: ['venueId'], where: openInjuryWhere, _count: { _all: true } }),
  ]);

  const venueName = new Map(venues.map((v) => [v.id, v.name]));
  const complianceTracked = openCompliance + completedCompliance;
  const completionRate = complianceTracked > 0 ? Math.round((completedCompliance / complianceTracked) * 100) : 100;

  return {
    generatedAt: now.toISOString(),
    venues,
    injuries: {
      open: openInjuries,
      critical: criticalInjuries,
      new30d: newInjuries30d,
      resolved30d: resolvedInjuries30d,
      statusBreakdown: injuriesByStatus.map((r) => ({ label: r.status, value: r._count._all })),
      byVenue: injuriesByVenue
        .filter((r) => r.venueId)
        .map((r) => ({ label: venueName.get(r.venueId as string) || 'Unknown', value: r._count._all })),
    },
    equipment: {
      active: totalEquipment,
      conditionBreakdown: equipmentByCondition.map((r) => ({ label: r.condition || 'Unspecified', value: r._count._all })),
    },
    safety: { open: openSafety, critical: criticalSafety },
    maintenance: { overdue: overdueMaint, due7: dueMaint7 },
    compliance: {
      open: openCompliance,
      overdue: overdueCompliance,
      due7: dueCompliance7,
      completed: completedCompliance,
      completionRate,
    },
    rosters: {
      sessions: totalSessions,
      conflictSlots,
      upcomingConflicts,
      activeCoaches,
    },
  };
}

/** PII-free text snapshot used as grounding context for the AI assistant. */
export async function buildClubSnapshot(clubId: string): Promise<string> {
  const m = await getClubMetrics(clubId);
  const statusBreakdown = m.injuries.statusBreakdown.map((r) => `${r.label}: ${r.value}`).join(', ');
  const conditionBreakdown = m.equipment.conditionBreakdown.map((r) => `${r.label}: ${r.value}`).join(', ');
  const injuriesPerVenue = m.injuries.byVenue.map((r) => `${r.label}: ${r.value}`).join(', ');

  return [
    `Snapshot date: ${new Date(m.generatedAt).toDateString()}.`,
    `Venues: ${m.venues.map((v) => v.name).join(', ') || 'none'}.`,
    ``,
    `INCIDENTS/INJURIES: ${m.injuries.open} open (${m.injuries.critical} high/critical), ${m.injuries.new30d} new in last 30 days, ${m.injuries.resolved30d} resolved in last 30 days. Status breakdown: ${statusBreakdown || 'none'}. Open incidents by venue: ${injuriesPerVenue || 'none'}.`,
    `EQUIPMENT: ${m.equipment.active} active items. Condition breakdown: ${conditionBreakdown || 'none'}.`,
    `SAFETY ISSUES: ${m.safety.open} open (${m.safety.critical} critical).`,
    `MAINTENANCE: ${m.maintenance.overdue} overdue, ${m.maintenance.due7} due within 7 days.`,
    `COMPLIANCE: ${m.compliance.open} open, ${m.compliance.overdue} overdue, ${m.compliance.due7} due within 7 days, completion rate ${m.compliance.completionRate}%.`,
    `ROSTERS/COACHING: ${m.rosters.sessions} sessions in window (last 90d + next 30d), ${m.rosters.conflictSlots} conflict slots in window, ${m.rosters.upcomingConflicts} unresolved upcoming conflicts, ${m.rosters.activeCoaches} active coaches.`,
  ].join('\n');
}

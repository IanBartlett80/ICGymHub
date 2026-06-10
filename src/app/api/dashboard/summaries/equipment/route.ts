import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/apiAuth';
import { buildAISummary, SummaryMetric } from '@/lib/aiSummary';

const OPEN_SAFETY_STATUSES = ['OPEN', 'IN_PROGRESS'];
const OPEN_TASK_STATUSES = ['PENDING', 'IN_PROGRESS'];
const GOOD_CONDITIONS = ['good', 'excellent', 'new', 'very good'];

// GET /api/dashboard/summaries/equipment
// AI overview of all zones, outstanding maintenance tasks and equipment with
// reported safety issues. Metrics are computed deterministically.
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const clubId = auth.user.clubId;
    const now = new Date();
    const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [zones, equipment, safetyIssues, tasks] = await Promise.all([
      prisma.zone.findMany({
        where: { clubId, active: true },
        select: { id: true, name: true },
      }),
      prisma.equipment.findMany({
        where: { clubId, active: true },
        select: { id: true, name: true, condition: true, zoneId: true },
      }),
      prisma.safetyIssue.findMany({
        where: { clubId, status: { in: OPEN_SAFETY_STATUSES } },
        select: { equipmentId: true, issueType: true, priority: true, title: true },
      }),
      prisma.maintenanceTask.findMany({
        where: { clubId, status: { in: OPEN_TASK_STATUSES } },
        select: { equipmentId: true, title: true, dueDate: true, priority: true },
      }),
    ]);

    const equipmentById = new Map(equipment.map((e) => [e.id, e]));
    const zoneNameById = new Map(zones.map((z) => [z.id, z.name]));

    // Equipment in poor condition.
    const poorCondition = equipment.filter(
      (e) => e.condition && !GOOD_CONDITIONS.includes(e.condition.toLowerCase())
    );

    const criticalSafety = safetyIssues.filter(
      (s) => (s.issueType || '').toUpperCase() === 'CRITICAL' || (s.priority || '').toUpperCase() === 'CRITICAL'
    ).length;

    const overdueTasks = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < now);
    const dueThisWeek = tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) >= now && new Date(t.dueDate) <= sevenDaysOut
    );

    // Per-zone aggregation.
    type ZoneAgg = { name: string; equipment: number; safety: number; overdue: number };
    const zoneAgg = new Map<string, ZoneAgg>();
    for (const z of zones) zoneAgg.set(z.id, { name: z.name, equipment: 0, safety: 0, overdue: 0 });
    const unassigned: ZoneAgg = { name: 'Unassigned / no zone', equipment: 0, safety: 0, overdue: 0 };

    for (const e of equipment) {
      const agg = (e.zoneId && zoneAgg.get(e.zoneId)) || unassigned;
      agg.equipment++;
    }
    for (const s of safetyIssues) {
      const eq = s.equipmentId ? equipmentById.get(s.equipmentId) : undefined;
      const agg = (eq?.zoneId && zoneAgg.get(eq.zoneId)) || unassigned;
      agg.safety++;
    }
    for (const t of overdueTasks) {
      const eq = t.equipmentId ? equipmentById.get(t.equipmentId) : undefined;
      const agg = (eq?.zoneId && zoneAgg.get(eq.zoneId)) || unassigned;
      agg.overdue++;
    }

    const zoneLines = [...zoneAgg.values(), unassigned]
      .filter((z) => z.equipment > 0 || z.safety > 0 || z.overdue > 0)
      .map(
        (z) => `- ${z.name}: ${z.equipment} item(s), ${z.safety} open safety issue(s), ${z.overdue} overdue task(s)`
      )
      .join('\n');

    const metrics: SummaryMetric[] = [
      { label: 'active zones', value: zones.length, tone: 'neutral' },
      { label: 'equipment tracked', value: equipment.length, tone: 'neutral' },
      { label: 'open safety issues', value: safetyIssues.length, tone: safetyIssues.length > 0 ? 'red' : 'green' },
      { label: 'overdue maintenance', value: overdueTasks.length, tone: overdueTasks.length > 0 ? 'red' : 'green' },
      { label: 'due in 7 days', value: dueThisWeek.length, tone: dueThisWeek.length > 0 ? 'amber' : 'green' },
    ];

    const safetyLines = safetyIssues
      .slice(0, 8)
      .map((s) => {
        const eq = s.equipmentId ? equipmentById.get(s.equipmentId) : undefined;
        const zoneName = eq?.zoneId ? zoneNameById.get(eq.zoneId) || 'unknown zone' : 'no zone';
        return `- ${s.title} on ${eq?.name || 'equipment'} (${zoneName}) — ${s.issueType || ''} ${s.priority || ''}`.trim();
      })
      .join('\n');

    const overdueLines = overdueTasks
      .slice(0, 8)
      .map((t) => {
        const eq = t.equipmentId ? equipmentById.get(t.equipmentId) : undefined;
        const daysOver = t.dueDate
          ? Math.floor((now.getTime() - new Date(t.dueDate).getTime()) / (24 * 60 * 60 * 1000))
          : 0;
        return `- ${t.title} on ${eq?.name || 'equipment'} (${daysOver} day(s) overdue, ${t.priority})`;
      })
      .join('\n');

    const poorLines = poorCondition
      .slice(0, 8)
      .map((e) => {
        const zoneName = e.zoneId ? zoneNameById.get(e.zoneId) || 'unknown zone' : 'no zone';
        return `- ${e.name} (${e.condition}, ${zoneName})`;
      })
      .join('\n');

    const facts = [
      `Equipment & maintenance snapshot for ${now.toDateString()}.`,
      ``,
      `Active zones: ${zones.length}. Equipment tracked: ${equipment.length}.`,
      `Open safety issues: ${safetyIssues.length} (critical: ${criticalSafety}).`,
      `Outstanding maintenance tasks: ${tasks.length} — overdue: ${overdueTasks.length}, due in next 7 days: ${dueThisWeek.length}.`,
      `Equipment in below-standard condition: ${poorCondition.length}.`,
      ``,
      `Zone overview:`,
      zoneLines || '- No active zones with equipment.',
      ``,
      `Open safety issues:`,
      safetyLines || '- None.',
      ``,
      `Overdue maintenance:`,
      overdueLines || '- None.',
      ``,
      `Equipment needing attention (condition):`,
      poorLines || '- None.',
    ].join('\n');

    const summary = await buildAISummary({
      system:
        'You are a facilities and equipment-management assistant for a gymnastics club. ' +
        'Write a concise overview (3–5 short bullet points, plain text, no markdown headings) for an admin. ' +
        'Give an overall picture of the zones, then the outstanding maintenance tasks (especially overdue ones) and any equipment with reported safety issues or poor condition that needs attention. ' +
        'Lead with the most urgent safety and overdue items. Only use the numbers and facts provided; never invent data. If everything is in good shape, say so briefly.',
      facts,
      metrics,
    });

    return NextResponse.json(summary);
  } catch (err) {
    console.error('Equipment AI summary failed:', err);
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
}

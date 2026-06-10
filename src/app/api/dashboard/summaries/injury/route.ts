import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/apiAuth';
import { buildAISummary, SummaryMetric } from '@/lib/aiSummary';

const OPEN_STATUSES = ['NEW', 'UNDER_REVIEW'];

// GET /api/dashboard/summaries/injury
// AI overview of newly submitted incident/injury reports and outstanding
// actions (unassigned, unresolved, high priority). Metrics are deterministic.
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const clubId = auth.user.clubId;
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      newCount,
      underReviewCount,
      recentCount,
      unassignedCount,
      criticalOpen,
      highOpen,
      openTotal,
      recent,
    ] = await Promise.all([
      prisma.injurySubmission.count({ where: { clubId, archived: false, status: 'NEW' } }),
      prisma.injurySubmission.count({ where: { clubId, archived: false, status: 'UNDER_REVIEW' } }),
      prisma.injurySubmission.count({
        where: { clubId, archived: false, submittedAt: { gte: sevenDaysAgo } },
      }),
      prisma.injurySubmission.count({
        where: {
          clubId,
          archived: false,
          status: { in: OPEN_STATUSES },
          assignedToUserId: null,
          assignedToName: null,
        },
      }),
      prisma.injurySubmission.count({
        where: { clubId, archived: false, status: { in: OPEN_STATUSES }, priority: 'CRITICAL' },
      }),
      prisma.injurySubmission.count({
        where: { clubId, archived: false, status: { in: OPEN_STATUSES }, priority: 'HIGH' },
      }),
      prisma.injurySubmission.count({
        where: { clubId, archived: false, status: { in: OPEN_STATUSES } },
      }),
      prisma.injurySubmission.findMany({
        where: { clubId, archived: false, status: { in: OPEN_STATUSES } },
        orderBy: { submittedAt: 'desc' },
        take: 10,
        select: {
          templateName: true,
          priority: true,
          status: true,
          submittedAt: true,
          assignedToName: true,
        },
      }),
    ]);

    const metrics: SummaryMetric[] = [
      { label: 'new', value: newCount, tone: newCount > 0 ? 'red' : 'green' },
      { label: 'under review', value: underReviewCount, tone: underReviewCount > 0 ? 'amber' : 'green' },
      { label: 'unassigned', value: unassignedCount, tone: unassignedCount > 0 ? 'red' : 'green' },
      { label: 'critical open', value: criticalOpen, tone: criticalOpen > 0 ? 'red' : 'green' },
      { label: 'outstanding total', value: openTotal, tone: 'neutral' },
    ];

    const recentLines = recent
      .map((r) => {
        const ageDays = Math.floor((now.getTime() - new Date(r.submittedAt).getTime()) / (24 * 60 * 60 * 1000));
        const ageLabel = ageDays <= 0 ? 'today' : ageDays === 1 ? '1 day ago' : `${ageDays} days ago`;
        const assigned = r.assignedToName ? `assigned to ${r.assignedToName}` : 'UNASSIGNED';
        return `- ${r.templateName || 'Report'} (${r.priority || 'no priority'}, ${r.status}, submitted ${ageLabel}, ${assigned})`;
      })
      .join('\n');

    const facts = [
      `Injury & incident snapshot for ${now.toDateString()}.`,
      ``,
      `Newly submitted in last 7 days: ${recentCount}.`,
      `Status — NEW: ${newCount}, UNDER_REVIEW: ${underReviewCount}.`,
      `Outstanding (open) reports total: ${openTotal}.`,
      `Unassigned open reports: ${unassignedCount}.`,
      `Open by priority — CRITICAL: ${criticalOpen}, HIGH: ${highOpen}.`,
      ``,
      `Most recent open reports:`,
      recentLines || '- None.',
    ].join('\n');

    const summary = await buildAISummary({
      system:
        'You are an incident-management assistant for a gymnastics club. ' +
        'Write a concise overview (3–5 short bullet points, plain text, no markdown headings) for an admin. ' +
        'Highlight newly submitted reports, anything still unassigned, critical/high-priority items, and the outstanding actions that need attention. ' +
        'Prioritise by urgency. Only use the numbers and facts provided; never invent data. If the queue is clear, say so briefly.',
      facts,
      metrics,
    });

    return NextResponse.json(summary);
  } catch (err) {
    console.error('Injury AI summary failed:', err);
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
}

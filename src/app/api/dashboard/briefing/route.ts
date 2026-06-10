import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/apiAuth';
import { generateChatCompletion, isOpenAIConfigured } from '@/lib/openai';

interface BriefingMetrics {
  overdueCompliance: number;
  complianceDueIn30Days: number;
  openIncidents: number;
  criticalSafetyIssues: number;
  overdueMaintenance: number;
  maintenanceDueThisWeek: number;
  rosterConflicts: number;
  weeklyClasses: number;
}

/**
 * Computes a deterministic 0-100 facility health score from real club metrics.
 * The score is always calculated in code — the AI only narrates these facts,
 * it never invents the number.
 */
function computeHealthScore(m: BriefingMetrics): number {
  let score = 100;
  score -= Math.min(m.overdueCompliance * 8, 32);
  score -= Math.min(m.criticalSafetyIssues * 10, 30);
  score -= Math.min(m.openIncidents * 5, 25);
  score -= Math.min(m.overdueMaintenance * 5, 20);
  score -= Math.min(m.maintenanceDueThisWeek * 2, 10);
  score -= Math.min(m.rosterConflicts * 3, 15);
  return Math.max(0, Math.min(100, score));
}

function statusFromScore(score: number): 'GREEN' | 'YELLOW' | 'RED' {
  if (score >= 80) return 'GREEN';
  if (score >= 50) return 'YELLOW';
  return 'RED';
}

// GET /api/dashboard/briefing - Daily briefing for the authenticated admin's club.
export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clubId = authResult.user.clubId;
    const now = new Date();

    // Current week boundaries (Monday–Sunday).
    const currentDay = now.getDay();
    const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - daysFromMonday);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const [
      overdueCompliance,
      complianceDueIn30Days,
      openIncidents,
      criticalSafetyIssues,
      overdueMaintenance,
      maintenanceDueThisWeek,
      rosterConflicts,
      weeklyClasses,
      club,
    ] = await Promise.all([
      prisma.complianceItem.count({
        where: { clubId, status: { not: 'COMPLETED' }, deadlineDate: { lt: now } },
      }),
      prisma.complianceItem.count({
        where: {
          clubId,
          status: { not: 'COMPLETED' },
          deadlineDate: { gte: now, lte: thirtyDaysFromNow },
        },
      }),
      prisma.injurySubmission.count({
        where: { clubId, status: { in: ['NEW', 'UNDER_REVIEW'] } },
      }),
      prisma.safetyIssue.count({
        where: { clubId, status: 'OPEN', issueType: 'CRITICAL' },
      }),
      prisma.maintenanceTask.count({
        where: { clubId, status: { not: 'COMPLETED' }, dueDate: { lt: now } },
      }),
      prisma.equipment.count({
        where: {
          clubId,
          active: true,
          nextMaintenance: { gte: now, lte: sevenDaysFromNow },
        },
      }),
      prisma.rosterSlot.count({
        where: {
          clubId,
          conflictFlag: true,
          session: { date: { gte: monday, lte: sunday } },
        },
      }),
      prisma.classSession.count({
        where: { clubId, date: { gte: monday, lte: sunday } },
      }),
      prisma.club.findUnique({ where: { id: clubId }, select: { name: true } }),
    ]);

    const metrics: BriefingMetrics = {
      overdueCompliance,
      complianceDueIn30Days,
      openIncidents,
      criticalSafetyIssues,
      overdueMaintenance,
      maintenanceDueThisWeek,
      rosterConflicts,
      weeklyClasses,
    };

    const healthScore = computeHealthScore(metrics);
    const status = statusFromScore(healthScore);
    const clubName = club?.name ?? authResult.user.fullName;

    let narrative: string | null = null;

    if (isOpenAIConfigured()) {
      const facts = [
        `Club: ${clubName}`,
        `Facility health score: ${healthScore}/100 (${status})`,
        `Overdue compliance items: ${overdueCompliance}`,
        `Compliance items due in next 30 days: ${complianceDueIn30Days}`,
        `Open injury/incident reports: ${openIncidents}`,
        `Open CRITICAL equipment safety issues: ${criticalSafetyIssues}`,
        `Overdue maintenance tasks: ${overdueMaintenance}`,
        `Equipment maintenance due in next 7 days: ${maintenanceDueThisWeek}`,
        `Roster conflicts this week: ${rosterConflicts}`,
        `Scheduled classes this week: ${weeklyClasses}`,
      ].join('\n');

      const system = [
        'You are "Coach", a friendly safety operations assistant for a gymnastics club management platform.',
        'Write a short daily briefing for the club administrator based ONLY on the metrics provided.',
        'Structure: a one-sentence greeting referencing the health score and status, then a short "Top priorities" list of the most pressing items (overdue compliance, critical safety issues, open incidents, overdue maintenance), then a brief encouraging closing line.',
        'Keep it under 130 words. Be specific with the numbers provided. Do NOT invent any data, names, or figures not given.',
        'If all metrics are zero or low, congratulate them and keep it brief. Use plain text, no markdown headings.',
      ].join(' ');

      try {
        narrative = await generateChatCompletion({
          system,
          user: facts,
          maxTokens: 300,
          temperature: 0.4,
        });
      } catch (err) {
        // Non-fatal: fall back to deterministic metrics only.
        console.error('Daily briefing narrative generation failed:', err);
        narrative = null;
      }
    }

    return NextResponse.json({
      clubName,
      healthScore,
      status,
      metrics,
      narrative,
      aiEnabled: isOpenAIConfigured(),
      generatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error('Error generating daily briefing:', error);
    return NextResponse.json({ error: 'Failed to generate briefing' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/apiAuth';
import { buildAISummary, SummaryMetric } from '@/lib/aiSummary';

const DAY_CODES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// GET /api/dashboard/summaries/rosters
// AI overview of upcoming class schedules, scheduling/coaching conflicts and
// coaching-availability recommendations. Metrics are computed deterministically.
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const clubId = auth.user.clubId;
    const now = new Date();

    const startToday = new Date(now);
    startToday.setHours(0, 0, 0, 0);

    // Week boundaries (Monday–Sunday).
    const currentDay = now.getDay();
    const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;
    const monday = new Date(startToday);
    monday.setDate(startToday.getDate() - daysFromMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const nextMonday = new Date(monday);
    nextMonday.setDate(monday.getDate() + 7);
    const nextSunday = new Date(sunday);
    nextSunday.setDate(sunday.getDate() + 7);

    const twoWeeksOut = new Date(startToday);
    twoWeeksOut.setDate(startToday.getDate() + 14);

    const [
      weeklyClasses,
      nextWeekClasses,
      upcomingClasses,
      conflictSessions,
      conflictSlots,
      activeCoaches,
      upcomingSessions,
    ] = await Promise.all([
      prisma.classSession.count({ where: { clubId, date: { gte: monday, lte: sunday } } }),
      prisma.classSession.count({ where: { clubId, date: { gte: nextMonday, lte: nextSunday } } }),
      prisma.classSession.count({ where: { clubId, date: { gte: startToday } } }),
      prisma.classSession.count({ where: { clubId, conflictFlag: true, date: { gte: startToday } } }),
      prisma.rosterSlot.findMany({
        where: { clubId, conflictFlag: true, startsAt: { gte: startToday } },
        select: { conflictType: true },
      }),
      prisma.coach.findMany({
        where: { clubId, active: true },
        select: {
          name: true,
          availability: { select: { dayOfWeek: true, startTimeLocal: true, endTimeLocal: true } },
        },
      }),
      prisma.classSession.findMany({
        where: { clubId, date: { gte: startToday, lte: twoWeeksOut } },
        orderBy: { date: 'asc' },
        take: 80,
        select: {
          date: true,
          startTimeLocal: true,
          endTimeLocal: true,
          template: { select: { name: true } },
          coaches: { select: { coach: { select: { name: true } } } },
        },
      }),
    ]);

    // Conflict slot breakdown by type.
    const conflictByType = { coach: 0, zone: 0, both: 0, other: 0 };
    for (const s of conflictSlots) {
      const t = (s.conflictType || '').toLowerCase();
      if (t === 'coach') conflictByType.coach++;
      else if (t === 'zone') conflictByType.zone++;
      else if (t === 'both') conflictByType.both++;
      else conflictByType.other++;
    }

    // Coach availability lookup: name -> availability windows by day code.
    const availabilityByCoach = new Map<
      string,
      Array<{ day: string; start: string; end: string }>
    >();
    for (const c of activeCoaches) {
      availabilityByCoach.set(
        c.name,
        c.availability.map((a) => ({ day: a.dayOfWeek, start: a.startTimeLocal, end: a.endTimeLocal }))
      );
    }

    // Detect coaches assigned outside their stated availability.
    const mismatches: string[] = [];
    for (const session of upcomingSessions) {
      const dayCode = DAY_CODES[new Date(session.date).getDay()];
      for (const link of session.coaches) {
        const coachName = link.coach.name;
        const windows = availabilityByCoach.get(coachName);
        // Only flag coaches we actually have availability data for.
        if (!windows || windows.length === 0) continue;
        const covered = windows.some(
          (w) =>
            w.day === dayCode &&
            w.start <= session.startTimeLocal &&
            w.end >= session.endTimeLocal
        );
        if (!covered) {
          const dateLabel = new Date(session.date).toLocaleDateString(undefined, {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          });
          mismatches.push(
            `${coachName} assigned to "${session.template?.name || 'class'}" on ${dateLabel} ${session.startTimeLocal}-${session.endTimeLocal}, outside stated availability`
          );
        }
      }
    }

    // Per-day class counts for this week.
    const perDay = new Map<string, number>();
    for (const session of upcomingSessions) {
      const d = new Date(session.date);
      if (d >= monday && d <= sunday) {
        const label = DAY_LABELS[d.getDay()];
        perDay.set(label, (perDay.get(label) || 0) + 1);
      }
    }

    const totalConflictSlots = conflictSlots.length;
    const metrics: SummaryMetric[] = [
      { label: 'classes this week', value: weeklyClasses, tone: 'neutral' },
      { label: 'classes next week', value: nextWeekClasses, tone: 'neutral' },
      { label: 'scheduling conflicts', value: conflictSessions, tone: conflictSessions > 0 ? 'red' : 'green' },
      { label: 'availability mismatches', value: mismatches.length, tone: mismatches.length > 0 ? 'amber' : 'green' },
      { label: 'active coaches', value: activeCoaches.length, tone: 'neutral' },
    ];

    // Compact availability reference so the model can recommend alternatives.
    const availabilityReference = activeCoaches
      .slice(0, 18)
      .map((c) => {
        const windows = c.availability
          .map((a) => `${a.dayOfWeek} ${a.startTimeLocal}-${a.endTimeLocal}`)
          .join('; ');
        return `- ${c.name}: ${windows || 'no availability recorded'}`;
      })
      .join('\n');

    const perDayLines = DAY_LABELS.slice(1)
      .concat(DAY_LABELS[0])
      .filter((d) => perDay.has(d))
      .map((d) => `- ${d}: ${perDay.get(d)} class(es)`)
      .join('\n');

    const facts = [
      `Club rostering snapshot for ${startToday.toDateString()}.`,
      ``,
      `Classes this week (Mon–Sun): ${weeklyClasses}.`,
      `Classes next week: ${nextWeekClasses}.`,
      `Total upcoming classes from today: ${upcomingClasses}.`,
      perDayLines ? `This week by day:\n${perDayLines}` : `No classes scheduled this week.`,
      ``,
      `Sessions flagged with conflicts (from today): ${conflictSessions}.`,
      `Conflict slots by type — coach: ${conflictByType.coach}, zone: ${conflictByType.zone}, both: ${conflictByType.both}, other: ${conflictByType.other} (total ${totalConflictSlots}).`,
      ``,
      `Coaching availability mismatches (next 14 days): ${mismatches.length}.`,
      mismatches.length > 0 ? mismatches.slice(0, 10).map((m) => `- ${m}`).join('\n') : `- None detected.`,
      ``,
      `Active coach availability reference:`,
      availabilityReference || '- No coaches with recorded availability.',
    ].join('\n');

    const summary = await buildAISummary({
      system:
        'You are an operations assistant for a gymnastics club\'s class rostering. ' +
        'Write a concise overview (3–5 short bullet points, plain text, no markdown headings) for an admin. ' +
        'Cover: the upcoming class schedule load, any scheduling or coaching conflicts, and the coaching availability mismatches. ' +
        'When there are availability mismatches, recommend a specific reassignment using the availability reference (name a coach who IS available for that day/time when one exists). ' +
        'Only use the numbers and facts provided; never invent data. If everything is clear, say so briefly.',
      facts,
      metrics,
    });

    return NextResponse.json(summary);
  } catch (err) {
    console.error('Rosters AI summary failed:', err);
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
}

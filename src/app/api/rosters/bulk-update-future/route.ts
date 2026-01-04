import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';

// PATCH /api/rosters/bulk-update-future - Update this and all future rosters in template
export async function PATCH(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || request.cookies.get('accessToken')?.value;
    const payload = token ? verifyAccessToken(token) : null;
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { templateId, dayOfWeek, startDate, sessionId, coachIds, startTime, endTime } = body;

    if (!templateId || !dayOfWeek || !startDate) {
      return NextResponse.json(
        { error: 'Template ID, day of week, and start date are required' },
        { status: 400 }
      );
    }

    // Find all future rosters with the same template and day of week
    const futureRosters = await prisma.roster.findMany({
      where: {
        templateId,
        dayOfWeek,
        startDate: {
          gte: new Date(startDate),
        },
        clubId: payload.clubId,
      },
      include: {
        sessions: {
          include: {
            classTemplate: true,
            zone: true,
            slots: true,
          },
        },
      },
    });

    // Get the session's class template ID to match across rosters
    const originalSession = await prisma.classSession.findUnique({
      where: { id: sessionId },
      include: { template: true, zone: true },
    });

    if (!originalSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    let updatedCount = 0;

    // Update each matching session in future rosters
    for (const roster of futureRosters) {
      // Find the matching session (same class template and zone)
      const matchingSession = roster.sessions.find(
        (s) => 
          s.classTemplateId === originalSession.classTemplateId &&
          s.zoneId === originalSession.zoneId
      );

      if (matchingSession) {
        // Update coach assignments if provided
        if (coachIds !== undefined) {
          // Delete existing coach assignments
          await prisma.sessionCoach.deleteMany({
            where: { sessionId: matchingSession.id },
          });

          // Create new coach assignments
          if (coachIds.length > 0) {
            await prisma.sessionCoach.createMany({
              data: coachIds.map((coachId: string) => ({
                sessionId: matchingSession.id,
                coachId,
              })),
            });
          }
        }

        // Update session times if provided
        if (startTime || endTime) {
          const updateData: any = {};
          if (startTime) {
            // Combine roster date with new time
            const sessionDate = new Date(roster.startDate);
            const [hours, minutes] = startTime.split(':');
            sessionDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            updateData.startTime = sessionDate;
          }
          if (endTime) {
            const sessionDate = new Date(roster.startDate);
            const [hours, minutes] = endTime.split(':');
            sessionDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            updateData.endTime = sessionDate;
          }

          await prisma.classSession.update({
            where: { id: matchingSession.id },
            data: updateData,
          });

          // Update slots if times changed
          if (startTime || endTime) {
            const slots = await prisma.rosterSlot.findMany({
              where: { sessionId: matchingSession.id },
              orderBy: { startsAt: 'asc' },
            });

            // Recalculate slot times based on rotation
            for (let i = 0; i < slots.length; i++) {
              const slot = slots[i];
              const rotationMs = (slot.endsAt.getTime() - slot.startsAt.getTime());
              const newStart = new Date(updateData.startTime || matchingSession.startTime);
              newStart.setTime(newStart.getTime() + i * rotationMs);
              const newEnd = new Date(newStart.getTime() + rotationMs);

              await prisma.rosterSlot.update({
                where: { id: slot.id },
                data: {
                  startsAt: newStart,
                  endsAt: newEnd,
                },
              });
            }
          }
        }

        updatedCount++;
      }
    }

    return NextResponse.json({
      message: `Successfully updated ${updatedCount} session(s) across ${futureRosters.length} roster(s)`,
      updatedCount,
      rosterCount: futureRosters.length,
    });
  } catch (error) {
    console.error('Error bulk updating rosters:', error);
    return NextResponse.json(
      { error: 'Failed to bulk update rosters' },
      { status: 500 }
    );
  }
}

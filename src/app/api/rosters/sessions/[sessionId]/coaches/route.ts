import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'

function getAccessToken(req: NextRequest): string | null {
  const headerToken = req.headers.get('authorization')
  if (headerToken?.startsWith('Bearer ')) {
    return headerToken.replace('Bearer ', '').trim()
  }
  const cookieToken = req.cookies.get('accessToken')?.value
  return cookieToken || null
}

async function getAuthenticatedUser(req: NextRequest) {
  const token = getAccessToken(req)
  const payload = token ? verifyAccessToken(token) : null
  if (!payload) return null

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { club: true },
  })

  if (!user || !user.club || user.clubId !== payload.clubId) return null
  return user
}

const updateCoachesSchema = z.object({
  coachIds: z.array(z.string()),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  zoneScope: z.enum(['single', 'all']).optional().default('single'),
})

// PATCH /api/rosters/sessions/[sessionId]/coaches - Update coaches for a session
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify session belongs to user's club
    const session = await prisma.classSession.findFirst({
      where: { id: sessionId, clubId: user.clubId },
      include: {
        coaches: true,
      },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const body = await req.json()
    const parsed = updateCoachesSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
    }

    const { coachIds, startTime, endTime, zoneScope } = parsed.data

    // Verify all coaches belong to the club
    const coaches = await prisma.coach.findMany({
      where: {
        id: { in: coachIds },
        clubId: user.clubId,
      },
    })

    if (coaches.length !== coachIds.length) {
      return NextResponse.json({ error: 'One or more coaches not found' }, { status: 400 })
    }

    // If zoneScope is 'all', find all sessions at the same time on the same roster
    let sessionIds = [sessionId]
    
    if (zoneScope === 'all') {
      const roster = await prisma.roster.findFirst({
        where: {
          sessions: {
            some: { id: sessionId }
          }
        },
        include: {
          sessions: {
            where: {
              startTime: session.startTime,
              endTime: session.endTime,
            },
            select: { id: true }
          }
        }
      })
      
      if (roster) {
        sessionIds = roster.sessions.map(s => s.id)
      }
    }

    // Update coaches for all target sessions
    for (const targetSessionId of sessionIds) {
      // Delete existing coach assignments
      await prisma.sessionCoach.deleteMany({
        where: { sessionId: targetSessionId },
      })

      // Create new coach assignments
      for (const coachId of coachIds) {
        await prisma.sessionCoach.create({
          data: {
            sessionId: targetSessionId,
            coachId,
          },
        })
      }
    }

    // Update session times if provided
    if (startTime || endTime) {
      const roster = await prisma.roster.findFirst({
        where: {
          sessions: {
            some: { id: sessionId }
          }
        }
      });

      if (roster) {
        const updateData: any = {};
        if (startTime) {
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
          where: { id: sessionId },
          data: updateData,
        });

        // Update associated slots
        if (startTime || endTime) {
          const slots = await prisma.rosterSlot.findMany({
            where: { sessionId },
            orderBy: { startsAt: 'asc' },
          });

          const sessionStartTime = updateData.startTime || session.startTime;
          const sessionEndTime = updateData.endTime || session.endTime;

          for (let i = 0; i < slots.length; i++) {
            const slot = slots[i];
            const rotationMs = (slot.endsAt.getTime() - slot.startsAt.getTime());
            const newStart = new Date(sessionStartTime);
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
    }

    // Fetch updated session with coaches
    const updatedSession = await prisma.classSession.findUnique({
      where: { id: sessionId },
      include: {
        coaches: {
          include: {
            coach: true,
          },
        },
      },
    })

    return NextResponse.json({ session: updatedSession }, { status: 200 })
  } catch (error) {
    console.error('Failed to update session coaches', error)
    return NextResponse.json({ error: 'Failed to update coaches' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'
import { recalculateRosterConflicts } from '@/lib/rosterGenerator'

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

    const { coachIds, zoneScope } = parsed.data

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
      // Find the roster that contains this session
      const slot = await prisma.rosterSlot.findFirst({
        where: { sessionId },
        select: { rosterId: true }
      })
      
      if (slot) {
        // Find all sessions at the same time on this roster
        const allSessions = await prisma.classSession.findMany({
          where: {
            startTimeLocal: session.startTimeLocal,
            endTimeLocal: session.endTimeLocal,
            rosterSlots: {
              some: {
                rosterId: slot.rosterId
              }
            }
          },
          select: { id: true }
        })
        
        sessionIds = allSessions.map(s => s.id)
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

    // Recalculate conflicts for all affected rosters
    const affectedSlots = await prisma.rosterSlot.findMany({
      where: { sessionId: { in: sessionIds } },
      select: { rosterId: true },
      distinct: ['rosterId'],
    })

    // Recalculate conflicts for each affected roster
    for (const slot of affectedSlots) {
      await recalculateRosterConflicts(prisma, slot.rosterId)
    }

    return NextResponse.json({ session: updatedSession }, { status: 200 })
  } catch (error) {
    console.error('Failed to update session coaches', error)
    return NextResponse.json({ error: 'Failed to update coaches' }, { status: 500 })
  }
}

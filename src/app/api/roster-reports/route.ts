import { NextRequest, NextResponse } from 'next/server'
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

// GET /api/roster-reports - Get published rosters with slots for reporting
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const coachId = searchParams.get('coachId')
    const status = searchParams.get('status') || 'PUBLISHED' // Default to published only

    // Build filter conditions
    const where: any = {
      clubId: user.clubId,
      status,
    }

    if (startDate && endDate) {
      // Use overlapping date logic: roster overlaps if its startDate <= search endDate AND its endDate >= search startDate
      where.AND = [
        { startDate: { lte: new Date(endDate) } },
        { endDate: { gte: new Date(startDate) } }
      ]
    }

    // Fetch rosters with slots
    const rosters = await prisma.roster.findMany({
      where,
      include: {
        slots: {
          include: {
            zone: true,
            session: {
              include: {
                template: {
                  select: {
                    id: true,
                    name: true,
                    color: true,
                  },
                },
                coaches: {
                  include: {
                    coach: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: {
            startsAt: 'asc',
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    })

    // Filter by coach if specified
    let slots = rosters.flatMap((roster) =>
      roster.slots.map((slot) => ({
        ...slot,
        rosterDate: roster.startDate,
        dayOfWeek: roster.dayOfWeek,
      }))
    )

    if (coachId) {
      slots = slots.filter((slot) =>
        slot.session.coaches.some((c) => c.coach.id === coachId)
      )
    }

    return NextResponse.json({ slots }, { status: 200 })
  } catch (error) {
    console.error('Failed to fetch roster reports', error)
    return NextResponse.json(
      { error: 'Failed to fetch roster reports' },
      { status: 500 }
    )
  }
}

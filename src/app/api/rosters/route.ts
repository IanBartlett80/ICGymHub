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

// GET /api/rosters - List all rosters for the club
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rosters = await prisma.roster.findMany({
      where: { clubId: user.clubId },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            activeDays: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
      take: 200,
    })

    return NextResponse.json({ rosters }, { status: 200 })
  } catch (error) {
    console.error('Failed to fetch rosters', error)
    return NextResponse.json({ error: 'Failed to fetch rosters' }, { status: 500 })
  }
}

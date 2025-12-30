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

// GET /api/rosters/[id] - Get a specific roster with all slots
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const roster = await prisma.roster.findFirst({
      where: { id: params.id, clubId: user.clubId },
      include: {
        slots: {
          include: {
            session: {
              include: {
                template: true,
                coaches: { include: { coach: true } },
              },
            },
            zone: true,
          },
        },
      },
    })

    if (!roster) {
      return NextResponse.json({ error: 'Roster not found' }, { status: 404 })
    }

    return NextResponse.json({ roster }, { status: 200 })
  } catch (error) {
    console.error('Failed to fetch roster', error)
    return NextResponse.json({ error: 'Failed to fetch roster' }, { status: 500 })
  }
}

// DELETE /api/rosters/[id] - Delete a roster
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const roster = await prisma.roster.findFirst({
      where: { id: params.id, clubId: user.clubId },
    })

    if (!roster) {
      return NextResponse.json({ error: 'Roster not found' }, { status: 404 })
    }

    await prisma.roster.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Roster deleted successfully' }, { status: 200 })
  } catch (error) {
    console.error('Failed to delete roster', error)
    return NextResponse.json({ error: 'Failed to delete roster' }, { status: 500 })
  }
}

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

// PATCH /api/rosters/[id]/status - Update roster status
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const body = await req.json()
    const { status } = body

    if (!status || !['DRAFT', 'PUBLISHED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be DRAFT or PUBLISHED' },
        { status: 400 }
      )
    }

    // Verify the roster belongs to the user's club
    const roster = await prisma.roster.findUnique({
      where: { id },
      select: { clubId: true },
    })

    if (!roster || roster.clubId !== user.clubId) {
      return NextResponse.json({ error: 'Roster not found' }, { status: 404 })
    }

    // Update the roster status
    const updatedRoster = await prisma.roster.update({
      where: { id },
      data: { status },
    })

    return NextResponse.json({ roster: updatedRoster }, { status: 200 })
  } catch (error) {
    console.error('Failed to update roster status', error)
    return NextResponse.json(
      { error: 'Failed to update roster status' },
      { status: 500 }
    )
  }
}

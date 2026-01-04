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

// POST /api/roster-templates/[id]/publish - Publish template and all linked rosters
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // Verify the template belongs to the user's club
    const template = await prisma.rosterTemplate.findUnique({
      where: { id },
      select: { clubId: true },
    })

    if (!template || template.clubId !== user.clubId) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Update all rosters linked to this template to PUBLISHED
    const result = await prisma.roster.updateMany({
      where: {
        templateId: id,
        clubId: user.clubId,
      },
      data: {
        status: 'PUBLISHED',
      },
    })

    return NextResponse.json(
      {
        message: 'Template rosters published successfully',
        count: result.count,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Failed to publish template rosters', error)
    return NextResponse.json(
      { error: 'Failed to publish template rosters' },
      { status: 500 }
    )
  }
}

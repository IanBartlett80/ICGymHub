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

// GET /api/rosters/[id]/export - Export roster as CSV
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
          orderBy: { startsAt: 'asc' },
        },
      },
    })

    if (!roster) {
      return NextResponse.json({ error: 'Roster not found' }, { status: 404 })
    }

    // Generate CSV
    let csv = 'Time,Class,Zone,Coaches,Duration,Conflict\n'

    for (const slot of roster.slots) {
      const startTime = new Date(slot.startsAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: user.club.timezone,
      })
      const endTime = new Date(slot.endsAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: user.club.timezone,
      })
      const className = slot.session.template?.name || 'Unknown'
      const zoneName = slot.zone.name
      const coaches = slot.session.coaches.map((c) => c.coach.name).join('; ')
      const duration = Math.round((slot.endsAt.getTime() - slot.startsAt.getTime()) / 60000)
      const conflict = slot.conflictFlag ? 'Yes' : 'No'

      csv += `"${startTime} - ${endTime}","${className}","${zoneName}","${coaches}",${duration},${conflict}\n`
    }

    await prisma.rosterExport.create({
      data: {
        clubId: user.clubId,
        exportType: 'csv',
        status: 'COMPLETED',
      },
    })

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="roster_${roster.startDate.toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Failed to export roster', error)
    return NextResponse.json({ error: 'Failed to export roster' }, { status: 500 })
  }
}

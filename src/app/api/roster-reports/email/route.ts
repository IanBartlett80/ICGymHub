import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyAccessToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is admin
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { club: true },
    })

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { startDate, endDate, sendToAll, coachId } = body

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      )
    }

    if (!user.club) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 })
    }

    // Fetch rosters with slots
    const rosters = await prisma.roster.findMany({
      where: {
        clubId: user.club.id,
        startDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
        status: 'PUBLISHED',
      },
      include: {
        template: true,
        slots: {
          include: {
            zone: true,
            session: {
              include: {
                template: true,
                coaches: {
                  include: {
                    coach: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    // Flatten slots
    type SlotWithRoster = {
      id: string
      startsAt: Date
      endsAt: Date
      rosterStartDate: Date
      zone: { id: string; name: string }
      session: {
        id: string
        template: { id: string; name: string; color: string | null } | null
        coaches: Array<{
          id: string
          coach: { id: string; name: string; email: string | null }
        }>
      }
    }

    const allSlots: SlotWithRoster[] = rosters.flatMap((roster) =>
      roster.slots.map((slot) => ({
        id: slot.id,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        rosterStartDate: roster.startDate,
        zone: slot.zone,
        session: {
          id: slot.session.id,
          template: slot.session.template,
          coaches: slot.session.coaches,
        },
      }))
    )

    if (sendToAll) {
      // Group slots by coach
      const coachMap = new Map<string, SlotWithRoster[]>()

      allSlots.forEach((slot) => {
        slot.session.coaches.forEach((sc) => {
          const coachId = sc.coach.id
          if (!coachMap.has(coachId)) {
            coachMap.set(coachId, [])
          }
          coachMap.get(coachId)!.push(slot)
        })
      })

      // TODO: Implement actual email sending once email infrastructure is ready
      // For now, just return success
      console.log(`Would send emails to ${coachMap.size} coaches`)

      return NextResponse.json({
        success: true,
        message: `Email functionality coming soon - would send to ${coachMap.size} coaches`,
      })
    } else if (coachId) {
      // Send to individual coach
      const coach = await prisma.coach.findUnique({
        where: { id: coachId },
      })

      if (!coach?.email) {
        return NextResponse.json(
          { error: 'Coach does not have an email address' },
          { status: 400 }
        )
      }

      // Filter slots for this coach
      const coachSlots = allSlots.filter((slot) =>
        slot.session.coaches.some((sc) => sc.coach.id === coachId)
      )

      // TODO: Implement actual email sending once email infrastructure is ready
      console.log(`Would send email to ${coach.name} with ${coachSlots.length} sessions`)

      return NextResponse.json({
        success: true,
        message: `Email functionality coming soon - would send to ${coach.name}`,
      })
    } else {
      return NextResponse.json(
        { error: 'Either sendToAll or coachId must be provided' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Email roster report error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

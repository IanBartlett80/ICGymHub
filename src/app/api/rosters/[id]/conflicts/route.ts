import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/apiAuth'

// GET /api/rosters/[id]/conflicts - Get detailed conflict information for a roster
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(req)
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: rosterId } = await params

    const roster = await prisma.roster.findFirst({
      where: { id: rosterId, clubId: authResult.user.clubId },
      select: { id: true, startDate: true, endDate: true, clubId: true, venueId: true },
    })

    if (!roster) {
      return NextResponse.json({ error: 'Roster not found' }, { status: 404 })
    }

    // Get ALL rosters for this date
    const allRostersForDate = await prisma.roster.findMany({
      where: {
        clubId: roster.clubId,
        startDate: { lte: roster.endDate },
        endDate: { gte: roster.startDate },
        status: { in: ['DRAFT', 'PUBLISHED'] },
      },
      select: { id: true },
    })

    // Get ALL slots for ALL rosters on this date
    const allSlots = await prisma.rosterSlot.findMany({
      where: {
        rosterId: { in: allRostersForDate.map(r => r.id) },
      },
      include: {
        session: {
          include: {
            coaches: {
              include: {
                coach: {
                  select: { id: true, name: true },
                },
              },
            },
            template: {
              select: { id: true, name: true, gymsportId: true },
            },
          },
        },
        zone: { select: { id: true, name: true, allowOverlap: true } },
        roster: { select: { id: true, venueId: true } },
      },
      orderBy: { startsAt: 'asc' },
    })

    // Build conflict details for slots in THIS roster
    const thisRosterSlots = allSlots.filter(s => s.rosterId === rosterId)
    const otherSlots = allSlots.filter(s => s.rosterId !== rosterId)

    const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) =>
      aStart < bEnd && bStart < aEnd

    const conflictDetails: Array<{
      slotId: string
      conflictType: string | null
      coachConflicts: Array<{
        coachId: string
        coachName: string
        clashingSlotId: string
        clashingClassName: string
        clashingZoneName: string
        clashingTime: string
        clashingRosterId: string
        isSameRoster: boolean
      }>
      zoneConflicts: Array<{
        zoneName: string
        clashingSlotId: string
        clashingClassName: string
        clashingTime: string
        isSameRoster: boolean
      }>
    }> = []

    for (const slot of thisRosterSlots) {
      if (!slot.conflictFlag) continue

      const coachConflicts: typeof conflictDetails[number]['coachConflicts'] = []
      const zoneConflicts: typeof conflictDetails[number]['zoneConflicts'] = []

      // Check coach conflicts against ALL slots
      for (const coach of slot.session.coaches) {
        for (const other of allSlots) {
          if (other.id === slot.id) continue
          const otherHasCoach = other.session.coaches.some(c => c.coach.id === coach.coach.id)
          if (!otherHasCoach) continue
          if (overlaps(slot.startsAt, slot.endsAt, other.startsAt, other.endsAt)) {
            coachConflicts.push({
              coachId: coach.coach.id,
              coachName: coach.coach.name,
              clashingSlotId: other.id,
              clashingClassName: other.session.template?.name || 'Unknown',
              clashingZoneName: other.zone.name,
              clashingTime: `${other.startsAt.toISOString()}-${other.endsAt.toISOString()}`,
              clashingRosterId: other.rosterId,
              isSameRoster: other.rosterId === rosterId,
            })
          }
        }
      }

      // Check zone conflicts against ALL slots (same venue only)
      for (const other of allSlots) {
        if (other.id === slot.id) continue
        if (other.zoneId !== slot.zoneId) continue
        if (other.roster.venueId !== roster.venueId) continue
        const currentAllowsOverlap = slot.allowOverlap || slot.zone.allowOverlap
        const otherAllowsOverlap = other.allowOverlap || other.zone.allowOverlap
        if (currentAllowsOverlap || otherAllowsOverlap) continue
        if (overlaps(slot.startsAt, slot.endsAt, other.startsAt, other.endsAt)) {
          zoneConflicts.push({
            zoneName: other.zone.name,
            clashingSlotId: other.id,
            clashingClassName: other.session.template?.name || 'Unknown',
            clashingTime: `${other.startsAt.toISOString()}-${other.endsAt.toISOString()}`,
            isSameRoster: other.rosterId === rosterId,
          })
        }
      }

      conflictDetails.push({
        slotId: slot.id,
        conflictType: slot.conflictType,
        coachConflicts,
        zoneConflicts,
      })
    }

    // Get available coaches for this club (for suggesting alternatives)
    const allCoaches = await prisma.coach.findMany({
      where: { clubId: roster.clubId, active: true },
      select: {
        id: true,
        name: true,
        gymsports: {
          select: { gymsport: { select: { id: true, name: true } } },
        },
        availability: {
          select: { dayOfWeek: true, startTimeLocal: true, endTimeLocal: true },
        },
      },
    })

    return NextResponse.json({ conflictDetails, allCoaches })
  } catch (error) {
    console.error('Error fetching conflict details:', error)
    return NextResponse.json({ error: 'Failed to fetch conflicts' }, { status: 500 })
  }
}

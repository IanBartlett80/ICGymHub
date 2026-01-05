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

const updateZoneOrderSchema = z.object({
  sessionId: z.string(),
  zoneOrder: z.array(z.object({
    slotId: z.string(),
    zoneId: z.string(),
    order: z.number(),
  })),
  scope: z.enum(['single', 'future']).optional().default('single'),
})

// PATCH /api/rosters/sessions/zone-order - Update zone order for session slots
export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = updateZoneOrderSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
    }

    const { sessionId, zoneOrder, scope } = parsed.data

    // Verify session belongs to user's club
    const session = await prisma.classSession.findFirst({
      where: { id: sessionId, clubId: user.clubId },
      include: {
        rosterSlots: {
          include: {
            roster: true,
            zone: true,
          },
        },
      },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Group zone order changes by slot
    const zoneOrderMap = new Map(zoneOrder.map(zo => [zo.slotId, { zoneId: zo.zoneId, order: zo.order }]))

    if (scope === 'single') {
      // Update only this roster's slots
      const affectedRosterIds = new Set<string>()
      
      for (const slot of session.rosterSlots) {
        const orderData = zoneOrderMap.get(slot.id)
        if (orderData) {
          await prisma.rosterSlot.update({
            where: { id: slot.id },
            data: {
              zoneId: orderData.zoneId,
              zoneOrder: orderData.order,
            },
          })
          affectedRosterIds.add(slot.rosterId)
        }
      }
      
      // Recalculate conflicts for affected rosters
      for (const rosterId of affectedRosterIds) {
        await recalculateRosterConflicts(prisma, rosterId)
      }
    } else if (scope === 'future') {
      // Find the template and roster info
      const roster = session.rosterSlots[0]?.roster
      if (!roster || !roster.templateId || !roster.dayOfWeek) {
        return NextResponse.json({ error: 'Cannot apply to future rosters - no template found' }, { status: 400 })
      }

      // Find all future rosters with same template and day of week
      const futureRosters = await prisma.roster.findMany({
        where: {
          clubId: user.clubId,
          templateId: roster.templateId,
          dayOfWeek: roster.dayOfWeek,
          startDate: {
            gte: roster.startDate,
          },
        },
        include: {
          slots: {
            where: { sessionId: session.id },
            orderBy: { startsAt: 'asc' },
          },
        },
      })

      const affectedRosterIds = new Set<string>()

      // Update slots for all future rosters
      for (const futureRoster of futureRosters) {
        // Find sessions in this future roster that match the template
        const matchingSessions = await prisma.classSession.findMany({
          where: {
            templateId: session.templateId,
            clubId: user.clubId,
            date: futureRoster.startDate,
          },
          include: {
            rosterSlots: {
              where: { rosterId: futureRoster.id },
              orderBy: { startsAt: 'asc' },
            },
          },
        })

        for (const matchingSession of matchingSessions) {
          // Apply the same zone order pattern to matching time slots
          const originalSlots = session.rosterSlots.sort((a, b) => 
            new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
          )
          const targetSlots = matchingSession.rosterSlots.sort((a, b) => 
            new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
          )

          for (let i = 0; i < Math.min(originalSlots.length, targetSlots.length); i++) {
            const originalSlot = originalSlots[i]
            const orderData = zoneOrderMap.get(originalSlot.id)
            
            if (orderData && targetSlots[i]) {
              await prisma.rosterSlot.update({
                where: { id: targetSlots[i].id },
                data: {
                  zoneId: orderData.zoneId,
                  zoneOrder: orderData.order,
                },
              })
              affectedRosterIds.add(targetSlots[i].rosterId)
            }
          }
        }
      }
      
      // Recalculate conflicts for all affected rosters
      for (const rosterId of affectedRosterIds) {
        await recalculateRosterConflicts(prisma, rosterId)
      }
    }

    return NextResponse.json({ message: 'Zone order updated successfully' }, { status: 200 })
  } catch (error) {
    console.error('Failed to update zone order', error)
    return NextResponse.json({ error: 'Failed to update zone order' }, { status: 500 })
  }
}

import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'

export type TemplateSelection = {
  templateId: string
  rotationMinutes?: number
  allowedZoneIds?: string[]
  coachIds?: string[]
  allowOverlap?: boolean
  startTimeLocal?: string
  endTimeLocal?: string
}

export type GenerateDailyRosterInput = {
  clubId: string
  date: string // YYYY-MM-DD in club local calendar
  selections: TemplateSelection[]
  generatedById: string
  timezone: string
}

export type GenerateDailyRosterResult = {
  rosterId: string
  sessionIds: string[]
  slotCount: number
  conflicts: { sessionId: string; reason: string }[]
}

const MINUTE_MS = 60 * 1000

const addMinutes = (date: Date, minutes: number): Date => new Date(date.getTime() + minutes * MINUTE_MS)

const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean => aStart < bEnd && bStart < aEnd

const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map((v) => parseInt(v, 10))
  return h * 60 + m
}

const zonedDate = (date: string, time: string, timeZone: string): Date => {
  // Create a Date representing the provided local time in the given timezone.
  const [year, month, day] = date.split('-').map((v) => parseInt(v, 10))
  const [hour, minute] = time.split(':').map((v) => parseInt(v, 10))
  const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute))
  const tzDate = new Date(utcDate.toLocaleString('en-US', { timeZone }))
  const diff = tzDate.getTime() - utcDate.getTime()
  return new Date(utcDate.getTime() - diff)
}

const getDayOfWeek = (date: string): string => {
  const d = new Date(date + 'T00:00:00')
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  return days[d.getUTCDay()]
}

const isCoachAvailable = (coach: any, dayOfWeek: string, startTime: string, endTime: string): boolean => {
  if (!coach.availability || coach.availability.length === 0) {
    return true // If no availability set, assume available
  }

  // Check if coach has availability for this day
  const dayAvailability = coach.availability.filter((a: any) => a.dayOfWeek === dayOfWeek)
  if (dayAvailability.length === 0) {
    return false // Coach not available on this day
  }

  // Check if the session time overlaps with any availability window
  const startMinutes = timeToMinutes(startTime)
  const endMinutes = timeToMinutes(endTime)

  return dayAvailability.some((avail: any) => {
    const availStart = timeToMinutes(avail.startTimeLocal)
    const availEnd = timeToMinutes(avail.endTimeLocal)
    
    // Session must be completely within availability window
    return startMinutes >= availStart && endMinutes <= availEnd
  })
}

const isCoachAccreditedForGymsport = (coach: any, gymsportId: string | null): boolean => {
  if (!gymsportId) {
    return true // If no gymsport specified, any coach can be assigned
  }

  if (!coach.gymsports || coach.gymsports.length === 0) {
    return false // Coach has no gymsport accreditations
  }

  return coach.gymsports.some((cg: any) => cg.gymsport.id === gymsportId)
}

export async function generateDailyRoster(
  prisma: PrismaClient,
  input: GenerateDailyRosterInput
): Promise<GenerateDailyRosterResult> {
  const { clubId, date, selections, generatedById, timezone } = input

  const dayRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dayRegex.test(date)) {
    throw new Error('Invalid date format; expected YYYY-MM-DD')
  }

  if (!selections.length) {
    throw new Error('At least one class template selection is required')
  }

  const clubZones = await prisma.zone.findMany({ 
    where: { clubId, active: true },
    orderBy: [
      { isFirst: 'desc' }, // Priority zones first
      { name: 'asc' }      // Then alphabetically
    ]
  })
  if (!clubZones.length) {
    throw new Error('No zones configured for this club')
  }

  const templates = await prisma.classTemplate.findMany({
    where: { clubId, id: { in: selections.map((s) => s.templateId) } },
    include: {
      gymsport: true,
      allowedZones: true,
      defaultCoaches: {
        include: {
          coach: {
            include: {
              gymsports: {
                include: {
                  gymsport: true,
                },
              },
              availability: true,
            },
          },
        },
      },
    },
  })

  if (!templates.length) {
    throw new Error('No matching class templates found for this club')
  }

  const dayStart = zonedDate(date, '00:00', timezone)
  const dayEnd = addMinutes(dayStart, 24 * 60)

  const roster = await prisma.roster.create({
    data: {
      clubId,
      scope: 'DAY',
      startDate: dayStart,
      endDate: dayEnd,
      status: 'DRAFT',
      generatedAt: new Date(),
      generatedById,
    },
  })

  const zoneSchedule = new Map<string, Array<{ start: Date; end: Date; sessionKey: string }>>()
  const coachSchedule = new Map<string, Array<{ start: Date; end: Date; sessionKey: string }>>()
  const conflicts: { sessionId: string; reason: string }[] = []
  const sessionIds: string[] = []
  let slotCount = 0

  for (const selection of selections) {
    const template = templates.find((t) => t.id === selection.templateId)
    if (!template) {
      continue
    }

    const sessionKey = randomUUID()
    const rotationMinutes = Math.max(1, selection.rotationMinutes ?? template.defaultRotationMinutes)
    const allowOverlap = selection.allowOverlap ?? template.allowOverlap
    const startTimeLocal = selection.startTimeLocal || template.startTimeLocal
    const endTimeLocal = selection.endTimeLocal || template.endTimeLocal

    const allowedZoneIds = (selection.allowedZoneIds && selection.allowedZoneIds.length
      ? selection.allowedZoneIds
      : template.allowedZones.map((z) => z.zoneId))
      .filter((id) => clubZones.some((cz) => cz.id === id))

    const resolvedAllowedZones = allowedZoneIds.length ? allowedZoneIds : clubZones.map((z) => z.id)

    // Sort zones to ensure isFirst zones appear first in rotation
    const sortedResolvedZones = resolvedAllowedZones.sort((a, b) => {
      const zoneA = clubZones.find(z => z.id === a)
      const zoneB = clubZones.find(z => z.id === b)
      if (!zoneA || !zoneB) return 0
      // isFirst zones come first (true > false when cast to number)
      if (zoneA.isFirst && !zoneB.isFirst) return -1
      if (!zoneA.isFirst && zoneB.isFirst) return 1
      return zoneA.name.localeCompare(zoneB.name)
    })

    const coachIds = (selection.coachIds && selection.coachIds.length
      ? selection.coachIds
      : template.defaultCoaches.map((c) => c.coachId))

    // Get the day of week for availability checking
    const dayOfWeek = getDayOfWeek(date)

    // Validate coaches - filter out those not available or not accredited
    const validCoachIds: string[] = []
    const invalidCoaches: string[] = []

    for (const coachId of coachIds) {
      const coachLink = template.defaultCoaches.find((c) => c.coachId === coachId)
      if (!coachLink) continue

      const coach = coachLink.coach

      // Check gymsport accreditation
      if (!isCoachAccreditedForGymsport(coach, template.gymsportId)) {
        invalidCoaches.push(`${coach.name} (not accredited for ${template.gymsport?.name || 'this gymsport'})`)
        continue
      }

      // Check availability
      if (!isCoachAvailable(coach, dayOfWeek, startTimeLocal, endTimeLocal)) {
        invalidCoaches.push(`${coach.name} (not available on ${dayOfWeek})`)
        continue
      }

      validCoachIds.push(coachId)
    }

    // If no valid coaches, flag as conflict
    if (validCoachIds.length === 0 && coachIds.length > 0) {
      conflicts.push({
        sessionId: sessionKey,
        reason: `No valid coaches available: ${invalidCoaches.join(', ')}`,
      })
    }

    // Use valid coaches or all coaches if no validation issues
    const finalCoachIds = validCoachIds.length > 0 ? validCoachIds : coachIds

    const sessionStart = zonedDate(date, startTimeLocal, timezone)
    const sessionEnd = zonedDate(date, endTimeLocal, timezone)

    const durationMinutes = timeToMinutes(endTimeLocal) - timeToMinutes(startTimeLocal)
    if (durationMinutes <= 0) {
      conflicts.push({ sessionId: sessionKey, reason: 'Invalid time range' })
      continue
    }

    const segments: Array<{ start: Date; end: Date; zoneId: string; conflict: boolean }> = []
    let cursor = sessionStart
    let zoneRotationIndex = 0 // Track which zone we're on in the rotation
    
    while (cursor < sessionEnd) {
      const remainingMinutes = Math.max(1, Math.ceil((sessionEnd.getTime() - cursor.getTime()) / MINUTE_MS))
      const next = addMinutes(cursor, Math.min(rotationMinutes, remainingMinutes))
      const segmentEnd = next <= sessionEnd ? next : sessionEnd

      // Rotate through zones in order, starting from the current rotation index
      let assignedZone: string | null = null
      let zoneConflict = false
      let checkedZones = 0
      
      // Try to find an available zone starting from current rotation position
      while (checkedZones < sortedResolvedZones.length) {
        const zoneIndex = (zoneRotationIndex + checkedZones) % sortedResolvedZones.length
        const zoneId = sortedResolvedZones[zoneIndex]
        const entries = zoneSchedule.get(zoneId) || []
        const conflict = entries.some((e) => !allowOverlap && overlaps(cursor, segmentEnd, e.start, e.end))
        
        if (!conflict) {
          assignedZone = zoneId
          // Move to next zone for next rotation
          zoneRotationIndex = (zoneIndex + 1) % sortedResolvedZones.length
          break
        }
        checkedZones++
      }

      // If no zone available without conflict, use the next zone in rotation anyway
      if (!assignedZone) {
        assignedZone = sortedResolvedZones[zoneRotationIndex % sortedResolvedZones.length]
        zoneRotationIndex = (zoneRotationIndex + 1) % sortedResolvedZones.length
        zoneConflict = !allowOverlap
      }

      const coachConflicts = finalCoachIds.some((coachId) => {
        const entries = coachSchedule.get(coachId) || []
        return entries.some((e) => overlaps(cursor, segmentEnd, e.start, e.end))
      })

      const segmentConflict = zoneConflict || coachConflicts
      
      // Determine conflict type
      let conflictType: string | null = null
      if (zoneConflict && coachConflicts) {
        conflictType = 'both'
      } else if (zoneConflict) {
        conflictType = 'zone'
      } else if (coachConflicts) {
        conflictType = 'coach'
      }
      
      segments.push({ 
        start: cursor, 
        end: segmentEnd, 
        zoneId: assignedZone, 
        conflict: segmentConflict,
        conflictType
      })

      // update schedules
      const zoneEntries = zoneSchedule.get(assignedZone) || []
      zoneEntries.push({ start: cursor, end: segmentEnd, sessionKey })
      zoneSchedule.set(assignedZone, zoneEntries)

      for (const coachId of finalCoachIds) {
        const list = coachSchedule.get(coachId) || []
        list.push({ start: cursor, end: segmentEnd, sessionKey })
        coachSchedule.set(coachId, list)
      }

      cursor = segmentEnd
    }

    const sessionHasConflict = segments.some((s) => s.conflict)

    const session = await prisma.classSession.create({
      data: {
        clubId,
        templateId: template.id,
        date: dayStart,
        startTimeLocal,
        endTimeLocal,
        rotationMinutes,
        allowOverlap,
        assignedZoneSequence: JSON.stringify(segments.map((s) => s.zoneId)),
        status: 'DRAFT',
        conflictFlag: sessionHasConflict,
        generatedById,
      },
    })

    sessionIds.push(session.id)

    // Link allowed zones and coaches (for the session snapshot)
    for (const zoneId of sortedResolvedZones) {
      await prisma.sessionAllowedZone.create({
        data: {
          sessionId: session.id,
          zoneId,
        },
      })
    }

    for (const coachId of finalCoachIds) {
      await prisma.sessionCoach.create({
        data: {
          sessionId: session.id,
          coachId,
        },
      })
    }

    // Create roster slots for each segment
    for (const segment of segments) {
      await prisma.rosterSlot.create({
        data: {
          clubId,
          rosterId: roster.id,
          sessionId: session.id,
          zoneId: segment.zoneId,
          startsAt: segment.start,
          endsAt: segment.end,
          conflictFlag: segment.conflict,
          conflictType: segment.conflictType,
          allowOverlap,
        },
      })
      slotCount += 1
    }

    if (sessionHasConflict) {
      conflicts.push({ sessionId: session.id, reason: 'Conflicts detected in one or more rotations' })
    }
  }

  return { rosterId: roster.id, sessionIds, slotCount, conflicts }
}

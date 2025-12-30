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

  const clubZones = await prisma.zone.findMany({ where: { clubId, active: true } })
  if (!clubZones.length) {
    throw new Error('No zones configured for this club')
  }

  const templates = await prisma.classTemplate.findMany({
    where: { clubId, id: { in: selections.map((s) => s.templateId) } },
    include: {
      allowedZones: true,
      defaultCoaches: true,
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

    const coachIds = (selection.coachIds && selection.coachIds.length
      ? selection.coachIds
      : template.defaultCoaches.map((c) => c.coachId))

    const sessionStart = zonedDate(date, startTimeLocal, timezone)
    const sessionEnd = zonedDate(date, endTimeLocal, timezone)

    const durationMinutes = timeToMinutes(endTimeLocal) - timeToMinutes(startTimeLocal)
    if (durationMinutes <= 0) {
      conflicts.push({ sessionId: sessionKey, reason: 'Invalid time range' })
      continue
    }

    const segments: Array<{ start: Date; end: Date; zoneId: string; conflict: boolean }> = []
    let cursor = sessionStart
    while (cursor < sessionEnd) {
      const remainingMinutes = Math.max(1, Math.ceil((sessionEnd.getTime() - cursor.getTime()) / MINUTE_MS))
      const next = addMinutes(cursor, Math.min(rotationMinutes, remainingMinutes))
      const segmentEnd = next <= sessionEnd ? next : sessionEnd

      let assignedZone: string | null = null
      let zoneConflict = false
      for (const zoneId of resolvedAllowedZones) {
        const entries = zoneSchedule.get(zoneId) || []
        const conflict = entries.some((e) => !allowOverlap && overlaps(cursor, segmentEnd, e.start, e.end))
        if (!conflict) {
          assignedZone = zoneId
          break
        }
      }

      if (!assignedZone) {
        assignedZone = resolvedAllowedZones[0]
        zoneConflict = !allowOverlap
      }

      const coachConflicts = coachIds.some((coachId) => {
        const entries = coachSchedule.get(coachId) || []
        return entries.some((e) => overlaps(cursor, segmentEnd, e.start, e.end))
      })

      const segmentConflict = zoneConflict || coachConflicts
      segments.push({ start: cursor, end: segmentEnd, zoneId: assignedZone, conflict: segmentConflict })

      // update schedules
      const zoneEntries = zoneSchedule.get(assignedZone) || []
      zoneEntries.push({ start: cursor, end: segmentEnd, sessionKey })
      zoneSchedule.set(assignedZone, zoneEntries)

      for (const coachId of coachIds) {
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
    for (const zoneId of resolvedAllowedZones) {
      await prisma.sessionAllowedZone.create({
        data: {
          sessionId: session.id,
          zoneId,
        },
      })
    }

    for (const coachId of coachIds) {
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

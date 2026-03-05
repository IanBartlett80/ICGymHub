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
  venueId?: string | null // Optional venue filter
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
  const { clubId, venueId, date, selections, generatedById, timezone } = input

  const dayRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dayRegex.test(date)) {
    throw new Error('Invalid date format; expected YYYY-MM-DD')
  }

  if (!selections.length) {
    throw new Error('At least one class template selection is required')
  }

  const clubZones = await prisma.zone.findMany({ 
    where: { 
      clubId, 
      active: true,
      ...(venueId && { venueId }), // Filter by venue if provided
    },
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

  console.log('Creating roster with clubId:', clubId, 'venueId:', venueId, 'date:', date);
  const roster = await prisma.roster.create({
    data: {
      clubId,
      venueId: venueId || null,
      scope: 'DAY',
      startDate: dayStart,
      endDate: dayEnd,
      status: 'DRAFT',
      generatedAt: new Date(),
      generatedById,
    },
  })
  console.log('Created roster:', { id: roster.id, venueId: roster.venueId });

  // Fetch existing rosters for the same date to detect cross-roster conflicts
  const existingRosters = await prisma.roster.findMany({
    where: {
      clubId,
      startDate: { lte: dayEnd },
      endDate: { gte: dayStart },
      status: { in: ['DRAFT', 'PUBLISHED'] },
      id: { not: roster.id }, // Exclude the roster we just created
    },
    include: {
      slots: {
        include: {
          session: {
            include: {
              coaches: true,
            },
          },
          zone: true,
        },
      },
    },
  })
  console.log(`Cross-roster conflict check: Found ${existingRosters.length} existing rosters for this date`)

  const zoneSchedule = new Map<string, Array<{ start: Date; end: Date; sessionKey: string; venueId: string | null }>>()
  const coachSchedule = new Map<string, Array<{ start: Date; end: Date; sessionKey: string }>>()
  const conflicts: { sessionId: string; reason: string }[] = []
  const sessionIds: string[] = []
  let slotCount = 0

  // Pre-populate schedules with existing roster slots
  for (const existingRoster of existingRosters) {
    for (const slot of existingRoster.slots) {
      // Add to zone schedule
      const zoneEntries = zoneSchedule.get(slot.zoneId) || []
      zoneEntries.push({
        start: slot.startsAt,
        end: slot.endsAt,
        sessionKey: `existing-${slot.id}`,
        venueId: slot.venueId,
      })
      zoneSchedule.set(slot.zoneId, zoneEntries)

      // Add to coach schedule
      if (slot.session.coaches && slot.session.coaches.length > 0) {
        for (const coach of slot.session.coaches) {
          const coachEntries = coachSchedule.get(coach.id) || []
          coachEntries.push({
            start: slot.startsAt,
            end: slot.endsAt,
            sessionKey: `existing-${slot.id}`,
          })
          coachSchedule.set(coach.id, coachEntries)
        }
      }
    }
  }
  console.log(`Pre-populated schedules: ${zoneSchedule.size} zones, ${coachSchedule.size} coaches`)

  for (const selection of selections) {
    const template = templates.find((t: any) => t.id === selection.templateId)
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
      : template.allowedZones.map((z: any) => z.zoneId))
      .filter((id: string) => clubZones.some((cz: any) => cz.id === id))

    const resolvedAllowedZones = allowedZoneIds.length ? allowedZoneIds : clubZones.map((z: any) => z.id)

    // Sort zones to ensure isFirst zones appear first in rotation
    const sortedResolvedZones = resolvedAllowedZones.sort((a: string, b: string) => {
      const zoneA = clubZones.find((z: any) => z.id === a)
      const zoneB = clubZones.find((z: any) => z.id === b)
      if (!zoneA || !zoneB) return 0
      // isFirst zones come first (true > false when cast to number)
      if (zoneA.isFirst && !zoneB.isFirst) return -1
      if (!zoneA.isFirst && zoneB.isFirst) return 1
      return zoneA.name.localeCompare(zoneB.name)
    })

    const coachIds = (selection.coachIds && selection.coachIds.length
      ? selection.coachIds
      : template.defaultCoaches.map((c: any) => c.coachId))

    // Get the day of week for availability checking
    const dayOfWeek = getDayOfWeek(date)

    // Validate coaches - filter out those not available or not accredited
    const validCoachIds: string[] = []
    const invalidCoaches: string[] = []

    for (const coachId of coachIds) {
      const coachLink = template.defaultCoaches.find((c: any) => c.coachId === coachId)
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

    const segments: Array<{ start: Date; end: Date; zoneId: string; conflict: boolean; conflictType: string | null }> = []
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
        // Zone conflicts only matter within same venue (zones are venue-specific)
        const conflict = entries.some((e) => {
          // Skip entries from different venues
          if (e.venueId !== (venueId || null)) return false
          return !allowOverlap && overlaps(cursor, segmentEnd, e.start, e.end)
        })
        
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

      const coachConflicts = finalCoachIds.some((coachId: string) => {
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
        zoneId: assignedZone!, 
        conflict: segmentConflict,
        conflictType
      })

      // update schedules
      const zoneEntries = zoneSchedule.get(assignedZone!) || []
      zoneEntries.push({ start: cursor, end: segmentEnd, sessionKey, venueId: venueId || null })
      zoneSchedule.set(assignedZone!, zoneEntries)

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
        venueId: venueId || null,
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
          venueId: venueId || null,
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

/**
 * Recalculate conflicts for all slots in a roster and ALL OTHER rosters on the same date
 */
export async function recalculateRosterConflicts(
  prisma: PrismaClient,
  rosterId: string
): Promise<void> {
  // First, get the roster to find its date range and club
  const roster = await prisma.roster.findUnique({
    where: { id: rosterId },
    select: { 
      id: true,
      clubId: true, 
      startDate: true, 
      endDate: true 
    },
  })

  if (!roster) {
    console.error(`Roster ${rosterId} not found for conflict recalculation`)
    return
  }

  console.log(`Recalculating conflicts for roster ${rosterId} (${roster.startDate.toISOString()})`)

  // Get ALL rosters for this date (not just the current one)
  const allRostersForDate = await prisma.roster.findMany({
    where: {
      clubId: roster.clubId,
      startDate: { lte: roster.endDate },
      endDate: { gte: roster.startDate },
      status: { in: ['DRAFT', 'PUBLISHED'] },
    },
    select: { id: true },
  })

  console.log(`Found ${allRostersForDate.length} rosters for this date (including current)`)

  // Get ALL slots for ALL rosters on this date
  const slots = await prisma.rosterSlot.findMany({
    where: {
      rosterId: { in: allRostersForDate.map((r: { id: string }) => r.id) },
    },
    include: {
      session: {
        include: {
          coaches: true,
        },
      },
      zone: true,
    },
    orderBy: { startsAt: 'asc' },
  })

  console.log(`Analyzing ${slots.length} total slots across all rosters for conflicts`)

  // Build schedules for zones and coaches from ALL rosters
  const zoneSchedule = new Map<string, Array<{ slotId: string; start: Date; end: Date; allowOverlap: boolean; zoneAllowsOverlap: boolean; venueId: string | null; rosterId: string }>>()
  const coachSchedule = new Map<string, Array<{ slotId: string; start: Date; end: Date; rosterId: string }>>()

  for (const slot of slots) {
    // Track zone usage with venue awareness
    const zoneEntries = zoneSchedule.get(slot.zoneId) || []
    zoneEntries.push({ 
      slotId: slot.id, 
      start: slot.startsAt, 
      end: slot.endsAt,
      allowOverlap: slot.allowOverlap,
      zoneAllowsOverlap: slot.zone.allowOverlap,
      venueId: slot.venueId, // Track venue for zone conflicts
      rosterId: slot.rosterId, // Track which roster this slot belongs to
    })
    zoneSchedule.set(slot.zoneId, zoneEntries)

    // Track coach usage
    for (const sessionCoach of slot.session.coaches) {
      const coachEntries = coachSchedule.get(sessionCoach.coachId) || []
      coachEntries.push({ 
        slotId: slot.id, 
        start: slot.startsAt, 
        end: slot.endsAt,
        rosterId: slot.rosterId, // Track which roster this slot belongs to
      })
      coachSchedule.set(sessionCoach.coachId, coachEntries)
    }
  }

  // Detect conflicts across ALL slots
  const slotConflicts = new Map<string, { hasZoneConflict: boolean; hasCoachConflict: boolean }>()

  for (const slot of slots) {
    let hasZoneConflict = false
    let hasCoachConflict = false

    // Check for zone conflicts - ONLY within same venue
    const zoneEntries = zoneSchedule.get(slot.zoneId) || []
    for (const entry of zoneEntries) {
      // Skip self
      if (entry.slotId === slot.id) continue
      
      // CRITICAL: Only check for zone conflict if SAME VENUE
      // Different venues can have same zone name without conflict
      if (entry.venueId !== slot.venueId) continue
      
      // Check if there's an overlap and overlap is not allowed by ANY of:
      // - The current slot's allowOverlap flag
      // - The other entry's allowOverlap flag
      // - The zone's allowOverlap flag (master zone setting)
      // If any of these allow overlap, there's no conflict
      const currentAllowsOverlap = slot.allowOverlap || slot.zone.allowOverlap
      const entryAllowsOverlap = entry.allowOverlap || entry.zoneAllowsOverlap
      
      if (!currentAllowsOverlap && !entryAllowsOverlap && overlaps(slot.startsAt, slot.endsAt, entry.start, entry.end)) {
        hasZoneConflict = true
        console.log(`Zone conflict detected: Slot ${slot.id} conflicts with ${entry.slotId} in zone ${slot.zoneId}`)
        break
      }
    }

    // Check for coach conflicts - ACROSS ALL VENUES (coach can't be in two places)
    for (const sessionCoach of slot.session.coaches) {
      const coachEntries = coachSchedule.get(sessionCoach.coachId) || []
      for (const entry of coachEntries) {
        // Skip self
        if (entry.slotId === slot.id) continue
        
        // Check if there's an overlap (no venue filter for coaches - this is cross-roster detection)
        if (overlaps(slot.startsAt, slot.endsAt, entry.start, entry.end)) {
          hasCoachConflict = true
          console.log(`Coach conflict detected: Slot ${slot.id} (roster ${slot.rosterId}) conflicts with ${entry.slotId} (roster ${entry.rosterId}) for coach ${sessionCoach.coachId}`)
          break
        }
      }
      if (hasCoachConflict) break
    }

    slotConflicts.set(slot.id, { hasZoneConflict, hasCoachConflict })
  }

  // Update all slots with their conflict status
  const updatePromises: Promise<any>[] = []
  for (const slot of slots) {
    const conflict = slotConflicts.get(slot.id)
    if (!conflict) continue

    const hasConflict = conflict.hasZoneConflict || conflict.hasCoachConflict
    let conflictType: string | null = null
    if (conflict.hasZoneConflict && conflict.hasCoachConflict) {
      conflictType = 'both'
    } else if (conflict.hasZoneConflict) {
      conflictType = 'zone'
    } else if (conflict.hasCoachConflict) {
      conflictType = 'coach'
    }

    // Only update if the conflict status changed
    if (slot.conflictFlag !== hasConflict || slot.conflictType !== conflictType) {
      updatePromises.push(
        prisma.rosterSlot.update({
          where: { id: slot.id },
          data: { conflictFlag: hasConflict, conflictType },
        })
      )
    }
  }

  if (updatePromises.length > 0) {
    await Promise.all(updatePromises)
    console.log(`Updated conflict status for ${updatePromises.length} slots across ${allRostersForDate.length} rosters`)
  } else {
    console.log('No conflict status changes needed')
  }

  // Update session conflict flags for all affected rosters
  const sessions = await prisma.classSession.findMany({
    where: {
      rosterSlots: {
        some: { rosterId: { in: allRostersForDate.map((r: { id: string }) => r.id) } },
      },
    },
    include: {
      rosterSlots: true,
    },
  })

  for (const session of sessions) {
    const hasConflict = session.rosterSlots.some((s: any) => s.conflictFlag)
    if (session.conflictFlag !== hasConflict) {
      await prisma.classSession.update({
        where: { id: session.id },
        data: { conflictFlag: hasConflict },
      })
    }
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/apiAuth'
import { recalculateRosterConflicts } from '@/lib/rosterGenerator'
import { generateChatCompletion, isOpenAIConfigured } from '@/lib/openai'

/**
 * AI-assisted roster conflict resolution.
 *
 * Strategy (decided with the admin):
 *  - The deterministic engine computes the LEGAL candidate coaches for each
 *    coach conflict (accredited for the gymsport, available per their stated
 *    availability, and not already booked at that time).
 *  - The AI proposes a COORDINATED plan across all conflicts (so a scarce coach
 *    is not handed to two overlapping classes).
 *  - The engine VALIDATES every coach the AI proposes against the legal set and
 *    a running busy map, applies only valid moves in a single pass (so a fix can
 *    never create a brand-new coach conflict), and falls back to a deterministic
 *    pick when the AI is unavailable or proposes something invalid.
 *  - Zone conflicts are SUGGEST-ONLY: we surface a free, allowed alternative zone
 *    for the admin to apply manually (moving a class changes the roster
 *    materially, so it is not auto-applied).
 *  - Anything that cannot be resolved is returned with a clear, specific reason
 *    so the admin understands WHY (no silent re-loop into a conflict state).
 */

const DAY_CODES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map((v) => parseInt(v, 10))
  return h * 60 + m
}

const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean =>
  aStart < bEnd && bStart < aEnd

interface Interval {
  start: Date
  end: Date
}

function intervalsOverlap(a: Interval, b: Interval): boolean {
  return overlaps(a.start, a.end, b.start, b.end)
}

interface CoachRecord {
  id: string
  name: string
  gymsports: Array<{ gymsport: { id: string; name: string } }>
  availability: Array<{ dayOfWeek: string; startTimeLocal: string; endTimeLocal: string }>
}

function isAccredited(coach: CoachRecord, gymsportId: string | null): boolean {
  if (!gymsportId) return true
  if (!coach.gymsports || coach.gymsports.length === 0) return false
  return coach.gymsports.some((cg) => cg.gymsport.id === gymsportId)
}

function isAvailable(
  coach: CoachRecord,
  dayOfWeek: string,
  startTimeLocal: string,
  endTimeLocal: string
): boolean {
  if (!coach.availability || coach.availability.length === 0) return true // no availability set => assume available
  const dayWindows = coach.availability.filter((a) => a.dayOfWeek === dayOfWeek)
  if (dayWindows.length === 0) return false
  const start = timeToMinutes(startTimeLocal)
  const end = timeToMinutes(endTimeLocal)
  return dayWindows.some(
    (w) => start >= timeToMinutes(w.startTimeLocal) && end <= timeToMinutes(w.endTimeLocal)
  )
}

// POST /api/rosters/[id]/ai-resolve - coordinated single-pass conflict resolution
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAuth(req)
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const clubId = auth.user.clubId
    const { id: rosterId } = await params

    const roster = await prisma.roster.findFirst({
      where: { id: rosterId, clubId },
      select: { id: true, startDate: true, endDate: true, venueId: true, dayOfWeek: true },
    })
    if (!roster) {
      return NextResponse.json({ error: 'Roster not found' }, { status: 404 })
    }

    // All rosters covering this date (cross-roster conflict awareness).
    const rostersForDate = await prisma.roster.findMany({
      where: {
        clubId,
        startDate: { lte: roster.endDate },
        endDate: { gte: roster.startDate },
        status: { in: ['DRAFT', 'PUBLISHED'] },
      },
      select: { id: true },
    })

    const allSlots = await prisma.rosterSlot.findMany({
      where: { rosterId: { in: rostersForDate.map((r) => r.id) } },
      include: {
        session: {
          include: {
            coaches: { include: { coach: { select: { id: true, name: true } } } },
            template: { select: { id: true, name: true, gymsportId: true } },
            allowedZones: { select: { zoneId: true } },
          },
        },
        zone: { select: { id: true, name: true, allowOverlap: true } },
        roster: { select: { id: true, venueId: true } },
      },
      orderBy: { startsAt: 'asc' },
    })

    const activeCoaches: CoachRecord[] = await prisma.coach.findMany({
      where: { clubId, active: true },
      select: {
        id: true,
        name: true,
        gymsports: { select: { gymsport: { select: { id: true, name: true } } } },
        availability: { select: { dayOfWeek: true, startTimeLocal: true, endTimeLocal: true } },
      },
    })

    const venueZones = await prisma.zone.findMany({
      where: { clubId, active: true, venueId: roster.venueId },
      select: { id: true, name: true, allowOverlap: true },
    })

    // --- Build session-level view (coaches are per-session, slots are segments) ---
    interface SessionView {
      id: string
      rosterId: string
      venueId: string | null
      gymsportId: string | null
      className: string
      startTimeLocal: string
      endTimeLocal: string
      interval: Interval
      coachIds: string[]
      isThisRoster: boolean
    }

    const sessionMap = new Map<string, SessionView>()
    for (const slot of allSlots) {
      const s = slot.session
      let sv = sessionMap.get(s.id)
      if (!sv) {
        sv = {
          id: s.id,
          rosterId: slot.rosterId,
          venueId: slot.venueId,
          gymsportId: s.template?.gymsportId ?? null,
          className: s.template?.name || 'Class',
          startTimeLocal: s.startTimeLocal,
          endTimeLocal: s.endTimeLocal,
          interval: { start: slot.startsAt, end: slot.endsAt },
          coachIds: s.coaches.map((c) => c.coach.id),
          isThisRoster: slot.rosterId === rosterId,
        }
        sessionMap.set(s.id, sv)
      } else {
        if (slot.startsAt < sv.interval.start) sv.interval.start = slot.startsAt
        if (slot.endsAt > sv.interval.end) sv.interval.end = slot.endsAt
      }
    }

    const coachName = (id: string) => activeCoaches.find((c) => c.id === id)?.name || 'Coach'
    const dayOfWeek = roster.dayOfWeek || DAY_CODES[new Date(roster.startDate).getUTCDay()]

    // Coach-conflict sessions in THIS roster (slots flagged coach/both).
    const coachConflictSessionIds = new Set<string>()
    for (const slot of allSlots) {
      if (
        slot.rosterId === rosterId &&
        slot.conflictFlag &&
        (slot.conflictType === 'coach' || slot.conflictType === 'both')
      ) {
        coachConflictSessionIds.add(slot.session.id)
      }
    }

    // Seed busy map from all sessions that are NOT being resolved.
    const busy = new Map<string, Interval[]>()
    const addBusy = (coachId: string, interval: Interval) => {
      const list = busy.get(coachId) || []
      list.push(interval)
      busy.set(coachId, list)
    }
    for (const sv of sessionMap.values()) {
      if (coachConflictSessionIds.has(sv.id)) continue
      for (const cid of sv.coachIds) addBusy(cid, sv.interval)
    }
    const isCoachBusy = (coachId: string, interval: Interval): boolean =>
      (busy.get(coachId) || []).some((b) => intervalsOverlap(b, interval))

    // Order conflict sessions by start time for a stable single pass.
    const conflictSessions = [...sessionMap.values()]
      .filter((sv) => coachConflictSessionIds.has(sv.id))
      .sort((a, b) => a.interval.start.getTime() - b.interval.start.getTime())

    // --- Per-session candidate pools (independent of order; for the AI prompt) ---
    interface SessionPlan {
      session: SessionView
      accredited: CoachRecord[]
      available: CoachRecord[]
    }

    const plans: SessionPlan[] = []
    for (const sv of conflictSessions) {
      const accredited = activeCoaches.filter((c) => isAccredited(c, sv.gymsportId))
      const available = accredited.filter((c) =>
        isAvailable(c, dayOfWeek, sv.startTimeLocal, sv.endTimeLocal)
      )
      plans.push({ session: sv, accredited, available })
    }
    const planBySession = new Map(plans.map((p) => [p.session.id, p]))

    // --- Ask the AI for a coordinated plan (optional) ---
    // The pools sent here are the potentially-legal coaches (accredited + available,
    // minus any coach already booked by a fixed session). The live apply pass below
    // re-validates every pick, so the AI cannot introduce an invalid assignment.
    const aiEnabled = isOpenAIConfigured()
    let aiChoice: Map<string, string[]> = new Map() // sessionId -> chosen replacement coachIds
    const initialFree = (p: SessionPlan): CoachRecord[] =>
      p.available.filter((c) => !isCoachBusy(c.id, p.session.interval))
    if (aiEnabled && plans.some((p) => initialFree(p).length > 0)) {
      try {
        const promptPayload = plans.map((p) => ({
          sessionId: p.session.id,
          className: p.session.className,
          day: dayOfWeek,
          time: `${p.session.startTimeLocal}-${p.session.endTimeLocal}`,
          coachesNeeded: Math.max(p.session.coachIds.length, 1),
          candidateCoaches: initialFree(p).map((c) => ({ id: c.id, name: c.name })),
        }))

        const aiText = await generateChatCompletion({
          system:
            'You are a rostering assistant resolving coach scheduling conflicts for a gymnastics club. ' +
            'For each session you are given the number of coaches needed and the ONLY legal candidate coaches. ' +
            'Choose coaches strictly from each session\'s candidateCoaches list. ' +
            'Coordinate across sessions: never assign the same coach to two sessions whose times overlap. ' +
            'Prefer spreading work evenly. ' +
            'Respond with ONLY valid JSON of the form {"assignments":[{"sessionId":"...","coachIds":["..."]}]} and nothing else.',
          user: JSON.stringify({ sessions: promptPayload }),
          maxTokens: 700,
          temperature: 0.2,
        })

        const jsonStart = aiText.indexOf('{')
        const jsonEnd = aiText.lastIndexOf('}')
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const parsed = JSON.parse(aiText.slice(jsonStart, jsonEnd + 1)) as {
            assignments?: Array<{ sessionId: string; coachIds: string[] }>
          }
          for (const a of parsed.assignments || []) {
            if (a.sessionId && Array.isArray(a.coachIds)) {
              aiChoice.set(a.sessionId, a.coachIds)
            }
          }
        }
      } catch (err) {
        console.error('AI resolve planning failed, falling back to deterministic:', err)
        aiChoice = new Map()
      }
    }

    // --- Validate + apply in a single coordinated LIVE pass ---
    // Process conflict sessions in start-time order. Kept coaches are booked into
    // the busy map immediately so two overlapping conflict sessions can never both
    // retain the same coach — exactly one keeps them, the other gets a replacement.
    interface ResolvedReport {
      sessionId: string
      className: string
      time: string
      assignedCoaches: string[]
      via: 'ai' | 'auto'
    }
    interface UnresolvedReport {
      sessionId: string
      className: string
      time: string
      reason: string
    }

    const resolved: ResolvedReport[] = []
    const unresolved: UnresolvedReport[] = []
    const sessionsToUpdate = new Map<string, string[]>() // sessionId -> final coachIds

    for (const sv of conflictSessions) {
      const plan = planBySession.get(sv.id)!
      const timeLabel = `${sv.startTimeLocal}-${sv.endTimeLocal}`

      // Determine which existing coaches can stay (not already booked elsewhere) vs
      // must be replaced, against the LIVE busy map.
      const kept: string[] = []
      let droppedCount = 0
      for (const cid of sv.coachIds) {
        if (isCoachBusy(cid, sv.interval) || kept.includes(cid)) {
          droppedCount++
        } else {
          kept.push(cid)
          addBusy(cid, sv.interval) // book retained coach
        }
      }
      const replacementsNeeded = Math.max(droppedCount, sv.coachIds.length === 0 ? 1 : 0)

      if (replacementsNeeded === 0) {
        // Resolved purely by keeping its coaches; the clash came from another session.
        continue
      }

      const keptSet = new Set(kept)
      const stillFree = plan.available.filter(
        (c) => !keptSet.has(c.id) && !isCoachBusy(c.id, sv.interval)
      )

      if (stillFree.length < replacementsNeeded) {
        let reason: string
        const gymsportLabel =
          plan.accredited[0]?.gymsports?.find((g) => g.gymsport.id === sv.gymsportId)?.gymsport
            .name ||
          plan.available[0]?.gymsports?.find((g) => g.gymsport.id === sv.gymsportId)?.gymsport
            .name ||
          'this program'
        if (plan.accredited.length === 0) {
          reason = `No active coaches are accredited for ${gymsportLabel}. Add an accreditation or assign a coach manually.`
        } else if (plan.available.length === 0) {
          reason = `No accredited coaches list availability covering ${timeLabel} on ${dayOfWeek}. Update coach availability or assign manually.`
        } else {
          reason = `Only ${stillFree.length} suitable coach${stillFree.length === 1 ? '' : 'es'} free at ${timeLabel}, but ${replacementsNeeded} needed — the others are already booked in overlapping classes at this time.`
        }
        unresolved.push({ sessionId: sv.id, className: sv.className, time: timeLabel, reason })
        continue
      }

      // Choose replacements: prefer the AI's validated picks, else deterministic.
      const chosen: CoachRecord[] = []
      const aiPicks = aiChoice.get(sv.id)
      if (aiPicks && aiPicks.length > 0) {
        for (const pickId of aiPicks) {
          if (chosen.length >= replacementsNeeded) break
          const cand = stillFree.find(
            (c) => c.id === pickId && !chosen.some((ch) => ch.id === c.id)
          )
          if (cand) chosen.push(cand)
        }
      }
      if (chosen.length < replacementsNeeded) {
        for (const c of stillFree) {
          if (chosen.length >= replacementsNeeded) break
          if (!chosen.some((ch) => ch.id === c.id)) chosen.push(c)
        }
      }

      const finalCoachIds = [...kept, ...chosen.map((c) => c.id)]
      sessionsToUpdate.set(sv.id, finalCoachIds)
      for (const c of chosen) addBusy(c.id, sv.interval) // book replacements

      resolved.push({
        sessionId: sv.id,
        className: sv.className,
        time: timeLabel,
        assignedCoaches: finalCoachIds.map(coachName),
        via: aiPicks && chosen.length > 0 && chosen.every((c) => aiPicks.includes(c.id)) ? 'ai' : 'auto',
      })
    }

    // Apply coach reassignments.
    for (const [sessionId, coachIds] of sessionsToUpdate) {
      await prisma.sessionCoach.deleteMany({ where: { sessionId } })
      for (const coachId of coachIds) {
        await prisma.sessionCoach.create({ data: { sessionId, coachId } })
      }
    }

    // --- Zone conflicts: suggest-only ---
    interface ZoneSuggestion {
      slotId: string
      className: string
      time: string
      currentZone: string
      suggestedZone: string | null
      reason: string
    }
    const zoneSuggestions: ZoneSuggestion[] = []
    const zoneConflictSlots = allSlots.filter(
      (s) =>
        s.rosterId === rosterId &&
        s.conflictFlag &&
        (s.conflictType === 'zone' || s.conflictType === 'both')
    )
    for (const slot of zoneConflictSlots) {
      const interval: Interval = { start: slot.startsAt, end: slot.endsAt }
      const timeLabel = `${slot.session.startTimeLocal}-${slot.session.endTimeLocal}`
      const allowedZoneIds = new Set(slot.session.allowedZones.map((z) => z.zoneId))
      // Candidate zones: same venue, active, not the current zone, free at this time.
      const candidateZones = venueZones.filter((z) => {
        if (z.id === slot.zoneId) return false
        if (allowedZoneIds.size > 0 && !allowedZoneIds.has(z.id)) return false
        // Occupied if another slot uses this zone in the same venue at an overlapping time
        // (unless overlap is allowed).
        const occupied = allSlots.some((other) => {
          if (other.id === slot.id) return false
          if (other.zoneId !== z.id) return false
          if (other.venueId !== slot.venueId) return false
          if (other.allowOverlap || other.zone.allowOverlap || z.allowOverlap) return false
          return intervalsOverlap({ start: other.startsAt, end: other.endsAt }, interval)
        })
        return !occupied
      })
      zoneSuggestions.push({
        slotId: slot.id,
        className: slot.session.template?.name || 'Class',
        time: timeLabel,
        currentZone: slot.zone.name,
        suggestedZone: candidateZones[0]?.name ?? null,
        reason: candidateZones[0]
          ? `Move to "${candidateZones[0].name}" which is free at ${timeLabel}. Use Edit Class to apply.`
          : `No alternative zone is free at ${timeLabel}. Consider changing the class time or enabling zone overlap.`,
      })
    }

    // Recalculate conflict flags once after all changes.
    const affectedRosterIds = new Set<string>([rosterId])
    for (const sessionId of sessionsToUpdate.keys()) {
      const sv = sessionMap.get(sessionId)
      if (sv) affectedRosterIds.add(sv.rosterId)
    }
    for (const rid of affectedRosterIds) {
      await recalculateRosterConflicts(prisma, rid)
    }

    return NextResponse.json({
      aiEnabled,
      resolvedCount: resolved.length,
      unresolvedCount: unresolved.length,
      resolved,
      unresolved,
      zoneSuggestions,
    })
  } catch (err) {
    console.error('AI roster resolve failed:', err)
    return NextResponse.json({ error: 'Failed to resolve conflicts' }, { status: 500 })
  }
}

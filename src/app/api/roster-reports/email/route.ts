import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import { sendEmail } from '@/lib/email'

// Helper function to format time without timezone conversion
function formatLocalTime(date: Date, formatStr: string): string {
  // Create a date string that represents the local time components
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  
  // Reconstruct the date treating the components as local
  const localDate = new Date(`${year}-${month}-${day}T${hours}:${minutes}:${seconds}`)
  return format(localDate, formatStr)
}

function getAccessToken(req: NextRequest): string | null {
  const headerToken = req.headers.get('authorization')
  if (headerToken?.startsWith('Bearer ')) {
    return headerToken.replace('Bearer ', '').trim()
  }
  const cookieToken = req.cookies.get('accessToken')?.value
  return cookieToken || null
}

export async function POST(request: NextRequest) {
  try {
    const token = getAccessToken(request)
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

    // Filter out slots that have already passed (only include future and today's slots)
    const now = new Date()
    const futureSlots = allSlots.filter(slot => new Date(slot.startsAt) >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))

    if (sendToAll) {
      // Group slots by coach
      const coachMap = new Map<string, SlotWithRoster[]>()

      futureSlots.forEach((slot) => {
        slot.session.coaches.forEach((sc) => {
          const coachId = sc.coach.id
          if (!coachMap.has(coachId)) {
            coachMap.set(coachId, [])
          }
          coachMap.get(coachId)!.push(slot)
        })
      })

      // Format email content for each coach
      const emailPromises = Array.from(coachMap.entries()).map(async ([cId, slots]) => {
        const coach = await prisma.coach.findUnique({ where: { id: cId } })
        if (!coach?.email) return null

        // Group slots by session to consolidate rotation times
        const sessionMap = new Map<string, {
          className: string
          date: string
          sessionId: string
          slots: { startsAt: Date; endsAt: Date }[]
        }>()

        slots.forEach(slot => {
          const key = `${slot.session.id}-${format(new Date(slot.startsAt), 'yyyy-MM-dd')}`
          
          if (!sessionMap.has(key)) {
            sessionMap.set(key, {
              className: slot.session.template?.name || 'Unknown Class',
              date: format(new Date(slot.startsAt), 'yyyy-MM-dd'),
              sessionId: slot.session.id,
              slots: []
            })
          }
          
          sessionMap.get(key)!.slots.push({
            startsAt: new Date(slot.startsAt),
            endsAt: new Date(slot.endsAt)
          })
        })

        // Convert to allocations with consolidated times
        const allocations = Array.from(sessionMap.values()).map(session => {
          const startTimes = session.slots.map(s => s.startsAt.getTime())
          const endTimes = session.slots.map(s => s.endsAt.getTime())
          const earliestStart = new Date(Math.min(...startTimes))
          const latestEnd = new Date(Math.max(...endTimes))

          return {
            className: session.className,
            date: format(new Date(session.date), 'EEE, MMM dd, yyyy'),
            startTime: formatLocalTime(earliestStart, 'h:mm a'),
            endTime: formatLocalTime(latestEnd, 'h:mm a'),
          }
        }).sort((a, b) => a.date.localeCompare(b.date))

        const emailBody = generateCoachAllocationEmail(coach.name, allocations, startDate, endDate)
        
        try {
          await sendEmail({
            to: coach.email,
            subject: `Your Coaching Schedule - ${format(new Date(startDate), 'MMM dd')} to ${format(new Date(endDate), 'MMM dd, yyyy')}`,
            htmlContent: emailBody,
          })
          console.log(`✅ Email sent successfully to ${coach.name} (${coach.email})`)
          return coach.email
        } catch (error) {
          console.error(`❌ Failed to send email to ${coach.name}:`, error)
          return null
        }
      })

      const results = await Promise.all(emailPromises)
      const sentCount = results.filter(Boolean).length
      const failedCount = results.length - sentCount

      return NextResponse.json({
        success: true,
        message: `Emails sent to ${sentCount} coach(es)${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
        sentCount,
        failedCount,
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

      // Filter slots for this coach (using futureSlots instead of allSlots)
      const coachSlots = futureSlots.filter((slot) =>
        slot.session.coaches.some((sc) => sc.coach.id === coachId)
      )

      // Group slots by session to consolidate rotation times
      const sessionMap = new Map<string, {
        className: string
        date: string
        sessionId: string
        slots: { startsAt: Date; endsAt: Date }[]
      }>()

      coachSlots.forEach(slot => {
        const key = `${slot.session.id}-${format(new Date(slot.startsAt), 'yyyy-MM-dd')}`
        
        if (!sessionMap.has(key)) {
          sessionMap.set(key, {
            className: slot.session.template?.name || 'Unknown Class',
            date: format(new Date(slot.startsAt), 'yyyy-MM-dd'),
            sessionId: slot.session.id,
            slots: []
          })
        }
        
        sessionMap.get(key)!.slots.push({
          startsAt: new Date(slot.startsAt),
          endsAt: new Date(slot.endsAt)
        })
      })

      // Convert to allocations with consolidated times
      const allocations = Array.from(sessionMap.values()).map(session => {
        const startTimes = session.slots.map(s => s.startsAt.getTime())
        const endTimes = session.slots.map(s => s.endsAt.getTime())
        const earliestStart = new Date(Math.min(...startTimes))
        const latestEnd = new Date(Math.max(...endTimes))

        return {
          className: session.className,
          date: format(new Date(session.date), 'EEE, MMM dd, yyyy'),
          startTime: formatLocalTime(earliestStart, 'h:mm a'),
          endTime: formatLocalTime(latestEnd, 'h:mm a'),
        }
      }).sort((a, b) => a.date.localeCompare(b.date))

      const emailBody = generateCoachAllocationEmail(coach.name, allocations, startDate, endDate)

      try {
        await sendEmail({
          to: coach.email,
          subject: `Your Coaching Schedule - ${format(new Date(startDate), 'MMM dd')} to ${format(new Date(endDate), 'MMM dd, yyyy')}`,
          htmlContent: emailBody,
        })
        console.log(`✅ Email sent successfully to ${coach.name} (${coach.email})`)
        
        return NextResponse.json({
          success: true,
          message: `Email sent successfully to ${coach.name}`,
        })
      } catch (error) {
        console.error(`❌ Failed to send email to ${coach.name}:`, error)
        return NextResponse.json(
          { error: `Failed to send email to ${coach.name}` },
          { status: 500 }
        )
      }
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

// Email template generator
function generateCoachAllocationEmail(
  coachName: string,
  allocations: Array<{
    className: string
    date: string
    startTime: string
    endTime: string
  }>,
  startDate: string,
  endDate: string
): string {
  const dateRange = `${format(new Date(startDate), 'MMM dd, yyyy')} - ${format(new Date(endDate), 'MMM dd, yyyy')}`
  
  let html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 {
      color: #2563eb;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 10px;
    }
    h2 {
      color: #1f2937;
      margin-top: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    th {
      background-color: #f3f4f6;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #374151;
      border-bottom: 2px solid #d1d5db;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    tr:hover {
      background-color: #f9fafb;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <h1>Your Coaching Schedule</h1>
  <p>Hi ${coachName},</p>
  <p>Here is your coaching schedule for <strong>${dateRange}</strong>:</p>
  
  <table>
    <thead>
      <tr>
        <th>Class</th>
        <th>Date</th>
        <th>Start Time</th>
        <th>End Time</th>
      </tr>
    </thead>
    <tbody>
`

  allocations.forEach(allocation => {
    html += `
      <tr>
        <td><strong>${allocation.className}</strong></td>
        <td>${allocation.date}</td>
        <td>${allocation.startTime}</td>
        <td>${allocation.endTime}</td>
      </tr>
`
  })

  html += `
    </tbody>
  </table>
  
  <div class="footer">
    <p>If you have any questions or need to make changes to your schedule, please contact your supervisor.</p>
    <p><em>This is an automated message. Please do not reply to this email.</em></p>
  </div>
</body>
</html>
`

  return html
}

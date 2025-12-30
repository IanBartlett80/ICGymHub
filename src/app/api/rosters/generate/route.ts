import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'
import { generateDailyRoster } from '@/lib/rosterGenerator'

const timePattern = /^\d{2}:\d{2}$/

const generateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  templates: z
    .array(
      z.object({
        templateId: z.string(),
        rotationMinutes: z.number().int().positive().optional(),
        allowedZoneIds: z.array(z.string()).optional(),
        coachIds: z.array(z.string()).optional(),
        allowOverlap: z.boolean().optional(),
        startTimeLocal: z.string().regex(timePattern).optional(),
        endTimeLocal: z.string().regex(timePattern).optional(),
      })
    )
    .min(1),
})

function getAccessToken(req: NextRequest): string | null {
  const headerToken = req.headers.get('authorization')
  if (headerToken?.startsWith('Bearer ')) {
    return headerToken.replace('Bearer ', '').trim()
  }
  const cookieToken = req.cookies.get('accessToken')?.value
  return cookieToken || null
}

export async function POST(req: NextRequest) {
  try {
    const token = getAccessToken(req)
    const payload = token ? verifyAccessToken(token) : null
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { club: true },
    })

    if (!user || !user.club || user.clubId !== payload.clubId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = generateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
    }

    const { date, templates } = parsed.data

    const result = await generateDailyRoster(prisma, {
      clubId: user.clubId,
      date,
      selections: templates,
      generatedById: user.id,
      timezone: user.club.timezone,
    })

    return NextResponse.json(
      {
        rosterId: result.rosterId,
        sessionIds: result.sessionIds,
        slotCount: result.slotCount,
        conflicts: result.conflicts,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Roster generation failed', error)
    return NextResponse.json({ error: 'Failed to generate roster' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
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

// GET /api/classes - List all class templates for the club
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const classes = await prisma.classTemplate.findMany({
      where: { clubId: user.clubId },
      include: {
        allowedZones: { include: { zone: true } },
        defaultCoaches: { include: { coach: true } },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ classes }, { status: 200 })
  } catch (error) {
    console.error('Failed to fetch classes', error)
    return NextResponse.json({ error: 'Failed to fetch classes' }, { status: 500 })
  }
}

const classSchema = z.object({
  name: z.string().min(1).max(200),
  level: z.string().min(1),
  lengthMinutes: z.number().int().positive(),
  defaultRotationMinutes: z.number().int().positive(),
  allowOverlap: z.boolean().optional(),
  activeDays: z.string(), // comma-separated days
  startTimeLocal: z.string().regex(/^\d{2}:\d{2}$/),
  endTimeLocal: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().max(1000).optional(),
  allowedZoneIds: z.array(z.string()).optional(),
  defaultCoachIds: z.array(z.string()).optional(),
})

// POST /api/classes - Create a new class template
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = classSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
    }

    const {
      name,
      level,
      lengthMinutes,
      defaultRotationMinutes,
      allowOverlap,
      activeDays,
      startTimeLocal,
      endTimeLocal,
      notes,
      allowedZoneIds,
      defaultCoachIds,
    } = parsed.data

    // Check for duplicate name
    const existing = await prisma.classTemplate.findUnique({
      where: { clubId_name: { clubId: user.clubId, name } },
    })

    if (existing) {
      return NextResponse.json({ error: 'A class with this name already exists' }, { status: 400 })
    }

    const classTemplate = await prisma.classTemplate.create({
      data: {
        clubId: user.clubId,
        name,
        level,
        lengthMinutes,
        defaultRotationMinutes,
        allowOverlap: allowOverlap ?? false,
        activeDays,
        startTimeLocal,
        endTimeLocal,
        notes: notes || null,
      },
    })

    // Link allowed zones
    if (allowedZoneIds?.length) {
      for (const zoneId of allowedZoneIds) {
        await prisma.templateAllowedZone.create({
          data: {
            templateId: classTemplate.id,
            zoneId,
          },
        })
      }
    }

    // Link default coaches
    if (defaultCoachIds?.length) {
      for (const coachId of defaultCoachIds) {
        await prisma.templateCoach.create({
          data: {
            templateId: classTemplate.id,
            coachId,
          },
        })
      }
    }

    return NextResponse.json({ class: classTemplate }, { status: 201 })
  } catch (error) {
    console.error('Failed to create class', error)
    return NextResponse.json({ error: 'Failed to create class' }, { status: 500 })
  }
}

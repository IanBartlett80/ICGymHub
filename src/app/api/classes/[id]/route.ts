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

const classSchema = z.object({
  name: z.string().min(1).max(200),
  level: z.string().min(1),
  lengthMinutes: z.number().int().positive(),
  defaultRotationMinutes: z.number().int().positive(),
  allowOverlap: z.boolean().optional(),
  activeDays: z.string(),
  startTimeLocal: z.string().regex(/^\d{2}:\d{2}$/),
  endTimeLocal: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().max(1000).optional(),
  allowedZoneIds: z.array(z.string()).optional(),
  defaultCoachIds: z.array(z.string()).optional(),
})

// GET /api/classes/[id] - Get a specific class template
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const classTemplate = await prisma.classTemplate.findFirst({
      where: { id, clubId: user.clubId },
      include: {
        allowedZones: { include: { zone: true } },
        defaultCoaches: { include: { coach: true } },
      },
    })

    if (!classTemplate) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    return NextResponse.json({ class: classTemplate }, { status: 200 })
  } catch (error) {
    console.error('Failed to fetch class', error)
    return NextResponse.json({ error: 'Failed to fetch class' }, { status: 500 })
  }
}

// PATCH /api/classes/[id] - Update a class template
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const classTemplate = await prisma.classTemplate.findFirst({
      where: { id, clubId: user.clubId },
    })

    if (!classTemplate) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
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

    // Check for duplicate name (excluding current class)
    if (name !== classTemplate.name) {
      const existing = await prisma.classTemplate.findFirst({
        where: { clubId: user.clubId, name, id: { not: id } },
      })

      if (existing) {
        return NextResponse.json({ error: 'A class with this name already exists' }, { status: 400 })
      }
    }

    const updated = await prisma.classTemplate.update({
      where: { id },
      data: {
        name,
        level,
        lengthMinutes,
        defaultRotationMinutes,
        allowOverlap: allowOverlap ?? classTemplate.allowOverlap,
        activeDays,
        startTimeLocal,
        endTimeLocal,
        notes: notes || null,
      },
    })

    // Update allowed zones
    await prisma.templateAllowedZone.deleteMany({
      where: { templateId: id },
    })

    if (allowedZoneIds?.length) {
      for (const zoneId of allowedZoneIds) {
        await prisma.templateAllowedZone.create({
          data: {
            templateId: id,
            zoneId,
          },
        })
      }
    }

    // Update default coaches
    await prisma.templateCoach.deleteMany({
      where: { templateId: id },
    })

    if (defaultCoachIds?.length) {
      for (const coachId of defaultCoachIds) {
        await prisma.templateCoach.create({
          data: {
            templateId: id,
            coachId,
          },
        })
      }
    }

    return NextResponse.json({ class: updated }, { status: 200 })
  } catch (error) {
    console.error('Failed to update class', error)
    return NextResponse.json({ error: 'Failed to update class' }, { status: 500 })
  }
}

// DELETE /api/classes/[id] - Delete a class template
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const classTemplate = await prisma.classTemplate.findFirst({
      where: { id, clubId: user.clubId },
    })

    if (!classTemplate) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    await prisma.classTemplate.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Class deleted successfully' }, { status: 200 })
  } catch (error) {
    console.error('Failed to delete class', error)
    return NextResponse.json({ error: 'Failed to delete class' }, { status: 500 })
  }
}

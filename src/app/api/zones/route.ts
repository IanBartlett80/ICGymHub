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

// GET /api/zones - List all zones for the club
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const zones = await prisma.zone.findMany({
      where: { clubId: user.clubId },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ zones }, { status: 200 })
  } catch (error) {
    console.error('Failed to fetch zones', error)
    return NextResponse.json({ error: 'Failed to fetch zones' }, { status: 500 })
  }
}

const zoneSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  allowOverlap: z.boolean().optional(),
  active: z.boolean().optional(),
  isFirst: z.boolean().optional(),
})

// POST /api/zones - Create a new zone
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = zoneSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
    }

    const { name, description, allowOverlap, active, isFirst } = parsed.data

    // Check for duplicate name
    const existing = await prisma.zone.findUnique({
      where: { clubId_name: { clubId: user.clubId, name } },
    })

    if (existing) {
      return NextResponse.json({ error: 'A zone with this name already exists' }, { status: 400 })
    }

    const zone = await prisma.zone.create({
      data: {
        clubId: user.clubId,
        name,
        description: description || null,
        allowOverlap: allowOverlap ?? false,
        active: active ?? true,
        isFirst: isFirst ?? false,
      },
    })

    return NextResponse.json({ zone }, { status: 201 })
  } catch (error) {
    console.error('Failed to create zone', error)
    return NextResponse.json({ error: 'Failed to create zone' }, { status: 500 })
  }
}

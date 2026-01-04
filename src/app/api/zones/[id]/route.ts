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

const zoneSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  allowOverlap: z.boolean().optional(),
  active: z.boolean().optional(),
})

// GET /api/zones/[id] - Get a specific zone
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const zone = await prisma.zone.findFirst({
      where: { id, clubId: user.clubId },
    })

    if (!zone) {
      return NextResponse.json({ error: 'Zone not found' }, { status: 404 })
    }

    return NextResponse.json({ zone }, { status: 200 })
  } catch (error) {
    console.error('Failed to fetch zone', error)
    return NextResponse.json({ error: 'Failed to fetch zone' }, { status: 500 })
  }
}

// PATCH /api/zones/[id] - Update a zone
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const zone = await prisma.zone.findFirst({
      where: { id, clubId: user.clubId },
    })

    if (!zone) {
      return NextResponse.json({ error: 'Zone not found' }, { status: 404 })
    }

    const body = await req.json()
    const parsed = zoneSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
    }

    const { name, description, allowOverlap, active } = parsed.data

    // Check for duplicate name (excluding current zone)
    if (name !== zone.name) {
      const existing = await prisma.zone.findFirst({
        where: { clubId: user.clubId, name, id: { not: id } },
      })

      if (existing) {
        return NextResponse.json({ error: 'A zone with this name already exists' }, { status: 400 })
      }
    }

    const updated = await prisma.zone.update({
      where: { id },
      data: {
        name,
        description: description || null,
        allowOverlap: allowOverlap ?? zone.allowOverlap,
        active: active ?? zone.active,
      },
    })

    return NextResponse.json({ zone: updated }, { status: 200 })
  } catch (error) {
    console.error('Failed to update zone', error)
    return NextResponse.json({ error: 'Failed to update zone' }, { status: 500 })
  }
}

// DELETE /api/zones/[id] - Delete a zone
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const zone = await prisma.zone.findFirst({
      where: { id, clubId: user.clubId },
    })

    if (!zone) {
      return NextResponse.json({ error: 'Zone not found' }, { status: 404 })
    }

    await prisma.zone.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Zone deleted successfully' }, { status: 200 })
  } catch (error) {
    console.error('Failed to delete zone', error)
    return NextResponse.json({ error: 'Failed to delete zone' }, { status: 500 })
  }
}

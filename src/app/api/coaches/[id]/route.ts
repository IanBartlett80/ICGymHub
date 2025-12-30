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

const coachSchema = z.object({
  name: z.string().min(1).max(200),
  accreditationLevel: z.string().max(100).optional(),
  membershipNumber: z.string().max(100).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
})

// GET /api/coaches/[id] - Get a specific coach
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const coach = await prisma.coach.findFirst({
      where: { id: params.id, clubId: user.clubId },
    })

    if (!coach) {
      return NextResponse.json({ error: 'Coach not found' }, { status: 404 })
    }

    return NextResponse.json({ coach }, { status: 200 })
  } catch (error) {
    console.error('Failed to fetch coach', error)
    return NextResponse.json({ error: 'Failed to fetch coach' }, { status: 500 })
  }
}

// PATCH /api/coaches/[id] - Update a coach
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const coach = await prisma.coach.findFirst({
      where: { id: params.id, clubId: user.clubId },
    })

    if (!coach) {
      return NextResponse.json({ error: 'Coach not found' }, { status: 404 })
    }

    const body = await req.json()
    const parsed = coachSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
    }

    const { name, accreditationLevel, membershipNumber, email, phone } = parsed.data

    // Check for duplicate email (excluding current coach)
    if (email && email !== coach.email) {
      const existing = await prisma.coach.findFirst({
        where: { clubId: user.clubId, email, id: { not: params.id } },
      })

      if (existing) {
        return NextResponse.json({ error: 'A coach with this email already exists' }, { status: 400 })
      }
    }

    const updated = await prisma.coach.update({
      where: { id: params.id },
      data: {
        name,
        accreditationLevel: accreditationLevel || null,
        membershipNumber: membershipNumber || null,
        email: email || null,
        phone: phone || null,
      },
    })

    return NextResponse.json({ coach: updated }, { status: 200 })
  } catch (error) {
    console.error('Failed to update coach', error)
    return NextResponse.json({ error: 'Failed to update coach' }, { status: 500 })
  }
}

// DELETE /api/coaches/[id] - Delete a coach
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const coach = await prisma.coach.findFirst({
      where: { id: params.id, clubId: user.clubId },
    })

    if (!coach) {
      return NextResponse.json({ error: 'Coach not found' }, { status: 404 })
    }

    await prisma.coach.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Coach deleted successfully' }, { status: 200 })
  } catch (error) {
    console.error('Failed to delete coach', error)
    return NextResponse.json({ error: 'Failed to delete coach' }, { status: 500 })
  }
}

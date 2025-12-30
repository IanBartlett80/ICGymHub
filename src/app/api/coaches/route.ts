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

// GET /api/coaches - List all coaches for the club
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const coaches = await prisma.coach.findMany({
      where: { clubId: user.clubId },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ coaches }, { status: 200 })
  } catch (error) {
    console.error('Failed to fetch coaches', error)
    return NextResponse.json({ error: 'Failed to fetch coaches' }, { status: 500 })
  }
}

const coachSchema = z.object({
  name: z.string().min(1).max(200),
  accreditationLevel: z.string().max(100).optional(),
  membershipNumber: z.string().max(100).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
})

// POST /api/coaches - Create a new coach
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = coachSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
    }

    const { name, accreditationLevel, membershipNumber, email, phone } = parsed.data

    // Check for duplicate email if provided
    if (email) {
      const existing = await prisma.coach.findUnique({
        where: { clubId_email: { clubId: user.clubId, email } },
      })

      if (existing) {
        return NextResponse.json({ error: 'A coach with this email already exists' }, { status: 400 })
      }
    }

    const coach = await prisma.coach.create({
      data: {
        clubId: user.clubId,
        name,
        accreditationLevel: accreditationLevel || null,
        membershipNumber: membershipNumber || null,
        email: email || null,
        phone: phone || null,
        importedFromCsv: false,
      },
    })

    return NextResponse.json({ coach }, { status: 201 })
  } catch (error) {
    console.error('Failed to create coach', error)
    return NextResponse.json({ error: 'Failed to create coach' }, { status: 500 })
  }
}

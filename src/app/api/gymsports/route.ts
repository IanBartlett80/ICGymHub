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

// GET /api/gymsports - List all gymsports for the club
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const gymsports = await prisma.gymsport.findMany({
      where: { clubId: user.clubId, active: true },
      orderBy: [{ isPredefined: 'desc' }, { name: 'asc' }],
    })

    return NextResponse.json({ gymsports }, { status: 200 })
  } catch (error) {
    console.error('Failed to fetch gymsports', error)
    return NextResponse.json({ error: 'Failed to fetch gymsports' }, { status: 500 })
  }
}

const gymsportSchema = z.object({
  name: z.string().min(1).max(200),
})

// POST /api/gymsports - Create a new custom gymsport
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = gymsportSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
    }

    const { name } = parsed.data

    // Check for duplicate name
    const existing = await prisma.gymsport.findUnique({
      where: { clubId_name: { clubId: user.clubId, name } },
    })

    if (existing) {
      return NextResponse.json({ error: 'A gymsport with this name already exists' }, { status: 400 })
    }

    const gymsport = await prisma.gymsport.create({
      data: {
        clubId: user.clubId,
        name,
        isPredefined: false,
        active: true,
      },
    })

    return NextResponse.json({ gymsport }, { status: 201 })
  } catch (error) {
    console.error('Failed to create gymsport', error)
    return NextResponse.json({ error: 'Failed to create gymsport' }, { status: 500 })
  }
}

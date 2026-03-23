import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function getAccessToken(req: NextRequest): string | null {
  const headerToken = req.headers.get('authorization')
  if (headerToken?.startsWith('Bearer ')) {
    return headerToken.replace('Bearer ', '').trim()
  }
  const cookieToken = req.cookies.get('accessToken')?.value
  return cookieToken || null
}

// GET /api/clubs/settings - Get club settings
export async function GET(request: NextRequest) {
  try {
    const token = getAccessToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyAccessToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { club: true },
    })

    if (!user?.club) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 })
    }

    return NextResponse.json({
      club: {
        id: user.club.id,
        name: user.club.name,
        timezone: user.club.timezone,
      },
    })
  } catch (error) {
    console.error('Get club settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Valid IANA timezone identifiers for Australian clubs (expandable)
const VALID_TIMEZONES = [
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Brisbane',
  'Australia/Perth',
  'Australia/Adelaide',
  'Australia/Hobart',
  'Australia/Darwin',
  'Australia/Lord_Howe',
  'Pacific/Auckland',
  'Pacific/Fiji',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Vancouver',
]

// PATCH /api/clubs/settings - Update club settings
export async function PATCH(request: NextRequest) {
  try {
    const token = getAccessToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyAccessToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { club: true },
    })

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!user.club) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 })
    }

    const body = await request.json()
    const { timezone } = body

    if (timezone && !VALID_TIMEZONES.includes(timezone)) {
      return NextResponse.json(
        { error: 'Invalid timezone. Please select a valid timezone.' },
        { status: 400 }
      )
    }

    const updatedClub = await prisma.club.update({
      where: { id: user.club.id },
      data: {
        ...(timezone && { timezone }),
      },
    })

    return NextResponse.json({
      message: 'Club settings updated successfully',
      club: {
        id: updatedClub.id,
        name: updatedClub.name,
        timezone: updatedClub.timezone,
      },
    })
  } catch (error) {
    console.error('Update club settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

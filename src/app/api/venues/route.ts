import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/apiAuth'
import { prisma } from '@/lib/prisma'

// GET /api/venues - List all venues for the club
export async function GET(request: NextRequest) {
  try {
    const payload = await verifyAuth(request)
    if (!payload.authenticated || !payload.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const venues = await prisma.venue.findMany({
      where: {
        clubId: payload.user.clubId,
      },
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' },
      ],
      include: {
        _count: {
          select: {
            zones: true,
            equipment: true,
            rosters: true,
            injurySubmissions: true,
            complianceItems: true,
          },
        },
      },
    })

    return NextResponse.json({ venues }, { status: 200 })
  } catch (error) {
    console.error('Error fetching venues:', error)
    return NextResponse.json(
      { error: 'Failed to fetch venues' },
      { status: 500 }
    )
  }
}

// POST /api/venues - Create a new venue
export async function POST(request: NextRequest) {
  try {
    const payload = await verifyAuth(request)
    if (!payload.authenticated || !payload.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, address, city, state, postalCode, phone, timezone } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Venue name is required' },
        { status: 400 }
      )
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    // Check if slug already exists for this club
    const existingVenue = await prisma.venue.findUnique({
      where: {
        clubId_slug: {
          clubId: payload.user.clubId,
          slug,
        },
      },
    })

    if (existingVenue) {
      return NextResponse.json(
        { error: 'A venue with this name already exists' },
        { status: 400 }
      )
    }

    // Get default venue count to determine if this should be default
    const venueCount = await prisma.venue.count({
      where: { clubId: payload.user.clubId },
    })

    const venue = await prisma.venue.create({
      data: {
        clubId: payload.user.clubId,
        name,
        slug,
        address,
        city,
        state,
        postalCode,
        phone,
        timezone: timezone || 'Australia/Sydney',
        isDefault: venueCount === 0, // First venue is default
        active: true,
      },
    })

    return NextResponse.json({ venue }, { status: 201 })
  } catch (error) {
    console.error('Error creating venue:', error)
    return NextResponse.json(
      { error: 'Failed to create venue' },
      { status: 500 }
    )
  }
}

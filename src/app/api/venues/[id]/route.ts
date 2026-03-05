import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/apiAuth'
import { prisma } from '@/lib/prisma'

// GET /api/venues/[id] - Get a specific venue
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await verifyAuth(request)
    if (!payload.authenticated || !payload.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const venue = await prisma.venue.findFirst({
      where: {
        id,
        clubId: payload.user.clubId,
      },
      include: {
        _count: {
          select: {
            zones: true,
            equipment: true,
            rosters: true,
            rosterTemplates: true,
            classSessions: true,
            injurySubmissions: true,
            injuryFormTemplates: true,
            complianceItems: true,
            complianceCategories: true,
            safetyIssues: true,
            maintenanceTasks: true,
          },
        },
      },
    })

    if (!venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
    }

    return NextResponse.json({ venue }, { status: 200 })
  } catch (error) {
    console.error('Error fetching venue:', error)
    return NextResponse.json(
      { error: 'Failed to fetch venue' },
      { status: 500 }
    )
  }
}

// PATCH /api/venues/[id] - Update a venue
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await verifyAuth(request)
    if (!payload.authenticated || !payload.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, address, city, state, postalCode, phone, timezone, active } = body

    // Verify venue exists and belongs to this club
    const existingVenue = await prisma.venue.findFirst({
      where: {
        id,
        clubId: payload.user.clubId,
      },
    })

    if (!existingVenue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
    }

    // If updating name, regenerate slug
    let slug = existingVenue.slug
    if (name && name !== existingVenue.name) {
      slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

      // Check if new slug conflicts
      const conflictingVenue = await prisma.venue.findFirst({
        where: {
          clubId: payload.user.clubId,
          slug,
          NOT: { id },
        },
      })

      if (conflictingVenue) {
        return NextResponse.json(
          { error: 'A venue with this name already exists' },
          { status: 400 }
        )
      }
    }

    const venue = await prisma.venue.update({
      where: { id },
      data: {
        name: name || existingVenue.name,
        slug,
        address: address !== undefined ? address : existingVenue.address,
        city: city !== undefined ? city : existingVenue.city,
        state: state !== undefined ? state : existingVenue.state,
        postalCode: postalCode !== undefined ? postalCode : existingVenue.postalCode,
        phone: phone !== undefined ? phone : existingVenue.phone,
        timezone: timezone || existingVenue.timezone,
        active: active !== undefined ? active : existingVenue.active,
      },
    })

    return NextResponse.json({ venue }, { status: 200 })
  } catch (error) {
    console.error('Error updating venue:', error)
    return NextResponse.json(
      { error: 'Failed to update venue' },
      { status: 500 }
    )
  }
}

// DELETE /api/venues/[id] - Delete a venue
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await verifyAuth(request)
    if (!payload.authenticated || !payload.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify venue exists and belongs to this club
    const venue = await prisma.venue.findFirst({
      where: {
        id,
        clubId: payload.user.clubId,
      },
      include: {
        _count: {
          select: {
            zones: true,
            equipment: true,
            rosters: true,
            injurySubmissions: true,
          },
        },
      },
    })

    if (!venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
    }

    // Prevent deleting default venue
    if (venue.isDefault) {
      return NextResponse.json(
        { error: 'Cannot delete the default venue. Set another venue as default first.' },
        { status: 400 }
      )
    }

    // Check if venue has associated data
    const hasData = 
      venue._count.zones > 0 ||
      venue._count.equipment > 0 ||
      venue._count.rosters > 0 ||
      venue._count.injurySubmissions > 0

    if (hasData) {
      return NextResponse.json(
        { 
          error: 'Cannot delete venue with associated data. Please move or delete zones, equipment, rosters, and injury submissions first.',
          counts: venue._count,
        },
        { status: 400 }
      )
    }

    // Ensure at least one venue remains
    const venueCount = await prisma.venue.count({
      where: { clubId: payload.user.clubId, active: true },
    })

    if (venueCount <= 1) {
      return NextResponse.json(
        { error: 'Cannot delete the last venue. At least one venue is required.' },
        { status: 400 }
      )
    }

    await prisma.venue.delete({
      where: { id },
    })

    return NextResponse.json(
      { message: 'Venue deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting venue:', error)
    return NextResponse.json(
      { error: 'Failed to delete venue' },
      { status: 500 }
    )
  }
}

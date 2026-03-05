import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/apiAuth'
import { prisma } from '@/lib/prisma'

// PATCH /api/venues/[id]/set-default - Set a venue as the default
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await verifyAuth(request)
    if (!payload.authenticated || !payload.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id} = await params

    // Verify venue exists and belongs to this club
    const venue = await prisma.venue.findFirst({
      where: {
        id,
        clubId: payload.user.clubId,
      },
    })

    if (!venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
    }

    // If already default, no action needed
    if (venue.isDefault) {
      return NextResponse.json({ venue }, { status: 200 })
    }

    // Use a transaction to update both the old and new default
    await prisma.$transaction([
      // Remove default from all other venues
      prisma.venue.updateMany({
        where: {
          clubId: payload.user.clubId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      }),
      // Set this venue as default
      prisma.venue.update({
        where: { id },
        data: {
          isDefault: true,
          active: true, // Ensure default venue is active
        },
      }),
    ])

    const updatedVenue = await prisma.venue.findUnique({
      where: { id },
    })

    return NextResponse.json({ venue: updatedVenue }, { status: 200 })
  } catch (error) {
    console.error('Error setting default venue:', error)
    return NextResponse.json(
      { error: 'Failed to set default venue' },
      { status: 500 }
    )
  }
}

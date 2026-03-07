import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  _request: NextRequest,
  { params }: { params: { publicId: string } }
) {
  try {
    const { publicId } = params;

    // Find venue by publicId
    const venue = await prisma.venue.findUnique({
      where: { publicId },
      include: {
        club: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!venue) {
      return NextResponse.json(
        { error: 'Venue not found' },
        { status: 404 }
      );
    }

    // Get zones in this venue with equipment counts
    const zones = await prisma.zone.findMany({
      where: {
        venueId: venue.id,
        active: true,
      },
      include: {
        _count: {
          select: {
            equipment: {
              where: {
                active: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({
      venue: {
        id: venue.id,
        name: venue.name,
        address: venue.address,
        city: venue.city,
        state: venue.state,
        club: venue.club,
      },
      zones: zones.map(zone => ({
        id: zone.id,
        name: zone.name,
        description: zone.description,
        publicId: zone.publicId,
        equipmentCount: zone._count.equipment,
      })),
    });
  } catch (error) {
    console.error('Failed to fetch venue data:', error);
    return NextResponse.json(
      { error: 'Failed to load venue data' },
      { status: 500 }
    );
  }
}

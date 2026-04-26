import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const { publicId } = await params;

    // Find zone by publicId
    const zone = await prisma.zone.findUnique({
      where: { publicId },
      include: {
        club: {
          select: {
            id: true,
            name: true,
          },
        },
        venue: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!zone) {
      return NextResponse.json(
        { error: 'Zone not found' },
        { status: 404 }
      );
    }

    // Get equipment in this zone
    const equipment = await prisma.equipment.findMany({
      where: {
        zoneId: zone.id,
      },
      select: {
        id: true,
        name: true,
        category: true,
        condition: true,
        photoUrl: true,
        serialNumber: true,
        lastCheckedDate: true,
        lastCheckStatus: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({
      zone: {
        id: zone.id,
        name: zone.name,
        description: zone.description,
        club: zone.club,
        venue: zone.venue,
      },
      equipment,
    });
  } catch (error) {
    console.error('Failed to fetch zone data:', error);
    return NextResponse.json(
      { error: 'Failed to load zone data' },
      { status: 500 }
    );
  }
}

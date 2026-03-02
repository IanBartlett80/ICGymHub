import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/equipment/public/[clubId] - Get all active equipment for a club (no auth required)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params;

    const equipment = await prisma.equipment.findMany({
      where: {
        clubId,
        active: true,
      },
      select: {
        id: true,
        name: true,
        serialNumber: true,
        category: true,
        zoneId: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({ equipment });
  } catch (error) {
    console.error('Error fetching public equipment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch equipment' },
      { status: 500 }
    );
  }
}

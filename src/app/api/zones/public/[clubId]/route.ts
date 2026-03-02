import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/zones/public/[clubId] - Get all active zones for a club (no auth required)
export async function GET(
  _req: NextRequest,
  { params }: { params: { clubId: string } }
) {
  try {
    const { clubId } = params;

    const zones = await prisma.zone.findMany({
      where: {
        clubId,
        active: true,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({ zones });
  } catch (error) {
    console.error('Error fetching public zones:', error);
    return NextResponse.json(
      { error: 'Failed to fetch zones' },
      { status: 500 }
    );
  }
}

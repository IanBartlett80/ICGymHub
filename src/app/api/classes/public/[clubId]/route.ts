import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/classes/public/[clubId] - Get all class templates for a club (no auth required)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params;

    const classes = await prisma.classTemplate.findMany({
      where: {
        clubId,
      },
      select: {
        id: true,
        name: true,
        venueId: true,
        gymsportId: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({ classes });
  } catch (error) {
    console.error('Error fetching public class templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch class templates' },
      { status: 500 }
    );
  }
}

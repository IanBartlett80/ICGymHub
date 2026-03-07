import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/public/equipment/categories?clubId=xxx - Get equipment categories for a club (public endpoint)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('clubId');

    if (!clubId) {
      return NextResponse.json(
        { error: 'clubId is required' },
        { status: 400 }
      );
    }

    const categories = await prisma.equipmentCategory.findMany({
      where: {
        clubId,
        active: true,
      },
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' },
      ],
      select: {
        id: true,
        name: true,
        isDefault: true,
      },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Public equipment categories error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch equipment categories' },
      { status: 500 }
    );
  }
}

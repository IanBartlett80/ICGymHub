import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';

// GET /api/equipment/maintenance-due - Get equipment due for maintenance
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const equipment = await prisma.equipment.findMany({
      where: {
        clubId: auth.user.clubId,
        active: true,
        nextMaintenance: {
          lte: futureDate,
        },
      },
      include: {
        zone: true,
        _count: {
          select: {
            maintenanceLogs: true,
          },
        },
      },
      orderBy: { nextMaintenance: 'asc' },
    });

    return NextResponse.json(equipment);
  } catch (error) {
    console.error('Maintenance due fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch maintenance due equipment' },
      { status: 500 }
    );
  }
}

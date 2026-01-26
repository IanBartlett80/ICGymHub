import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/apiAuth';

// GET /api/equipment/[id]/maintenance-logs - Get maintenance logs for equipment
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, club } = await authenticateRequest(request);

    // Verify equipment exists and belongs to club
    const equipment = await prisma.equipment.findFirst({
      where: {
        id: params.id,
        clubId: club.id,
      },
    });

    if (!equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }

    const logs = await prisma.maintenanceLog.findMany({
      where: {
        equipmentId: params.id,
        clubId: club.id,
      },
      orderBy: {
        performedAt: 'desc',
      },
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Maintenance logs fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch maintenance logs' },
      { status: 500 }
    );
  }
}

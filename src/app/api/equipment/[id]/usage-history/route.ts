import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';

// GET /api/equipment/[id]/usage-history - Get usage history for equipment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Verify equipment belongs to club
    const equipment = await prisma.equipment.findFirst({
      where: {
        id,
        clubId: auth.user.clubId,
      },
    });

    if (!equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }

    const where: any = {
      equipmentId: id,
      clubId: auth.user.clubId,
    };

    if (startDate || endDate) {
      where.usedFrom = {};
      if (startDate) where.usedFrom.gte = new Date(startDate);
      if (endDate) where.usedFrom.lte = new Date(endDate);
    }

    const usageHistory = await prisma.equipmentUsage.findMany({
      where,
      include: {
        session: {
          include: {
            template: true,
          },
        },
        coach: true,
      },
      orderBy: { usedFrom: 'desc' },
    });

    return NextResponse.json(usageHistory);
  } catch (error) {
    console.error('Usage history fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage history' },
      { status: 500 }
    );
  }
}

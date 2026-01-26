import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';

// POST /api/equipment/[id]/checkin - Mark equipment as returned
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { notes } = body;

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

    if (!equipment.inUse) {
      return NextResponse.json(
        { error: 'Equipment is not currently in use' },
        { status: 400 }
      );
    }

    // Find the active usage record (one without usedUntil)
    const activeUsage = await prisma.equipmentUsage.findFirst({
      where: {
        equipmentId: id,
        clubId: auth.user.clubId,
        usedUntil: null,
      },
      orderBy: { usedFrom: 'desc' },
    });

    if (!activeUsage) {
      return NextResponse.json(
        { error: 'No active usage record found' },
        { status: 404 }
      );
    }

    // Update usage record and equipment
    const [usageRecord, updatedEquipment] = await Promise.all([
      prisma.equipmentUsage.update({
        where: { id: activeUsage.id },
        data: {
          usedUntil: new Date(),
          notes: notes ? (activeUsage.notes ? `${activeUsage.notes}\n${notes}` : notes) : activeUsage.notes,
        },
        include: {
          session: {
            include: {
              template: true,
            },
          },
          coach: true,
        },
      }),
      prisma.equipment.update({
        where: { id },
        data: {
          inUse: false,
          currentClass: null,
        },
        include: {
          zone: true,
        },
      }),
    ]);

    return NextResponse.json({ equipment: updatedEquipment, usageRecord });
  } catch (error) {
    console.error('Equipment checkin error:', error);
    return NextResponse.json(
      { error: 'Failed to checkin equipment' },
      { status: 500 }
    );
  }
}

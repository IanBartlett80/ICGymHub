import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';

// POST /api/equipment/[id]/checkout - Mark equipment as in use
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
    const { sessionId, coachId, notes } = body;

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

    if (equipment.inUse) {
      return NextResponse.json(
        { error: 'Equipment is already in use' },
        { status: 400 }
      );
    }

    if (equipment.condition === 'Out of Service') {
      return NextResponse.json(
        { error: 'Equipment is out of service and cannot be used' },
        { status: 400 }
      );
    }

    // Verify session or coach exists if provided
    if (sessionId) {
      const session = await prisma.classSession.findFirst({
        where: {
          id: sessionId,
          clubId: auth.user.clubId,
        },
      });
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
    }

    if (coachId) {
      const coach = await prisma.coach.findFirst({
        where: {
          id: coachId,
          clubId: auth.user.clubId,
        },
      });
      if (!coach) {
        return NextResponse.json({ error: 'Coach not found' }, { status: 404 });
      }
    }

    // Create usage record and update equipment
    const [usageRecord, updatedEquipment] = await Promise.all([
      prisma.equipmentUsage.create({
        data: {
          clubId: auth.user.clubId,
          equipmentId: id,
          sessionId: sessionId || null,
          coachId: coachId || null,
          usedFrom: new Date(),
          notes: notes || null,
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
          inUse: true,
          currentClass: sessionId || null,
        },
        include: {
          zone: true,
        },
      }),
    ]);

    return NextResponse.json({ equipment: updatedEquipment, usageRecord });
  } catch (error) {
    console.error('Equipment checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to checkout equipment' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';

// GET /api/equipment/[id] - Get single equipment with details
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

    const equipment = await prisma.equipment.findFirst({
      where: {
        id,
        clubId: auth.user.clubId,
      },
      include: {
        maintenanceLogs: {
          orderBy: { performedAt: 'desc' },
          take: 20,
        },
        usageHistory: {
          orderBy: { usedFrom: 'desc' },
          take: 20,
          include: {
            session: {
              include: {
                template: true,
              },
            },
            coach: true,
          },
        },
      },
    });

    if (!equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }

    return NextResponse.json(equipment);
  } catch (error) {
    console.error('Equipment get error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch equipment' },
      { status: 500 }
    );
  }
}

// PUT /api/equipment/[id] - Update equipment
export async function PUT(
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
    const {
      name,
      category,
      serialNumber,
      purchaseDate,
      purchaseCost,
      condition,
      location,
      zoneId,
      lastMaintenance,
      nextMaintenance,
      maintenanceNotes,
      inUse,
      currentClass,
      active,
    } = body;

    // Verify ownership
    const existing = await prisma.equipment.findFirst({
      where: {
        id,
        clubId: auth.user.clubId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }

    // Validation
    if (name !== undefined && name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Equipment name cannot be empty' },
        { status: 400 }
      );
    }

    const validConditions = ['Excellent', 'Good', 'Fair', 'Poor', 'Out of Service'];
    if (condition && !validConditions.includes(condition)) {
      return NextResponse.json(
        { error: 'Invalid condition value' },
        { status: 400 }
      );
    }

    // Check if zone exists if provided
    if (zoneId !== undefined && zoneId !== null) {
      const zone = await prisma.zone.findFirst({
        where: {
          id: zoneId,
          clubId: auth.user.clubId,
        },
      });
      if (!zone) {
        return NextResponse.json(
          { error: 'Zone not found' },
          { status: 404 }
        );
      }
    }

    // Check for duplicate serial number
    if (serialNumber && serialNumber !== existing.serialNumber) {
      const duplicate = await prisma.equipment.findUnique({
        where: { serialNumber },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: 'Serial number already exists' },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (category !== undefined) updateData.category = category || null;
    if (serialNumber !== undefined) updateData.serialNumber = serialNumber || null;
    if (purchaseDate !== undefined) updateData.purchaseDate = purchaseDate ? new Date(purchaseDate) : null;
    if (purchaseCost !== undefined) updateData.purchaseCost = purchaseCost || null;
    if (condition !== undefined) updateData.condition = condition;
    if (location !== undefined) updateData.location = location || null;
    if (zoneId !== undefined) updateData.zoneId = zoneId || null;
    if (lastMaintenance !== undefined) updateData.lastMaintenance = lastMaintenance ? new Date(lastMaintenance) : null;
    if (nextMaintenance !== undefined) updateData.nextMaintenance = nextMaintenance ? new Date(nextMaintenance) : null;
    if (maintenanceNotes !== undefined) updateData.maintenanceNotes = maintenanceNotes || null;
    if (inUse !== undefined) updateData.inUse = inUse;
    if (currentClass !== undefined) updateData.currentClass = currentClass || null;
    if (active !== undefined) updateData.active = active;

    const equipment = await prisma.equipment.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(equipment);
  } catch (error) {
    console.error('Equipment update error:', error);
    return NextResponse.json(
      { error: 'Failed to update equipment' },
      { status: 500 }
    );
  }
}

// DELETE /api/equipment/[id] - Delete equipment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.equipment.findFirst({
      where: {
        id,
        clubId: auth.user.clubId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }

    await prisma.equipment.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Equipment delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete equipment' },
      { status: 500 }
    );
  }
}

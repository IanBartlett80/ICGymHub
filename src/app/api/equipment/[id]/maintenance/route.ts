import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';

// GET /api/equipment/[id]/maintenance - Get maintenance history
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

    const maintenanceLogs = await prisma.maintenanceLog.findMany({
      where: {
        equipmentId: id,
        clubId: auth.user.clubId,
      },
      orderBy: { performedAt: 'desc' },
    });

    return NextResponse.json(maintenanceLogs);
  } catch (error) {
    console.error('Maintenance logs fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch maintenance logs' },
      { status: 500 }
    );
  }
}

// POST /api/equipment/[id]/maintenance - Add maintenance log
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
    const { maintenanceType, description, performedBy, cost, performedAt } = body;

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

    // Validation
    const validTypes = ['Routine', 'Repair', 'Inspection', 'Replacement'];
    if (!maintenanceType || !validTypes.includes(maintenanceType)) {
      return NextResponse.json(
        { error: 'Valid maintenance type is required (Routine, Repair, Inspection, or Replacement)' },
        { status: 400 }
      );
    }

    if (!description || description.trim().length < 10) {
      return NextResponse.json(
        { error: 'Description is required (minimum 10 characters)' },
        { status: 400 }
      );
    }

    // Create maintenance log
    const maintenanceLog = await prisma.maintenanceLog.create({
      data: {
        clubId: auth.user.clubId,
        equipmentId: id,
        maintenanceType,
        description: description.trim(),
        performedBy: performedBy || null,
        cost: cost || null,
        performedAt: performedAt ? new Date(performedAt) : new Date(),
      },
    });

    // Update equipment's lastMaintenance
    await prisma.equipment.update({
      where: { id },
      data: {
        lastMaintenance: maintenanceLog.performedAt,
      },
    });

    return NextResponse.json(maintenanceLog, { status: 201 });
  } catch (error) {
    console.error('Maintenance log create error:', error);
    return NextResponse.json(
      { error: 'Failed to create maintenance log' },
      { status: 500 }
    );
  }
}

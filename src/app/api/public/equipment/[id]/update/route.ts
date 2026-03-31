import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT /api/public/equipment/[id]/update - Update equipment from public mobile form (QR code scan)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      clubId,
      name,
      category,
      serialNumber,
      condition,
      photoUrl,
    } = body;

    // Validation
    if (!clubId) {
      return NextResponse.json(
        { error: 'Club ID is required' },
        { status: 400 }
      );
    }

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Equipment name is required' },
        { status: 400 }
      );
    }

    if (!category) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      );
    }

    // Verify club exists
    const club = await prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!club) {
      return NextResponse.json(
        { error: 'Club not found' },
        { status: 404 }
      );
    }

    // Verify equipment exists and belongs to the club
    const existing = await prisma.equipment.findFirst({
      where: {
        id,
        clubId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Equipment not found' },
        { status: 404 }
      );
    }

    // Check for duplicate serial number if changed
    if (serialNumber && serialNumber.trim().length > 0 && serialNumber.trim() !== existing.serialNumber) {
      const duplicate = await prisma.equipment.findUnique({
        where: { serialNumber: serialNumber.trim() },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: 'Serial number already exists' },
          { status: 400 }
        );
      }
    }

    const validConditions = ['Excellent', 'Good', 'Fair', 'Poor', 'Out of Service'];
    if (condition && !validConditions.includes(condition)) {
      return NextResponse.json(
        { error: 'Invalid condition value' },
        { status: 400 }
      );
    }

    const equipment = await prisma.equipment.update({
      where: { id },
      data: {
        name: name.trim(),
        category,
        serialNumber: serialNumber && serialNumber.trim().length > 0 ? serialNumber.trim() : null,
        condition: condition || 'Good',
        photoUrl: photoUrl || existing.photoUrl,
      },
    });

    // Create an audit log entry
    await prisma.auditLog.create({
      data: {
        clubId,
        action: 'UPDATE_EQUIPMENT',
        entityType: 'Equipment',
        entityId: equipment.id,
        changes: JSON.stringify({ message: 'Equipment updated via QR code mobile form', equipmentName: name }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });

    return NextResponse.json(equipment, { status: 200 });
  } catch (error) {
    console.error('Public equipment update error:', error);
    return NextResponse.json(
      { error: 'Failed to update equipment' },
      { status: 500 }
    );
  }
}

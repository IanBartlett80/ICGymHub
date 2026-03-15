import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/public/equipment/create - Create equipment from public form (QR code scan)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      clubId,
      venueId,
      zoneId,
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

    // Verify venue exists if provided
    if (venueId) {
      const venue = await prisma.venue.findFirst({
        where: {
          id: venueId,
          clubId,
        },
      });
      if (!venue) {
        return NextResponse.json(
          { error: 'Venue not found' },
          { status: 404 }
        );
      }
    }

    // Verify zone exists if provided
    if (zoneId) {
      const zone = await prisma.zone.findFirst({
        where: {
          id: zoneId,
          clubId,
        },
      });
      if (!zone) {
        return NextResponse.json(
          { error: 'Zone not found' },
          { status: 404 }
        );
      }
    }

    // Check for duplicate serial number if provided
    if (serialNumber && serialNumber.trim().length > 0) {
      const existing = await prisma.equipment.findUnique({
        where: { serialNumber: serialNumber.trim() },
      });
      if (existing) {
        return NextResponse.json(
          { error: 'Serial number already exists' },
          { status: 400 }
        );
      }
    }

    const equipment = await prisma.equipment.create({
      data: {
        clubId,
        venueId: venueId || null,
        zoneId: zoneId || null,
        name: name.trim(),
        category,
        serialNumber: serialNumber && serialNumber.trim().length > 0 ? serialNumber.trim() : null,
        condition: condition || 'Good',
        photoUrl: photoUrl || null,
        active: true,
      },
    });

    // Create an audit log entry
    await prisma.auditLog.create({
      data: {
        clubId,
        action: 'CREATE_EQUIPMENT',
        entityType: 'Equipment',
        entityId: equipment.id,
        changes: JSON.stringify({ message: 'Equipment added via QR code scan', equipmentName: name }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    }).catch(err => {
      console.error('Failed to create audit log:', err);
      // Don't fail the request if audit log fails
    });

    return NextResponse.json(equipment, { status: 201 });
  } catch (error) {
    console.error('Public equipment create error:', error);
    return NextResponse.json(
      { error: 'Failed to create equipment' },
      { status: 500 }
    );
  }
}

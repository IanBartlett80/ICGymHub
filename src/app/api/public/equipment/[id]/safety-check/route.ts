import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/public/equipment/[id]/safety-check - Record "No Issues Detected" safety check
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Verify equipment exists
    const equipment = await prisma.equipment.findUnique({
      where: { id },
    });

    if (!equipment) {
      return NextResponse.json(
        { error: 'Equipment not found' },
        { status: 404 }
      );
    }

    // Update equipment with safety check
    const updatedEquipment = await prisma.equipment.update({
      where: { id },
      data: {
        lastCheckedDate: new Date(),
        lastCheckStatus: 'No Issues Detected',
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        clubId: equipment.clubId,
        action: 'SAFETY_CHECK',
        entityType: 'Equipment',
        entityId: equipment.id,
        details: 'Safety check performed via QR code - No Issues Detected',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    }).catch(err => {
      console.error('Failed to create audit log:', err);
      // Don't fail the request if audit log fails
    });

    return NextResponse.json(updatedEquipment, { status: 200 });
  } catch (error) {
    console.error('Safety check error:', error);
    return NextResponse.json(
      { error: 'Failed to record safety check' },
      { status: 500 }
    );
  }
}

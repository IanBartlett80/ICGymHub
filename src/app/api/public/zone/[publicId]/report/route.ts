import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: { publicId: string } }
) {
  try {
    const { publicId } = params;
    const body = await request.json();
    const { equipmentId, issueType, title, description, reportedBy, reportedByEmail } = body;

    // Validate required fields
    if (!equipmentId || !issueType || !title || !description || !reportedBy || !reportedByEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Find zone by publicId
    const zone = await prisma.zone.findUnique({
      where: { publicId },
      select: { id: true, clubId: true },
    });

    if (!zone) {
      return NextResponse.json(
        { error: 'Zone not found' },
        { status: 404 }
      );
    }

    // Verify equipment exists and belongs to this zone
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
      select: { id: true, zoneId: true, name: true },
    });

    if (!equipment || equipment.zoneId !== zone.id) {
      return NextResponse.json(
        { error: 'Equipment not found in this zone' },
        { status: 404 }
      );
    }

    // Create safety issue
    const safetyIssue = await prisma.safetyIssue.create({
      data: {
        equipmentId,
        clubId: zone.clubId,
        issueType,
        title,
        description,
        status: 'OPEN',
        reportedBy,
        reportedByEmail,
      },
    });

    return NextResponse.json({
      success: true,
      issueId: safetyIssue.id,
    });
  } catch (error) {
    console.error('Failed to create safety issue:', error);
    return NextResponse.json(
      { error: 'Failed to submit report' },
      { status: 500 }
    );
  }
}

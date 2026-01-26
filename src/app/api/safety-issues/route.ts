import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/apiAuth';

// GET /api/safety-issues - List all safety issues for a club
export async function GET(request: NextRequest) {
  try {
    const { user, club } = await authenticateRequest(request);

    const { searchParams } = new URL(request.url);
    const zoneId = searchParams.get('zoneId');
    const equipmentId = searchParams.get('equipmentId');
    const status = searchParams.get('status');
    const issueType = searchParams.get('issueType');
    const priority = searchParams.get('priority');

    const where: any = {
      clubId: club.id,
    };

    if (zoneId) {
      where.equipment = {
        zoneId,
      };
    }

    if (equipmentId) {
      where.equipmentId = equipmentId;
    }

    if (status) {
      where.status = status;
    }

    if (issueType) {
      where.issueType = issueType;
    }

    if (priority) {
      where.priority = priority;
    }

    const issues = await prisma.safetyIssue.findMany({
      where,
      include: {
        equipment: {
          include: {
            zone: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ issues });
  } catch (error: any) {
    console.error('Error fetching safety issues:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch safety issues' },
      { status: error.status || 500 }
    );
  }
}

// POST /api/safety-issues - Create a new safety issue
export async function POST(request: NextRequest) {
  try {
    const { user, club } = await authenticateRequest(request);
    const body = await request.json();

    const {
      equipmentId,
      issueType,
      title,
      description,
      reportedBy,
      reportedByEmail,
      photos,
      priority,
    } = body;

    // Validate required fields
    if (!equipmentId || !issueType || !title || !description || !reportedBy) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify equipment belongs to this club
    const equipment = await prisma.equipment.findFirst({
      where: {
        id: equipmentId,
        clubId: club.id,
      },
    });

    if (!equipment) {
      return NextResponse.json(
        { error: 'Equipment not found' },
        { status: 404 }
      );
    }

    const issue = await prisma.safetyIssue.create({
      data: {
        clubId: club.id,
        equipmentId,
        issueType,
        title,
        description,
        reportedBy,
        reportedByEmail,
        photos: photos ? JSON.stringify(photos) : null,
        priority: priority || 'MEDIUM',
        status: 'OPEN',
      },
      include: {
        equipment: {
          include: {
            zone: true,
          },
        },
      },
    });

    return NextResponse.json({ issue }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating safety issue:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create safety issue' },
      { status: 500 }
    );
  }
}

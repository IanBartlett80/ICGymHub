import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/apiAuth';

// Force dynamic rendering (disable caching)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/safety-issues - List all safety issues for a club
export async function GET(request: NextRequest) {
  try {
    const { club } = await authenticateRequest(request);

    const { searchParams } = new URL(request.url);
    const zoneId = searchParams.get('zoneId');
    const equipmentId = searchParams.get('equipmentId');
    const venueId = searchParams.get('venueId');
    const status = searchParams.get('status');
    const issueType = searchParams.get('issueType');
    const priority = searchParams.get('priority');

    const where: any = {
      clubId: club.id,
    };

    // Venue filtering
    if (venueId && venueId !== 'all') {
      where.venueId = venueId;
    }

    // Handle equipment filtering - can't use both equipmentId and equipment relation filter
    if (equipmentId) {
      where.equipmentId = equipmentId;
    } else if (zoneId) {
      where.equipment = {
        zoneId,
      };
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

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);

    const [issues, total] = await Promise.all([
      prisma.safetyIssue.findMany({
        where,
        select: {
          id: true,
          clubId: true,
          equipmentId: true,
          issueType: true,
          title: true,
          description: true,
          reportedBy: true,
          reportedByEmail: true,
          photos: true,
          priority: true,
          status: true,
          resolvedAt: true,
          resolvedBy: true,
          resolutionNotes: true,
          createdAt: true,
          updatedAt: true,
          venueId: true,
          equipment: {
            select: {
              id: true,
              name: true,
              // Deliberately omit photoUrl — it's a potentially large base64 blob
              zone: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.safetyIssue.count({ where }),
    ]);

    return NextResponse.json({ issues, total, page, limit });
  } catch (error: any) {
    console.error('Error fetching safety issues:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: 'Failed to fetch safety issues',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: error.status || 500 }
    );
  }
}

// POST /api/safety-issues - Create a new safety issue
export async function POST(request: NextRequest) {
  try {
    const { club } = await authenticateRequest(request);
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
        venueId: equipment.venueId,
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

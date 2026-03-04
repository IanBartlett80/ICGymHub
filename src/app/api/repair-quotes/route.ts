import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';

// GET /api/repair-quotes - List repair quote requests with filtering
export async function GET(request: NextRequest) {
  try {
    const { club } = await authenticateRequest(request);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const urgency = searchParams.get('urgency');
    const equipmentId = searchParams.get('equipmentId');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {
      clubId: club.id,
    };

    if (status) {
      where.status = status;
    }

    if (urgency) {
      where.urgency = urgency;
    }

    if (equipmentId) {
      where.equipmentId = equipmentId;
    }

    if (search) {
      where.OR = [
        { issueDescription: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { quoteReceivedFrom: { contains: search, mode: 'insensitive' } },
        { equipment: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [requests, total] = await Promise.all([
      prisma.repairQuoteRequest.findMany({
        where,
        include: {
          equipment: {
            include: {
              zone: true,
            },
          },
          requestedBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          safetyIssue: {
            select: {
              id: true,
              title: true,
              issueType: true,
              priority: true,
            },
          },
        },
        orderBy: [
          { createdAt: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.repairQuoteRequest.count({ where }),
    ]);

    return NextResponse.json({
      requests,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Repair quotes list error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch repair quote requests',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/repair-quotes - Create new repair quote request
export async function POST(request: NextRequest) {
  try {
    const { club, user } = await authenticateRequest(request);

    const body = await request.json();
    const {
      equipmentId,
      safetyIssueId,
      issueDescription,
      urgency,
      preferredRepairDate,
      estimatedBudget,
      contactPerson,
      contactPhone,
      contactEmail,
      additionalNotes,
      specialRequirements,
      photos,
    } = body;

    // Validation
    if (!equipmentId) {
      return NextResponse.json(
        { error: 'Equipment ID is required' },
        { status: 400 }
      );
    }

    if (!issueDescription || !issueDescription.trim()) {
      return NextResponse.json(
        { error: 'Issue description is required' },
        { status: 400 }
      );
    }

    if (!contactPerson || !contactPerson.trim()) {
      return NextResponse.json(
        { error: 'Contact person is required' },
        { status: 400 }
      );
    }

    // Verify equipment belongs to club
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

    // Create repair quote request
    const repairQuote = await prisma.repairQuoteRequest.create({
      data: {
        clubId: club.id,
        equipmentId,
        safetyIssueId: safetyIssueId || null,
        requestedById: user.id,
        issueDescription,
        urgency: urgency || 'MEDIUM',
       preferredRepairDate: preferredRepairDate ? new Date(preferredRepairDate) : null,
        estimatedBudget,
        contactPerson,
        contactPhone,
        contactEmail,
        additionalNotes,
        specialRequirements,
        photos: photos ? JSON.stringify(photos) : null,
        status: 'PENDING',
      },
      include: {
        equipment: {
          include: {
            zone: true,
          },
        },
        requestedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(repairQuote, { status: 201 });
  } catch (error) {
    console.error('Create repair quote error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create repair quote request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

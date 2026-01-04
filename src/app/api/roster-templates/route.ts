import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';

// GET /api/roster-templates - List all roster templates for the club
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || request.cookies.get('accessToken')?.value;
    const payload = token ? verifyAccessToken(token) : null;
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templates = await prisma.rosterTemplate.findMany({
      where: {
        clubId: payload.clubId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        rosters: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            dayOfWeek: true,
          },
          orderBy: {
            startDate: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching roster templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch roster templates' },
      { status: 500 }
    );
  }
}

// POST /api/roster-templates - Create a new roster template
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || request.cookies.get('accessToken')?.value;
    const payload = token ? verifyAccessToken(token) : null;
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, startDate, endDate, activeDays } = body;

    // Validation
    if (!name || !startDate || !endDate || !activeDays || activeDays.length === 0) {
      return NextResponse.json(
        { error: 'Name, start date, end date, and at least one active day are required' },
        { status: 400 }
      );
    }

    const template = await prisma.rosterTemplate.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        activeDays: activeDays.join(','), // Store as comma-separated string
        clubId: payload.clubId,
        createdById: payload.userId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Error creating roster template:', error);
    return NextResponse.json(
      { error: 'Failed to create roster template' },
      { status: 500 }
    );
  }
}

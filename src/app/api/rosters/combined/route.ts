import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';

// GET /api/rosters/combined - Get roster slots from multiple templates for a date range
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || request.cookies.get('accessToken')?.value;
    const payload = token ? verifyAccessToken(token) : null;
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const templateIds = searchParams.get('templateIds')?.split(',') || [];
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    // Fetch all rosters within date range that belong to selected templates
    const rosters = await prisma.roster.findMany({
      where: {
        clubId: payload.clubId,
        templateId: templateIds.length > 0 ? { in: templateIds } : undefined,
        startDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: {
        slots: {
          include: {
            session: {
              include: {
                template: {
                  select: {
                    id: true,
                    name: true,
                    color: true,
                  },
                },
                coaches: {
                  include: {
                    coach: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
            zone: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Flatten slots from all rosters and add roster date
    const allSlots = rosters.flatMap(roster =>
      roster.slots.map(slot => ({
        ...slot,
        rosterDate: roster.startDate.toISOString(),
        rosterId: roster.id,
        zoneName: slot.zone.name,
        coaches: slot.session.coaches,
      }))
    );

    return NextResponse.json({ slots: allSlots });
  } catch (error) {
    console.error('Error fetching combined roster data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch roster data' },
      { status: 500 }
    );
  }
}

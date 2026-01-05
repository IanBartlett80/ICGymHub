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

    // Parse dates and set to end of day for endDate to include full day
    const startDateObj = new Date(startDate + 'T00:00:00.000Z');
    const endDateObj = new Date(endDate + 'T23:59:59.999Z');
    
    console.log('Fetching rosters for:', { 
      templateIds, 
      startDate: startDateObj.toISOString(), 
      endDate: endDateObj.toISOString(), 
      clubId: payload.clubId 
    });

    // Fetch all rosters within date range that belong to selected templates
    const rosters = await prisma.roster.findMany({
      where: {
        clubId: payload.clubId,
        templateId: templateIds.length > 0 ? { in: templateIds } : undefined,
        OR: [
          {
            // Roster starts within the range
            startDate: {
              gte: startDateObj,
              lte: endDateObj,
            },
          },
          {
            // Roster ends within the range
            endDate: {
              gte: startDateObj,
              lte: endDateObj,
            },
          },
          {
            // Roster spans the entire range
            AND: [
              { startDate: { lte: startDateObj } },
              { endDate: { gte: endDateObj } },
            ],
          },
        ],
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
                allowOverlap: true,
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

    console.log('Found rosters:', rosters.length, 'Total slots:', allSlots.length);
    console.log('Rosters by template:', rosters.map(r => ({ 
      id: r.id, 
      templateId: r.templateId, 
      dayOfWeek: r.dayOfWeek,
      startDate: r.startDate,
      endDate: r.endDate,
      slotsCount: r.slots.length 
    })));

    return NextResponse.json({ slots: allSlots });
  } catch (error) {
    console.error('Error fetching combined roster data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch roster data' },
      { status: 500 }
    );
  }
}

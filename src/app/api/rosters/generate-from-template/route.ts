import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';
import { addDays, format } from 'date-fns';

// POST /api/rosters/generate-from-template - Generate rosters from a template
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || request.cookies.get('accessToken')?.value;
    const payload = token ? verifyAccessToken(token) : null;
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, startDate, endDate, activeDays, scope } = body;

    // Validation
    if (!name || !startDate || !endDate || !activeDays || activeDays.length === 0) {
      return NextResponse.json(
        { error: 'Name, start date, end date, and at least one active day are required' },
        { status: 400 }
      );
    }

    // Create the roster template first
    const template = await prisma.rosterTemplate.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        activeDays: activeDays.join(','),
        clubId: payload.clubId,
        createdById: payload.userId,
      },
    });

    // Generate empty rosters for each matching day
    const createdRosters = [];
    let currentDate = new Date(startDate);
    const end = new Date(endDate);

    while (currentDate <= end) {
      const dayOfWeek = format(currentDate, 'EEE').toUpperCase().substring(0, 3);
      
      if (activeDays.includes(dayOfWeek)) {
        // Create empty roster for this day
        const roster = await prisma.roster.create({
          data: {
            startDate: currentDate,
            endDate: currentDate,
            scope: scope || 'WEEK',
            status: 'DRAFT',
            clubId: payload.clubId,
            templateId: template.id,
            dayOfWeek: dayOfWeek,
          },
        });

        createdRosters.push(roster);
      }

      currentDate = addDays(currentDate, 1);
    }

    return NextResponse.json({
      template,
      rosters: createdRosters,
      message: `Successfully created ${createdRosters.length} rosters from template`,
    }, { status: 201 });
  } catch (error) {
    console.error('Error generating rosters from template:', error);
    return NextResponse.json(
      { error: 'Failed to generate rosters from template' },
      { status: 500 }
    );
  }
}

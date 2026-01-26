import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';
import { addDays, format } from 'date-fns';
import { generateDailyRoster } from '@/lib/rosterGenerator';

// POST /api/rosters/generate-from-template - Generate rosters from a template
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || request.cookies.get('accessToken')?.value;
    const payload = token ? verifyAccessToken(token) : null;
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, startDate, endDate, activeDays, classTemplates } = body;

    // Validation
    if (!name || !startDate || !endDate || !activeDays || activeDays.length === 0) {
      return NextResponse.json(
        { error: 'Name, start date, end date, and at least one active day are required' },
        { status: 400 }
      );
    }

    if (!classTemplates || classTemplates.length === 0) {
      return NextResponse.json(
        { error: 'At least one class template must be selected' },
        { status: 400 }
      );
    }

    // Get user for timezone
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { club: true },
    });

    if (!user || !user.club) {
      return NextResponse.json({ error: 'User or club not found' }, { status: 404 });
    }

    // Create the roster template with class configuration
    const template = await prisma.rosterTemplate.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        activeDays: activeDays.join(','),
        classConfig: JSON.stringify(classTemplates), // Store class template configurations
        clubId: payload.clubId,
        createdById: payload.userId,
      },
    });

    // Generate rosters for each matching day
    const createdRosters = [];
    let currentDate = new Date(startDate);
    const end = new Date(endDate);

    while (currentDate <= end) {
      const dayOfWeek = format(currentDate, 'EEE').toUpperCase().substring(0, 3);
      
      if (activeDays.includes(dayOfWeek)) {
        // Use the roster generator to create a proper roster with sessions
        const result = await generateDailyRoster(prisma, {
          clubId: payload.clubId,
          date: format(currentDate, 'yyyy-MM-dd'),
          selections: classTemplates,
          generatedById: payload.userId,
          timezone: user.club.timezone,
        });

        // Update the roster to link it to the template
        await prisma.roster.update({
          where: { id: result.rosterId },
          data: {
            templateId: template.id,
            dayOfWeek: dayOfWeek,
          },
        });

        // Fetch the roster with its slots
        const roster = await prisma.roster.findUnique({
          where: { id: result.rosterId },
          include: {
            slots: {
              include: {
                session: {
                  include: {
                    template: true,
                    coaches: {
                      include: {
                        coach: true,
                      },
                    },
                  },
                },
                zone: true,
              },
            },
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

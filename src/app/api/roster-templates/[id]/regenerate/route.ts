import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';
import { addDays, format } from 'date-fns';
import { generateDailyRoster } from '@/lib/rosterGenerator';

// POST /api/roster-templates/[id]/regenerate - Regenerate all rosters from template
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || request.cookies.get('accessToken')?.value;
    const payload = token ? verifyAccessToken(token) : null;
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the template
    const template = await prisma.rosterTemplate.findUnique({
      where: {
        id: params.id,
        clubId: payload.clubId,
      },
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Get user for timezone
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { club: true },
    });

    if (!user || !user.club) {
      return NextResponse.json({ error: 'User or club not found' }, { status: 404 });
    }

    // Parse active days and class configurations
    const activeDays = template.activeDays.split(',');
    const classTemplates = JSON.parse(template.classConfig);

    // Delete all existing rosters for this template
    await prisma.roster.deleteMany({
      where: {
        templateId: params.id,
      },
    });

    // Generate new rosters for each matching day
    const createdRosters = [];
    let currentDate = new Date(template.startDate);
    const endDate = new Date(template.endDate);

    while (currentDate <= endDate) {
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
            templateId: params.id,
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
      message: `Successfully regenerated ${createdRosters.length} rosters`,
      rosters: createdRosters,
    });
  } catch (error) {
    console.error('Error regenerating rosters from template:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate rosters from template' },
      { status: 500 }
    );
  }
}

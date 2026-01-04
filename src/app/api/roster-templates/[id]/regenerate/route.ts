import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';
import { addDays, format } from 'date-fns';

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

    // Parse active days
    const activeDays = template.activeDays.split(',');

    // Delete all existing rosters for this template
    await prisma.roster.deleteMany({
      where: {
        templateId: params.id,
      },
    });

    // Generate new empty rosters for each matching day
    const createdRosters = [];
    let currentDate = new Date(template.startDate);
    const endDate = new Date(template.endDate);

    while (currentDate <= endDate) {
      const dayOfWeek = format(currentDate, 'EEE').toUpperCase().substring(0, 3);
      
      if (activeDays.includes(dayOfWeek)) {
        // Create empty roster for this day
        const roster = await prisma.roster.create({
          data: {
            startDate: currentDate,
            endDate: currentDate,
            scope: 'WEEK',
            status: 'DRAFT',
            clubId: payload.clubId,
            templateId: params.id,
            dayOfWeek: dayOfWeek,
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

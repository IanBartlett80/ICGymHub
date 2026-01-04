import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';

// GET /api/roster-templates/[id] - Get a specific roster template
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || request.cookies.get('accessToken')?.value;
    const payload = token ? verifyAccessToken(token) : null;
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const template = await prisma.rosterTemplate.findUnique({
      where: {
        id: params.id,
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
          include: {
            sessions: {
              include: {
                classTemplate: true,
                zone: true,
                coaches: {
                  include: {
                    coach: true,
                  },
                },
              },
            },
          },
          orderBy: {
            startDate: 'asc',
          },
        },
      },
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error fetching roster template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch roster template' },
      { status: 500 }
    );
  }
}

// PATCH /api/roster-templates/[id] - Update a roster template
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || request.cookies.get('accessToken')?.value;
    const payload = token ? verifyAccessToken(token) : null;
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, startDate, endDate, activeDays, status } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (activeDays !== undefined) updateData.activeDays = activeDays.join(',');
    if (status !== undefined) updateData.status = status;

    const template = await prisma.rosterTemplate.update({
      where: {
        id: params.id,
        clubId: payload.clubId,
      },
      data: updateData,
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

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error updating roster template:', error);
    return NextResponse.json(
      { error: 'Failed to update roster template' },
      { status: 500 }
    );
  }
}

// DELETE /api/roster-templates/[id] - Delete a roster template
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || request.cookies.get('accessToken')?.value;
    const payload = token ? verifyAccessToken(token) : null;
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if template exists and belongs to the club
    const template = await prisma.rosterTemplate.findUnique({
      where: {
        id: params.id,
        clubId: payload.clubId,
      },
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Delete the template (cascades to rosters)
    await prisma.rosterTemplate.delete({
      where: {
        id: params.id,
      },
    });

    return NextResponse.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting roster template:', error);
    return NextResponse.json(
      { error: 'Failed to delete roster template' },
      { status: 500 }
    );
  }
}

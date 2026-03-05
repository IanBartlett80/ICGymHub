import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';

// PATCH /api/rosters/templates/[id]/update-venue - Update venue for template and all its rosters
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || request.cookies.get('accessToken')?.value;
    const payload = token ? verifyAccessToken(token) : null;
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { venueId } = body;

    // Verify the template exists and belongs to user's club
    const template = await prisma.rosterTemplate.findFirst({
      where: {
        id,
        clubId: payload.clubId,
      },
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Update the template with the new venueId
    await prisma.rosterTemplate.update({
      where: { id },
      data: { venueId: venueId || null },
    });

    // Update all rosters associated with this template
    const updatedRosters = await prisma.roster.updateMany({
      where: {
        templateId: id,
        clubId: payload.clubId,
      },
      data: { venueId: venueId || null },
    });

    return NextResponse.json({
      message: 'Template and rosters updated successfully',
      updatedRosters: updatedRosters.count,
    });
  } catch (error) {
    console.error('Failed to update template venue:', error);
    return NextResponse.json({ error: 'Failed to update template venue' }, { status: 500 });
  }
}

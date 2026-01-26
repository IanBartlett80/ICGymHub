import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/apiAuth';

// GET /api/safety-issues/[id] - Get a single safety issue
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, club } = await authenticateRequest(request);

    const issue = await prisma.safetyIssue.findFirst({
      where: {
        id: params.id,
        clubId: club.id,
      },
      include: {
        equipment: {
          include: {
            zone: true,
          },
        },
      },
    });

    if (!issue) {
      return NextResponse.json(
        { error: 'Safety issue not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ issue });
  } catch (error: any) {
    console.error('Error fetching safety issue:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch safety issue' },
      { status: error.status || 500 }
    );
  }
}

// PUT /api/safety-issues/[id] - Update a safety issue
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, club } = await authenticateRequest(request);
    const body = await request.json();

    // Verify issue belongs to this club
    const existing = await prisma.safetyIssue.findFirst({
      where: {
        id: params.id,
        clubId: club.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Safety issue not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};

    if (body.status !== undefined) updateData.status = body.status;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.photos !== undefined) {
      updateData.photos = body.photos ? JSON.stringify(body.photos) : null;
    }

    const issue = await prisma.safetyIssue.update({
      where: { id: params.id },
      data: updateData,
      include: {
        equipment: {
          include: {
            zone: true,
          },
        },
      },
    });

    return NextResponse.json({ issue });
  } catch (error: any) {
    console.error('Error updating safety issue:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update safety issue' },
      { status: 500 }
    );
  }
}

// DELETE /api/safety-issues/[id] - Delete a safety issue
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, club } = await authenticateRequest(request);

    // Verify issue belongs to this club
    const existing = await prisma.safetyIssue.findFirst({
      where: {
        id: params.id,
        clubId: club.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Safety issue not found' },
        { status: 404 }
      );
    }

    await prisma.safetyIssue.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting safety issue:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete safety issue' },
      { status: 500 }
    );
  }
}

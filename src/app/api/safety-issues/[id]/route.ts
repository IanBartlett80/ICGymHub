import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/apiAuth';

// GET /api/safety-issues/[id] - Get a single safety issue
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { club } = await authenticateRequest(request);
    const { id } = await params;

    const issue = await prisma.safetyIssue.findFirst({
      where: {
        id,
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
  } catch (error: unknown) {
    console.error('Error fetching safety issue:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch safety issue' },
      { status: 500 }
    );
  }
}

// PUT /api/safety-issues/[id] - Update a safety issue
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { club } = await authenticateRequest(request);
    const { id } = await params;
    const body = await request.json();

    // Verify issue belongs to this club
    const existing = await prisma.safetyIssue.findFirst({
      where: {
        id,
        clubId: club.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Safety issue not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (body.status !== undefined) updateData.status = body.status;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.photos !== undefined) {
      updateData.photos = body.photos ? JSON.stringify(body.photos) : null;
    }

    const issue = await prisma.safetyIssue.update({
      where: { id },
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
  } catch (error: unknown) {
    console.error('Error updating safety issue:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update safety issue' },
      { status: 500 }
    );
  }
}

// DELETE /api/safety-issues/[id] - Delete a safety issue
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { club } = await authenticateRequest(request);
    const { id } = await params;

    // Verify issue belongs to this club
    const existing = await prisma.safetyIssue.findFirst({
      where: {
        id,
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
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting safety issue:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete safety issue' },
      { status: 500 }
    );
  }
}

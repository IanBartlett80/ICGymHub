import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/apiAuth';

// Force dynamic rendering (disable caching)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    const { club, user } = await authenticateRequest(request);
    const { id } = await params;
    const body = await request.json();

    // Verify issue belongs to this club
    const existing = await prisma.safetyIssue.findFirst({
      where: {
        id,
        clubId: club.id,
      },
      include: {
        equipment: true,
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
    if (body.issueType !== undefined) updateData.issueType = body.issueType;
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.photos !== undefined) {
      updateData.photos = body.photos ? JSON.stringify(body.photos) : null;
    }

    // If status is changing to RESOLVED or CLOSED, add resolution data
    const isBeingResolved = (body.status === 'RESOLVED' || body.status === 'CLOSED') && 
                           existing.status !== 'RESOLVED' && 
                           existing.status !== 'CLOSED';
    
    if (isBeingResolved) {
      updateData.resolvedAt = new Date();
      updateData.resolvedBy = user.fullName || user.email;
      if (body.resolutionNotes) {
        updateData.resolutionNotes = body.resolutionNotes;
      }
    }

    // Use transaction to update safety issue and create maintenance log
    const result = await prisma.$transaction(async (tx) => {
      // Update the safety issue
      const updatedIssue = await tx.safetyIssue.update({
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

      // If being resolved, create a maintenance log entry
      if (isBeingResolved && existing.equipment) {
        await tx.maintenanceLog.create({
          data: {
            clubId: club.id,
            equipmentId: existing.equipmentId,
            maintenanceType: 'Safety Issue Resolution',
            description: `Safety Issue Resolved: ${existing.title}\n\nOriginal Issue: ${existing.description}\n\nResolution: ${body.resolutionNotes || 'No resolution notes provided'}\n\nReported by: ${existing.reportedBy}\nResolved by: ${user.fullName || user.email}`,
            performedBy: user.fullName || user.email,
            performedAt: new Date(),
            cost: null,
          },
        });
      }

      return updatedIssue;
    });

    return NextResponse.json({ issue: result });
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

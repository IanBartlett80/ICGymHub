import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/apiAuth';

// Force dynamic rendering (disable caching)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// POST /api/safety-issues/[id]/resolve - Resolve a safety issue
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { club } = await authenticateRequest(request);
    const { id } = await params;
    const body = await request.json();

    const {
      resolutionType,
      resolutionNotes,
      resolvedBy,
      resolutionCost,
      newCondition,
    } = body;

    // Verify issue belongs to this club
    const existingIssue = await prisma.safetyIssue.findFirst({
      where: {
        id,
        clubId: club.id,
      },
      include: {
        equipment: true,
      },
    });

    if (!existingIssue) {
      return NextResponse.json(
        { error: 'Safety issue not found' },
        { status: 404 }
      );
    }

    // Validate required fields
    if (!resolutionType || !resolutionNotes || !resolvedBy) {
      return NextResponse.json(
        { error: 'Missing required resolution fields' },
        { status: 400 }
      );
    }

    // Start a transaction to update issue and optionally create maintenance log
    const result = await prisma.$transaction(async (tx) => {
      // Update the safety issue
      const resolvedIssue = await tx.safetyIssue.update({
        where: { id },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
          resolvedBy,
          resolutionNotes: `${resolutionType}: ${resolutionNotes}`,
        },
        include: {
          equipment: {
            include: {
              zone: true,
            },
          },
        },
      });

      // If equipment condition changed, update it
      if (newCondition && newCondition !== existingIssue.equipment.condition) {
        await tx.equipment.update({
          where: { id: existingIssue.equipmentId },
          data: { condition: newCondition },
        });
      }

      // Always create a maintenance log entry for resolved safety issues
      await tx.maintenanceLog.create({
        data: {
          clubId: club.id,
          equipmentId: existingIssue.equipmentId,
          maintenanceType: resolutionType === 'Repaired' ? 'Repair' : 
                          resolutionType === 'Replaced' ? 'Replacement' : 
                          'Safety Issue Resolution',
          description: `Safety Issue Resolved: ${existingIssue.title}\n\nOriginal Issue: ${existingIssue.description}\n\nResolution Type: ${resolutionType}\nResolution Notes: ${resolutionNotes}\n\nReported by: ${existingIssue.reportedBy}\nResolved by: ${resolvedBy}`,
          performedBy: resolvedBy,
          cost: resolutionCost || null,
          performedAt: new Date(),
        },
      });

      return resolvedIssue;
    });

    return NextResponse.json({ issue: result });
  } catch (error: unknown) {
    console.error('Error resolving safety issue:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to resolve safety issue' },
      { status: 500 }
    );
  }
}

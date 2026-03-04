import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';

// POST /api/repair-quotes/[id]/approve - Approve a repair quote
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { club, user } = await authenticateRequest(request);
    const { id } = await params;
    const body = await request.json();
    const { approvalNotes, scheduledRepairDate, repairCompanyName, repairContactPerson, repairContactPhone, repairContactEmail } = body;

    // Verify the repair quote belongs to the club
    const existingQuote = await prisma.repairQuoteRequest.findFirst({
      where: {
        id,
        clubId: club.id,
      },
    });

    if (!existingQuote) {
      return NextResponse.json(
        { error: 'Repair quote request not found' },
        { status: 404 }
      );
    }

    // Update with approval
    const updated = await prisma.repairQuoteRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: user.id,
        approvedByName: user.fullName,
        approvedAt: new Date(),
        approvalNotes: approvalNotes || null,
        scheduledRepairDate: scheduledRepairDate ? new Date(scheduledRepairDate) : null,
        repairCompanyName,
        repairContactPerson,
        repairContactPhone,
        repairContactEmail,
        // Clear any previous rejection
        rejectedBy: null,
        rejectedByName: null,
        rejectedAt: null,
        rejectionReason: null,
      },
      include: {
        equipment: {
          include: {
            zone: true,
          },
        },
        requestedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Approve repair quote error:', error);
    return NextResponse.json(
      { error: 'Failed to approve repair quote request' },
      { status: 500 }
    );
  }
}

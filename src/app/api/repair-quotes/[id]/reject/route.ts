import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';

// POST /api/repair-quotes/[id]/reject - Reject a repair quote
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { club, user } = await authenticateRequest(request);
    const { id } = await params;
    const body = await request.json();
    const { rejectionReason } = body;

    if (!rejectionReason || !rejectionReason.trim()) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

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

    // Update with rejection
    const updated = await prisma.repairQuoteRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedBy: user.id,
        rejectedByName: user.fullName,
        rejectedAt: new Date(),
        rejectionReason,
        // Clear any previous approval
        approvedBy: null,
        approvedByName: null,
        approvedAt: null,
        approvalNotes: null,
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
    console.error('Reject repair quote error:', error);
    return NextResponse.json(
      { error: 'Failed to reject repair quote request' },
      { status: 500 }
    );
  }
}

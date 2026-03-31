import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

// Helper to append to status history
function appendStatusHistory(existing: string | null, status: string, actor: string, notes?: string) {
  const history = existing ? JSON.parse(existing) : []
  history.push({
    status,
    timestamp: new Date().toISOString(),
    actor,
    notes: notes || '',
  })
  return JSON.stringify(history)
}

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
        statusHistory: appendStatusHistory(
          existingQuote.statusHistory,
          'APPROVED',
          `${user.fullName} (${club.name})`,
          approvalNotes || 'Quote approved'
        ),
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

    // Notify ICB Solutions
    try {
      await sendEmail({
        to: 'IanBartlett@icb.solutions',
        subject: `[${existingQuote.requestReference || id}] Quote APPROVED - ${updated.equipment.name} at ${club.name}`,
        htmlContent: `
          <h2>Quote Approved</h2>
          <p><strong>Reference:</strong> ${existingQuote.requestReference || id}</p>
          <p><strong>Club:</strong> ${club.name}</p>
          <p><strong>Equipment:</strong> ${updated.equipment.name}</p>
          <p><strong>Approved by:</strong> ${user.fullName}</p>
          <p><strong>Quote Amount:</strong> $${existingQuote.quoteAmount || 'N/A'}</p>
          ${approvalNotes ? `<p><strong>Notes:</strong> ${approvalNotes}</p>` : ''}
          ${scheduledRepairDate ? `<p><strong>Scheduled Date:</strong> ${new Date(scheduledRepairDate).toLocaleDateString()}</p>` : ''}
          <p style="margin-top:20px;">Please proceed with scheduling the repair.</p>
        `,
      });
    } catch (emailErr) {
      console.error('Failed to send approval notification to ICB:', emailErr);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Approve repair quote error:', error);
    return NextResponse.json(
      { error: 'Failed to approve repair quote request' },
      { status: 500 }
    );
  }
}

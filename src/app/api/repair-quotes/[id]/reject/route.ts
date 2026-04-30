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
        statusHistory: appendStatusHistory(
          existingQuote.statusHistory,
          'REJECTED',
          `${user.fullName} (${club.name})`,
          `Rejected: ${rejectionReason}`
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

    // Notify ICB Solutions about rejection so they can re-quote
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://gymhub.club'
      const manageUrl = existingQuote.secureToken
        ? `${appUrl}/quote-manage/${existingQuote.secureToken}`
        : null

      await sendEmail({
        to: 'GymHub@icb.solutions',
        subject: `[${existingQuote.requestReference || id}] Quote REJECTED - ${updated.equipment.name} at ${club.name}`,
        htmlContent: `
          <h2 style="color:#dc2626;">Quote Rejected</h2>
          <p><strong>Reference:</strong> ${existingQuote.requestReference || id}</p>
          <p><strong>Club:</strong> ${club.name}</p>
          <p><strong>Equipment:</strong> ${updated.equipment.name}</p>
          <p><strong>Rejected by:</strong> ${user.fullName}</p>
          <p><strong>Previous Quote:</strong> $${existingQuote.quoteAmount || 'N/A'}</p>
          <p><strong>Rejection Reason:</strong> ${rejectionReason}</p>
          <p style="margin-top:20px;">Please review the feedback and consider submitting a revised quote.</p>
          ${manageUrl ? `<p><a href="${manageUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;margin-top:10px;">Submit Revised Quote</a></p>` : ''}
        `,
      });
    } catch (emailErr) {
      console.error('Failed to send rejection notification to ICB:', emailErr);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Reject repair quote error:', error);
    return NextResponse.json(
      { error: 'Failed to reject repair quote request' },
      { status: 500 }
    );
  }
}

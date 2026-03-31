import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';

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

// POST /api/repair-quotes/[id]/complete - Mark repair as completed
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { club, user } = await authenticateRequest(request);
    const { id } = await params;
    const body = await request.json();
    const { finalCost, completionNotes, invoiceDocuments, warrantyInfo } = body;

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

    // Update with completion details
    const updated = await prisma.repairQuoteRequest.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        repairCompletedAt: new Date(),
        repairCompletedBy: user.fullName,
        finalCost: finalCost || null,
        completionNotes: completionNotes || null,
        invoiceDocuments: invoiceDocuments ? JSON.stringify(invoiceDocuments) : null,
        warrantyInfo: warrantyInfo || null,
        statusHistory: appendStatusHistory(
          existingQuote.statusHistory,
          'COMPLETED',
          `${user.fullName} (${club.name})`,
          completionNotes || 'Repair marked as completed'
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

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Complete repair quote error:', error);
    return NextResponse.json(
      { error: 'Failed to mark repair as completed' },
      { status: 500 }
    );
  }
}

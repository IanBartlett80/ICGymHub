import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';

// GET /api/repair-quotes/[id] - Get single repair quote request
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { club } = await authenticateRequest(request);
    const { id } = await params;

    const repairQuote = await prisma.repairQuoteRequest.findFirst({
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
        requestedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        safetyIssue: {
          select: {
            id: true,
            title: true,
            description: true,
            issueType: true,
            priority: true,
            status: true,
          },
        },
      },
    });

    if (!repairQuote) {
      return NextResponse.json(
        { error: 'Repair quote request not found' },
        { status: 404 }
      );
    }

    // Parse JSON fields
    const parsedQuote = {
      ...repairQuote,
      photos: repairQuote.photos ? JSON.parse(repairQuote.photos) : [],
      quoteDocuments: repairQuote.quoteDocuments ? JSON.parse(repairQuote.quoteDocuments) : [],
      invoiceDocuments: repairQuote.invoiceDocuments ? JSON.parse(repairQuote.invoiceDocuments) : [],
    };

    return NextResponse.json(parsedQuote);
  } catch (error) {
    console.error('Get repair quote error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch repair quote request' },
      { status: 500 }
    );
  }
}

// PUT /api/repair-quotes/[id] - Update repair quote request
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { club, user } = await authenticateRequest(request);
    const { id } = await params;
    const body = await request.json();

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

    const {
      issueDescription,
      urgency,
      preferredRepairDate,
      estimatedBudget,
      contactPerson,
      contactPhone,
      contactEmail,
      additionalNotes,
      specialRequirements,
      status,
      quoteAmount,
      quoteReceivedAt,
      quoteReceivedFrom,
      quoteNotes,
      quoteDocuments,
      approvedBy,
      approvedByName,
      approvedAt,
      approvalNotes,
      rejectedBy,
      rejectedByName,
      rejectedAt,
      rejectionReason,
      scheduledRepairDate,
      repairCompanyName,
      repairContactPerson,
      repairContactPhone,
      repairContactEmail,
      repairCompletedAt,
      repairCompletedBy,
      finalCost,
      completionNotes,
      invoiceDocuments,
      warrantyInfo,
    } = body;

    const updateData: any = {
      updatedAt: new Date(),
    };

    // Only update provided fields
    if (issueDescription !== undefined) updateData.issueDescription = issueDescription;
    if (urgency !== undefined) updateData.urgency = urgency;
    if (preferredRepairDate !== undefined) updateData.preferredRepairDate = preferredRepairDate ? new Date(preferredRepairDate) : null;
    if (estimatedBudget !== undefined) updateData.estimatedBudget = estimatedBudget;
    if (contactPerson !== undefined) updateData.contactPerson = contactPerson;
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone;
    if (contactEmail !== undefined) updateData.contactEmail = contactEmail;
    if (additionalNotes !== undefined) updateData.additionalNotes = additionalNotes;
    if (specialRequirements !== undefined) updateData.specialRequirements = specialRequirements;
    if (status !== undefined) updateData.status = status;
    
    // Quote details
    if (quoteAmount !== undefined) updateData.quoteAmount = quoteAmount;
    if (quoteReceivedAt !== undefined) updateData.quoteReceivedAt = quoteReceivedAt ? new Date(quoteReceivedAt) : null;
    if (quoteReceivedFrom !== undefined) updateData.quoteReceivedFrom = quoteReceivedFrom;
    if (quoteNotes !== undefined) updateData.quoteNotes = quoteNotes;
    if (quoteDocuments !== undefined) updateData.quoteDocuments = JSON.stringify(quoteDocuments);
    
    // Approval tracking
    if (approvedBy !== undefined) updateData.approvedBy = approvedBy;
    if (approvedByName !== undefined) updateData.approvedByName = approvedByName;
    if (approvedAt !== undefined) updateData.approvedAt = approvedAt ? new Date(approvedAt) : null;
    if (approvalNotes !== undefined) updateData.approvalNotes = approvalNotes;
    if (rejectedBy !== undefined) updateData.rejectedBy = rejectedBy;
    if (rejectedByName !== undefined) updateData.rejectedByName = rejectedByName;
    if (rejectedAt !== undefined) updateData.rejectedAt = rejectedAt ? new Date(rejectedAt) : null;
    if (rejectionReason !== undefined) updateData.rejectionReason = rejectionReason;
    
    // Repair scheduling
    if (scheduledRepairDate !== undefined) updateData.scheduledRepairDate = scheduledRepairDate ? new Date(scheduledRepairDate) : null;
    if (repairCompanyName !== undefined) updateData.repairCompanyName = repairCompanyName;
    if (repairContactPerson !== undefined) updateData.repairContactPerson = repairContactPerson;
    if (repairContactPhone !== undefined) updateData.repairContactPhone = repairContactPhone;
    if (repairContactEmail !== undefined) updateData.repairContactEmail = repairContactEmail;
    
    // Completion
    if (repairCompletedAt !== undefined) updateData.repairCompletedAt = repairCompletedAt ? new Date(repairCompletedAt) : null;
    if (repairCompletedBy !== undefined) updateData.repairCompletedBy = repairCompletedBy;
    if (finalCost !== undefined) updateData.finalCost = finalCost;
    if (completionNotes !== undefined) updateData.completionNotes = completionNotes;
    if (invoiceDocuments !== undefined) updateData.invoiceDocuments = JSON.stringify(invoiceDocuments);
    if (warrantyInfo !== undefined) updateData.warrantyInfo = warrantyInfo;

    const updated = await prisma.repairQuoteRequest.update({
      where: { id },
      data: updateData,
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
        safetyIssue: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update repair quote error:', error);
    return NextResponse.json(
      { error: 'Failed to update repair quote request' },
      { status: 500 }
    );
  }
}

// DELETE /api/repair-quotes/[id] - Delete repair quote request
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { club } = await authenticateRequest(request);
    const { id } = await params;

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

    await prisma.repairQuoteRequest.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete repair quote error:', error);
    return NextResponse.json(
      { error: 'Failed to delete repair quote request' },
      { status: 500 }
    );
  }
}

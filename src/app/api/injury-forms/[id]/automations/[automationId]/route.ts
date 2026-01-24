import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

// GET /api/injury-forms/[id]/automations/[automationId] - Get specific automation
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; automationId: string } }
) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const automation = await prisma.injuryFormAutomation.findFirst({
      where: {
        id: params.automationId,
        template: {
          clubId: authResult.user.clubId,
        },
      },
    });

    if (!automation) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 });
    }

    return NextResponse.json({ automation });
  } catch (error) {
    console.error('Error fetching automation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch automation' },
      { status: 500 }
    );
  }
}

// PUT /api/injury-forms/[id]/automations/[automationId] - Update automation
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; automationId: string } }
) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      description,
      active,
      order,
      triggerConditions,
      actions,
      emailRecipients,
      emailSubject,
      emailTemplate,
      escalationEnabled,
      escalationHours,
      escalationActions,
    } = body;

    const automation = await prisma.injuryFormAutomation.updateMany({
      where: {
        id: params.automationId,
        template: {
          clubId: authResult.user.clubId,
        },
      },
      data: {
        name,
        description,
        active,
        order,
        triggerConditions: JSON.stringify(triggerConditions),
        actions: JSON.stringify(actions),
        emailRecipients: emailRecipients ? JSON.stringify(emailRecipients) : null,
        emailSubject,
        emailTemplate,
        escalationEnabled,
        escalationHours,
        escalationActions: escalationActions ? JSON.stringify(escalationActions) : null,
      },
    });

    if (automation.count === 0) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 });
    }

    const updated = await prisma.injuryFormAutomation.findUnique({
      where: { id: params.automationId },
    });

    return NextResponse.json({ automation: updated });
  } catch (error) {
    console.error('Error updating automation:', error);
    return NextResponse.json(
      { error: 'Failed to update automation' },
      { status: 500 }
    );
  }
}

// DELETE /api/injury-forms/[id]/automations/[automationId] - Delete automation
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; automationId: string } }
) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await prisma.injuryFormAutomation.deleteMany({
      where: {
        id: params.automationId,
        template: {
          clubId: authResult.user.clubId,
        },
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting automation:', error);
    return NextResponse.json(
      { error: 'Failed to delete automation' },
      { status: 500 }
    );
  }
}

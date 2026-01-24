import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/apiAuth';

// GET /api/injury-forms/[id]/automations - List automations for a template
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify template ownership
    const template = await prisma.injuryFormTemplate.findFirst({
      where: {
        id: id,
        clubId: authResult.user.clubId,
      },
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const automations = await prisma.injuryFormAutomation.findMany({
      where: { templateId: id },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ automations });
  } catch (error) {
    console.error('Error fetching automations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch automations' },
      { status: 500 }
    );
  }
}

// POST /api/injury-forms/[id]/automations - Create automation
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify template ownership
    const template = await prisma.injuryFormTemplate.findFirst({
      where: {
        id: id,
        clubId: authResult.user.clubId,
      },
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
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

    const automation = await prisma.injuryFormAutomation.create({
      data: {
        templateId: id,
        name,
        description,
        active: active !== false,
        order: order || 0,
        triggerConditions: JSON.stringify(triggerConditions),
        actions: JSON.stringify(actions),
        emailRecipients: emailRecipients ? JSON.stringify(emailRecipients) : null,
        emailSubject,
        emailTemplate,
        escalationEnabled: escalationEnabled || false,
        escalationHours,
        escalationActions: escalationActions ? JSON.stringify(escalationActions) : null,
      },
    });

    return NextResponse.json({ automation }, { status: 201 });
  } catch (error) {
    console.error('Error creating automation:', error);
    return NextResponse.json(
      { error: 'Failed to create automation' },
      { status: 500 }
    );
  }
}

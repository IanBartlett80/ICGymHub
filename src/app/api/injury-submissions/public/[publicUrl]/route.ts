import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { triggerAutomations } from '@/lib/automationEngine';

// GET /api/injury-submissions/public/[publicUrl] - Get public form template (no auth)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ publicUrl: string }> }
) {
  try {
    const { publicUrl } = await params;

    const template = await prisma.injuryFormTemplate.findFirst({
      where: {
        publicUrl,
        active: true,
      },
      include: {
        sections: {
          include: {
            fields: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!template) {
      return NextResponse.json({ error: 'Form not found or inactive' }, { status: 404 });
    }

    // Return template without sensitive info
    const publicTemplate = {
      id: template.id,
      name: template.name,
      description: template.description,
      headerColor: template.headerColor,
      logoUrl: template.logoUrl,
      clubId: template.clubId,
      sections: template.sections,
    };

    return NextResponse.json({ template: publicTemplate });
  } catch (error) {
    console.error('Error fetching public form:', error);
    return NextResponse.json(
      { error: 'Failed to fetch form' },
      { status: 500 }
    );
  }
}

// POST /api/injury-submissions/public/[publicUrl] - Submit form (no auth)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ publicUrl: string }> }
) {
  try {
    const { publicUrl } = await params;
    const body = await req.json();
    const { formData } = body;

    // Get template
    const template = await prisma.injuryFormTemplate.findFirst({
      where: {
        publicUrl,
        active: true,
      },
      include: {
        sections: {
          include: {
            fields: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!template) {
      return NextResponse.json({ error: 'Form not found or inactive' }, { status: 404 });
    }

    // Flatten all fields from all sections
    const allFields = template.sections.flatMap(section => section.fields);

    // Validate required fields
    const requiredFields = allFields.filter((f) => f.required);
    for (const field of requiredFields) {
      if (!formData[field.id]) {
        return NextResponse.json(
          { error: `Field "${field.label}" is required` },
          { status: 400 }
        );
      }
    }

    // Calculate retention date (5 years for Australian WHS compliance)
    const retentionDate = new Date();
    retentionDate.setFullYear(retentionDate.getFullYear() + 5);

    // Create submission
    const submission = await prisma.injurySubmission.create({
      data: {
        templateId: template.id,
        clubId: template.clubId,
        submitterInfo: JSON.stringify({
          ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
          userAgent: req.headers.get('user-agent'),
          submittedAt: new Date().toISOString(),
        }),
        status: 'NEW',
        retentionDate,
        data: {
          create: Object.entries(formData).map(([fieldId, value]) => ({
            fieldId,
            value: JSON.stringify({ value, displayValue: value }),
          })),
        },
      },
      include: {
        data: {
          include: {
            field: true,
          },
        },
      },
    });

    // Create audit log for submission
    await prisma.injurySubmissionAudit.create({
      data: {
        submissionId: submission.id,
        action: 'SUBMISSION_CREATED',
        newValue: 'NEW',
        metadata: JSON.stringify({ source: 'public_form' }),
      },
    });

    // Trigger automations
    await triggerAutomations(submission.id, 'ON_SUBMIT');

    return NextResponse.json({
      success: true,
      submissionId: submission.id,
      message: template.thankYouMessage,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating injury submission:', error);
    return NextResponse.json(
      { error: 'Failed to submit form' },
      { status: 500 }
    );
  }
}

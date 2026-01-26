import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/apiAuth';

// GET /api/injury-forms/[id] - Get a specific template
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

    const template = await prisma.injuryFormTemplate.findFirst({
      where: {
        id,
        clubId: authResult.user.clubId,
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
        automations: {
          where: { active: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error fetching injury form template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    );
  }
}

// PUT /api/injury-forms/[id] - Update a template
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, description, headerColor, logoUrl, thankYouMessage, active, sections } = body;

    // Verify ownership
    const existing = await prisma.injuryFormTemplate.findFirst({
      where: {
        id,
        clubId: authResult.user.clubId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Delete existing sections and fields, then recreate
    await prisma.injuryFormSection.deleteMany({
      where: { templateId: id },
    });

    // Update template basic info
    await prisma.injuryFormTemplate.update({
      where: { id },
      data: {
        name,
        description,
        headerColor,
        logoUrl,
        thankYouMessage,
        active,
      },
    });

    // Recreate sections with fields
    if (sections && sections.length > 0) {
      await Promise.all(
        sections.map(async (section: any, sectionIndex: number) => {
          const createdSection = await prisma.injuryFormSection.create({
            data: {
              templateId: id,
              title: section.title,
              description: section.description,
              order: sectionIndex,
            },
          });

          // Create fields for this section
          if (section.fields && section.fields.length > 0) {
            await prisma.injuryFormField.createMany({
              data: section.fields.map((field: any, fieldIndex: number) => ({
                templateId: id,
                sectionId: createdSection.id,
                fieldType: field.fieldType,
                label: field.label,
                description: field.description,
                placeholder: field.placeholder,
                required: field.required || false,
                order: fieldIndex,
                options: field.options ? JSON.stringify(field.options) : null,
                validation: field.validation ? JSON.stringify(field.validation) : null,
                conditionalLogic: field.conditionalLogic ? JSON.stringify(field.conditionalLogic) : null,
              })),
            });
          }
        })
      );
    }

    // Fetch the complete updated template
    const completeTemplate = await prisma.injuryFormTemplate.findUnique({
      where: { id },
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

    return NextResponse.json({ template: completeTemplate });
  } catch (error) {
    console.error('Error updating injury form template:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

// DELETE /api/injury-forms/[id] - Delete a template
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.injuryFormTemplate.findFirst({
      where: {
        id,
        clubId: authResult.user.clubId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Check if there are any submissions
    const submissionCount = await prisma.injurySubmission.count({
      where: { templateId: id },
    });

    if (submissionCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete template with existing submissions. Please archive it instead.' },
        { status: 400 }
      );
    }

    await prisma.injuryFormTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting injury form template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/apiAuth';
import { nanoid } from 'nanoid';

// GET /api/injury-forms - List all injury form templates for a club
export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('active') === 'true';

    const templates = await prisma.injuryFormTemplate.findMany({
      where: {
        clubId: authResult.user.clubId,
        ...(activeOnly && { active: true }),
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
        _count: {
          select: {
            submissions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error fetching injury form templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

// POST /api/injury-forms - Create a new injury form template
export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, headerColor, logoUrl, thankYouMessage, sections } = body;

    // Generate unique public URL slug
    const publicUrl = `injury-report-${nanoid(10)}`;

    // Create template first
    const template = await prisma.injuryFormTemplate.create({
      data: {
        clubId: authResult.user.clubId,
        name,
        description,
        publicUrl,
        headerColor: headerColor || '#0078d4',
        logoUrl,
        thankYouMessage: thankYouMessage || 'Thank you for your submission. We will review this report shortly.',
      },
    });

    // Then create sections with fields
    if (sections && sections.length > 0) {
      await Promise.all(
        sections.map(async (section: any, sectionIndex: number) => {
          const createdSection = await prisma.injuryFormSection.create({
            data: {
              templateId: template.id,
              title: section.title,
              description: section.description,
              order: sectionIndex,
            },
          });

          // Create fields for this section
          if (section.fields && section.fields.length > 0) {
            await prisma.injuryFormField.createMany({
              data: section.fields.map((field: any, fieldIndex: number) => ({
                templateId: template.id,
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

    // Fetch the complete template with sections and fields
    const completeTemplate = await prisma.injuryFormTemplate.findUnique({
      where: { id: template.id },
      include: {
        sections: {
          include: {
            fields: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    return NextResponse.json({ template: completeTemplate }, { status: 201 });
  } catch (error) {
    console.error('Error creating injury form template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}

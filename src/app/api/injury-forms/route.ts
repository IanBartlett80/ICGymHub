import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
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

    const template = await prisma.injuryFormTemplate.create({
      data: {
        clubId: authResult.user.clubId,
        name,
        description,
        publicUrl,
        headerColor: headerColor || '#0078d4',
        logoUrl,
        thankYouMessage: thankYouMessage || 'Thank you for your submission. We will review this report shortly.',
        sections: {
          create: sections?.map((section: any, sectionIndex: number) => ({
            title: section.title,
            description: section.description,
            order: sectionIndex,
            fields: {
              create: section.fields?.map((field: any, fieldIndex: number) => ({
                templateId: undefined, // Will be set by Prisma
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
            },
          })),
        },
      },
      include: {
        sections: {
          include: {
            fields: true,
          },
        },
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('Error creating injury form template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}

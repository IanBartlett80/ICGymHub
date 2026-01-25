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

    console.log('Creating injury form template:', { name, sectionsCount: sections?.length });

    // Generate unique public URL slug
    const publicUrl = `injury-report-${nanoid(10)}`;

    // Fetch coaches, gymsports, and class templates for default fields
    const [coaches, gymsports, classTemplates] = await Promise.all([
      prisma.coach.findMany({
        where: { clubId: authResult.user.clubId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.gymsport.findMany({
        where: { clubId: authResult.user.clubId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.classTemplate.findMany({
        where: { clubId: authResult.user.clubId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);

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

    // Create default sections with fields
    
    // Section 1: Reported By Details
    const section1 = await prisma.injuryFormSection.create({
      data: {
        templateId: template.id,
        title: 'Reported By Details',
        description: 'Information about who is reporting the incident',
        order: 0,
      },
    });

    const section1Fields = [
      {
        templateId: template.id,
        sectionId: section1.id,
        fieldType: 'TEXT_SHORT',
        label: 'Injury Reported By',
        description: 'Name of the person reporting this incident',
        required: true,
        order: 0,
      },
      {
        templateId: template.id,
        sectionId: section1.id,
        fieldType: 'DATE',
        label: 'Date of Report Submission',
        description: 'Date this report is being submitted',
        required: true,
        order: 1,
      },
      {
        templateId: template.id,
        sectionId: section1.id,
        fieldType: 'DATETIME',
        label: 'Date and Time of Incident',
        description: 'When did the incident occur?',
        required: true,
        order: 2,
      },
      {
        templateId: template.id,
        sectionId: section1.id,
        fieldType: 'DROPDOWN',
        label: 'Supervising Coach',
        description: 'Coach who was supervising at the time of incident',
        required: true,
        order: 3,
        options: coaches.length > 0 
          ? JSON.stringify(coaches.map(c => c.name))
          : JSON.stringify(['No coaches available']),
      },
      {
        templateId: template.id,
        sectionId: section1.id,
        fieldType: 'EMAIL',
        label: 'Coach Email',
        description: 'Email address of the supervising coach',
        required: false,
        order: 4,
      },
      {
        templateId: template.id,
        sectionId: section1.id,
        fieldType: 'PHONE',
        label: 'Coach Phone',
        description: 'Phone number of the supervising coach',
        required: false,
        order: 5,
      },
      {
        templateId: template.id,
        sectionId: section1.id,
        fieldType: 'TEXT_LONG',
        label: 'Detailed Description of What Happened',
        description: 'Please provide a detailed account of the incident',
        required: true,
        order: 6,
      },
    ];

    await prisma.injuryFormField.createMany({ data: section1Fields });

    // Section 2: Athlete Details
    const section2 = await prisma.injuryFormSection.create({
      data: {
        templateId: template.id,
        title: 'Athlete Details',
        description: 'Information about the athlete involved',
        order: 1,
      },
    });

    const section2Fields = [
      {
        templateId: template.id,
        sectionId: section2.id,
        fieldType: 'TEXT_SHORT',
        label: 'Athlete Name',
        description: 'Full name of the athlete',
        required: true,
        order: 0,
      },
      {
        templateId: template.id,
        sectionId: section2.id,
        fieldType: 'DROPDOWN',
        label: 'Program',
        description: 'Which program/gymsport was the athlete participating in?',
        required: true,
        order: 1,
        options: gymsports.length > 0 
          ? JSON.stringify(gymsports.map(g => g.name))
          : JSON.stringify(['No programs available']),
      },
      {
        templateId: template.id,
        sectionId: section2.id,
        fieldType: 'DROPDOWN',
        label: 'Class',
        description: 'Which class was the athlete in?',
        required: true,
        order: 2,
        options: classTemplates.length > 0 
          ? JSON.stringify(classTemplates.map(c => c.name))
          : JSON.stringify(['No classes available']),
      },
    ];

    await prisma.injuryFormField.createMany({ data: section2Fields });

    // Section 3: Injury Details
    const section3 = await prisma.injuryFormSection.create({
      data: {
        templateId: template.id,
        title: 'Injury Details',
        description: 'Information about the injury sustained',
        order: 2,
      },
    });

    const section3Fields = [
      {
        templateId: template.id,
        sectionId: section3.id,
        fieldType: 'MULTIPLE_CHOICE',
        label: 'Part of Body Injured',
        description: 'Select the body part that was injured',
        required: true,
        order: 0,
        options: JSON.stringify([
          'Head / Neck region',
          'Shoulder',
          'Upper torso region',
          'Elbow',
          'Wrist / Hand',
          'Lower Back',
          'Hip',
          'Knee',
          'Ankle',
          'Foot'
        ]),
      },
      {
        templateId: template.id,
        sectionId: section3.id,
        fieldType: 'MULTIPLE_CHOICE',
        label: 'Nature of Injury Sustained',
        description: 'Select the type of injury',
        required: true,
        order: 1,
        options: JSON.stringify([
          'Cut / Abrasion',
          'Dizzy',
          'Passout / Unconscious',
          'Bruise',
          'Sprain',
          'Broken bone / Fracture',
          'Dislocation',
          'Burn',
          'Swelling'
        ]),
      },
    ];

    await prisma.injuryFormField.createMany({ data: section3Fields });

    // Section 4: Action Taken
    const section4 = await prisma.injuryFormSection.create({
      data: {
        templateId: template.id,
        title: 'Action Taken',
        description: 'Actions taken following the incident',
        order: 3,
      },
    });

    const section4Fields = [
      {
        templateId: template.id,
        sectionId: section4.id,
        fieldType: 'DROPDOWN',
        label: 'Was First Aid Administered',
        description: 'Was first aid provided to the athlete?',
        required: true,
        order: 0,
        options: JSON.stringify(['Yes', 'No']),
      },
      {
        templateId: template.id,
        sectionId: section4.id,
        fieldType: 'DROPDOWN',
        label: 'Was Medication Administered',
        description: 'Was any medication given to the athlete?',
        required: true,
        order: 1,
        options: JSON.stringify(['Yes', 'No']),
      },
      {
        templateId: template.id,
        sectionId: section4.id,
        fieldType: 'DROPDOWN',
        label: 'Was Emergency Services Contacted',
        description: 'Were emergency services (ambulance, police) called?',
        required: true,
        order: 2,
        options: JSON.stringify(['Yes', 'No']),
      },
      {
        templateId: template.id,
        sectionId: section4.id,
        fieldType: 'DROPDOWN',
        label: 'Was Advice Given to Seek Further Medical Attention',
        description: 'Was the athlete/parent advised to seek medical attention?',
        required: true,
        order: 3,
        options: JSON.stringify(['Yes', 'No']),
      },
      {
        templateId: template.id,
        sectionId: section4.id,
        fieldType: 'DROPDOWN',
        label: 'Was Parent / Guardian Contacted to Discuss the Incident?',
        description: 'Was the parent or guardian notified about the incident?',
        required: true,
        order: 4,
        options: JSON.stringify(['Yes', 'No']),
      },
      {
        templateId: template.id,
        sectionId: section4.id,
        fieldType: 'TEXT_LONG',
        label: 'Additional Details Related to the Incident',
        description: 'Any other relevant information about the actions taken',
        required: false,
        order: 5,
      },
    ];

    await prisma.injuryFormField.createMany({ data: section4Fields });

    // Then create any additional custom sections with fields provided by the user
    if (sections && sections.length > 0) {
      await Promise.all(
        sections.map(async (section: any, sectionIndex: number) => {
          const createdSection = await prisma.injuryFormSection.create({
            data: {
              templateId: template.id,
              title: section.title,
              description: section.description,
              order: sectionIndex + 4, // Start after the 4 default sections
            },
          });

          // Create fields for this section
          if (section.fields && section.fields.length > 0) {
            console.log(`Creating ${section.fields.length} fields for section "${section.title}"`);
            await prisma.injuryFormField.createMany({
              data: section.fields.map((field: any, fieldIndex: number) => {
                const fieldData = {
                  templateId: template.id,
                  sectionId: createdSection.id,
                  fieldType: field.fieldType,
                  label: field.label,
                  description: field.description || null,
                  placeholder: field.placeholder || null,
                  required: field.required || false,
                  order: fieldIndex,
                  options: field.options && field.options.length > 0 ? JSON.stringify(field.options) : null,
                  validation: field.validation ? JSON.stringify(field.validation) : null,
                  conditionalLogic: field.conditionalLogic ? JSON.stringify(field.conditionalLogic) : null,
                };
                console.log('Field data:', fieldData);
                return fieldData;
              }),
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
            fields: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    return NextResponse.json({ template: completeTemplate }, { status: 201 });
  } catch (error) {
    console.error('Error creating injury form template:', error);
    return NextResponse.json(
      { error: 'Failed to create template', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

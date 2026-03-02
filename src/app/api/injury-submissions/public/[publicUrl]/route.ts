import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { triggerAutomations } from '@/lib/automationEngine';

// GET /api/injury-submissions/public/[publicUrl] - Get public form template (no auth)
export async function GET(
  _req: NextRequest,
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

    // Extract zone and equipment IDs from form data
    const zoneField = allFields.find(f => f.label.includes('Zone') || f.label.includes('Area'));
    const equipmentField = allFields.find(f => f.label.includes('Equipment') || f.label.includes('Apparatus'));
    
    const zoneId = zoneField ? formData[zoneField.id] : null;
    const equipmentId = equipmentField ? formData[equipmentField.id] : null;

    if (zoneId) {
      const zone = await prisma.zone.findFirst({
        where: {
          id: zoneId,
          clubId: template.clubId,
          active: true,
        },
        select: { id: true },
      });

      if (!zone) {
        return NextResponse.json(
          { error: 'Selected zone is invalid' },
          { status: 400 }
        );
      }
    }

    if (equipmentId) {
      const equipment = await prisma.equipment.findFirst({
        where: {
          id: equipmentId,
          clubId: template.clubId,
          active: true,
        },
        select: {
          id: true,
          zoneId: true,
        },
      });

      if (!equipment) {
        return NextResponse.json(
          { error: 'Selected equipment is invalid' },
          { status: 400 }
        );
      }

      if (zoneId && equipment.zoneId && equipment.zoneId !== zoneId) {
        return NextResponse.json(
          { error: 'Selected equipment does not belong to the selected zone' },
          { status: 400 }
        );
      }
    }

    // Fetch equipment context if equipment is selected
    let equipmentMaintenanceSnapshot = null;
    let equipmentSafetySnapshot = null;

    if (equipmentId) {
      // Fetch last maintenance record
      const lastMaintenance = await prisma.maintenanceTask.findFirst({
        where: {
          equipmentId,
          status: 'COMPLETED',
        },
        orderBy: {
          completedDate: 'desc',
        },
        select: {
          id: true,
          taskType: true,
          title: true,
          completedDate: true,
          completedBy: true,
          status: true,
          notes: true,
        },
      });

      if (lastMaintenance) {
        equipmentMaintenanceSnapshot = JSON.stringify({
          taskId: lastMaintenance.id,
          taskType: lastMaintenance.taskType,
          title: lastMaintenance.title,
          completedDate: lastMaintenance.completedDate,
          completedBy: lastMaintenance.completedBy,
          status: lastMaintenance.status,
          notes: lastMaintenance.notes,
        });
      }

      // Fetch last safety issue
      const lastSafetyIssue = await prisma.safetyIssue.findFirst({
        where: {
          equipmentId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          issueType: true,
          description: true,
          priority: true,
          status: true,
          createdAt: true,
          resolvedAt: true,
        },
      });

      if (lastSafetyIssue) {
        equipmentSafetySnapshot = JSON.stringify({
          issueId: lastSafetyIssue.id,
          issueType: lastSafetyIssue.issueType,
          description: lastSafetyIssue.description,
          priority: lastSafetyIssue.priority,
          severity: lastSafetyIssue.priority,
          status: lastSafetyIssue.status,
          createdAt: lastSafetyIssue.createdAt,
          reportedDate: lastSafetyIssue.createdAt,
          resolvedAt: lastSafetyIssue.resolvedAt,
          resolvedDate: lastSafetyIssue.resolvedAt,
        });
      }
    }

    // Calculate retention date (5 years for Australian WHS compliance)
    const retentionDate = new Date();
    retentionDate.setFullYear(retentionDate.getFullYear() + 5);

    // Create submission
    const submissionData: any = {
        templateId: template.id,
        clubId: template.clubId,
        zoneId: zoneId || null,
        equipmentId: equipmentId || null,
        equipmentMaintenanceSnapshot: equipmentMaintenanceSnapshot,
        equipmentSafetySnapshot: equipmentSafetySnapshot,
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
      };

    const submission = await prisma.injurySubmission.create({
      data: submissionData,
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

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { triggerAutomations } from '@/lib/automationEngine';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { rateLimit, getClientIp } from '@/lib/rateLimit';

function isSchemaDriftError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2021' || error.code === 'P2022';
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('column') || message.includes('does not exist') || message.includes('table');
  }

  return false;
}

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
  // 20 submissions per IP per 10 minutes — prevents spam flooding a club's queue
  const ip = getClientIp(req)
  const rl = rateLimit(`public-form:${ip}`, 20, 10 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many submissions. Please wait a few minutes before trying again.' },
      { status: 429 }
    )
  }
  try {
    const { publicUrl } = await params;
    const body = await req.json();
    const formData = (body?.formData && typeof body.formData === 'object') ? body.formData : {};

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

    // Resolve venue/zone/equipment IDs from valid submitted values instead of label heuristics
    const submittedStringValues = Object.values(formData).filter(
      (value): value is string => typeof value === 'string' && value.trim().length > 0
    );

    const [matchingVenues, matchingZones, matchingEquipment] = await Promise.all([
      prisma.venue.findMany({
        where: {
          clubId: template.clubId,
          active: true,
          id: { in: submittedStringValues },
        },
        select: { id: true, name: true },
      }),
      prisma.zone.findMany({
        where: {
          clubId: template.clubId,
          active: true,
          id: { in: submittedStringValues },
        },
        select: { id: true, name: true },
      }),
      prisma.equipment.findMany({
        where: {
          clubId: template.clubId,
          active: true,
          id: { in: submittedStringValues },
        },
        select: {
          id: true,
          name: true,
          zoneId: true,
        },
      }),
    ]);

    const venueId = matchingVenues[0]?.id || null;
    const zoneId = matchingZones[0]?.id || null;
    const equipmentRecord = matchingEquipment[0] || null;
    const equipmentId = equipmentRecord?.id || null;

    // Build lookup maps for resolving IDs to friendly names when storing form data
    const idToNameMap = new Map<string, string>();
    for (const v of matchingVenues) idToNameMap.set(v.id, v.name);
    for (const z of matchingZones) idToNameMap.set(z.id, z.name);
    for (const e of matchingEquipment) idToNameMap.set(e.id, e.name);

    if (zoneId && equipmentRecord?.zoneId && equipmentRecord.zoneId !== zoneId) {
      return NextResponse.json(
        { error: 'Selected equipment does not belong to the selected zone' },
        { status: 400 }
      );
    }

    // Fetch equipment context if equipment is selected
    let equipmentMaintenanceSnapshot = null;
    let equipmentSafetySnapshot = null;

    if (equipmentId) {
      try {
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
      } catch (snapshotError) {
        console.warn('Skipping maintenance snapshot due to schema mismatch:', snapshotError);
      }

      try {
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
      } catch (snapshotError) {
        console.warn('Skipping safety snapshot due to schema mismatch:', snapshotError);
      }
    }

    // Calculate retention date (5 years for Australian WHS compliance)
    const retentionDate = new Date();
    retentionDate.setFullYear(retentionDate.getFullYear() + 5);

    // Create submission
    const templateFieldIds = new Set(allFields.map((field) => field.id));
    const safeFormEntries = Object.entries(formData).filter(([fieldId]) => templateFieldIds.has(fieldId));

    const submitterInfo = JSON.stringify({
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      userAgent: req.headers.get('user-agent'),
      submittedAt: new Date().toISOString(),
    });

    const entryRows = safeFormEntries.map(([fieldId, value]) => {
      // Handle values that are already objects (e.g., gym sport, class with id/name)
      if (typeof value === 'object' && value !== null) {
        // Value is already an object with displayValue, use it as-is  
        const objectValue = value as any;
        return {
          fieldId,
          value: JSON.stringify({
            value: objectValue.value || objectValue.id || value,
            displayValue: objectValue.displayValue || objectValue.name || value,
            id: objectValue.id,
            name: objectValue.name,
            ...(objectValue.gymsportId && { gymsportId: objectValue.gymsportId }),
          }),
        };
      }
      
      // Regular string/number value — resolve IDs to friendly names if matched
      const stringValue = String(value);
      const friendlyName = idToNameMap.get(stringValue);
      return {
        fieldId,
        value: JSON.stringify({ value: stringValue, displayValue: friendlyName || stringValue }),
      };
    });

    const submissionData: any = {
      templateId: template.id,
      clubId: template.clubId,
      venueId: venueId || null,
      zoneId: zoneId || null,
      equipmentId: equipmentId || null,
      equipmentMaintenanceSnapshot: equipmentMaintenanceSnapshot,
      equipmentSafetySnapshot: equipmentSafetySnapshot,
      submitterInfo,
      status: 'NEW',
      retentionDate,
    };

    const legacySubmissionData: any = {
      templateId: template.id,
      clubId: template.clubId,
      submitterInfo,
      status: 'NEW',
    };

    let submissionId: string;
    try {
      const created = await prisma.injurySubmission.create({
        data: submissionData,
        select: { id: true },
      });
      submissionId = created.id;

      if (entryRows.length > 0) {
        await prisma.injurySubmissionData.createMany({
          data: entryRows.map((entry) => ({
            submissionId,
            ...entry,
          })),
        });
      }
    } catch (createError) {
      console.warn('Primary injury submission create failed, retrying with legacy-compatible payload:', createError);

      try {
        const createdLegacy = await prisma.injurySubmission.create({
          data: legacySubmissionData,
          select: { id: true },
        });
        submissionId = createdLegacy.id;

        if (entryRows.length > 0) {
          await prisma.injurySubmissionData.createMany({
            data: entryRows.map((entry) => ({
              submissionId,
              ...entry,
            })),
          });
        }
      } catch (legacyCreateError) {
        console.error('Legacy-compatible injury submission create also failed:', {
          createError,
          legacyCreateError,
        });

        const rawFallbackSubmissionId = randomUUID();

        try {
          await prisma.$transaction(async (tx) => {
            await tx.$executeRaw`
              INSERT INTO "InjurySubmission" ("id", "templateId", "clubId", "submitterInfo", "status")
              VALUES (${rawFallbackSubmissionId}, ${template.id}, ${template.clubId}, ${submitterInfo}, ${'NEW'})
            `;

            for (const entry of entryRows) {
              await tx.$executeRaw`
                INSERT INTO "InjurySubmissionData" ("id", "submissionId", "fieldId", "value")
                VALUES (${randomUUID()}, ${rawFallbackSubmissionId}, ${entry.fieldId}, ${entry.value})
              `;
            }
          });

          submissionId = rawFallbackSubmissionId;
        } catch (rawFallbackError) {
          console.error('Raw SQL legacy fallback failed:', {
            createError,
            legacyCreateError,
            rawFallbackError,
          });
          throw rawFallbackError;
        }
      }
    }

    // Create audit log for submission
    try {
      await prisma.injurySubmissionAudit.create({
        data: {
          submissionId,
          action: 'SUBMISSION_CREATED',
          newValue: 'NEW',
          metadata: JSON.stringify({ source: 'public_form' }),
        },
      });
    } catch (auditError) {
      if (!isSchemaDriftError(auditError)) {
        throw auditError;
      }
      console.warn('Skipping injury submission audit due to schema mismatch:', auditError);
    }

    // Trigger automations in the background so submission success is not blocked
    void triggerAutomations(submissionId, 'ON_SUBMIT').catch((automationError) => {
      console.error('Background automation failed after submission:', {
        submissionId,
        error: automationError,
      });
    });

    return NextResponse.json({
      success: true,
      submissionId,
      message: template.thankYouMessage,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating injury submission:', error);
    return NextResponse.json(
      {
        error: 'Failed to submit form',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

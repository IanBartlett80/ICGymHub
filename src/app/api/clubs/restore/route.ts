import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/apiAuth';
import { verifyPassword } from '@/lib/auth';

// Helper: convert ISO date strings in a record to Date objects for Prisma
function convertDates(record: any): any {
  const result: any = {};
  for (const [key, value] of Object.entries(record)) {
    if (value !== null && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      result[key] = new Date(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// Helper: get set of IDs from backup records that don't exist in DB
async function getMissingIds(model: any, records: any[]): Promise<Set<string>> {
  if (!records?.length) return new Set();
  const ids = records.map((r: any) => r.id);
  const existing = await model.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((e: any) => e.id));
  return new Set(ids.filter((id: string) => !existingIds.has(id)));
}

// Shared: parse and validate backup from request
async function parseAndValidateBackup(request: NextRequest) {
  const { user, club } = await authenticateRequest(request);

  if (user.role !== 'ADMIN') {
    throw { status: 403, message: 'Admin access required' };
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const password = formData.get('password') as string | null;

  if (!file || !password) {
    throw { status: 400, message: 'Backup file and password are required' };
  }

  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });

  if (!fullUser) {
    throw { status: 404, message: 'User not found' };
  }

  const passwordValid = await verifyPassword(password, fullUser.passwordHash);
  if (!passwordValid) {
    throw { status: 401, message: 'Invalid password' };
  }

  const fileContent = await file.text();
  let backupData: any;

  try {
    backupData = JSON.parse(fileContent);
  } catch {
    throw { status: 400, message: 'Invalid backup file format' };
  }

  if (!backupData.version || !backupData.data || !backupData.clubId) {
    throw { status: 400, message: 'Invalid backup file structure' };
  }

  if (backupData.clubDomain !== club.domain) {
    throw { status: 403, message: 'This backup belongs to a different club and cannot be restored here' };
  }

  return { user, club, backupData };
}

// POST - Validate a backup file
export async function POST(request: NextRequest) {
  try {
    const { user, club, backupData } = await parseAndValidateBackup(request);

    // Audit log
    await prisma.auditLog.create({
      data: {
        clubId: club.id,
        userId: user.id,
        action: 'CLUB_RESTORE_VALIDATED',
        entityType: 'Club',
        entityId: club.id,
        changes: JSON.stringify({ backupDate: backupData.exportedAt }),
      },
    });

    const recordCount = Object.values(backupData.data).reduce(
      (sum: number, arr: any) => sum + (Array.isArray(arr) ? arr.length : 0), 0
    );

    return NextResponse.json({
      message: 'Backup validated successfully',
      summary: {
        exportedAt: backupData.exportedAt,
        clubName: backupData.clubName,
        recordCount,
        tables: Object.entries(backupData.data).map(([key, val]: [string, any]) => ({
          name: key,
          count: Array.isArray(val) ? val.length : 0,
        })),
      },
    });
  } catch (error: any) {
    console.error('Validation error:', error);
    if (error.status) {
      return NextResponse.json({ error: 'Request could not be processed' }, { status: error.status });
    }
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to process backup file' }, { status: 500 });
  }
}

// PUT - Execute restore: compare backup to current DB and recreate missing records
export async function PUT(request: NextRequest) {
  try {
    const { user, club, backupData } = await parseAndValidateBackup(request);

    const authenticatedClubId = user.clubId;
    const data = backupData.data;
    const restored: Record<string, number> = {};
    const errors: string[] = [];

    // Helper: restore simple (flat) records for a given model
    // CRITICAL: Force-override clubId on every record to the authenticated user's club
    async function restoreSimple(
      modelName: string,
      model: any,
      records: any[] | undefined,
    ) {
      if (!records?.length) return;
      const missingIds = await getMissingIds(model, records);
      if (missingIds.size === 0) return;
      let count = 0;
      for (const record of records) {
        if (!missingIds.has(record.id)) continue;
        try {
          const safeRecord = { ...convertDates(record), clubId: authenticatedClubId };
          await model.create({ data: safeRecord });
          count++;
        } catch (e: any) {
          errors.push(`${modelName} "${record.name || record.title || record.id}": ${e.message?.slice(0, 100)}`);
        }
      }
      if (count > 0) restored[modelName] = count;
    }

    // Audit log - restore started
    await prisma.auditLog.create({
      data: {
        clubId: club.id,
        userId: user.id,
        action: 'CLUB_RESTORE_STARTED',
        entityType: 'Club',
        entityId: club.id,
        changes: JSON.stringify({ backupDate: backupData.exportedAt }),
      },
    });

    // ── Restore in dependency order ──

    // 1. Gymsports (no FK deps beyond club)
    await restoreSimple('gymsports', prisma.gymsport, data.gymsports);

    // 2. Venues (no FK deps beyond club)
    await restoreSimple('venues', prisma.venue, data.venues);

    // 3. Zones (depends on Venue)
    await restoreSimple('zones', prisma.zone, data.zones);

    // 4. Coaches (no FK deps beyond club)
    await restoreSimple('coaches', prisma.coach, data.coaches);

    // 5. Equipment Categories
    await restoreSimple('equipmentCategories', prisma.equipmentCategory, data.equipmentCategories);

    // 6. Equipment (depends on Zone, Venue)
    await restoreSimple('equipment', prisma.equipment, data.equipment);

    // 7. Class Templates (depends on Gymsport, Venue)
    await restoreSimple('classTemplates', prisma.classTemplate, data.classTemplates);

    // 8. Class Sessions (depends on ClassTemplate, Venue)
    await restoreSimple('classSessions', prisma.classSession, data.classSessions);

    // 9. Roster Templates (depends on Venue)
    await restoreSimple('rosterTemplates', prisma.rosterTemplate, data.rosterTemplates);

    // 10. Rosters (depends on RosterTemplate, Venue)
    await restoreSimple('rosters', prisma.roster, data.rosters);

    // 11. Roster Slots (depends on Roster, ClassSession, Zone)
    await restoreSimple('rosterSlots', prisma.rosterSlot, data.rosterSlots);

    // 12. Compliance Categories (depends on Venue)
    await restoreSimple('complianceCategories', prisma.complianceCategory, data.complianceCategories);

    // 13. Compliance Items (depends on ComplianceCategory, Venue)
    await restoreSimple('complianceItems', prisma.complianceItem, data.complianceItems);

    // 14. Maintenance Tasks (depends on Equipment, Venue)
    await restoreSimple('maintenanceTasks', prisma.maintenanceTask, data.maintenanceTasks);

    // 15. Safety Issues (depends on Equipment, Venue)
    await restoreSimple('safetyIssues', prisma.safetyIssue, data.safetyIssues);

    // 16. Injury Form Templates (with nested sections, fields, automations)
    if (data.injuryFormTemplates?.length) {
      const missingIds = await getMissingIds(prisma.injuryFormTemplate, data.injuryFormTemplates);
      if (missingIds.size > 0) {
        let count = 0;
        for (const record of data.injuryFormTemplates) {
          if (!missingIds.has(record.id)) continue;
          try {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { sections, automations, fields, submissions, club: _c, venue: _v, ...templateData } = record;
            await prisma.injuryFormTemplate.create({ data: { ...convertDates(templateData), clubId: authenticatedClubId } });
            count++;

            // Restore sections and their fields
            if (sections?.length) {
              for (const section of sections) {
                try {
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const { fields: sectionFields, template: _t, ...sectionData } = section;
                  await prisma.injuryFormSection.create({ data: convertDates(sectionData) });
                  if (sectionFields?.length) {
                    for (const field of sectionFields) {
                      try {
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const { section: _s, template: _ft, submissionData: _sd, ...fieldData } = field;
                        await prisma.injuryFormField.create({ data: convertDates(fieldData) });
                      } catch (e: any) {
                        errors.push(`InjuryFormField "${field.label}": ${e.message?.slice(0, 100)}`);
                      }
                    }
                  }
                } catch (e: any) {
                  errors.push(`InjuryFormSection "${section.title}": ${e.message?.slice(0, 100)}`);
                }
              }
            }

            // Restore automations
            if (automations?.length) {
              for (const automation of automations) {
                try {
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const { template: _t, ...autoData } = automation;
                  await prisma.injuryFormAutomation.create({ data: convertDates(autoData) });
                } catch (e: any) {
                  errors.push(`InjuryFormAutomation "${automation.name}": ${e.message?.slice(0, 100)}`);
                }
              }
            }
          } catch (e: any) {
            errors.push(`InjuryFormTemplate "${record.name}": ${e.message?.slice(0, 100)}`);
          }
        }
        if (count > 0) restored.injuryFormTemplates = count;
      }
    }

    // 17. Injury Submissions (with nested data, comments)
    if (data.injurySubmissions?.length) {
      const missingIds = await getMissingIds(prisma.injurySubmission, data.injurySubmissions);
      if (missingIds.size > 0) {
        let count = 0;
        for (const record of data.injurySubmissions) {
          if (!missingIds.has(record.id)) continue;
          try {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { data: subData, comments, notifications: _n, assignedTo: _a, club: _c, equipment: _eq, template: _t, venue: _v, zone: _z, auditLog: _al, ...submissionFields } = record;
            await prisma.injurySubmission.create({ data: { ...convertDates(submissionFields), clubId: authenticatedClubId } });
            count++;

            // Restore submission data
            if (subData?.length) {
              for (const d of subData) {
                try {
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const { field: _f, submission: _s, ...dataFields } = d;
                  await prisma.injurySubmissionData.create({ data: convertDates(dataFields) });
                } catch (e: any) {
                  errors.push(`InjurySubmissionData: ${e.message?.slice(0, 100)}`);
                }
              }
            }

            // Restore comments
            if (comments?.length) {
              for (const comment of comments) {
                try {
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const { submission: _s, user: _u, ...commentFields } = comment;
                  await prisma.injurySubmissionComment.create({ data: convertDates(commentFields) });
                } catch (e: any) {
                  errors.push(`InjurySubmissionComment: ${e.message?.slice(0, 100)}`);
                }
              }
            }
          } catch (e: any) {
            errors.push(`InjurySubmission "${record.id}": ${e.message?.slice(0, 100)}`);
          }
        }
        if (count > 0) restored.injurySubmissions = count;
      }
    }

    const totalRestored = Object.values(restored).reduce((sum, count) => sum + count, 0);

    // Audit log - restore completed
    await prisma.auditLog.create({
      data: {
        clubId: club.id,
        userId: user.id,
        action: 'CLUB_RESTORE_COMPLETED',
        entityType: 'Club',
        entityId: club.id,
        changes: JSON.stringify({
          restored,
          totalRestored,
          backupDate: backupData.exportedAt,
          errorCount: errors.length,
        }),
      },
    });

    return NextResponse.json({
      message: totalRestored > 0
        ? `Successfully restored ${totalRestored} missing record${totalRestored !== 1 ? 's' : ''}`
        : 'No missing records found — your database is up to date with this backup',
      restored,
      totalRestored,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Restore execution error:', error);
    if (error.status) {
      return NextResponse.json({ error: 'Request could not be processed' }, { status: error.status });
    }
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to execute restore' }, { status: 500 });
  }
}

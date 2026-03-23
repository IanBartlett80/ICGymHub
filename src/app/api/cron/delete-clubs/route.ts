import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// This endpoint should be called by a cron job daily to permanently delete clubs
// that have passed their 30-day deletion period
// Secure this endpoint with a secret key in production

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret (for security)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'development-cron-secret';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find all clubs that are scheduled for deletion and past their deletion date
    const clubsToDelete = await prisma.club.findMany({
      where: {
        deletedAt: { not: null },
        deletionScheduledFor: {
          lte: new Date(), // Deletion date is in the past
        },
      },
      select: {
        id: true,
        name: true,
        deletionScheduledFor: true,
        deletedBy: true,
      },
    });

    if (clubsToDelete.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No clubs require deletion',
        deletedCount: 0,
      });
    }

    const deletedClubs: string[] = [];
    const errors: Array<{ clubId: string; clubName: string; error: string }> = [];

    // Process each club deletion
    for (const club of clubsToDelete) {
      try {
        console.log(`Permanently deleting club: ${club.name} (${club.id})`);

        // Create a final audit log before deletion
        await prisma.auditLog.create({
          data: {
            clubId: club.id,
            action: 'CLUB_PERMANENTLY_DELETED',
            entityType: 'Club',
            entityId: club.id,
            changes: JSON.stringify({
              clubName: club.name,
              deletedBy: club.deletedBy,
              scheduledDeletionDate: club.deletionScheduledFor,
              actualDeletionDate: new Date().toISOString(),
            }),
          },
        });

        // Permanently delete all club data
        // The CASCADE rules in the schema will handle most deletions
        // But we'll explicitly delete some tables to ensure clean removal
        
        await prisma.$transaction(async (tx) => {
          // Delete all related data
          // Note: Due to CASCADE rules, deleting the Club will automatically
          // delete all related records. However, we'll be explicit for safety.
          
          // Delete junction tables first
          await tx.injurySubmissionData.deleteMany({ 
            where: { submission: { clubId: club.id } } 
          });
          await tx.injurySubmissionComment.deleteMany({ 
            where: { submission: { clubId: club.id } } 
          });
          await tx.injurySubmissionAudit.deleteMany({ 
            where: { submission: { clubId: club.id } } 
          });
          await tx.injurySubmission.deleteMany({ where: { clubId: club.id } });
          
          await tx.injuryFormField.deleteMany({ 
            where: { template: { clubId: club.id } } 
          });
          await tx.injuryFormSection.deleteMany({ 
            where: { template: { clubId: club.id } } 
          });
          await tx.injuryFormAutomation.deleteMany({ 
            where: { template: { clubId: club.id } } 
          });
          await tx.injuryFormTemplate.deleteMany({ where: { clubId: club.id } });
          await tx.injuryNotification.deleteMany({ where: { clubId: club.id } });

          await tx.repairQuoteRequest.deleteMany({ where: { clubId: club.id } });
          await tx.safetyIssue.deleteMany({ where: { clubId: club.id } });
          await tx.maintenanceTask.deleteMany({ where: { clubId: club.id } });
          await tx.maintenanceLog.deleteMany({ where: { clubId: club.id } });
          await tx.equipmentUsage.deleteMany({ where: { clubId: club.id } });
          await tx.equipment.deleteMany({ where: { clubId: club.id } });
          await tx.equipmentCategory.deleteMany({ where: { clubId: club.id } });

          await tx.rosterSlot.deleteMany({ where: { clubId: club.id } });
          await tx.roster.deleteMany({ where: { clubId: club.id } });
          await tx.rosterTemplate.deleteMany({ where: { clubId: club.id } });
          await tx.rosterExport.deleteMany({ where: { clubId: club.id } });

          await tx.sessionCoach.deleteMany({ 
            where: { session: { clubId: club.id } } 
          });
          await tx.sessionAllowedZone.deleteMany({ 
            where: { session: { clubId: club.id } } 
          });
          await tx.classSession.deleteMany({ where: { clubId: club.id } });

          await tx.templateCoach.deleteMany({ 
            where: { template: { clubId: club.id } } 
          });
          await tx.templateAllowedZone.deleteMany({ 
            where: { template: { clubId: club.id } } 
          });
          await tx.classTemplate.deleteMany({ where: { clubId: club.id } });

          await tx.coachAvailability.deleteMany({ 
            where: { coach: { clubId: club.id } } 
          });
          await tx.coachGymsport.deleteMany({ 
            where: { coach: { clubId: club.id } } 
          });
          await tx.coach.deleteMany({ where: { clubId: club.id } });
          await tx.coachImportJob.deleteMany({ where: { clubId: club.id } });

          await tx.gymsport.deleteMany({ where: { clubId: club.id } });
          await tx.zone.deleteMany({ where: { clubId: club.id } });
          await tx.venue.deleteMany({ where: { clubId: club.id } });

          await tx.complianceItem.deleteMany({ where: { clubId: club.id } });
          await tx.complianceCategory.deleteMany({ where: { clubId: club.id } });

          await tx.passwordReset.deleteMany({ 
            where: { user: { clubId: club.id } } 
          });
          await tx.session.deleteMany({ where: { clubId: club.id } });
          await tx.emailVerification.deleteMany({ where: { clubId: club.id } });
          await tx.user.deleteMany({ where: { clubId: club.id } });

          await tx.clubBackup.deleteMany({ where: { clubId: club.id } });
          await tx.clubService.deleteMany({ where: { clubId: club.id } });
          await tx.clubDomain.deleteMany({ where: { clubId: club.id } });
          
          // Finally, delete audit logs and the club itself
          await tx.auditLog.deleteMany({ where: { clubId: club.id } });
          await tx.club.delete({ where: { id: club.id } });
        }, {
          maxWait: 30000,
          timeout: 120000, // 2 minutes timeout for large clubs
        });

        deletedClubs.push(`${club.name} (${club.id})`);
        console.log(`Successfully deleted club: ${club.name}`);

      } catch (error) {
        console.error(`Failed to delete club ${club.name}:`, error);
        errors.push({
          clubId: club.id,
          clubName: club.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${clubsToDelete.length} club(s) for deletion`,
      deletedCount: deletedClubs.length,
      deletedClubs,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('Failed to run club deletion cron:', error);
    return NextResponse.json(
      { 
        error: 'Failed to run club deletion cron',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

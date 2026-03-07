/**
 * Backfill Injury Submission Relations
 * 
 * This script extracts venue/zone/equipment IDs from InjurySubmissionData fields
 * and populates the venueId/zoneId/equipmentId columns in InjurySubmission table.
 * 
 * This is needed for submissions created before venue/zone/equipment were stored
 * as direct relations instead of just in the form data.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface FieldValue {
  value: string;
  displayValue?: string;
}

async function main() {
  console.log('Starting backfill of injury submission relations...');

  // Get all submissions
  const submissions = await prisma.injurySubmission.findMany({
    include: {
      data: {
        include: {
          field: true,
        },
      },
    },
  });

  console.log(`Found ${submissions.length} submissions to process`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const submission of submissions) {
    const updates: any = {};
    let needsUpdate = false;

    // Extract venue, zone, and equipment from data fields
    for (const dataItem of submission.data) {
      try {
        const parsedValue: FieldValue = JSON.parse(dataItem.value);
        const value = parsedValue.value;

        // Check if this is a venue field
        if (dataItem.field.label.toLowerCase().includes('venue') && value) {
          // Verify this is a valid venue ID
          const venue = await prisma.venue.findFirst({
            where: {
              id: value,
              clubId: submission.clubId,
            },
          });

          if (venue && !submission.venueId) {
            updates.venueId = venue.id;
            needsUpdate = true;
            console.log(`  - Found venue: ${venue.id}`);
          }
        }

        // Check if this is a zone field
        if ((dataItem.field.label.toLowerCase().includes('zone') || 
             dataItem.field.label.toLowerCase().includes('area')) && value) {
          const zone = await prisma.zone.findFirst({
            where: {
              id: value,
              clubId: submission.clubId,
            },
          });

          if (zone && !submission.zoneId) {
            updates.zoneId = zone.id;
            needsUpdate = true;
            console.log(`  - Found zone: ${zone.id}`);
          }
        }

        // Check if this is an equipment field
        if ((dataItem.field.label.toLowerCase().includes('equipment') || 
             dataItem.field.label.toLowerCase().includes('apparatus')) && value) {
          const equipment = await prisma.equipment.findFirst({
            where: {
              id: value,
              clubId: submission.clubId,
            },
          });

          if (equipment && !submission.equipmentId) {
            updates.equipmentId = equipment.id;
            needsUpdate = true;
            console.log(`  - Found equipment: ${equipment.id}`);
          }
        }
      } catch (err) {
        // Skip if value is not JSON or invalid
        continue;
      }
    }

    if (needsUpdate) {
      console.log(`Updating submission ${submission.id}:`, updates);
      await prisma.injurySubmission.update({
        where: { id: submission.id },
        data: updates,
      });
      updatedCount++;
    } else {
      skippedCount++;
    }
  }

  console.log('\nBackfill complete!');
  console.log(`Updated: ${updatedCount} submissions`);
  console.log(`Skipped: ${skippedCount} submissions (already had relations or no data to extract)`);
}

main()
  .catch((e) => {
    console.error('Error during backfill:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

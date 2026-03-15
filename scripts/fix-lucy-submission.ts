/**
 * Fix Lucy Bartlett's submission to have proper Gym Sport display value
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixSubmission() {
  try {
    console.log('🔧 Fixing Lucy Bartlett\'s submission...\n');

    // Get the submission
    const submission = await prisma.injurySubmission.findFirst({
      where: {
        id: 'cmmr9ozdo000vdxj50jbtgllx',
      },
      include: {
        data: {
          include: {
            field: true,
          },
        },
      },
    });

    if (!submission) {
      console.log('❌ Submission not found');
      return;
    }

    // Get the gym sport field
    const gymSportField = submission.data.find(d => d.field.label === 'Gym Sport');
    
    if (!gymSportField) {
      console.log('❌ Gym Sport field not found in submission');
      return;
    }

    // Get the actual gym sport name
    const gymSport = await prisma.gymsport.findUnique({
      where: {
        id: 'cmm8r83v60003pk5psjf8o9yg',
      },
    });

    if (!gymSport) {
      console.log('❌ Gym Sport not found in database');
      return;
    }

    console.log(`✅ Found Gym Sport: ${gymSport.name} (${gymSport.id})\n`);

    // Update the submission data
    const updatedValue = {
      value: gymSport.id,
      displayValue: gymSport.name,
      id: gymSport.id,
      name: gymSport.name,
    };

    await prisma.injurySubmissionData.update({
      where: {
        id: gymSportField.id,
      },
      data: {
        value: JSON.stringify(updatedValue),
      },
    });

    console.log(`✅ Updated submission data:`);
    console.log(`   Before: ${gymSportField.value}`);
    console.log(`   After: ${JSON.stringify(updatedValue)}\n`);

    // Also update the Class field if it exists
    const classField = submission.data.find(d => d.field.label === 'Class');
    if (classField) {
      const classValue = JSON.parse(classField.value);
      
      // If it's just a string/ID, try to find the class
      if (typeof classValue.value === 'string' || typeof classValue.displayValue === 'string') {
        const classTemplate = await prisma.classTemplate.findFirst({
          where: {
            OR: [
              { id: classValue.value },
              { name: classValue.displayValue },
            ],
          },
        });

        if (classTemplate) {
          const updatedClassValue = {
            value: classTemplate.id,
            displayValue: classTemplate.name,
            id: classTemplate.id,
            name: classTemplate.name,
            gymsportId: classTemplate.gymsportId,
          };

          await prisma.injurySubmissionData.update({
            where: {
              id: classField.id,
            },
            data: {
              value: JSON.stringify(updatedClassValue),
            },
          });

          console.log(`✅ Also updated Class field:`);
          console.log(`   Before: ${classField.value}`);
          console.log(`   After: ${JSON.stringify(updatedClassValue)}\n`);
        }
      }
    }

    console.log('✅ Submission fixed! Now the automation should trigger for this submission.\n');
    console.log('💡 To manually trigger the automation for this submission, run:');
    console.log('   npx tsx -e "import {triggerAutomations} from \'./src/lib/automationEngine\'; triggerAutomations(\'cmmr9ozdo000vdxj50jbtgllx\', \'ON_SUBMIT\')"');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSubmission();

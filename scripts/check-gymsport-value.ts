/**
 * Check the gym sport value in the latest submission
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkGymSportValue() {
  try {
    // Get the latest submission with all data
    const submission = await prisma.injurySubmission.findFirst({
      where: {
        id: 'cmmr9ozdo000vdxj50jbtgllx', // Lucy Bartlett's submission
      },
      include: {
        data: {
          include: {
            field: true,
          },
        },
        template: {
          include: {
            automations: true,
          },
        },
      },
    });

    if (!submission) {
      console.log('❌ Submission not found');
      return;
    }

    console.log('📝 Submission Data:\n');
    
    // Find Gym Sport field
    const gymSportData = submission.data.find(d => d.field.label === 'Gym Sport');
    
    if (gymSportData) {
      console.log('🏃 Gym Sport Field:');
      console.log(`   Field Label: ${gymSportData.field.label}`);
      console.log(`   Field ID: ${gymSportData.fieldId}`);
      console.log(`   Raw Value: ${gymSportData.value}`);
      
      const parsedValue = JSON.parse(gymSportData.value);
      console.log(`   Parsed Value:`, parsedValue);
    } else {
      console.log('❌ No Gym Sport field found in submission data');
    }

    // Check the automation trigger type
    console.log('\n\n📋 Automation Details:\n');
    
    const automation = await prisma.injuryFormAutomation.findFirst({
      where: {
        id: 'cmmr9n4rv0001116ovprl0vn2', // MAG Automation
      },
    });

    if (automation) {
      console.log(`Automation: ${automation.name}`);
      console.log(`Active: ${automation.active}`);
      console.log(`Trigger Type: ${automation.triggerType || '❌ NULL/UNDEFINED'}`);
      console.log(`Trigger Conditions: ${automation.triggerConditions}`);
      console.log(`Actions: ${automation.actions}`);
    }

    // Look up the gym sport by ID to see what MAG's ID is
    console.log('\n\n🔍 Looking up Gym Sports:\n');
    
    const gymsports = await prisma.gymsport.findMany({
      where: {
        OR: [
          { id: 'cmm8r83v60003pk5psjf8o9yg' },
          { name: { contains: 'MAG', mode: 'insensitive' } },
        ],
      },
    });

    gymsports.forEach(gs => {
      console.log(`  ${gs.name}: ${gs.id}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGymSportValue();

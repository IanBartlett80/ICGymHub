/**
 * Fix MAG Automation and update gym sport display values
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixMagAutomation() {
  try {
    console.log('🔧 Fixing MAG Automation issues...\n');

    // Issue 1: Fix the automation triggerType
    console.log('1️⃣ Setting triggerType to ON_SUBMIT...');
    
    const automation = await prisma.injuryFormAutomation.update({
      where: {
        id: 'cmmr9n4rv0001116ovprl0vn2',
      },
      data: {
        triggerType: 'ON_SUBMIT',
      },
    });
    
    console.log('   ✅ Automation triggerType updated\n');

    // Issue 2: Update the automation condition to check the gym sport ID
    // Since the gym sport is stored as an ID, we need to get the MAG gym sport ID
    const magGymSport = await prisma.gymsport.findFirst({
      where: {
        id: 'cmm8r83v60003pk5psjf8o9yg', // The ID from the submission
      },
    });

    if (magGymSport) {
      console.log(`2️⃣ Found MAG Gym Sport: ${magGymSport.name} (${magGymSport.id})`);
      console.log('   Automation will check for ID: cmm8r83v60003pk5psjf8o9yg\n');
      
      // Update the trigger condition to use the ID
      const triggerConditions = {
        trigger: 'ON_SUBMIT',
        conditions: [
          {
            field: '_gymsport',
            operator: 'equals',
            value: 'cmm8r83v60003pk5psjf8o9yg', // Use the ID instead of name
          },
        ],
        logic: 'AND',
      };

      await prisma.injuryFormAutomation.update({
        where: {
          id: 'cmmr9n4rv0001116ovprl0vn2',
        },
        data: {
          triggerConditions: JSON.stringify(triggerConditions),
        },
      });
      
      console.log('   ✅ Updated automation condition to match gym sport ID\n');
    }

    // Issue 3: Check if we need to update the submission data to include proper display values
    console.log('3️⃣ Checking if we need to update submission display values...');
    
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

    if (submission) {
      const gymSportData = submission.data.find(d => d.field.label === 'Gym Sport');
      
      if (gymSportData && magGymSport) {
        const currentValue = JSON.parse(gymSportData.value);
        const updatedValue = {
          value: magGymSport.id,
          displayValue: magGymSport.name, // Fix the display value
          id: magGymSport.id,
          name: magGymSport.name,
        };

        await prisma.injurySubmissionData.update({
          where: {
            id: gymSportData.id,
          },
          data: {
            value: JSON.stringify(updatedValue),
          },
        });
        
        console.log(`   ✅ Updated Lucy Bartlett's submission to show "${magGymSport.name}" instead of ID\n`);
      }
    }

    console.log('✅ All fixes complete!\n');
    console.log('📝 Summary:');
    console.log('   - Trigger type set to ON_SUBMIT');
    console.log('   - Automation condition updated to match gym sport ID');
    console.log('   - Submission display value fixed');
    console.log('\n💡 Next submission for MAG should trigger the automation');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMagAutomation();

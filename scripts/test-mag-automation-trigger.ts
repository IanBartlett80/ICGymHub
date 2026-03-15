/**
 * Test if automation will now trigger for MAG submissions
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAutomation() {
  try {
    console.log('🧪 Testing MAG Automation triggering...\n');

    // Get the latest MAG submission
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
            automations: {
              where: { active: true },
            },
          },
        },
      },
    });

    if (!submission) {
      console.log('❌ Submission not found');
      return;
    }

    console.log('📝 Submission Details:');
    console.log(`   ID: ${submission.id}`);
    console.log(`   Template: ${submission.template.name}`);
    console.log(`   Status: ${submission.status}\n`);

    // Check gym sport field
    const gymSportField = submission.data.find(d => d.field.label === 'Gym Sport');
    if (gymSportField) {
      const parsedValue = JSON.parse(gymSportField.value);
      console.log('🏃 Gym Sport Field Value:');
      console.log(`   Raw: ${gymSportField.value}`);
      console.log(`   Parsed:`, parsedValue);
      console.log(`   displayValue: ${parsedValue.displayValue}`);
      console.log(`   value: ${parsedValue.value}\n`);
    }

    // Check automation
    const automation = submission.template.automations[0];
    if (automation) {
      console.log('⚙️ Automation Details:');
      console.log(`   Name: ${automation.name}`);
      console.log(`   Active: ${automation.active}`);
      
      const triggerConditions = JSON.parse(automation.triggerConditions);
      console.log(`\n   Trigger: ${triggerConditions.trigger}`);
      console.log(`   Conditions:`);
      triggerConditions.conditions?.forEach((cond: any) => {
        console.log(`      - Field: ${cond.field}`);
        console.log(`        Operator: ${cond.operator}`);
        console.log(`        Expected Value: "${cond.value}"`);
      });
      
      // Simulate condition evaluation
      console.log(`\n🔍 Condition Evaluation:`);
      if (gymSportField) {
        const parsedValue = JSON.parse(gymSportField.value);
        const condition = triggerConditions.conditions[0];
        
        console.log(`   Checking if Gym Sport matches "${condition.value}"...`);
        console.log(`   Submission has:`);
        console.log(`      - value: ${parsedValue.value}`);
        console.log(`      - displayValue: ${parsedValue.displayValue}`);
        console.log(`      - name: ${parsedValue.name}`);
        
        const matchesDisplayValue = parsedValue.displayValue === condition.value;
        const matchesName = parsedValue.name === condition.value;
        const matchesValue = parsedValue.value === condition.value;
        
        console.log(`\n   Match Results:`);
        console.log(`      - displayValue === "MAG": ${matchesDisplayValue ? '✅' : '❌'}`);
        console.log(`      - name === "MAG": ${matchesName ? '✅' : '❌'}`);
        console.log(`      - value === "MAG": ${matchesValue ? '✅' : '❌'}`);
        
        if (matchesDisplayValue || matchesName || matchesValue) {
          console.log(`\n   ✅ AUTOMATION SHOULD TRIGGER!`);
        } else {
          console.log(`\n   ❌ Automation will NOT trigger`);
          console.log(`   💡 Suggestion: Update automation condition to use ID: ${parsedValue.value}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAutomation();

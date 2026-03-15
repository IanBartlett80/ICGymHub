/**
 * Debug script to check MAG Automation and recent submission
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugAutomation() {
  try {
    console.log('🔍 Checking recent injury submissions...\n');

    // Get the most recent submission
    const recentSubmissions = await prisma.injurySubmission.findMany({
      take: 5,
      orderBy: { submittedAt: 'desc' },
      include: {
        template: {
          select: { name: true, id: true },
        },
        data: {
          include: {
            field: {
              select: { label: true },
            },
          },
        },
      },
    });

    console.log(`Found ${recentSubmissions.length} recent submission(s):\n`);
    
    for (const sub of recentSubmissions) {
      console.log(`📝 Submission ID: ${sub.id}`);
      console.log(`   Template: ${sub.template.name} (${sub.templateId})`);
      console.log(`   Status: ${sub.status}`);
      console.log(`   Priority: ${sub.priority || 'Not set'}`);
      console.log(`   Submitted: ${sub.submittedAt}`);
      
      // Find athlete name and gym sport
      const athleteNameField = sub.data.find(d => d.field.label === 'Athlete Name');
      const gymSportField = sub.data.find(d => d.field.label === 'Gym Sport');
      
      if (athleteNameField) {
        const value = JSON.parse(athleteNameField.value);
        console.log(`   Athlete: ${value.value || value.displayValue || 'Unknown'}`);
      }
      
      if (gymSportField) {
        const value = JSON.parse(gymSportField.value);
        console.log(`   Gym Sport: ${value.displayValue || value.name || value.value || 'Unknown'}`);
      }
      
      console.log('');
    }

    // Get MAG Automation
    console.log('\n🔍 Checking MAG Automation...\n');
    
    const magAutomations = await prisma.injuryFormAutomation.findMany({
      where: {
        name: {
          contains: 'MAG',
          mode: 'insensitive',
        },
      },
      include: {
        template: {
          select: { name: true, id: true },
        },
      },
    });

    if (magAutomations.length === 0) {
      console.log('❌ No automation found with "MAG" in the name');
    } else {
      for (const automation of magAutomations) {
        console.log(`📋 Automation: ${automation.name} (${automation.id})`);
        console.log(`   Template: ${automation.template.name} (${automation.templateId})`);
        console.log(`   Active: ${automation.active}`);
        console.log(`   Trigger: ${automation.triggerType}`);
        console.log(`   Execution Count: ${automation.executionCount}`);
        console.log(`   Last Executed: ${automation.lastExecuted || 'Never'}`);
        
        // Parse trigger conditions
        const conditions = JSON.parse(automation.triggerConditions);
        console.log(`\n   📌 Trigger Conditions:`);
        console.log(`      Logic: ${conditions.logic || 'AND'}`);
        console.log(`      Conditions:`);
        conditions.conditions?.forEach((cond: any, idx: number) => {
          console.log(`         ${idx + 1}. Field: ${cond.field}`);
          console.log(`            Operator: ${cond.operator}`);
          console.log(`            Value: ${cond.value}`);
        });
        
        // Parse actions
        const actions = JSON.parse(automation.actions);
        console.log(`\n   ⚙️ Actions (${actions.actions?.length || 0}):`);
        actions.actions?.forEach((action: any, idx: number) => {
          console.log(`      ${idx + 1}. Type: ${action.type}`);
          if (action.type === 'SEND_EMAIL') {
            console.log(`         Recipients: ${action.config?.recipients?.join(', ') || 'Not configured'}`);
            console.log(`         Subject: ${action.config?.subject || 'Not configured'}`);
          }
        });
        
        // Check legacy email config
        if (automation.emailRecipients) {
          console.log(`\n   📧 Legacy Email Config:`);
          console.log(`      Recipients: ${automation.emailRecipients}`);
          console.log(`      Subject: ${automation.emailSubject || 'Not set'}`);
        }
        
        console.log('');
      }
    }

    // Check if the most recent submission matches the MAG automation template
    if (recentSubmissions.length > 0 && magAutomations.length > 0) {
      const latestSub = recentSubmissions[0];
      const magAuto = magAutomations[0];
      
      console.log('\n🔄 Matching Check:');
      console.log(`   Latest submission template: ${latestSub.templateId}`);
      console.log(`   MAG automation template: ${magAuto.templateId}`);
      console.log(`   Match: ${latestSub.templateId === magAuto.templateId ? '✅ YES' : '❌ NO'}`);
      
      if (latestSub.templateId === magAuto.templateId) {
        console.log('\n   ⚠️  Templates match but automation did not trigger!');
        console.log('   Possible reasons:');
        console.log('   1. Automation is inactive');
        console.log('   2. Trigger conditions not met');
        console.log('   3. Error during automation execution');
        console.log('   4. Trigger type mismatch (check if it\'s ON_SUBMIT)');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugAutomation();

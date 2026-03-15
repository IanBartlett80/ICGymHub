import { prisma } from '../src/lib/prisma';

/**
 * This script fixes automations that have email configuration in database columns
 * but are missing the SEND_EMAIL action in the actions JSON array.
 * 
 * This is a data migration to fix legacy automations created before the fix.
 */
async function fixAutomationActions() {
  console.log('\n🔧 Starting automation fix...\n');

  const automations = await prisma.injuryFormAutomation.findMany({
    where: {
      OR: [
        { emailRecipients: { not: null } },
        { emailSubject: { not: null } },
        { emailTemplate: { not: null } },
      ],
    },
  });

  console.log(`Found ${automations.length} automation(s) with email configuration\n`);

  let fixedCount = 0;
  let skippedCount = 0;

  for (const automation of automations) {
    const actions = JSON.parse(automation.actions);
    const hasSendEmailAction = actions.actions?.some((a: any) => a.type === 'SEND_EMAIL');

    if (!hasSendEmailAction && automation.emailRecipients) {
      console.log(`\n📧 Fixing automation: ${automation.name} (${automation.id})`);
      console.log(`   Email Recipients: ${automation.emailRecipients}`);
      console.log(`   Email Subject: ${automation.emailSubject}`);
      
      // Add SEND_EMAIL action to the actions array
      const updatedActions = {
        ...actions,
        actions: [
          ...(actions.actions || []),
          {
            type: 'SEND_EMAIL',
            config: {
              recipients: JSON.parse(automation.emailRecipients),
              subject: automation.emailSubject,
              body: automation.emailTemplate,
            },
          },
        ],
      };

      await prisma.injuryFormAutomation.update({
        where: { id: automation.id },
        data: {
          actions: JSON.stringify(updatedActions),
        },
      });

      console.log(`   ✅ Added SEND_EMAIL action to actions array`);
      fixedCount++;
    } else {
      console.log(`\n⏭️  Skipping automation: ${automation.name} (${automation.id})`);
      if (hasSendEmailAction) {
        console.log(`   Already has SEND_EMAIL action`);
      } else {
        console.log(`   No email configuration to fix`);
      }
      skippedCount++;
    }
  }

  console.log(`\n\n✨ Fix complete!`);
  console.log(`   Fixed: ${fixedCount} automation(s)`);
  console.log(`   Skipped: ${skippedCount} automation(s)`);
  console.log(`\n`);

  await prisma.$disconnect();
}

fixAutomationActions().catch((error) => {
  console.error('Error fixing automations:', error);
  process.exit(1);
});

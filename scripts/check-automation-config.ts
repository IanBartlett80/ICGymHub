import { prisma } from '../src/lib/prisma';

async function checkAutomations() {
  const automations = await prisma.injuryFormAutomation.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      actions: true,
      emailRecipients: true,
      emailSubject: true,
      emailTemplate: true,
      triggerConditions: true,
      executionCount: true,
      lastExecuted: true,
    },
  });

  console.log('\n=== ACTIVE AUTOMATIONS ===\n');
  
  for (const auto of automations) {
    console.log(`\nAutomation: ${auto.name} (${auto.id})`);
    console.log(`Executed: ${auto.executionCount} times`);
    console.log(`Last executed: ${auto.lastExecuted || 'Never'}`);
    
    const actions = JSON.parse(auto.actions);
    console.log(`\nActions in JSON:`, JSON.stringify(actions, null, 2));
    
    console.log(`\nEmail Config in Database:`);
    console.log(`  Recipients: ${auto.emailRecipients}`);
    console.log(`  Subject: ${auto.emailSubject}`);
    console.log(`  Template: ${auto.emailTemplate?.substring(0, 50)}...`);
    
    const hasSendEmailAction = actions.actions?.some((a: any) => a.type === 'SEND_EMAIL');
    console.log(`\n✅ Has SEND_EMAIL action in actions JSON: ${hasSendEmailAction}`);
    
    if (!hasSendEmailAction && auto.emailRecipients) {
      console.log(`\n⚠️  WARNING: Email config exists in DB columns but NO SEND_EMAIL action in actions JSON!`);
      console.log(`   This means emails will NOT be sent even though the automation executes.`);
    }
  }
  
  await prisma.$disconnect();
}

checkAutomations().catch(console.error);

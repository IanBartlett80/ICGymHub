import { testEmailConnection, sendEmail } from '../src/lib/email';

async function testEmailSetup() {
  console.log('\n📧 Testing Email Configuration...\n');
  
  console.log('Environment Variables:');
  console.log(`  AZURE_TENANT_ID: ${process.env.AZURE_TENANT_ID ? '✅ Set' : '❌ Not set'}`);
  console.log(`  AZURE_CLIENT_ID: ${process.env.AZURE_CLIENT_ID ? '✅ Set' : '❌ Not set'}`);
  console.log(`  AZURE_CLIENT_SECRET: ${process.env.AZURE_CLIENT_SECRET ? '✅ Set' : '❌ Not set'}`);
  console.log(`  AZURE_SENDER_EMAIL: ${process.env.AZURE_SENDER_EMAIL || process.env.SMTP_FROM_EMAIL || '❌ Not set'}`);
  console.log(`  SMTP_HOST: ${process.env.SMTP_HOST ? '✅ Set' : '❌ Not set'}`);
  console.log(`  SMTP_USER: ${process.env.SMTP_USER ? '✅ Set' : '❌ Not set'}\n`);

  console.log('Testing email connection...\n');
  
  try {
    const result = await testEmailConnection();
    console.log('✅ Email connection test:', result);
  } catch (error) {
    console.error('❌ Email connection failed:', error);
    return;
  }

  console.log('\nSending test email to rohankennedy@me.com...\n');
  
  try {
    const result = await sendEmail({
      to: 'rohankennedy@me.com',
      subject: 'ICGymHub Test - Email Automation Test',
      htmlContent: '<h1>Test Email</h1><p>This is a test email from the ICGymHub automation system.</p><p>If you received this, email sending is working correctly!</p>',
    });
    console.log('✅ Test email sent successfully:', result);
  } catch (error) {
    console.error('❌ Failed to send test email:', error);
  }
}

testEmailSetup().catch(console.error);

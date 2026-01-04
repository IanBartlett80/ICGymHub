import nodemailer from 'nodemailer'
import { ClientSecretCredential } from '@azure/identity'
import { Client } from '@microsoft/microsoft-graph-client'
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials'

type EmailProvider = 'smtp' | 'graph'

function getEmailProvider(): EmailProvider {
  // Use Microsoft Graph if Entra credentials are provided
  if (process.env.AZURE_TENANT_ID && process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET) {
    return 'graph'
  }
  // Fall back to SMTP
  return 'smtp'
}

interface EmailConfig {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
}

function getEmailConfig(): EmailConfig {
  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !port || !user || !pass) {
    throw new Error('SMTP configuration is incomplete. Please check your environment variables.')
  }

  return {
    host,
    port: parseInt(port, 10),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user,
      pass,
    },
  }
}

let transporter: nodemailer.Transporter | null = null
let graphClient: Client | null = null

function getGraphClient() {
  if (!graphClient) {
    const tenantId = process.env.AZURE_TENANT_ID
    const clientId = process.env.AZURE_CLIENT_ID
    const clientSecret = process.env.AZURE_CLIENT_SECRET

    if (!tenantId || !clientId || !clientSecret) {
      throw new Error('Azure Entra configuration is incomplete. Please check your environment variables.')
    }

    const credential = new ClientSecretCredential(tenantId, clientId, clientSecret)
    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
      scopes: ['https://graph.microsoft.com/.default'],
    })

    graphClient = Client.initWithMiddleware({ authProvider })
  }
  return graphClient
}

function getTransporter() {
  if (!transporter) {
    const config = getEmailConfig()
    transporter = nodemailer.createTransport(config)
  }
  return transporter
}

interface SendVerificationEmailParams {
  to: string
  clubName: string
  verificationToken: string
  appUrl: string
}

export async function sendVerificationEmail({
  to,
  clubName,
  verificationToken,
  appUrl,
}: SendVerificationEmailParams) {
  const provider = getEmailProvider()
  
  if (provider === 'graph') {
    return await sendEmailViaGraph({ to, clubName, verificationToken, appUrl })
  } else {
    return await sendEmailViaSMTP({ to, clubName, verificationToken, appUrl })
  }
}

async function sendEmailViaGraph({
  to,
  clubName,
  verificationToken,
  appUrl,
}: SendVerificationEmailParams) {
  const verificationLink = `${appUrl}/verify-email?token=${verificationToken}`
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.AZURE_SENDER_EMAIL

  if (!fromEmail) {
    throw new Error('Sender email is not configured (SMTP_FROM_EMAIL or AZURE_SENDER_EMAIL)')
  }

  const emailContent = getEmailHtmlContent(clubName, verificationLink)

  const message = {
    subject: `Verify Your Email - ${clubName}`,
    body: {
      contentType: 'HTML',
      content: emailContent,
    },
    from: {
      emailAddress: {
        address: fromEmail,
      },
    },
    toRecipients: [
      {
        emailAddress: {
          address: to,
        },
      },
    ],
  }

  try {
    const client = getGraphClient()
    // Use /users/{email}/sendMail endpoint with explicit from address
    await client.api(`/users/${fromEmail}/sendMail`).post({
      message,
      saveToSentItems: false,
    })
    console.log(`✅ Verification email sent via Microsoft Graph to ${to}`)
    return { success: true, provider: 'graph' }
  } catch (error) {
    console.error('❌ Failed to send email via Microsoft Graph:', error)
    throw error
  }
}

async function sendEmailViaSMTP({
  to,
  clubName,
  verificationToken,
  appUrl,
}: SendVerificationEmailParams) {
  const verificationLink = `${appUrl}/verify-email?token=${verificationToken}`
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER

  if (!fromEmail) {
    throw new Error('SMTP_FROM_EMAIL is not configured')
  }

  const emailContent = getEmailHtmlContent(clubName, verificationLink)

  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME || 'ICGymHub'}" <${fromEmail}>`,
    to,
    subject: `Verify Your Email - ${clubName}`,
    html: emailContent,
    text: getEmailTextContent(clubName, verificationLink),
  }

  try {
    const transporter = getTransporter()
    const info = await transporter.sendMail(mailOptions)
    console.log('✅ Verification email sent via SMTP:', info.messageId)
    return { success: true, messageId: info.messageId, provider: 'smtp' }
  } catch (error) {
    console.error('❌ Failed to send verification email via SMTP:', error)
    throw error
  }
}

function getEmailHtmlContent(clubName: string, verificationLink: string): string {
  return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 40px 0; text-align: center;">
              <table role="presentation" style="width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <tr>
                  <td style="padding: 40px 30px; text-align: center; background-color: #2563eb; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Welcome to ICGymHub!</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="margin: 0 0 20px; font-size: 16px; color: #333333; line-height: 1.5;">
                      Hi there,
                    </p>
                    <p style="margin: 0 0 20px; font-size: 16px; color: #333333; line-height: 1.5;">
                      Thank you for registering <strong>${clubName}</strong> with ICGymHub. To complete your registration and activate your club account, please verify your email address.
                    </p>
                    <table role="presentation" style="margin: 30px 0;">
                      <tr>
                        <td style="text-align: center;">
                          <a href="${verificationLink}" style="display: inline-block; padding: 14px 40px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
                            Verify Email Address
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 20px 0; font-size: 14px; color: #666666; line-height: 1.5;">
                      Or copy and paste this link into your browser:
                    </p>
                    <p style="margin: 0 0 20px; font-size: 14px; color: #2563eb; word-break: break-all;">
                      ${verificationLink}
                    </p>
                    <p style="margin: 20px 0 0; font-size: 14px; color: #666666; line-height: 1.5;">
                      This verification link will expire in <strong>24 hours</strong>.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 30px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
                    <p style="margin: 0; font-size: 12px; color: #666666;">
                      If you didn't create an account with ICGymHub, you can safely ignore this email.
                    </p>
                    <p style="margin: 10px 0 0; font-size: 12px; color: #666666;">
                      © ${new Date().getFullYear()} ICGymHub. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
}

function getEmailTextContent(clubName: string, verificationLink: string): string {
  return `
Welcome to ICGymHub!

Thank you for registering ${clubName} with ICGymHub.

To complete your registration and activate your club account, please verify your email address by clicking the link below:

${verificationLink}

This verification link will expire in 24 hours.

If you didn't create an account with ICGymHub, you can safely ignore this email.

© ${new Date().getFullYear()} ICGymHub. All rights reserved.
    `.trim()
}

// Test email configuration
export async function testEmailConnection() {
  const provider = getEmailProvider()
  
  try {
    if (provider === 'graph') {
      const client = getGraphClient()
      // Test by getting user profile
      const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.AZURE_SENDER_EMAIL
      if (!fromEmail) {
        throw new Error('Sender email not configured')
      }
      await client.api(`/users/${fromEmail}`).get()
      console.log('✅ Microsoft Graph API connection verified successfully')
      return { success: true, provider: 'graph' }
    } else {
      const transporter = getTransporter()
      await transporter.verify()
      console.log('✅ SMTP connection verified successfully')
      return { success: true, provider: 'smtp' }
    }
  } catch (error) {
    console.error(`❌ Email connection failed (${provider}):`, error)
    throw error
  }
}

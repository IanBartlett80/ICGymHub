import nodemailer from 'nodemailer'
import { ClientSecretCredential } from '@azure/identity'
import { Client } from '@microsoft/microsoft-graph-client'
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials'

type EmailProvider = 'smtp' | 'graph'

const GYMHUB_LOGO_URL = 'https://longhornfloorplans.blob.core.windows.net/client-resources/GymHub_Logo.png'

/**
 * Generates the standard GymHub email logo header row for use in all branded emails.
 */
export function getLogoHeaderHtml(): string {
  return `<tr>
  <td style="padding: 20px 30px; text-align: center; background-color: #ffffff;">
    <img src="${GYMHUB_LOGO_URL}" alt="GymHub" width="180" style="display: block; margin: 0 auto; max-width: 180px; height: auto;" />
  </td>
</tr>`
}

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
                ${getLogoHeaderHtml()}
                <tr>
                  <td style="padding: 30px 30px 40px; text-align: center; background-color: #2563eb;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Welcome to GymHub!</h1>
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

// Generic email sending function
interface SendEmailParams {
  to: string
  subject: string
  htmlContent: string
  textContent?: string
}

export async function sendEmail({
  to,
  subject,
  htmlContent,
  textContent,
}: SendEmailParams) {
  const provider = getEmailProvider()
  
  if (provider === 'graph') {
    return await sendGenericEmailViaGraph({ to, subject, htmlContent })
  } else {
    return await sendGenericEmailViaSMTP({ to, subject, htmlContent, textContent })
  }
}

async function sendGenericEmailViaGraph({
  to,
  subject,
  htmlContent,
}: SendEmailParams) {
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.AZURE_SENDER_EMAIL

  if (!fromEmail) {
    throw new Error('Sender email is not configured (SMTP_FROM_EMAIL or AZURE_SENDER_EMAIL)')
  }

  const message = {
    subject,
    body: {
      contentType: 'HTML',
      content: htmlContent,
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
    await client.api(`/users/${fromEmail}/sendMail`).post({
      message,
      saveToSentItems: false,
    })
    console.log(`✅ Email sent via Microsoft Graph to ${to}`)
    return { success: true, provider: 'graph' }
  } catch (error) {
    console.error('❌ Failed to send email via Microsoft Graph:', error)
    throw error
  }
}

// Password Reset Email
interface SendPasswordResetEmailParams {
  to: string
  resetToken: string
  appUrl: string
}

export async function sendPasswordResetEmail({
  to,
  resetToken,
  appUrl,
}: SendPasswordResetEmailParams) {
  const resetLink = `${appUrl}/reset-password?token=${resetToken}`
  const htmlContent = getPasswordResetHtmlContent(resetLink)
  const textContent = getPasswordResetTextContent(resetLink)

  return sendEmail({
    to,
    subject: 'Reset Your Password - ICGymHub',
    htmlContent,
    textContent,
  })
}

function getPasswordResetHtmlContent(resetLink: string): string {
  return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 40px 0; text-align: center;">
              <table role="presentation" style="width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                ${getLogoHeaderHtml()}
                <tr>
                  <td style="padding: 30px 30px 40px; text-align: center; background-color: #2563eb;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Reset Your Password</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="margin: 0 0 20px; font-size: 16px; color: #333333; line-height: 1.5;">
                      Hi there,
                    </p>
                    <p style="margin: 0 0 20px; font-size: 16px; color: #333333; line-height: 1.5;">
                      We received a request to reset your ICGymHub password. Click the button below to choose a new password.
                    </p>
                    <table role="presentation" style="margin: 30px 0;">
                      <tr>
                        <td style="text-align: center;">
                          <a href="${resetLink}" style="display: inline-block; padding: 14px 40px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
                            Reset Password
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 20px 0; font-size: 14px; color: #666666; line-height: 1.5;">
                      Or copy and paste this link into your browser:
                    </p>
                    <p style="margin: 0 0 20px; font-size: 14px; color: #2563eb; word-break: break-all;">
                      ${resetLink}
                    </p>
                    <p style="margin: 20px 0 0; font-size: 14px; color: #666666; line-height: 1.5;">
                      This link will expire in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email — your password will remain unchanged.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 30px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
                    <p style="margin: 0; font-size: 12px; color: #666666;">
                      If you didn't request this password reset, you can safely ignore this email.
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

function getPasswordResetTextContent(resetLink: string): string {
  return `
Reset Your Password

Hi there,

We received a request to reset your ICGymHub password. Click the link below to choose a new password:

${resetLink}

This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email — your password will remain unchanged.

© ${new Date().getFullYear()} ICGymHub. All rights reserved.
    `.trim()
}

// Welcome Email - sent after email verification
interface SendWelcomeEmailParams {
  to: string
  clubName: string
  domain: string
  abn: string | null
  address: string
  city: string
  state: string
  postalCode: string
  phone: string
  adminFullName: string
  username: string
}

export async function sendWelcomeEmail(params: SendWelcomeEmailParams) {
  const htmlContent = getWelcomeHtmlContent(params)
  const textContent = getWelcomeTextContent(params)

  return sendEmail({
    to: params.to,
    subject: `Welcome to GymHub, ${params.clubName}!`,
    htmlContent,
    textContent,
  })
}

function getWelcomeHtmlContent(p: SendWelcomeEmailParams): string {
  return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to GymHub</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 40px 0; text-align: center;">
              <table role="presentation" style="width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                ${getLogoHeaderHtml()}
                <tr>
                  <td style="padding: 30px 30px 40px; text-align: center; background-color: #2563eb;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Welcome to GymHub!</h1>
                    <p style="margin: 8px 0 0; color: #bfdbfe; font-size: 16px;">Your club is now active</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="margin: 0 0 20px; font-size: 16px; color: #333333; line-height: 1.5;">
                      Hi ${p.adminFullName},
                    </p>
                    <p style="margin: 0 0 20px; font-size: 16px; color: #333333; line-height: 1.5;">
                      Congratulations! <strong>${p.clubName}</strong> has been successfully registered and activated on GymHub. Here is a summary of your registration details.
                    </p>

                    <h2 style="margin: 30px 0 10px; font-size: 18px; color: #333; border-bottom: 1px solid #eee; padding-bottom: 8px;">Club Details</h2>
                    <table style="width: 100%; margin-bottom: 20px; font-size: 14px;">
                      <tr><td style="padding: 6px 8px; color: #666; width: 40%;">Club Name</td><td style="padding: 6px 8px; color: #333; font-weight: 600;">${p.clubName}</td></tr>
                      <tr><td style="padding: 6px 8px; color: #666;">Domain</td><td style="padding: 6px 8px; color: #333;">${p.domain}</td></tr>
                      ${p.abn ? `<tr><td style="padding: 6px 8px; color: #666;">ABN</td><td style="padding: 6px 8px; color: #333;">${p.abn}</td></tr>` : ''}
                    </table>

                    <h2 style="margin: 30px 0 10px; font-size: 18px; color: #333; border-bottom: 1px solid #eee; padding-bottom: 8px;">Location</h2>
                    <table style="width: 100%; margin-bottom: 20px; font-size: 14px;">
                      <tr><td style="padding: 6px 8px; color: #666; width: 40%;">Address</td><td style="padding: 6px 8px; color: #333;">${p.address}</td></tr>
                      <tr><td style="padding: 6px 8px; color: #666;">City</td><td style="padding: 6px 8px; color: #333;">${p.city}</td></tr>
                      <tr><td style="padding: 6px 8px; color: #666;">State</td><td style="padding: 6px 8px; color: #333;">${p.state}</td></tr>
                      <tr><td style="padding: 6px 8px; color: #666;">Postal Code</td><td style="padding: 6px 8px; color: #333;">${p.postalCode}</td></tr>
                      <tr><td style="padding: 6px 8px; color: #666;">Phone</td><td style="padding: 6px 8px; color: #333;">${p.phone}</td></tr>
                    </table>

                    <h2 style="margin: 30px 0 10px; font-size: 18px; color: #333; border-bottom: 1px solid #eee; padding-bottom: 8px;">Your Admin Account</h2>
                    <table style="width: 100%; margin-bottom: 20px; font-size: 14px;">
                      <tr><td style="padding: 6px 8px; color: #666; width: 40%;">Full Name</td><td style="padding: 6px 8px; color: #333;">${p.adminFullName}</td></tr>
                      <tr><td style="padding: 6px 8px; color: #666;">Username</td><td style="padding: 6px 8px; color: #333; font-weight: 600;">${p.username}</td></tr>
                    </table>

                    <div style="margin: 30px 0; padding: 16px; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px;">
                      <p style="margin: 0 0 8px; font-size: 14px; color: #1e40af; font-weight: 600;">Getting Started</p>
                      <p style="margin: 0; font-size: 14px; color: #1e40af; line-height: 1.5;">
                        Sign in at <a href="https://gymhub.club/sign-in" style="color: #2563eb; font-weight: 600;">gymhub.club/sign-in</a> using the username shown above to start setting up your club — add venues, zones, coaches, and equipment.
                      </p>
                    </div>

                    <p style="margin: 20px 0 0; font-size: 14px; color: #666666; line-height: 1.5;">
                      If you have any questions, reach out to us at <a href="mailto:GymHub@icb.solutions" style="color: #2563eb;">GymHub@icb.solutions</a>.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 30px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
                    <p style="margin: 0; font-size: 12px; color: #666666;">
                      © ${new Date().getFullYear()} GymHub. All rights reserved.
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

function getWelcomeTextContent(p: SendWelcomeEmailParams): string {
  return `
Welcome to GymHub!

Hi ${p.adminFullName},

Congratulations! ${p.clubName} has been successfully registered and activated on GymHub.

Club Details
- Club Name: ${p.clubName}
- Domain: ${p.domain}${p.abn ? `\n- ABN: ${p.abn}` : ''}

Location
- Address: ${p.address}
- City: ${p.city}
- State: ${p.state}
- Postal Code: ${p.postalCode}
- Phone: ${p.phone}

Your Admin Account
- Full Name: ${p.adminFullName}
- Username: ${p.username}

Getting Started
Sign in at https://gymhub.club/sign-in using your username to start setting up your club.

If you have any questions, reach out to us at GymHub@icb.solutions.

© ${new Date().getFullYear()} GymHub. All rights reserved.
  `.trim()
}

async function sendGenericEmailViaSMTP({
  to,
  subject,
  htmlContent,
  textContent,
}: SendEmailParams) {
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER

  if (!fromEmail) {
    throw new Error('SMTP_FROM_EMAIL is not configured')
  }

  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME || 'ICGymHub'}" <${fromEmail}>`,
    to,
    subject,
    html: htmlContent,
    text: textContent || htmlContent.replace(/<[^>]*>/g, ''), // Strip HTML if no text provided
  }

  try {
    const transporter = getTransporter()
    const info = await transporter.sendMail(mailOptions)
    console.log('✅ Email sent via SMTP:', info.messageId)
    return { success: true, messageId: info.messageId, provider: 'smtp' }
  } catch (error) {
    console.error('❌ Failed to send email via SMTP:', error)
    throw error
  }
}

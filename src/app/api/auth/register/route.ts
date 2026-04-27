import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { clubRegistrationSchema, validateDomainMatch, isConsumerEmail, normalizeDomain } from '@/lib/validation'
import { sendVerificationEmail, sendEmail } from '@/lib/email'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const forwardedProto = req.headers.get('x-forwarded-proto')
    const forwardedHost = req.headers.get('x-forwarded-host')
    const host = req.headers.get('host')
    const requestOrigin = forwardedHost
      ? `${forwardedProto || 'https'}://${forwardedHost}`
      : host
      ? `${forwardedProto || 'https'}://${host}`
      : null
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || requestOrigin

    if (!appUrl) {
      return NextResponse.json(
        { error: 'Application base URL is not configured' },
        { status: 500 }
      )
    }

    // Validate input
    const result = clubRegistrationSchema.safeParse(body)
    if (!result.success) {
      const flat = result.error.flatten()
      const firstMessage = flat.fieldErrors && Object.values(flat.fieldErrors)[0]?.[0]
      return NextResponse.json(
        { error: firstMessage || 'Invalid input. Please review the form fields.' },
        { status: 400 }
      )
    }

    const {
      clubName,
      abn,
      clubDomain,
      address,
      city,
      state,
      postalCode,
      phone,
      adminFullName,
      adminEmail,
      adminUsername,
      adminPassword,
    } = result.data

    // Payment fields come from the request body (not Zod-validated, optional)
    const agreeToPayment = body.agreeToPayment === true
    const paymentSkipped = body.paymentSkipped === true

    const normalizedClubDomain = normalizeDomain(clubDomain) || clubDomain
    const domainForUse = normalizedClubDomain

    // Create full username with domain: username@domain
    const fullUsername = `${adminUsername}@${domainForUse}`

    // Check for duplicate club (name or domain or ABN if provided)
    const clubOrConditions: any[] = [
      { name: clubName },
      { domain: domainForUse },
    ]
    
    if (abn) {
      clubOrConditions.push({ abn })
    }

    const existingClub = await prisma.club.findFirst({
      where: {
        OR: clubOrConditions,
      },
    })

    if (existingClub) {
      if (existingClub.name === clubName) {
        return NextResponse.json(
          { error: 'A club with this name already exists' },
          { status: 409 }
        )
      }
      if (existingClub.domain === domainForUse) {
        return NextResponse.json(
          { error: 'A club with this domain already exists' },
          { status: 409 }
        )
      }
      if (abn && existingClub.abn === abn) {
        return NextResponse.json(
          { error: 'A club with this ABN already exists' },
          { status: 409 }
        )
      }
    }

    // Check for duplicate username (globally unique across all clubs)
    const existingUsername = await prisma.user.findFirst({
      where: { username: fullUsername },
    })

    if (existingUsername) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 409 }
      )
    }

    // Validate email/domain match - allow consumer emails with note
    const isDomainMatch = validateDomainMatch(adminEmail, domainForUse)
    const isConsumer = isConsumerEmail(adminEmail)

    if (!isDomainMatch && !isConsumer) {
      return NextResponse.json(
        { error: 'Email domain does not match club domain. Please use an email matching your club domain or a consumer email provider.' },
        { status: 400 }
      )
    }

    // Create club and user in transaction
    const hashedPassword = await hashPassword(adminPassword)
    const clubSlug = clubName.toLowerCase().replace(/\s+/g, '-')
    let verificationToken: string | null = null

    // Calculate trial end date (30 days from now)
    const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    // Determine payment status
    let paymentStatus = 'NONE'
    if (agreeToPayment) {
      paymentStatus = 'AGREED'
    } else if (paymentSkipped) {
      paymentStatus = 'SKIPPED'
    }

    const clubData: Parameters<typeof prisma.club.create>[0]['data'] = {
      name: clubName,
      slug: clubSlug,
      abn: null as any, // optional; overwritten when provided
      domain: domainForUse,
      address,
      city,
      state,
      postalCode,
      phone,
      status: 'PENDING_VERIFICATION',
      timezone: 'Australia/Sydney',
      paymentStatus,
      paymentAgreedAt: agreeToPayment ? new Date() : null,
      trialEndsAt: agreeToPayment ? trialEndsAt : null,
      monthlyRateAud: 100,
      users: {
        create: {
          email: adminEmail,
          username: fullUsername,
          passwordHash: hashedPassword,
          fullName: adminFullName,
          role: 'ADMIN',
        },
      },
      clubDomains: {
        create: {
          domain: domainForUse,
          verified: false, // All domains require verification (consumer or business)
        },
      },
    }

    if (abn) {
      // Only set ABN when provided to avoid unique constraint conflicts on null
      ;(clubData as any).abn = abn
    }

    const club = await prisma.club.create({
      data: clubData,
      include: {
        users: true,
      },
    })

    // Create email verification token for ALL registrations (consumer and business)
    verificationToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex')

    const user = club.users[0]

    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        clubId: club.id,
        email: adminEmail,
        tokenHash,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    })

    // Send verification email to all users (consumer or business)
    try {
      await sendVerificationEmail({
        to: adminEmail,
        clubName,
        verificationToken,
        appUrl,
      })
      console.log(`✅ Verification email sent to ${adminEmail}`)
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError)
      // Don't fail registration if email fails - user can resend
    }

    // Initialize club services
    const services = ['roster', 'incident', 'equipment', 'icscore', 'maintenance']
    for (const serviceKey of services) {
      let service = await prisma.service.findUnique({
        where: { key: serviceKey },
      })
      if (!service) {
        service = await prisma.service.create({
          data: {
            key: serviceKey,
            name: serviceKey.charAt(0).toUpperCase() + serviceKey.slice(1),
          },
        })
      }
      await prisma.clubService.create({
        data: {
          clubId: club.id,
          serviceId: service.id,
          enabled: true,
        },
      })
    }

    // Send new registration notification email to GymHub admin
    try {
      const registrationDate = new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f4f4f4;">
          <table role="presentation" style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:40px 0;text-align:center;">
                <table role="presentation" style="width:600px;margin:0 auto;background-color:#ffffff;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="padding:30px;text-align:center;background-color:#2563eb;border-radius:8px 8px 0 0;">
                      <h1 style="margin:0;color:#ffffff;font-size:24px;">New Club Registration</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:30px;">
                      <p style="margin:0 0 20px;font-size:14px;color:#666;">Registered: ${registrationDate} (AEST)</p>

                      <h2 style="margin:0 0 10px;font-size:18px;color:#333;border-bottom:1px solid #eee;padding-bottom:8px;">Club Details</h2>
                      <table style="width:100%;margin-bottom:20px;font-size:14px;">
                        <tr><td style="padding:4px 8px;color:#666;width:40%;">Club Name</td><td style="padding:4px 8px;color:#333;font-weight:600;">${clubName}</td></tr>
                        <tr><td style="padding:4px 8px;color:#666;">Domain</td><td style="padding:4px 8px;color:#333;">${domainForUse}</td></tr>
                        <tr><td style="padding:4px 8px;color:#666;">ABN</td><td style="padding:4px 8px;color:#333;">${abn || 'Not provided'}</td></tr>
                      </table>

                      <h2 style="margin:0 0 10px;font-size:18px;color:#333;border-bottom:1px solid #eee;padding-bottom:8px;">Location</h2>
                      <table style="width:100%;margin-bottom:20px;font-size:14px;">
                        <tr><td style="padding:4px 8px;color:#666;width:40%;">Address</td><td style="padding:4px 8px;color:#333;">${address}</td></tr>
                        <tr><td style="padding:4px 8px;color:#666;">City</td><td style="padding:4px 8px;color:#333;">${city}</td></tr>
                        <tr><td style="padding:4px 8px;color:#666;">State</td><td style="padding:4px 8px;color:#333;">${state}</td></tr>
                        <tr><td style="padding:4px 8px;color:#666;">Postal Code</td><td style="padding:4px 8px;color:#333;">${postalCode}</td></tr>
                        <tr><td style="padding:4px 8px;color:#666;">Phone</td><td style="padding:4px 8px;color:#333;">${phone}</td></tr>
                      </table>

                      <h2 style="margin:0 0 10px;font-size:18px;color:#333;border-bottom:1px solid #eee;padding-bottom:8px;">Admin Account</h2>
                      <table style="width:100%;margin-bottom:20px;font-size:14px;">
                        <tr><td style="padding:4px 8px;color:#666;width:40%;">Full Name</td><td style="padding:4px 8px;color:#333;">${adminFullName}</td></tr>
                        <tr><td style="padding:4px 8px;color:#666;">Email</td><td style="padding:4px 8px;color:#333;">${adminEmail}</td></tr>
                        <tr><td style="padding:4px 8px;color:#666;">Username</td><td style="padding:4px 8px;color:#333;">${fullUsername}</td></tr>
                      </table>

                      <h2 style="margin:0 0 10px;font-size:18px;color:#333;border-bottom:1px solid #eee;padding-bottom:8px;">Payment</h2>
                      <table style="width:100%;margin-bottom:20px;font-size:14px;">
                        <tr><td style="padding:4px 8px;color:#666;width:40%;">Payment Status</td><td style="padding:4px 8px;color:#333;font-weight:600;">${agreeToPayment ? 'Agreed to $100/month' : 'Skipped'}</td></tr>
                        <tr><td style="padding:4px 8px;color:#666;">Trial Ends</td><td style="padding:4px 8px;color:#333;">${agreeToPayment ? trialEndsAt.toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney' }) : 'N/A'}</td></tr>
                        <tr><td style="padding:4px 8px;color:#666;">Club ID</td><td style="padding:4px 8px;color:#333;font-family:monospace;font-size:12px;">${club.id}</td></tr>
                      </table>

                      <div style="margin-top:20px;padding:12px;background-color:#fef3c7;border:1px solid #f59e0b;border-radius:6px;">
                        <p style="margin:0;font-size:13px;color:#92400e;"><strong>Action Required:</strong> Please set up the billing account for this club.</p>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:20px;background-color:#f9fafb;border-radius:0 0 8px 8px;text-align:center;">
                      <p style="margin:0;font-size:12px;color:#666;">© ${new Date().getFullYear()} GymHub. Automated registration notification.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `

      await sendEmail({
        to: 'GymHub@icb.solutions',
        subject: 'NEW CLUB REGISTRATION',
        htmlContent,
      })
      console.log(`✅ Registration notification email sent for ${clubName}`)
    } catch (emailNotifyError) {
      // Don't fail registration if notification email fails
      console.error('Failed to send registration notification email:', emailNotifyError)
    }

    return NextResponse.json(
      {
        message: 'Club registered successfully',
        clubId: club.id,
        requiresEmailVerification: true,
        note: isConsumer 
          ? 'Please check your email to verify your account. Consumer email addresses (Gmail, Yahoo, etc.) must also be verified.'
          : 'Please check your email to verify your account and club domain.',
        verificationLink: `${appUrl}/verify-email?token=${verificationToken}`,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'An error occurred during registration. Please try again.' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { clubRegistrationSchema, validateDomainMatch, isConsumerEmail, normalizeDomain } from '@/lib/validation'
import { sendVerificationEmail } from '@/lib/email'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

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
          verified: isConsumer, // Auto-verify consumer domains; require verification for club domains
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

    // Create email verification token if needed
    if (!isConsumer) {
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

      // Send verification email
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
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

    return NextResponse.json(
      {
        message: 'Club registered successfully',
        clubId: club.id,
        requiresEmailVerification: !isConsumer,
        note: isConsumer ? 'Email verified automatically. Your club is pending domain verification.' : 'Please check your email to verify your club domain.',
        verificationLink: !isConsumer ? `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${verificationToken}` : undefined, // Development only
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

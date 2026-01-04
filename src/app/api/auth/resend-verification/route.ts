import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendVerificationEmail } from '@/lib/email'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findFirst({
      where: { email },
      include: { club: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'No account found with this email' },
        { status: 404 }
      )
    }

    // Check if club is already verified
    if (user.club.status === 'ACTIVE') {
      return NextResponse.json(
        { error: 'This club is already verified' },
        { status: 400 }
      )
    }

    // Create new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex')

    // Delete old verification if exists
    await prisma.emailVerification.deleteMany({
      where: {
        userId: user.id,
      },
    })

    // Create new verification record
    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        clubId: user.clubId,
        email: user.email,
        tokenHash,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    })

    // Send verification email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    try {
      await sendVerificationEmail({
        to: user.email,
        clubName: user.club.name,
        verificationToken,
        appUrl,
      })
      console.log(`✅ Verification email sent to ${email}`)
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError)
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again later.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: 'Verification email sent successfully',
        email: user.email,
        note: 'Check your email for the verification link. It will expire in 24 hours.',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Resend verification error:', error)
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}

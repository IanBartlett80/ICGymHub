import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashToken } from '@/lib/auth'
import { sendPasswordResetEmail } from '@/lib/email'

const TOKEN_EXPIRY_MS = 60 * 60 * 1000 // 1 hour

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, username } = body

    if (!email || !username) {
      return NextResponse.json(
        { error: 'Email and username are required' },
        { status: 400 }
      )
    }

    // Always return success to prevent user enumeration
    const successResponse = NextResponse.json({
      message: 'If an account exists with that email and username, a password reset link has been sent.',
    })

    // Find user by both email and username
    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        username: username.trim(),
        isActive: true,
      },
      include: { club: true },
    })

    if (!user || user.club.status !== 'ACTIVE') {
      // Return same response to prevent enumeration
      return successResponse
    }

    // Invalidate any existing unused reset tokens for this user
    await prisma.passwordReset.updateMany({
      where: {
        userId: user.id,
        consumedAt: null,
      },
      data: {
        consumedAt: new Date(), // Mark as consumed
      },
    })

    // Generate a secure token
    const crypto = require('crypto')
    const rawToken = crypto.randomBytes(48).toString('base64url')
    const tokenHash = hashToken(rawToken)

    // Store the hashed token
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + TOKEN_EXPIRY_MS),
      },
    })

    // Send password reset email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gymhub.club'
    console.log(`[forgot-password] Sending reset email to ${user.email} for user ${user.username} (id: ${user.id})`)
    try {
      const result = await sendPasswordResetEmail({
        to: user.email,
        resetToken: rawToken,
        appUrl,
      })
      console.log(`[forgot-password] Email sent successfully:`, result)
    } catch (emailError) {
      console.error('[forgot-password] Failed to send password reset email:', emailError)
      return NextResponse.json(
        { error: 'Unable to send reset email. Please try again or contact support.' },
        { status: 500 }
      )
    }

    return successResponse
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashToken, hashPassword } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, password } = body

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and new password are required' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }
    if (!/[A-Z]/.test(password)) {
      return NextResponse.json(
        { error: 'Password must contain an uppercase letter' },
        { status: 400 }
      )
    }
    if (!/[a-z]/.test(password)) {
      return NextResponse.json(
        { error: 'Password must contain a lowercase letter' },
        { status: 400 }
      )
    }
    if (!/[0-9]/.test(password)) {
      return NextResponse.json(
        { error: 'Password must contain a number' },
        { status: 400 }
      )
    }

    // Hash the incoming token and look it up
    const tokenHash = hashToken(token)

    const passwordReset = await prisma.passwordReset.findUnique({
      where: { tokenHash },
      include: { user: true },
    })

    if (!passwordReset) {
      return NextResponse.json(
        { error: 'Invalid or expired reset link. Please request a new one.' },
        { status: 400 }
      )
    }

    // Check if already consumed
    if (passwordReset.consumedAt) {
      return NextResponse.json(
        { error: 'This reset link has already been used. Please request a new one.' },
        { status: 400 }
      )
    }

    // Check expiration
    if (passwordReset.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'This reset link has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    // Hash the new password
    const passwordHash = await hashPassword(password)

    // Update user password, reset login attempts, and mark token as consumed
    await prisma.$transaction([
      prisma.user.update({
        where: { id: passwordReset.userId },
        data: {
          passwordHash,
          loginAttempts: 0,
          lockedUntil: null,
        },
      }),
      prisma.passwordReset.update({
        where: { id: passwordReset.id },
        data: { consumedAt: new Date() },
      }),
      // Invalidate all existing sessions for this user (force re-login)
      prisma.session.deleteMany({
        where: { userId: passwordReset.userId },
      }),
    ])

    return NextResponse.json({
      message: 'Password has been reset successfully. You can now sign in with your new password.',
    })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}

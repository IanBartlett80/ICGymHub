import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, generateTokens } from '@/lib/auth'
import { loginSchema } from '@/lib/validation'

const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Validate input
    const result = loginSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { errors: result.error.flatten() },
        { status: 400 }
      )
    }

    const { username, password } = result.data

    // Find user by username
    const user = await prisma.user.findFirst({
      where: { username },
      include: { club: true },
    })

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }

    // Check if user is locked out
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return NextResponse.json(
        { error: 'Account is locked. Please try again later.' },
        { status: 401 }
      )
    }

    // Check if club is active
    if (user.club.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Your club account is not active. Please contact support.' },
        { status: 401 }
      )
    }

    // Verify password
    const passwordMatch = await verifyPassword(password, user.passwordHash)
    if (!passwordMatch) {
      // Increment login attempts
      const newAttempts = user.loginAttempts + 1
      const shouldLockout = newAttempts >= MAX_LOGIN_ATTEMPTS

      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: newAttempts,
          lockedUntil: shouldLockout ? new Date(Date.now() + LOCKOUT_DURATION) : null,
        },
      })

      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }

    // Generate tokens
    const tokens = generateTokens({
      userId: user.id,
      clubId: user.clubId,
      username: user.username,
    })

    // Create session
    await prisma.session.create({
      data: {
        userId: user.id,
        clubId: user.clubId,
        refreshToken: require('crypto')
          .createHash('sha256')
          .update(tokens.refreshToken)
          .digest('hex'),
        expiresAt: new Date(Date.now() + parseInt(process.env.SESSION_MAX_AGE || '3600') * 1000),
      },
    })

    // Reset login attempts and update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        lastLogin: new Date(),
      },
    })

    const response = NextResponse.json(
      {
        message: 'Login successful',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          clubId: user.clubId,
          clubName: user.club.name,
        },
        tokens,
      },
      { status: 200 }
    )

    // Set secure HTTP-only cookies
    response.cookies.set('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: parseInt(process.env.SESSION_MAX_AGE || '3600'),
    })

    response.cookies.set('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'An error occurred during login. Please try again.' },
      { status: 500 }
    )
  }
}

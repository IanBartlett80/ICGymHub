import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyRefreshToken, generateTokens, hashToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    // Get refresh token from cookie
    const refreshToken = req.cookies.get('refreshToken')?.value

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token provided' },
        { status: 401 }
      )
    }

    // Verify the refresh token
    const payload = verifyRefreshToken(refreshToken)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 }
      )
    }

    // Hash the refresh token to find it in the database
    const hashedRefreshToken = hashToken(refreshToken)

    // Find the session in the database
    const session = await prisma.session.findUnique({
      where: { refreshToken: hashedRefreshToken },
      include: { user: { include: { club: true } } },
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 401 }
      )
    }

    // Check if session has expired
    if (session.expiresAt < new Date()) {
      // Delete expired session
      await prisma.session.delete({
        where: { id: session.id },
      })

      return NextResponse.json(
        { error: 'Session expired' },
        { status: 401 }
      )
    }

    // Check if user is still active
    if (!session.user.isActive || session.user.club.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'User or club account is not active' },
        { status: 401 }
      )
    }

    // Generate new tokens
    const newTokens = generateTokens({
      userId: session.userId,
      clubId: session.clubId,
      username: session.user.username,
    })

    // Update session with new refresh token hash and expiration
    await prisma.session.update({
      where: { id: session.id },
      data: {
        refreshToken: hashToken(newTokens.refreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    })

    const response = NextResponse.json(
      {
        message: 'Token refreshed successfully',
        user: {
          id: session.user.id,
          username: session.user.username,
          email: session.user.email,
          fullName: session.user.fullName,
          role: session.user.role,
          clubId: session.user.clubId,
          clubName: session.user.club.name,
          clubTimezone: session.user.club.timezone,
          paymentStatus: session.user.club.paymentStatus,
          paymentCancelledAt: session.user.club.paymentCancelledAt,
        },
        tokens: newTokens,
      },
      { status: 200 }
    )

    // Set new secure HTTP-only cookies
    response.cookies.set('accessToken', newTokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: parseInt(process.env.SESSION_MAX_AGE || '3600'),
    })

    response.cookies.set('refreshToken', newTokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })

    return response
  } catch (error) {
    console.error('Token refresh error:', error)
    return NextResponse.json(
      { error: 'An error occurred during token refresh' },
      { status: 500 }
    )
  }
}

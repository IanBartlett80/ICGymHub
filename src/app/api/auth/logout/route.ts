import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    // Get refresh token from cookie
    const refreshToken = req.cookies.get('refreshToken')?.value

    if (refreshToken) {
      // Hash the refresh token to find it in the database
      const hashedRefreshToken = hashToken(refreshToken)

      // Delete the session from database
      await prisma.session.deleteMany({
        where: { refreshToken: hashedRefreshToken },
      })
    }

    // Create response
    const response = NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    )

    // Clear cookies
    response.cookies.delete('accessToken')
    response.cookies.delete('refreshToken')

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'An error occurred during logout' },
      { status: 500 }
    )
  }
}

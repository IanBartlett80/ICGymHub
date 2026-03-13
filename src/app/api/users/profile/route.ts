import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken, hashPassword, verifyPassword } from '@/lib/auth'

// Helper function to get access token from Authorization header or cookie
function getAccessToken(req: NextRequest): string | null {
  const headerToken = req.headers.get('authorization')
  if (headerToken?.startsWith('Bearer ')) {
    return headerToken.replace('Bearer ', '').trim()
  }
  const cookieToken = req.cookies.get('accessToken')?.value
  return cookieToken || null
}

export async function PATCH(request: NextRequest) {
  try {
    // Get and verify token
    const token = getAccessToken(request)
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      )
    }

    const payload = verifyAccessToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { fullName, email, username, currentPassword, newPassword } = body

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        passwordHash: true,
        clubId: true,
        club: {
          select: {
            name: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {}

    // Update full name if provided
    if (fullName && fullName !== user.fullName) {
      updateData.fullName = fullName
    }

    // Update email if provided and different
    if (email && email !== user.email) {
      // Check if email is already taken by another user
      const existingEmail = await prisma.user.findFirst({
        where: {
          email: email,
          id: { not: user.id }
        }
      })

      if (existingEmail) {
        return NextResponse.json(
          { error: 'Email address is already in use' },
          { status: 400 }
        )
      }

      updateData.email = email
    }

    // Update username if provided and user is an admin
    if (username && username !== user.username) {
      if (user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Only administrators can change their username' },
          { status: 403 }
        )
      }

      // Check if username is already taken
      const existingUsername = await prisma.user.findFirst({
        where: {
          username: username,
          id: { not: user.id }
        }
      })

      if (existingUsername) {
        return NextResponse.json(
          { error: 'Username is already taken' },
          { status: 400 }
        )
      }

      updateData.username = username
    }

    // Handle password change
    if (newPassword) {
      // Validate that current password was provided
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Current password is required to change password' },
          { status: 400 }
        )
      }

      // Verify current password
      const isValidPassword = await verifyPassword(currentPassword, user.passwordHash)
      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 400 }
        )
      }

      // Validate new password
      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: 'New password must be at least 6 characters' },
          { status: 400 }
        )
      }

      // Hash and update password
      updateData.passwordHash = await hashPassword(newPassword)
    }

    // If nothing to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        message: 'No changes detected',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          clubId: user.clubId,
          clubName: user.club.name
        }
      })
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        clubId: true,
        club: {
          select: {
            name: true
          }
        }
      }
    })

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        role: updatedUser.role,
        clubId: updatedUser.clubId,
        clubName: updatedUser.club.name
      }
    })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}

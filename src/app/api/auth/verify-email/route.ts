import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      )
    }

    // Hash the token to compare with stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    // Find the verification record
    const verification = await prisma.emailVerification.findUnique({
      where: { tokenHash },
      include: {
        user: true,
        club: true,
      },
    })

    if (!verification) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 404 }
      )
    }

    // Check if token has expired
    if (verification.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Verification token has expired. Please request a new one.' },
        { status: 410 }
      )
    }

    // Check if already consumed
    if (verification.consumedAt) {
      return NextResponse.json(
        { error: 'This verification token has already been used' },
        { status: 400 }
      )
    }

    // Mark club as ACTIVE and verification as consumed
    await prisma.$transaction([
      prisma.club.update({
        where: { id: verification.clubId },
        data: { status: 'ACTIVE' },
      }),
      prisma.emailVerification.update({
        where: { id: verification.id },
        data: { consumedAt: new Date() },
      }),
    ])

    return NextResponse.json(
      {
        message: 'Email verified successfully! Your club is now active.',
        clubId: verification.clubId,
        clubName: verification.club.name,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.json(
      { error: 'An error occurred during verification. Please try again.' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// POST - Verify QR PIN for a club (public endpoint - no auth required)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clubId, pin } = body;

    // Validate inputs
    if (!clubId || !pin) {
      return NextResponse.json(
        { error: 'Club ID and PIN are required' },
        { status: 400 }
      );
    }

    // Validate PIN format
    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { error: 'Invalid PIN format', verified: false },
        { status: 400 }
      );
    }

    // Fetch club with PIN
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: {
        id: true,
        name: true,
        qrAccessPin: true,
      },
    });

    if (!club) {
      return NextResponse.json(
        { error: 'Club not found', verified: false },
        { status: 404 }
      );
    }

    // If no PIN set, allow access (backward compatible)
    if (!club.qrAccessPin) {
      return NextResponse.json({
        verified: true,
        clubId: club.id,
        clubName: club.name,
        noPinRequired: true,
      });
    }

    // Verify PIN
    const isValid = await bcrypt.compare(pin, club.qrAccessPin);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Incorrect PIN', verified: false },
        { status: 401 }
      );
    }

    return NextResponse.json({
      verified: true,
      clubId: club.id,
      clubName: club.name,
    });
  } catch (error) {
    console.error('Failed to verify QR PIN:', error);
    return NextResponse.json(
      { error: 'Failed to verify PIN', verified: false },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

function getAccessToken(req: NextRequest): string | null {
  const headerToken = req.headers.get('authorization');
  if (headerToken?.startsWith('Bearer ')) {
    return headerToken.replace('Bearer ', '').trim();
  }
  const cookieToken = req.cookies.get('accessToken')?.value;
  return cookieToken || null;
}

async function getAuthenticatedUser(req: NextRequest) {
  const token = getAccessToken(req);
  if (!token) return null;
  return await verifyAccessToken(token);
}

// GET - Check if club has QR PIN configured
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    
    if (!user?.clubId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const club = await prisma.club.findUnique({
      where: { id: user.clubId },
      select: {
        qrAccessPin: true,
        qrPinUpdatedAt: true,
      },
    });

    if (!club) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 });
    }

    return NextResponse.json({
      hasPin: !!club.qrAccessPin,
      lastUpdated: club.qrPinUpdatedAt,
    });
  } catch (error) {
    console.error('Failed to check QR PIN:', error);
    return NextResponse.json(
      { error: 'Failed to check QR PIN' },
      { status: 500 }
    );
  }
}

// POST - Set or update QR PIN (ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const tokenPayload = await getAuthenticatedUser(request);
    
    if (!tokenPayload?.clubId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with role to check admin status
    const user = await prisma.user.findUnique({
      where: { id: tokenPayload.userId },
      select: { id: true, role: true, clubId: true },
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { pin } = body;

    // Validate PIN format (must be exactly 4 digits)
    if (!pin || !/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { error: 'PIN must be exactly 4 digits' },
        { status: 400 }
      );
    }

    // Hash the PIN
    const hashedPin = await bcrypt.hash(pin, 10);

    // Update the club with hashed PIN
    await prisma.club.update({
      where: { id: user.clubId },
      data: {
        qrAccessPin: hashedPin,
        qrPinUpdatedAt: new Date(),
        // Clear any existing reset tokens
        qrPinResetToken: null,
        qrPinResetTokenExpiry: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'QR Access PIN updated successfully',
    });
  } catch (error) {
    console.error('Failed to update QR PIN:', error);
    return NextResponse.json(
      { error: 'Failed to update QR PIN' },
      { status: 500 }
    );
  }
}

// DELETE - Remove QR PIN (ADMIN only)
export async function DELETE(request: NextRequest) {
  try {
    const tokenPayload = await getAuthenticatedUser(request);
    
    if (!tokenPayload?.clubId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with role to check admin status
    const user = await prisma.user.findUnique({
      where: { id: tokenPayload.userId },
      select: { id: true, role: true, clubId: true },
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await prisma.club.update({
      where: { id: user.clubId },
      data: {
        qrAccessPin: null,
        qrPinUpdatedAt: null,
        qrPinResetToken: null,
        qrPinResetTokenExpiry: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'QR Access PIN removed successfully',
    });
  } catch (error) {
    console.error('Failed to remove QR PIN:', error);
    return NextResponse.json(
      { error: 'Failed to remove QR PIN' },
      { status: 500 }
    );
  }
}

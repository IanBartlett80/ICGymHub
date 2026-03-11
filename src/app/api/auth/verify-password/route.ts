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

// POST - Verify user's account password (for PIN reset)
export async function POST(request: NextRequest) {
  try {
    const tokenPayload = await getAuthenticatedUser(request);
    
    if (!tokenPayload?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    // Fetch user from database to get email and password hash
    const user = await prisma.user.findUnique({
      where: { id: tokenPayload.userId },
      select: {
        id: true,
        email: true,
        passwordHash: true,
      },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: 'User not found', verified: false },
        { status: 404 }
      );
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Incorrect password', verified: false },
        { status: 401 }
      );
    }

    return NextResponse.json({
      verified: true,
      message: 'Password verified successfully',
    });
  } catch (error) {
    console.error('Failed to verify password:', error);
    return NextResponse.json(
      { error: 'Failed to verify password', verified: false },
      { status: 500 }
    );
  }
}

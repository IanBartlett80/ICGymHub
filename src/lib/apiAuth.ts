import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';

function getAccessToken(req: NextRequest): string | null {
  const headerToken = req.headers.get('authorization');
  if (headerToken?.startsWith('Bearer ')) {
    return headerToken.replace('Bearer ', '').trim();
  }
  const cookieToken = req.cookies.get('accessToken')?.value;
  return cookieToken || null;
}

export interface AuthResult {
  authenticated: boolean;
  user: {
    id: string;
    username: string;
    email: string;
    fullName: string;
    clubId: string;
    role: string;
  } | null;
}

export async function verifyAuth(req: NextRequest): Promise<AuthResult> {
  const token = getAccessToken(req);
  const payload = token ? verifyAccessToken(token) : null;
  
  if (!payload) {
    return { authenticated: false, user: null };
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      username: true,
      email: true,
      fullName: true,
      clubId: true,
      role: true,
    },
  });

  if (!user || user.clubId !== payload.clubId) {
    return { authenticated: false, user: null };
  }

  return {
    authenticated: true,
    user,
  };
}

export async function authenticateRequest(req: NextRequest) {
  const token = getAccessToken(req);
  const payload = token ? verifyAccessToken(token) : null;
  
  if (!payload) {
    throw new Error('Unauthorized');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      username: true,
      email: true,
      fullName: true,
      clubId: true,
      role: true,
    },
  });

  if (!user || user.clubId !== payload.clubId) {
    throw new Error('Unauthorized');
  }

  const club = await prisma.club.findUnique({
    where: { id: user.clubId },
  });

  if (!club) {
    throw new Error('Club not found');
  }

  return { user, club };
}

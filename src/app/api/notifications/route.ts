import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

// GET /api/notifications - Get notifications for current user
export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    const notifications = await prisma.injuryNotification.findMany({
      where: {
        userId: authResult.user.id,
        clubId: authResult.user.clubId,
        ...(unreadOnly && { read: false }),
      },
      include: {
        submission: {
          select: {
            id: true,
            status: true,
            template: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const unreadCount = unreadOnly ? notifications.length : await prisma.injuryNotification.count({
      where: {
        userId: authResult.user.id,
        clubId: authResult.user.clubId,
        read: false,
      },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

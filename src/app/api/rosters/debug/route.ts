import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';

// GET /api/rosters/debug - Debug roster and template data
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || request.cookies.get('accessToken')?.value;
    const payload = token ? verifyAccessToken(token) : null;
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all roster templates
    const templates = await prisma.rosterTemplate.findMany({
      where: { clubId: payload.clubId },
      select: {
        id: true,
        name: true,
        venueId: true,
        startDate: true,
        endDate: true,
        activeDays: true,
        status: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Get all rosters
    const rosters = await prisma.roster.findMany({
      where: { clubId: payload.clubId },
      select: {
        id: true,
        templateId: true,
        venueId: true,
        startDate: true,
        endDate: true,
        dayOfWeek: true,
        status: true,
        _count: {
          select: {
            slots: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
      take: 20,
    });

    return NextResponse.json({
      templates: templates.map(t => ({
        ...t,
        startDate: t.startDate.toISOString(),
        endDate: t.endDate.toISOString(),
      })),
      rosters: rosters.map(r => ({
        ...r,
        startDate: r.startDate.toISOString(),
        endDate: r.endDate.toISOString(),
        slotCount: r._count.slots,
      })),
    });
  } catch (error) {
    console.error('Error fetching debug data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch debug data' },
      { status: 500 }
    );
  }
}

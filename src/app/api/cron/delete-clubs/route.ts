import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST - Permanent deletion of clubs past their cooling-off period
// Called by external cron job with CRON_SECRET header
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = request.headers.get('x-cron-secret');
    if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find clubs past their deletion date
    const clubsToDelete = await prisma.club.findMany({
      where: {
        deletionScheduledFor: {
          lte: new Date(),
        },
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        domain: true,
        deletionScheduledFor: true,
        deletedBy: true,
      },
    });

    if (clubsToDelete.length === 0) {
      return NextResponse.json({ message: 'No clubs to delete', count: 0 });
    }

    const results = [];

    for (const club of clubsToDelete) {
      try {
        // Mark as deleted (soft delete preserves the record)
        await prisma.club.update({
          where: { id: club.id },
          data: {
            deletedAt: new Date(),
            status: 'DELETED',
          },
        });

        // Audit log
        await prisma.auditLog.create({
          data: {
            clubId: club.id,
            action: 'CLUB_PERMANENTLY_DELETED',
            entityType: 'Club',
            entityId: club.id,
            changes: JSON.stringify({ clubName: club.name, domain: club.domain, deletedBy: club.deletedBy }),
          },
        });

        results.push({ id: club.id, name: club.name, status: 'deleted' });
      } catch (err: any) {
        console.error(`Failed to delete club ${club.id}:`, err);
        results.push({ id: club.id, name: club.name, status: 'error', error: err.message });
      }
    }

    return NextResponse.json({
      message: `Processed ${results.length} clubs`,
      results,
    });
  } catch (error: any) {
    console.error('Cron delete error:', error);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}

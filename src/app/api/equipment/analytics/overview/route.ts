import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';

// GET /api/equipment/analytics/overview - Get equipment statistics
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clubId = auth.user.clubId;

    // Get total equipment count
    const totalCount = await prisma.equipment.count({
      where: { clubId, active: true },
    });

    // Get count by category
    const byCategory = await prisma.equipment.groupBy({
      by: ['category'],
      where: { clubId, active: true },
      _count: true,
    });

    const categoryStats = byCategory.map(item => ({
      category: item.category || 'Uncategorized',
      count: item._count,
    }));

    // Get count by condition
    const byCondition = await prisma.equipment.groupBy({
      by: ['condition'],
      where: { clubId, active: true },
      _count: true,
    });

    const conditionStats = byCondition.map(item => ({
      condition: item.condition,
      count: item._count,
    }));

    // Get currently in use count
    const inUseCount = await prisma.equipment.count({
      where: { clubId, active: true, inUse: true },
    });

    // Get maintenance due count (next 7 days)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    
    const maintenanceDueCount = await prisma.equipment.count({
      where: {
        clubId,
        active: true,
        nextMaintenance: {
          lte: futureDate,
        },
      },
    });

    // Get equipment needing attention (Fair, Poor, or Out of Service)
    const needsAttentionCount = await prisma.equipment.count({
      where: {
        clubId,
        active: true,
        condition: {
          in: ['Fair', 'Poor', 'Out of Service'],
        },
      },
    });

    return NextResponse.json({
      totalCount,
      inUseCount,
      availableCount: totalCount - inUseCount,
      maintenanceDueCount,
      needsAttentionCount,
      byCategory: categoryStats,
      byCondition: conditionStats,
    });
  } catch (error) {
    console.error('Equipment analytics overview error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch equipment analytics' },
      { status: 500 }
    );
  }
}

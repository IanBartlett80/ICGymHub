import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';

// GET /api/equipment/analytics/costs - Get cost analysis
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const clubId = auth.user.clubId;

    // Get total purchase costs
    const equipment = await prisma.equipment.findMany({
      where: {
        clubId,
        active: true,
        purchaseCost: { not: null },
      },
      select: {
        purchaseCost: true,
        purchaseDate: true,
        category: true,
      },
    });

    const totalPurchaseCost = equipment.reduce((sum, item) => {
      const cost = parseFloat(item.purchaseCost || '0');
      return sum + cost;
    }, 0);

    const purchaseCostByCategory = equipment.reduce((acc: any, item) => {
      const category = item.category || 'Uncategorized';
      const cost = parseFloat(item.purchaseCost || '0');
      acc[category] = (acc[category] || 0) + cost;
      return acc;
    }, {});

    // Get maintenance costs
    const maintenanceWhere: any = {
      clubId,
      cost: { not: null },
    };

    if (startDate || endDate) {
      maintenanceWhere.performedAt = {};
      if (startDate) maintenanceWhere.performedAt.gte = new Date(startDate);
      if (endDate) maintenanceWhere.performedAt.lte = new Date(endDate);
    }

    const maintenanceLogs = await prisma.maintenanceLog.findMany({
      where: maintenanceWhere,
      include: {
        equipment: {
          select: {
            category: true,
          },
        },
      },
    });

    const totalMaintenanceCost = maintenanceLogs.reduce((sum, log) => {
      const cost = parseFloat(log.cost || '0');
      return sum + cost;
    }, 0);

    const maintenanceCostByCategory = maintenanceLogs.reduce((acc: any, log) => {
      const category = log.equipment.category || 'Uncategorized';
      const cost = parseFloat(log.cost || '0');
      acc[category] = (acc[category] || 0) + cost;
      return acc;
    }, {});

    const maintenanceCostByType = maintenanceLogs.reduce((acc: any, log) => {
      const type = log.maintenanceType;
      const cost = parseFloat(log.cost || '0');
      acc[type] = (acc[type] || 0) + cost;
      return acc;
    }, {});

    // Calculate average costs
    const activeEquipmentCount = await prisma.equipment.count({
      where: { clubId, active: true },
    });

    return NextResponse.json({
      purchase: {
        total: totalPurchaseCost,
        byCategory: Object.entries(purchaseCostByCategory).map(([category, cost]) => ({
          category,
          cost,
        })),
        average: activeEquipmentCount > 0 ? totalPurchaseCost / activeEquipmentCount : 0,
      },
      maintenance: {
        total: totalMaintenanceCost,
        byCategory: Object.entries(maintenanceCostByCategory).map(([category, cost]) => ({
          category,
          cost,
        })),
        byType: Object.entries(maintenanceCostByType).map(([type, cost]) => ({
          type,
          cost,
        })),
        count: maintenanceLogs.length,
        average: maintenanceLogs.length > 0 ? totalMaintenanceCost / maintenanceLogs.length : 0,
      },
      totalCost: totalPurchaseCost + totalMaintenanceCost,
    });
  } catch (error) {
    console.error('Equipment cost analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cost analytics' },
      { status: 500 }
    );
  }
}

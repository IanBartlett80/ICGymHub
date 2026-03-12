import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/apiAuth';

// GET /api/equipment/export/excel - Export equipment register to Excel
export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const venueId = searchParams.get('venueId');
    const category = searchParams.get('category');
    const condition = searchParams.get('condition');

    const where: any = {
      clubId: authResult.user.clubId,
      active: true,
    };

    if (venueId && venueId !== 'all') {
      where.venueId = venueId;
    }
    if (category && category !== 'all') {
      where.category = category;
    }
    if (condition && condition !== 'all') {
      where.condition = condition;
    }

    const equipment = await prisma.equipment.findMany({
      where,
      include: {
        zone: {
          include: {
            venue: true,
          },
        },
        venue: true,
        _count: {
          select: {
            maintenanceLogs: true,
            safetyIssues: {
              where: {
                status: {
                  notIn: ['RESOLVED', 'CLOSED']
                }
              }
            },
            usageHistory: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Simple CSV format that Excel can open (will enhance with proper Excel format later if needed)
    const headers = [
      'Name',
      'Serial Number',
      'Category',
      'Venue',
      'Zone',
      'Condition',
      'Purchase Date',
      'Purchase Cost',
      'Last Checked',
      'Last Check Status',
      'Last Checked By',
      'In Use',
      'Last Maintenance',
      'Next Maintenance',
      'Safety Issues',
      'Maintenance Logs',
      'Usage Records',
    ];

    const rows = equipment.map((item: any) => [
      item.name,
      item.serialNumber || '',
      item.category || '',
      item.venue?.name || item.zone?.venue?.name || '',
      item.zone?.name || '',
      item.condition || '',
      item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : '',
      item.purchaseCost ? `$${item.purchaseCost}` : '',
      item.lastCheckedDate ? new Date(item.lastCheckedDate).toLocaleDateString() : '',
      item.lastCheckStatus || '',
      item.lastCheckedBy || '',
      item.inUse ? 'Yes' : 'No',
      item.lastMaintenance ? new Date(item.lastMaintenance).toLocaleDateString() : '',
      item.nextMaintenance ? new Date(item.nextMaintenance).toLocaleDateString() : '',
      item._count.safetyIssues.toString(),
      item._count.maintenanceLogs.toString(),
      item._count.usageHistory.toString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'application/vnd.ms-excel',
        'Content-Disposition': `attachment; filename="equipment-register-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Error exporting equipment to Excel:', error);
    return NextResponse.json(
      { error: 'Failed to export equipment' },
      { status: 500 }
    );
  }
}

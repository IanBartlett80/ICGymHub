import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/apiAuth';

// GET /api/equipment/analytics/safety-issues-monthly - Get monthly safety issues data per zone
export async function GET(request: NextRequest) {
  try {
    const { club } = await authenticateRequest(request);

    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get('months') || '6'); // Default to 6 months
    const zoneIdsParam = searchParams.get('zoneIds');

    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    startDate.setMonth(now.getMonth() - months);
    startDate.setDate(1); // Start from first day of month
    startDate.setHours(0, 0, 0, 0);

    // Build zone query
    const zoneWhere: any = {
      clubId: club.id,
      active: true,
    };
    
    // If zoneIds filter is set, only get those specific zones
    if (zoneIdsParam) {
      const zoneIds = zoneIdsParam.split(',').filter(id => id.trim());
      if (zoneIds.length > 0) {
        zoneWhere.id = { in: zoneIds };
      }
    }

    // Get zones (filtered if needed)
    const zones = await prisma.zone.findMany({
      where: zoneWhere,
      select: {
        id: true,
        name: true,
      },
    });

    // Get safety issues only for the filtered zones
    const activeZoneIds = zones.map(z => z.id);
    
    const safetyIssues = await prisma.safetyIssue.findMany({
      where: {
        clubId: club.id,
        createdAt: {
          gte: startDate,
        },
        equipment: {
          active: true,
          zoneId: activeZoneIds.length > 0 ? { in: activeZoneIds } : undefined,
        },
      },
      select: {
        id: true,
        createdAt: true,
        issueType: true,
        status: true,
        equipment: {
          select: {
            zoneId: true,
          },
        },
      },
    });

    // Group issues by month and zone
    const monthlyData: { [key: string]: any } = {};
    const zoneMap: { [key: string]: string } = {};
    
    zones.forEach(zone => {
      zoneMap[zone.id] = zone.name;
    });

    // Initialize months
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(now.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      monthlyData[monthKey] = {
        month: monthLabel,
        total: 0,
      };
      
      // Initialize each zone count
      zones.forEach(zone => {
        monthlyData[monthKey][zone.name] = 0;
      });
    }

    // Count issues per month per zone
    safetyIssues.forEach((issue: any) => {
      const issueDate = new Date(issue.createdAt);
      const monthKey = `${issueDate.getFullYear()}-${String(issueDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].total++;
        
        if (issue.equipment.zoneId && zoneMap[issue.equipment.zoneId]) {
          const zoneName = zoneMap[issue.equipment.zoneId];
          monthlyData[monthKey][zoneName]++;
        }
      }
    });

    // Convert to array and sort by date
    const dataArray = Object.values(monthlyData).sort((a: any, b: any) => {
      // Sort by the original month key to maintain chronological order
      return a.month.localeCompare(b.month);
    });

    return NextResponse.json({
      data: dataArray,
      zones: zones.map(z => z.name),
      totalIssues: safetyIssues.length,
    });
  } catch (error) {
    console.error('Monthly safety issues analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monthly safety issues data' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/apiAuth';

// GET /api/equipment/analytics/safety-issues-monthly-by-venue - Get monthly safety issues data per venue
export async function GET(request: NextRequest) {
  try {
    const { club } = await authenticateRequest(request);

    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get('months') || '6'); // Default to 6 months
    const venueIdFilter = searchParams.get('venueId');

    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    startDate.setMonth(now.getMonth() - months);
    startDate.setDate(1); // Start from first day of month
    startDate.setHours(0, 0, 0, 0);

    // Build venue query
    const venueWhere: any = {
      clubId: club.id,
      active: true,
    };
    
    // If venueId filter is set, only get that specific venue
    if (venueIdFilter && venueIdFilter !== 'all') {
      venueWhere.id = venueIdFilter;
    }

    // Get venues (filtered if needed)
    const venues = await prisma.venue.findMany({
      where: venueWhere,
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Get safety issues only for the filtered venues
    const activeVenueIds = venues.map(v => v.id);
    
    const safetyIssues = await prisma.safetyIssue.findMany({
      where: {
        clubId: club.id,
        createdAt: {
          gte: startDate,
        },
        equipment: {
          active: true,
          venueId: activeVenueIds.length > 0 ? { in: activeVenueIds } : undefined,
        },
      },
      select: {
        id: true,
        createdAt: true,
        issueType: true,
        status: true,
        equipment: {
          select: {
            venueId: true,
          },
        },
      },
    });

    // Group issues by month and venue
    const monthlyData: { [key: string]: any } = {};
    const venueMap: { [key: string]: string } = {};
    
    venues.forEach(venue => {
      venueMap[venue.id] = venue.name;
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
      
      // Initialize each venue count
      venues.forEach(venue => {
        monthlyData[monthKey][venue.name] = 0;
      });
    }

    // Count issues per month per venue
    safetyIssues.forEach((issue: any) => {
      const issueDate = new Date(issue.createdAt);
      const monthKey = `${issueDate.getFullYear()}-${String(issueDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].total++;
        
        if (issue.equipment?.venueId && venueMap[issue.equipment.venueId]) {
          const venueName = venueMap[issue.equipment.venueId];
          monthlyData[monthKey][venueName]++;
        }
      }
    });

    // Convert to array and sort by date (sort on YYYY-MM key for correct chronological order)
    const dataArray = Object.entries(monthlyData)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([, value]) => value);

    return NextResponse.json({
      data: dataArray,
      venues: venues.map(v => v.name),
      totalIssues: safetyIssues.length,
    });
  } catch (error) {
    console.error('Monthly safety issues by venue analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monthly safety issues by venue data' },
      { status: 500 }
    );
  }
}

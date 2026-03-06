import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/apiAuth';

// GET /api/injury-submissions/analytics/monthly-by-zone - Get monthly incident data per zone
export async function GET(request: NextRequest) {
  try {
    const { club } = await authenticateRequest(request);

    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get('months') || '6'); // Default to 6 months

    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    startDate.setMonth(now.getMonth() - months);
    startDate.setDate(1); // Start from first day of month
    startDate.setHours(0, 0, 0, 0);

    // Get all zones
    const zones = await prisma.zone.findMany({
      where: {
        clubId: club.id,
        active: true,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Get all injury submissions for the date range
    const submissions = await prisma.injurySubmission.findMany({
      where: {
        clubId: club.id,
        submittedAt: {
          gte: startDate,
        },
      },
      select: {
        id: true,
        submittedAt: true,
        status: true,
        priority: true,
        zoneId: true,
      },
    });

    // Group submissions by month and zone
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

    // Count submissions per month per zone
    submissions.forEach((submission: any) => {
      const submissionDate = new Date(submission.submittedAt);
      const monthKey = `${submissionDate.getFullYear()}-${String(submissionDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].total++;
        
        if (submission.zoneId && zoneMap[submission.zoneId]) {
          const zoneName = zoneMap[submission.zoneId];
          monthlyData[monthKey][zoneName]++;
        }
      }
    });

    // Convert to array and sort by date
    const dataArray = Object.values(monthlyData).sort((a: any, b: any) => {
      return a.month.localeCompare(b.month);
    });

    return NextResponse.json({
      data: dataArray,
      zones: zones.map(z => z.name),
      totalSubmissions: submissions.length,
    });
  } catch (error) {
    console.error('Monthly incidents by zone analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monthly incidents by zone data' },
      { status: 500 }
    );
  }
}

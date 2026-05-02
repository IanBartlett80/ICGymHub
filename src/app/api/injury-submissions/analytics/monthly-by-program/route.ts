import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/apiAuth';

// GET /api/injury-submissions/analytics/monthly-by-program - Get monthly incident data per gymsport/program
export async function GET(request: NextRequest) {
  try {
    const { club } = await authenticateRequest(request);

    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get('months') || '6'); // Default to 6 months
    const venueId = searchParams.get('venueId');

    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    startDate.setMonth(now.getMonth() - months);
    startDate.setDate(1); // Start from first day of month
    startDate.setHours(0, 0, 0, 0);

    // Build submissions filter with venue if specified
    const submissionsWhere: any = {
      clubId: club.id,
      submittedAt: {
        gte: startDate,
      },
      ...(venueId && venueId !== 'all' ? { venueId } : {}),
    };

    // Get all injury submissions for the date range with their data fields
    const submissions = await prisma.injurySubmission.findMany({
      where: submissionsWhere,
      select: {
        id: true,
        submittedAt: true,
        status: true,
        priority: true,
        data: {
          include: {
            field: true,
          },
        },
      },
    });

    // Extract unique gymsports/programs from submission data
    const gymsportsSet = new Set<string>();
    const submissionsByGymsport: { [key: string]: any[] } = {};

    submissions.forEach((submission) => {
      const gymsportField = submission.data.find((d) => d.field.label === 'Gymsport' || d.field.label === 'Program');
      if (gymsportField && gymsportField.value) {
        const gymsport = gymsportField.value;
        gymsportsSet.add(gymsport);
        if (!submissionsByGymsport[gymsport]) {
          submissionsByGymsport[gymsport] = [];
        }
        submissionsByGymsport[gymsport].push(submission);
      }
    });

    const gymsports = Array.from(gymsportsSet).sort();

    // Group submissions by month and gymsport
    const monthlyData: { [key: string]: any } = {};

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
      
      // Initialize each gymsport count
      gymsports.forEach(gymsport => {
        monthlyData[monthKey][gymsport] = 0;
      });
    }

    // Count submissions per month per gymsport
    submissions.forEach((submission: any) => {
      const submissionDate = new Date(submission.submittedAt);
      const monthKey = `${submissionDate.getFullYear()}-${String(submissionDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].total++;
        
        const gymsportField = submission.data.find((d: any) => d.field.label === 'Gymsport' || d.field.label === 'Program');
        if (gymsportField && gymsportField.value) {
          const gymsport = gymsportField.value;
          if (monthlyData[monthKey][gymsport] !== undefined) {
            monthlyData[monthKey][gymsport]++;
          }
        }
      }
    });

    // Convert to array and sort by date (sort on YYYY-MM key for correct chronological order)
    const dataArray = Object.entries(monthlyData)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([, value]) => value);

    return NextResponse.json({
      data: dataArray,
      programs: gymsports,
      totalSubmissions: submissions.length,
    });
  } catch (error) {
    console.error('Monthly incidents by program analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monthly incidents by program data' },
      { status: 500 }
    );
  }
}

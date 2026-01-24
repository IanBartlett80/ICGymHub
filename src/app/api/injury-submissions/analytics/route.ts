import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const gymsportFilter = searchParams.get('gymsport');
    const classFilter = searchParams.get('class');
    const equipmentFilter = searchParams.get('equipment');
    const statusFilter = searchParams.get('status');
    const priorityFilter = searchParams.get('priority');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build where clause
    const where: any = {
      template: {
        clubId: auth.user.clubId,
      },
    };

    if (statusFilter && statusFilter !== 'all') {
      where.status = statusFilter;
    }

    if (priorityFilter && priorityFilter !== 'all') {
      where.priority = priorityFilter;
    }

    if (startDate || endDate) {
      where.submittedAt = {};
      if (startDate) {
        where.submittedAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.submittedAt.lte = end;
      }
    }

    // Fetch all submissions matching the filters
    const submissions = await prisma.injurySubmission.findMany({
      where,
      include: {
        template: true,
        data: {
          include: {
            field: true,
          },
        },
        assignedTo: true,
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });

    // Filter by gymsport, class, equipment if specified
    let filteredSubmissions = submissions;
    
    if (gymsportFilter && gymsportFilter !== 'all') {
      filteredSubmissions = filteredSubmissions.filter((sub) =>
        sub.data.some((d) => d.field.label === 'Gymsport' && d.value === gymsportFilter)
      );
    }

    if (classFilter && classFilter !== 'all') {
      filteredSubmissions = filteredSubmissions.filter((sub) =>
        sub.data.some((d) => d.field.label === 'Class' && d.value === classFilter)
      );
    }

    if (equipmentFilter && equipmentFilter !== 'all') {
      filteredSubmissions = filteredSubmissions.filter((sub) =>
        sub.data.some((d) => d.field.label === 'Equipment' && d.value === equipmentFilter)
      );
    }

    // Calculate analytics
    const totalSubmissions = filteredSubmissions.length;

    // Status counts
    const statusCounts = filteredSubmissions.reduce((acc: any[], sub) => {
      const existing = acc.find((s) => s.status === sub.status);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ status: sub.status, count: 1 });
      }
      return acc;
    }, []);

    // Priority counts
    const priorityCounts = filteredSubmissions.reduce((acc: any[], sub) => {
      const priority = sub.priority || 'NONE';
      const existing = acc.find((p) => p.priority === priority);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ priority, count: 1 });
      }
      return acc;
    }, []);

    // Submissions by date
    const submissionsByDate = filteredSubmissions.reduce((acc: any, sub) => {
      const date = sub.submittedAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    // Average response time
    const responseTimes = filteredSubmissions
      .filter((s) => s.resolvedAt)
      .map((s) => {
        const submitted = new Date(s.submittedAt).getTime();
        const resolved = new Date(s.resolvedAt!).getTime();
        return (resolved - submitted) / (1000 * 60 * 60); // hours
      });
    const avgResponseTimeHours =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

    // Gymsport breakdown
    const gymsportData = filteredSubmissions.reduce((acc: any, sub) => {
      const gymsportField = sub.data.find((d) => d.field.label === 'Gymsport');
      if (gymsportField) {
        const name = gymsportField.value;
        if (!acc[name]) acc[name] = 0;
        acc[name]++;
      }
      return acc;
    }, {});
    const gymsportBreakdown = Object.entries(gymsportData).map(([name, count]) => ({
      gymsportName: name,
      count: count as number,
    }));

    // Class breakdown
    const classData = filteredSubmissions.reduce((acc: any, sub) => {
      const classField = sub.data.find((d) => d.field.label === 'Class');
      if (classField) {
        const name = classField.value;
        if (!acc[name]) acc[name] = 0;
        acc[name]++;
      }
      return acc;
    }, {});
    const classBreakdown = Object.entries(classData).map(([name, count]) => ({
      className: name,
      count: count as number,
    }));

    // Equipment breakdown
    const equipmentData = filteredSubmissions.reduce((acc: any, sub) => {
      const equipmentField = sub.data.find((d) => d.field.label === 'Equipment');
      if (equipmentField) {
        const name = equipmentField.value;
        if (!acc[name]) acc[name] = 0;
        acc[name]++;
      }
      return acc;
    }, {});
    const equipmentBreakdown = Object.entries(equipmentData).map(([name, count]) => ({
      equipmentName: name,
      count: count as number,
    }));

    // Coach involvement stats
    const coachData = filteredSubmissions.reduce((acc: any, sub) => {
      if (sub.assignedTo) {
        const name = sub.assignedTo.fullName;
        if (!acc[name]) acc[name] = 0;
        acc[name]++;
      }
      return acc;
    }, {});
    const coachInvolvementStats = Object.entries(coachData).map(([name, count]) => ({
      coachName: name,
      incidentCount: count as number,
    }));

    // Time patterns (hour of day)
    const hourData = filteredSubmissions.reduce((acc: any, sub) => {
      const hour = new Date(sub.submittedAt).getHours();
      if (!acc[hour]) acc[hour] = 0;
      acc[hour]++;
      return acc;
    }, {});
    const timePatterns = Object.entries(hourData).map(([hour, count]) => ({
      hour: parseInt(hour),
      count: count as number,
    }));

    return NextResponse.json({
      totalSubmissions,
      statusCounts,
      priorityCounts,
      submissionsByDate,
      avgResponseTimeHours,
      gymsportBreakdown,
      classBreakdown,
      equipmentBreakdown,
      coachInvolvementStats,
      timePatterns,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

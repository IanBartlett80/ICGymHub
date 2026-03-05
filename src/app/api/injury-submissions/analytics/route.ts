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
    const venueFilter = searchParams.get('venueId');
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

    if (venueFilter && venueFilter !== 'all') {
      where.venueId = venueFilter;
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
        venue: {
          select: {
            id: true,
            name: true,
          },
        },
        zone: {
          select: {
            id: true,
            name: true,
          },
        },
        equipment: {
          select: {
            id: true,
            name: true,
          },
        },
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

    // Average response time - Calculate based on status changes to RESOLVED or CLOSED
    // Note: resolvedAt exists in SafetyIssue model but not InjurySubmission
    // We'll calculate based on resolved/closed submissions using updatedAt
    const resolvedSubmissions = filteredSubmissions.filter(
      (s) => s.status === 'RESOLVED' || s.status === 'CLOSED'
    );
    const responseTimes = resolvedSubmissions.map((s) => {
      const submitted = new Date(s.submittedAt).getTime();
      const resolved = new Date(s.updatedAt).getTime();
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

    // Venue breakdown
    const venueData = filteredSubmissions.reduce((acc: any, sub) => {
      if (sub.venue) {
        const name = sub.venue.name;
        if (!acc[name]) acc[name] = { count: 0, critical: 0 };
        acc[name].count++;
        if (sub.priority === 'CRITICAL' || sub.priority === 'HIGH') {
          acc[name].critical++;
        }
      }
      return acc;
    }, {});
    const venueBreakdown = Object.entries(venueData).map(([name, data]: [string, any]) => ({
      venueName: name,
      count: data.count,
      critical: data.critical,
    }));

    // Zone breakdown  
    const zoneData = filteredSubmissions.reduce((acc: any, sub) => {
      if (sub.zone) {
        const name = sub.zone.name;
        if (!acc[name]) acc[name] = 0;
        acc[name]++;
      }
      return acc;
    }, {});
    const zoneBreakdown = Object.entries(zoneData).map(([name, count]) => ({
      zoneName: name,
      count: count as number,
    }));

    // Equipment-related injuries
    const equipmentRelated = filteredSubmissions.filter(sub => sub.equipment || sub.equipmentId);
    const equipmentInjuryData = filteredSubmissions.reduce((acc: any, sub) => {
      if (sub.equipment) {
        const name = sub.equipment.name;
        if (!acc[name]) acc[name] = { count: 0, critical: 0 };
        acc[name].count++;
        if (sub.priority === 'CRITICAL' || sub.priority === 'HIGH') {
          acc[name].critical++;
        }
      }
      return acc;
    }, {});
    const equipmentInjuryBreakdown = Object.entries(equipmentInjuryData).map(
      ([name, data]: [string, any]) => ({
        equipmentName: name,
        count: data.count,
        critical: data.critical,
      })
    );

    // Monthly trend data (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyData: any = {};
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = { total: 0, critical: 0, resolved: 0 };
    }

    filteredSubmissions.forEach((sub) => {
      const subDate = new Date(sub.submittedAt);
      if (subDate >= sixMonthsAgo) {
        const monthKey = `${subDate.getFullYear()}-${String(subDate.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].total++;
          if (sub.priority === 'CRITICAL' || sub.priority === 'HIGH') {
            monthlyData[monthKey].critical++;
          }
          if (sub.status === 'RESOLVED' || sub.status === 'CLOSED') {
            monthlyData[monthKey].resolved++;
          }
        }
      }
    });

    const trendData = Object.entries(monthlyData).map(([month, data]: [string, any]) => {
      const [year, monthNum] = month.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return {
        month: `${monthNames[parseInt(monthNum) - 1]} ${year.slice(2)}`,
        total: data.total,
        critical: data.critical,
        resolved: data.resolved,
      };
    });

    // Day of week pattern
    const dayOfWeekData = filteredSubmissions.reduce((acc: any, sub) => {
      const dayOfWeek = new Date(sub.submittedAt).getDay();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = dayNames[dayOfWeek];
      if (!acc[dayName]) acc[dayName] = 0;
      acc[dayName]++;
      return acc;
    }, {});
    const dayOfWeekPattern = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
      (day) => ({
        day,
        count: dayOfWeekData[day] || 0,
      })
    );

    // Severity distribution for pie chart
    const severityData = filteredSubmissions.reduce((acc: any, sub) => {
      const priority = sub.priority || 'NONE';
      if (!acc[priority]) acc[priority] = 0;
      acc[priority]++;
      return acc;
    }, {});
    const severityDistribution = [
      { name: 'Critical', value: severityData['CRITICAL'] || 0, color: '#ef4444' },
      { name: 'High', value: severityData['HIGH'] || 0, color: '#f97316' },
      { name: 'Medium', value: severityData['MEDIUM'] || 0, color: '#eab308' },
      { name: 'Low', value: severityData['LOW'] || 0, color: '#22c55e' },
      { name: 'Unassigned', value: severityData['NONE'] || 0, color: '#94a3b8' },
    ].filter(item => item.value > 0);

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
      venueBreakdown,
      zoneBreakdown,
      equipmentInjuryBreakdown,
      equipmentRelatedCount: equipmentRelated.length,
      trendData,
      dayOfWeekPattern,
      severityDistribution,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

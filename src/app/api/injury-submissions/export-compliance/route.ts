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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build where clause
    const where: any = {
      template: {
        clubId: auth.user.clubId,
      },
    };

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

    // Fetch submissions
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
        comments: true,
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });

    // Generate CSV
    const headers = [
      'Submission ID',
      'Form Template',
      'Status',
      'Priority',
      'Submitted At',
      'Resolved At',
      'Assigned To',
      'Gymsport',
      'Class',
      'Equipment',
      'Response Time (hours)',
      'Comments Count',
      'Submitter Name',
      'Submitter Email',
    ];

    const rows = submissions.map((sub) => {
      const gymsport = sub.data.find((d) => d.field.label === 'Gymsport')?.value || '';
      const gymClass = sub.data.find((d) => d.field.label === 'Class')?.value || '';
      const equipment = sub.data.find((d) => d.field.label === 'Equipment')?.value || '';
      
      let responseTime = '';
      if (sub.resolvedAt) {
        const hours = (new Date(sub.resolvedAt).getTime() - new Date(sub.submittedAt).getTime()) / (1000 * 60 * 60);
        responseTime = hours.toFixed(2);
      }

      const submitterInfo = sub.submitterInfo ? JSON.parse(sub.submitterInfo) : {};

      return [
        sub.id,
        sub.template.name,
        sub.status,
        sub.priority || '',
        sub.submittedAt.toISOString(),
        sub.resolvedAt?.toISOString() || '',
        sub.assignedTo?.fullName || '',
        gymsport,
        gymClass,
        equipment,
        responseTime,
        sub.comments.length.toString(),
        submitterInfo.name || '',
        submitterInfo.email || '',
      ];
    });

    // Convert to CSV
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="injury-compliance-report-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export compliance error:', error);
    return NextResponse.json(
      { error: 'Failed to export compliance report' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/apiAuth';

// GET /api/equipment/export/pdf - Export equipment register to PDF
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

    const [equipment, club] = await Promise.all([
      prisma.equipment.findMany({
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
              safetyIssues: true,
              usageHistory: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.club.findUnique({
        where: { id: authResult.user.clubId },
      }),
    ]);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Equipment Asset Register - ${club?.name}</title>
  <style>
    @media print {
      @page { margin: 0.5cm; size: A4 landscape; }
      body { margin: 0; }
      .page-break { page-break-after: always; }
    }
    body {
      font-family: Arial, sans-serif;
      font-size: 10px;
      line-height: 1.3;
      color: #333;
    }
    .header {
      background: #4B5563;
      color: white;
      padding: 15px;
      margin-bottom: 20px;
    }
    .header h1 {
      margin: 0 0 5px 0;
      font-size: 18px;
    }
    .header p {
      margin: 0;
      font-size: 11px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th {
      background: #F3F4F6;
      border: 1px solid #D1D5DB;
      padding: 6px 4px;
      text-align: left;
      font-weight: 600;
      font-size: 9px;
    }
    td {
      border: 1px solid #E5E7EB;
      padding: 5px 4px;
      font-size: 9px;
    }
    tr:nth-child(even) {
      background: #F9FAFB;
    }
    .condition-excellent { background: #D1FAE5; color: #065F46; }
    .condition-good { background: #DBEAFE; color: #1E40AF; }
    .condition-fair { background: #FEF3C7; color: #92400E; }
    .condition-poor { background: #FED7AA; color: #9A3412; }
    .condition-out { background: #FEE2E2; color: #991B1B; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 600; }
    .footer {
      margin-top: 20px;
      padding-top: 10px;
      border-top: 2px solid #D1D5DB;
      font-size: 9px;
      color: #6B7280;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Equipment Asset Register</h1>
    <p>${club?.name}</p>
    <p>Generated: ${new Date().toLocaleString()} by ${authResult.user.fullName}</p>
    <p>Total Equipment Items: ${equipment.length}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 15%;">Name</th>
        <th style="width: 10%;">Serial #</th>
        <th style="width: 10%;">Category</th>
        <th style="width: 8%;">Venue</th>
        <th style="width: 8%;">Zone</th>
        <th style="width: 8%;">Condition</th>
        <th style="width: 8%;">Purchase Date</th>
        <th style="width: 7%;">Purchase Cost</th>
        <th style="width: 8%;">Last Checked</th>
        <th style="width: 8%;">Status</th>
        <th style="width: 5%;">In Use</th>
        <th style="width: 5%;">Issues</th>
      </tr>
    </thead>
    <tbody>
      ${equipment.map((item: any) => {
        const conditionClass = 
          item.condition === 'Excellent' ? 'condition-excellent' :
          item.condition === 'Good' ? 'condition-good' :
          item.condition === 'Fair' ? 'condition-fair' :
          item.condition === 'Poor' ? 'condition-poor' :
          item.condition === 'Out of Service' ? 'condition-out' : '';
        
        return `
        <tr>
          <td class="font-bold">${item.name}</td>
          <td>${item.serialNumber || '-'}</td>
          <td>${item.category || '-'}</td>
          <td>${item.venue?.name || item.zone?.venue?.name || '-'}</td>
          <td>${item.zone?.name || '-'}</td>
          <td class="${conditionClass}">${item.condition || '-'}</td>
          <td>${item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : '-'}</td>
          <td>${item.purchaseCost || '-'}</td>
          <td>${item.lastCheckedDate ? new Date(item.lastCheckedDate).toLocaleDateString() : '-'}</td>
          <td>${item.lastCheckStatus || '-'}</td>
          <td class="text-center">${item.inUse ? 'Yes' : 'No'}</td>
          <td class="text-center ${item._count.safetyIssues > 0 ? 'condition-out font-bold' : ''}">${item._count.safetyIssues}</td>
        </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  <div class="footer">
    <p><strong>Document Information:</strong> This equipment asset register is for internal use only and should be stored securely in accordance with club policies.</p>
    <p><strong>Compliance:</strong> Regular equipment inspections and maintenance are required under Australian safety regulations and insurance requirements.</p>
  </div>
</body>
</html>
    `;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="equipment-register-${new Date().toISOString().split('T')[0]}.html"`,
      },
    });
  } catch (error) {
    console.error('Error exporting equipment to PDF:', error);
    return NextResponse.json(
      { error: 'Failed to export equipment' },
      { status: 500 }
    );
  }
}

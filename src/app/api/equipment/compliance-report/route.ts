import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/apiAuth';

// GET /api/equipment/compliance-report - Generate Equipment Safety Compliance Report
export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const venueId = searchParams.get('venueId');

    const where: any = {
      clubId: authResult.user.clubId,
      active: true,
    };

    if (venueId && venueId !== 'all') {
      where.venueId = venueId;
    }

    const [equipment, club, venue] = await Promise.all([
      prisma.equipment.findMany({
        where,
        include: {
          zone: {
            include: {
              venue: true,
            },
          },
          venue: true,
          safetyIssues: {
            orderBy: { createdAt: 'desc' },
          },
          maintenanceTasks: {
            orderBy: { dueDate: 'desc' },
            take: 10,
          },
          maintenanceLogs: {
            orderBy: { performedAt: 'desc' },
            take: 10,
          },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.club.findUnique({
        where: { id: authResult.user.clubId },
      }),
      venueId && venueId !== 'all' ? prisma.venue.findUnique({
        where: { id: venueId },
      }) : null,
    ]);

    // Calculate statistics
    const criticalIssues = equipment.reduce((sum, item) => 
      sum + item.safetyIssues.filter((issue: any) => issue.priority === 'CRITICAL').length, 0
    );
    const nonCriticalIssues = equipment.reduce((sum, item) => 
      sum + item.safetyIssues.filter((issue: any) => issue.priority === 'HIGH' || issue.priority === 'MEDIUM').length, 0
    );
    const recommendations = equipment.reduce((sum, item) => 
      sum + item.safetyIssues.filter((issue: any) => issue.priority === 'LOW').length, 0
    );

    const reportId = `R-${Date.now().toString().slice(-5)}`;
    const reportDate = new Date();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Equipment Safety Compliance Report - ${reportId}</title>
  <style>
    @media print {
      @page { margin: 1cm; size: A4; }
      body { margin: 0; }
      .page-break { page-break-after: always; }
      .no-print { display: none; }
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 11px;
      line-height: 1.5;
      color: #333;
      max-width: 210mm;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: #3B4D69;
      color: white;
      padding: 20px;
      margin: -20px -20px 30px -20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .report-id {
      font-size: 20px;
      font-weight: bold;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 20px;
      margin-bottom: 30px;
      background: #F9FAFB;
      padding: 15px;
      border-radius: 4px;
    }
    .info-item h4 {
      margin: 0 0 5px 0;
      font-size: 10px;
      color: #6B7280;
      text-transform: uppercase;
    }
    .info-item p {
      margin: 0;
      font-size: 11px;
      color: #111827;
    }
    .scope-section {
      background: #F3F4F6;
      padding: 15px;
      margin-bottom: 25px;
      border-radius: 4px;
    }
    .scope-section h3 {
      margin: 0 0 10px 0;
      font-size: 14px;
      color:  #374151;
    }
    .scope-section p {
      margin: 0;
      color: #4B5563;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 30px;
    }
    .summary-card {
      padding: 12px;
      border-radius: 4px;
      text-align: center;
    }
    .summary-card .number {
      font-size: 28px;
      font-weight: bold;
      margin: 0 0 5px 0;
    }
    .summary-card .label {
      font-size: 10px;
      margin: 0;
    }
    .critical { background: #FEE2E2; border-left: 4px solid #DC2626; }
    .non-critical { background: #FEF3C7; border-left: 4px solid #F59E0B; }
    .recommendations { background: #DBEAFE; border-left: 4px solid #3B82F6; }
    .notes { background: #E5E7EB; border-left: 4px solid #6B7280; }
    .equipment-section {
      margin-bottom: 30px;
      border: 2px solid #E5E7EB;
      border-radius: 6px;
      overflow: hidden;
    }
    .equipment-header {
      background: #111827;
      color: white;
      padding: 12px 15px;
      font-size: 14px;
      font-weight: bold;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .status-badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: bold;
      text-transform: uppercase;
    }
    .status-resolved { background: #10B981; color: white; }
    .status-open { background: #EF4444; color: white; }
    .status-pending { background: #F59E0B; color: white; }
    .status-completed { background: #3B82F6; color: white; }
    .equipment-info {
      padding: 15px;
      background: white;
      border-bottom: 1px solid #E5E7EB;
    }
    .info-row {
      display: grid;
      grid-template-columns: 150px 1fr;
      padding: 6px 0;
    }
    .info-label {
      font-weight: 600;
      color: #6B7280;
    }
    .info-value {
      color: #111827;
    }
    .issue-item {
      border-left: 4px solid;
      margin: 15px;
      padding: 15px;
      background: white;
    }
    .issue-item.critical-issue { border-color: #DC2626; background: #FEF2F2; }
    .issue-item.high-issue { border-color: #F59E0B; background: #FFFBEB; }
    .issue-item.medium-issue { border-color: #3B82F6; background: #EFF6FF; }
    .issue-item.low-issue { border-color: #10B981; background: #F0FDF4; }
    .issue-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 10px;
    }
    .issue-title {
      font-weight: bold;
      color: #111827;
      margin: 0 0 5px 0;
    }
    .issue-id {
      font-size: 9px;
      color: #6B7280;
    }
    .issue-dates {
      text-align: right;
      font-size: 9px;
      color: #6B7280;
    }
    .issue-description {
      margin: 10px 0;
      padding: 10px;
      background: rgba(255,255,255,0.7);
      border-radius: 4px;
    }
    .issue-photo {
      max-width: 150px;
      max-height: 150px;
      border-radius: 4px;
      border: 1px solid #D1D5DB;
      margin: 10px 0;
    }
    .maintenance-task {
      padding: 12px;
      margin: 10px 15px;
      background: #F9FAFB;
      border-left: 3px solid #6B7280;
      border-radius: 4px;
    }
    .task-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .task-title {
      font-weight: 600;
      color: #111827;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #D1D5DB;
      font-size: 9px;
      color: #6B7280;
      text-align: center;
    }
    .footer p {
      margin: 5px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Equipment Safety Compliance Report</h1>
    <div class="report-id">${reportId}</div>
  </div>

  <div class="info-grid">
    <div class="info-item">
      <h4>Property:</h4>
      <p>${club?.name || 'N/A'}</p>
      <p>${club?.address || ''}</p>
      <p>${club?.city || ''}, ${club?.state || ''} ${club?.postalCode || ''}</p>
    </div>
    <div class="info-item">
      <h4>Venue:</h4>
      <p>${venue ? venue.name : venueId === 'all' || !venueId ? 'All Venues' : 'N/A'}</p>
    </div>
    <div class="info-item">
      <h4>Issued by:</h4>
      <p>${authResult.user.fullName}</p>
      <p>${reportDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      <h4 style="margin-top: 10px;">Report Date:</h4>
      <p>${reportDate.toLocaleDateString('en-AU')}</p>
    </div>
  </div>

  <div class="scope-section">
    <h3>Scope of Report</h3>
    <p>Comprehensive equipment safety inspection and maintenance review including current defects, safety issues, maintenance tasks, and compliance status for all equipment items.</p>
  </div>

  <div class="summary-grid">
    <div class="summary-card critical">
      <div class="number">${criticalIssues}</div>
      <div class="label">Critical Defects</div>
      <p style="font-size: 9px; margin-top: 5px;">Equipment inoperative or unsafe</p>
    </div>
    <div class="summary-card non-critical">
      <div class="number">${nonCriticalIssues}</div>
      <div class="label">Non-critical Defects</div>
      <p style="font-size: 9px; margin-top: 5px;">Issues requiring attention</p>
    </div>
    <div class="summary-card recommendations">
      <div class="number">${recommendations}</div>
      <div class="label">Recommendations</div>
      <p style="font-size: 9px; margin-top: 5px;">Suggested improvements</p>
    </div>
    <div class="summary-card notes">
      <div class="number">${equipment.length}</div>
      <div class="label">Equipment Items</div>
      <p style="font-size: 9px; margin-top: 5px;">Total items reviewed</p>
    </div>
  </div>

  ${equipment.map((item: any, index: number) => {
    const hasIssues = item.safetyIssues.length > 0 || item.maintenanceTasks.some((t: any) => t.status !== 'COMPLETED');
    
    if (!hasIssues) return '';
    
    return `
    <div class="equipment-section">
      <div class="equipment-header">
        <span>${index + 1} - ${item.name}</span>
        ${item.safetyIssues.some((i: any) => i.status !== 'RESOLVED') ? 
          '<span class="status-badge status-open">REQUIRES ATTENTION</span>' :
          '<span class="status-badge status-resolved">ALL CLEAR</span>'}
      </div>

      <div class="equipment-info">
        ${item.photoUrl ? `
        <div style="margin-bottom: 15px;">
          <img src="${item.photoUrl}" alt="${item.name}" style="max-width: 200px; max-height: 200px; border-radius: 4px; border: 2px solid #E5E7EB;" />
        </div>
        ` : ''}
        <div class="info-row">
          <div class="info-label">Serial Number:</div>
          <div class="info-value">${item.serialNumber || 'N/A'}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Category:</div>
          <div class="info-value">${item.category || 'N/A'}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Location:</div>
          <div class="info-value">${item.zone?.venue?.name || ''} - ${item.zone?.name || item.location || 'N/A'}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Condition:</div>
          <div class="info-value">${item.condition || 'N/A'}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Last Safety Check:</div>
          <div class="info-value">${item.lastCheckedDate ? new Date(item.lastCheckedDate).toLocaleDateString('en-AU') : 'Never Checked'}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Check Status:</div>
          <div class="info-value">${item.lastCheckStatus || 'N/A'}</div>
        </div>
      </div>

      ${item.safetyIssues.map((issue: any) => {
        const priorityClass = 
          issue.priority === 'CRITICAL' ? 'critical-issue' :
          issue.priority === 'HIGH' ? 'high-issue' :
          issue.priority === 'MEDIUM' ? 'medium-issue' : 'low-issue';
        
        const statusBadge = 
          issue.status === 'RESOLVED' ? 'status-resolved' :
          issue.status === 'IN_PROGRESS' ? 'status-pending' : 'status-open';

        return `
        <div class="issue-item ${priorityClass}">
          <div class="issue-header">
            <div>
              <div class="issue-title">
                <span class="status-badge ${statusBadge}">${issue.status.replace('_', ' ')}</span>
                ${issue.issueType.replace('_', ' ')}
              </div>
              <div class="issue-id">ID: ${issue.id.slice(-8)}</div>
            </div>
            <div class="issue-dates">
              <div><strong>Added:</strong> ${new Date(issue.createdAt).toLocaleString('en-AU')}</div>
              ${issue.resolvedAt ? `<div><strong>Resolved:</strong> ${new Date(issue.resolvedAt).toLocaleString('en-AU')}</div>` : ''}
            </div>
          </div>

          <div class="issue-description">
            <strong>Description:</strong><br>
            ${issue.description}
          </div>

          ${issue.photos ? `<img src="${issue.photos}" class="issue-photo" alt="Issue photo" />` : ''}

          ${issue.resolutionNotes ? `
          <div style="margin-top: 10px; padding: 8px; background: rgba(255,255,255,0.9); border-radius: 4px;">
            <strong>Resolution Notes:</strong> ${issue.resolutionNotes}
          </div>
          ` : ''}

          <div style="margin-top: 10px; font-size: 10px; color: #6B7280;">
            <div><strong>Reported by:</strong> ${issue.reportedBy || 'System'}</div>
            ${issue.resolvedBy ? `<div><strong>Resolved by:</strong> ${issue.resolvedBy}</div>` : ''}
          </div>
        </div>
        `;
      }).join('')}

      ${item.maintenanceTasks.length > 0 ? `
        <div style="padding: 15px; border-top: 1px solid #E5E7EB;">
          <h4 style="margin: 0 0 10px 0; color: #374151;">Maintenance Tasks</h4>
          ${item.maintenanceTasks.map((task: any) => `
            <div class="maintenance-task">
              <div class="task-header">
                <div class="task-title">${task.title}</div>
                <span class="status-badge ${task.status === 'COMPLETED' ? 'status-completed' : task.status === 'IN_PROGRESS' ? 'status-pending' : 'status-open'}">
                  ${task.status.replace('_', ' ')}
                </span>
              </div>
              <div style="font-size: 10px; color: #6B7280;">
                <div><strong>Type:</strong> ${task.taskType?.replace('_', ' ') || 'General'}</div>
                <div><strong>Due:</strong> ${task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-AU') : 'Not set'}</div>
                ${task.completedDate ? `<div><strong>Completed:</strong> ${new Date(task.completedDate).toLocaleDateString('en-AU')}</div>` : ''}
                ${task.assignedToName ? `<div><strong>Assigned to:</strong> ${task.assignedToName}</div>` : ''}
              </div>
              ${task.notes ? `<div style="margin-top: 8px; font-size: 10px;">${task.notes}</div>` : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
    ${index < equipment.length - 1 && (index + 1) % 3 === 0 ? '<div class="page-break"></div>' : ''}
    `;
  }).join('')}

  <div class="footer">
    <p><strong>Compliance Information:</strong></p>
    <p>This equipment safety compliance report is prepared in accordance with Australian Work Health and Safety (WHS) regulations and gymnastics industry standards.</p>
    <p>Regular equipment inspections and maintenance are mandatory requirements for insurance compliance and participant safety.</p>
    <p><strong>Report Generated:</strong> ${reportDate.toLocaleString('en-AU')} | <strong>Prepared by:</strong> ${authResult.user.fullName}</p>
    <p style="margin-top: 15px;">${club?.name} | ABN: ${club?.abn || 'N/A'}</p>
  </div>

  <button onclick="window.print()" class="no-print" style="position: fixed; top: 20px; right: 20px; padding: 12px 24px; background: #3B82F6; color: white; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    Print Report
  </button>
</body>
</html>
    `;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="equipment-compliance-report-${reportId}.html"`,
      },
    });
  } catch (error) {
    console.error('Error generating compliance report:', error);
    return NextResponse.json(
      { error: 'Failed to generate compliance report' },
      { status: 500 }
    );
  }
}

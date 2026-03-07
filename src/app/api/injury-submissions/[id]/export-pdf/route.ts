import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/apiAuth';

// GET /api/injury-submissions/[id]/export-pdf - Export submission as PDF
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const submission = await prisma.injurySubmission.findFirst({
      where: {
        id: id,
        clubId: authResult.user.clubId,
      },
      include: {
        template: {
          include: {
            club: {
              select: {
                name: true,
                address: true,
                city: true,
                state: true,
                phone: true,
              },
            },
          },
        },
        venue: {
          select: {
            name: true,
          },
        },
        zone: {
          select: {
            name: true,
            venue: {
              select: {
                name: true,
              },
            },
          },
        },
        equipment: {
          select: {
            name: true,
            serialNumber: true,
            category: true,
            condition: true,
            lastCheckedDate: true,
            lastCheckStatus: true,
            lastCheckedBy: true,
          },
        },
        data: {
          include: {
            field: true,
          },
        },
        assignedTo: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Parse submitter info
    const submitterInfo = submission.submitterInfo ? JSON.parse(submission.submitterInfo) : {};

    // Build HTML for PDF
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 40px;
      color: #333;
    }
    .header {
      border-bottom: 3px solid ${submission.template.headerColor || '#0078d4'};
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0;
      color: ${submission.template.headerColor || '#0078d4'};
    }
    .section {
      margin-bottom: 30px;
    }
    .section h2 {
      color: #444;
      border-bottom: 1px solid #ddd;
      padding-bottom: 10px;
    }
    .field {
      margin-bottom: 15px;
    }
    .field-label {
      font-weight: bold;
      color: #666;
    }
    .field-value {
      margin-top: 5px;
      padding: 10px;
      background: #f5f5f5;
      border-radius: 4px;
    }
    .metadata {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #ddd;
      font-size: 12px;
      color: #666;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
    }
    .status-new { background: #fff4e6; color: #d46b08; }
    .status-under-review { background: #e6f7ff; color: #0050b3; }
    .status-resolved { background: #f6ffed; color: #389e0d; }
    .status-closed { background: #f0f0f0; color: #595959; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Injury / Incident Report</h1>
    <p><strong>${submission.template.club.name}</strong></p>
    <p>${submission.template.club.address || ''} ${submission.template.club.city || ''} ${submission.template.club.state || ''}</p>
    <p>Report ID: ${submission.id}</p>
    <p>Form: ${submission.template.name}</p>
    <p>Status: <span class="status-badge status-${submission.status.toLowerCase().replace('_', '-')}">${submission.status}</span></p>
    ${submission.priority ? `<p>Priority: ${submission.priority}</p>` : ''}
  </div>

  <div class="section">
    <h2>Submission Details</h2>
    <div class="field">
      <div class="field-label">Submitted At:</div>
      <div class="field-value">${new Date(submission.submittedAt).toLocaleString()}</div>
    </div>
    ${submitterInfo.name ? `
    <div class="field">
      <div class="field-label">Submitted By:</div>
      <div class="field-value">${submitterInfo.name}</div>
    </div>
    ` : ''}
    ${submitterInfo.email ? `
    <div class="field">
      <div class="field-label">Email:</div>
      <div class="field-value">${submitterInfo.email}</div>
    </div>
    ` : ''}
    ${submitterInfo.phone ? `
    <div class="field">
      <div class="field-label">Phone:</div>
      <div class="field-value">${submitterInfo.phone}</div>
    </div>
    ` : ''}
  </div>

  ${submission.venue || submission.zone || submission.equipment ? `
  <div class="section">
    <h2>Location & Equipment Information</h2>
    ${submission.venue ? `
    <div class="field">
      <div class="field-label">Venue:</div>
      <div class="field-value">${submission.venue.name}</div>
    </div>
    ` : ''}
    ${submission.zone ? `
    <div class="field">
      <div class="field-label">Gym Zone / Area:</div>
      <div class="field-value">${submission.zone.name}${submission.zone.venue ? ` (${submission.zone.venue.name})` : ''}</div>
    </div>
    ` : ''}
    ${submission.equipment ? `
    <div class="field">
      <div class="field-label">Equipment / Apparatus:</div>
      <div class="field-value">
        <strong>${submission.equipment.name}</strong>
        ${submission.equipment.serialNumber ? `<br>Serial: ${submission.equipment.serialNumber}` : ''}
        ${submission.equipment.category ? `<br>Category: ${submission.equipment.category}` : ''}
        ${submission.equipment.condition ? `<br>Condition: ${submission.equipment.condition}` : ''}
      </div>
    </div>
    <div class="field">
      <div class="field-label">Equipment Safety Check Status:</div>
      <div class="field-value">
        ${submission.equipment.lastCheckedDate ? `
          <strong>Last Checked:</strong> ${new Date(submission.equipment.lastCheckedDate).toLocaleDateString()}<br>
          ${submission.equipment.lastCheckStatus ? `<strong>Status:</strong> ${submission.equipment.lastCheckStatus}<br>` : ''}
          ${submission.equipment.lastCheckedBy ? `<strong>Checked By:</strong> ${submission.equipment.lastCheckedBy}` : ''}
        ` : `
          <span style="color: #d48806;">⚠️ Never Checked</span> - No safety check recorded for this equipment
        `}
      </div>
    </div>
    ` : ''}
  </div>
  ` : ''}

  <div class="section">
    <h2>Report Data</h2>
    ${submission.data
      .sort((a, b) => a.field.order - b.field.order)
      .map((data) => {
        const value = JSON.parse(data.value);
        let displayValue;
        
        // Handle date/time fields
        if (data.field.fieldType === 'datetime' || data.field.label.toLowerCase().includes('date') || data.field.label.toLowerCase().includes('time')) {
          try {
            const dateValue = value.value || data.value;
            if (dateValue && dateValue !== 'N/A') {
              const date = new Date(dateValue);
              if (!isNaN(date.getTime())) {
                // Format as: "5:47pm Saturday 7th March, 2026"
                const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
                const day = date.getDate();
                const suffix = day === 1 || day === 21 || day === 31 ? 'st' : 
                              day === 2 || day === 22 ? 'nd' : 
                              day === 3 || day === 23 ? 'rd' : 'th';
                const month = date.toLocaleDateString('en-US', { month: 'long' });
                const year = date.getFullYear();
                displayValue = `${time} ${weekday} ${day}${suffix} ${month}, ${year}`;
              } else {
                displayValue = value.displayValue || value.value || 'N/A';
              }
            } else {
              displayValue = 'N/A';
            }
          } catch {
            displayValue = value.displayValue || value.value || 'N/A';
          }
        }
        // Handle Venue field - show name from submission.venue if available
        else if (data.field.label.toLowerCase().includes('venue') && submission.venue) {
          displayValue = submission.venue.name;
        }
        // Handle Zone/Area field - show name from submission.zone if available
        else if ((data.field.label.toLowerCase().includes('zone') || data.field.label.toLowerCase().includes('area')) && submission.zone) {
          displayValue = submission.zone.name;
        }
        // Handle Equipment field - show name from submission.equipment if available
        else if ((data.field.label.toLowerCase().includes('equipment') || data.field.label.toLowerCase().includes('apparatus')) && submission.equipment) {
          displayValue = submission.equipment.name;
        }
        // Handle array values
        else if (Array.isArray(value.value)) {
          displayValue = value.value.join(', ');
        }
        // Default: use displayValue, then value, then 'N/A'
        else {
          displayValue = value.displayValue || value.value || 'N/A';
        }
        
        return `
      <div class="field">
        <div class="field-label">${data.field.label}${data.field.required ? ' *' : ''}</div>
        <div class="field-value">${displayValue}</div>
      </div>
    `;
      })
      .join('')}
  </div>

  ${submission.assignedTo ? `
  <div class="section">
    <h2>Assignment</h2>
    <div class="field">
      <div class="field-label">Assigned To:</div>
      <div class="field-value">${submission.assignedTo.fullName} (${submission.assignedTo.email})</div>
    </div>
    <div class="field">
      <div class="field-label">Assigned At:</div>
      <div class="field-value">${submission.assignedAt ? new Date(submission.assignedAt).toLocaleString() : 'N/A'}</div>
    </div>
  </div>
  ` : ''}

  <div class="metadata">
    <p><strong>Retention Date:</strong> ${submission.retentionDate ? new Date(submission.retentionDate).toLocaleDateString() : 'N/A'}</p>
    <p><strong>This document is confidential and should be handled in accordance with Australian WHS regulations and Privacy Act 1988.</strong></p>
    <p>Generated on ${new Date().toLocaleString()} by ${authResult.user.fullName}</p>
  </div>
</body>
</html>
    `;

    // Return HTML (client will use browser's print to PDF feature)
    // For server-side PDF generation, we would use puppeteer or similar
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="injury-report-${submission.id}.html"`,
      },
    });
  } catch (error) {
    console.error('Error exporting PDF:', error);
    return NextResponse.json(
      { error: 'Failed to export PDF' },
      { status: 500 }
    );
  }
}

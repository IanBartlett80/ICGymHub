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

    // Helper function to get field value for display
    const getFieldValue = (label: string): string | null => {
      const data = submission.data.find(d => 
        d.field.label.toLowerCase().includes(label.toLowerCase())
      );
      if (!data) return null;
      
      try {
        const value = JSON.parse(data.value);
        return value.displayValue || value.value || null;
      } catch {
        return null;
      }
    };

    // Extract key information for header
    const athleteName = getFieldValue('athlete') || 'Unknown Athlete';
    const gymSport = getFieldValue('gymsport') || getFieldValue('gym sport');
    const classLevel = getFieldValue('class');
    const sportInfo = [gymSport, classLevel].filter(Boolean).join(' ');

    // Build HTML for PDF
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #333;
      line-height: 1.6;
      background: #f8f9fa;
    }
    
    .page {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 40px;
    }
    
    /* Header with Gradient */
    .header {
      background: linear-gradient(135deg, #2563eb 0%, #4f46e5 50%, #7c3aed 100%);
      color: white;
      padding: 40px;
      margin: -40px -40px 40px -40px;
      border-radius: 16px 16px 0 0;
    }
    
    .header-title {
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .header-subtitle {
      font-size: 18px;
      color: rgba(191, 219, 254, 1);
      margin-bottom: 4px;
    }
    
    .header-meta {
      margin-top: 20px;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.9);
    }
    
    .club-info {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.2);
      font-size: 14px;
    }
    
    /* Sections */
    .section {
      margin-bottom: 30px;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    
    .section-header {
      padding: 16px 24px;
      color: white;
      font-size: 16px;
      font-weight: bold;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .section-content {
      padding: 24px;
      background: white;
    }
    
    /* Section Colors */
    .section-blue .section-header {
      background: linear-gradient(90deg, #2563eb 0%, #4f46e5 100%);
    }
    
    .section-green .section-header {
      background: linear-gradient(90deg, #059669 0%, #10b981 100%);
    }
    
    .section-purple .section-header {
      background: linear-gradient(90deg, #9333ea 0%, #ec4899 100%);
    }
    
    .section-gray .section-header {
      background: linear-gradient(90deg, #4b5563 0%, #64748b 100%);
    }
    
    /* Fields */
    .field {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    
    .field-label {
      font-weight: 600;
      color: #4b5563;
      margin-bottom: 6px;
      font-size: 14px;
    }
    
    .field-value {
      padding: 12px;
      background: #f9fafb;
      border-radius: 8px;
      color: #1f2937;
      border: 1px solid #e5e7eb;
    }
    
    .field-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }
    
    /* Status badges */
    .status-badge {
      display: inline-block;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      border: 2px solid;
    }
    
    .status-new { 
      background: #fff4e6; 
      color: #d46b08; 
      border-color: #ffd591;
    }
    
    .status-under-review { 
      background: #e6f7ff; 
      color: #0050b3; 
      border-color: #91d5ff;
    }
    
    .status-resolved { 
      background: #f6ffed; 
      color: #389e0d; 
      border-color: #b7eb8f;
    }
    
    .status-closed { 
      background: #f0f0f0; 
      color: #595959; 
      border-color: #d9d9d9;
    }
    
    .priority-critical {
      background: #fff1f0;
      color: #cf1322;
      border-color: #ffa39e;
    }
    
    .priority-high {
      background: #fff7e6;
      color: #d46b08;
      border-color: #ffd591;
    }
    
    .priority-medium {
      background: #fffbe6;
      color: #d48806;
      border-color: #ffe58f;
    }
    
    .priority-low {
      background: #f6ffed;
      color: #389e0d;
      border-color: #b7eb8f;
    }
    
    /* Equipment photo */
    .equipment-photo {
      width: 80px;
      height: 80px;
      object-fit: cover;
      border-radius: 8px;
      border: 2px solid #e5e7eb;
      margin-right: 16px;
      float: left;
    }
    
    .equipment-info {
      overflow: hidden;
    }
    
    /* Safety check styling */
    .safety-check {
      background: #dbeafe;
      border: 1px solid: #93c5fd;
      padding: 16px;
      border-radius: 8px;
      margin-top: 12px;
    }
    
    .safety-check.never-checked {
      background: #fef3c7;
      border-color: #fde68a;
    }
    
    .safety-check-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    
    .safety-check-label {
      font-size: 12px;
      font-weight: 600;
      color: #4b5563;
    }
    
    .safety-check-value {
      font-size: 14px;
      font-weight: bold;
      color: #1f2937;
    }
    
    /* Footer */
    .footer {
      margin-top: 40px;
      padding-top: 24px;
      border-top: 2px solid #e5e7eb;
      font-size: 12px;
      color: #6b7280;
    }
    
    .confidential {
      background: #fef3c7;
      border: 2px solid #fde68a;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 16px;
      font-weight: 600;
      color: #92400e;
    }
    
    @media print {
      body {
        background: white;
      }
      
      .page {
        margin: 0;
        padding: 20px;
      }
      
      .section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="header-title">
        📋 Injury Report Details for ${athleteName}
      </div>
      <div class="header-subtitle">${submission.template.name}</div>
      ${sportInfo ? `<div class="header-subtitle">${sportInfo}</div>` : ''}
      <div class="header-meta">
        📅 Submitted on ${new Date(submission.submittedAt).toLocaleString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </div>
      <div class="club-info">
        <strong>${submission.template.club.name}</strong><br>
        ${submission.template.club.address || ''} ${submission.template.club.city || ''} ${submission.template.club.state || ''}<br>
        ${submission.template.club.phone ? `Phone: ${submission.template.club.phone}` : ''}
      </div>
    </div>

    <!-- Submission Information -->
    <div class="section section-blue">
      <div class="section-header">
        ℹ️ Submission Information
      </div>
      <div class="section-content">
        <div class="field-grid">
          <div class="field">
            <div class="field-label">Submitted At</div>
            <div class="field-value">${new Date(submission.submittedAt).toLocaleString()}</div>
          </div>
          <div class="field">
            <div class="field-label">Report ID</div>
            <div class="field-value">${submission.id}</div>
          </div>
          ${submitterInfo.name ? `
          <div class="field">
            <div class="field-label">Submitted By</div>
            <div class="field-value">${submitterInfo.name}</div>
          </div>
          ` : ''}
          ${submitterInfo.email ? `
          <div class="field">
            <div class="field-label">Email</div>
            <div class="field-value">${submitterInfo.email}</div>
          </div>
          ` : ''}
          ${submitterInfo.phone ? `
          <div class="field">
            <div class="field-label">Phone</div>
            <div class="field-value">${submitterInfo.phone}</div>
          </div>
          ` : ''}
          <div class="field">
            <div class="field-label">Status</div>
            <div class="field-value">
              <span class="status-badge status-${submission.status.toLowerCase().replace('_', '-')}">${submission.status.replace('_', ' ')}</span>
            </div>
          </div>
          ${submission.priority ? `
          <div class="field">
            <div class="field-label">Priority</div>
            <div class="field-value">
              <span class="status-badge priority-${submission.priority.toLowerCase()}">${submission.priority}</span>
            </div>
          </div>
          ` : ''}
        </div>
      </div>
    </div>

    <!-- Location & Equipment Information -->
    ${submission.venue || submission.zone || submission.equipment ? `
    <div class="section section-green">
      <div class="section-header">
        📍 Location & Equipment Information
      </div>
      <div class="section-content">
        <div class="field-grid">
          ${submission.venue ? `
          <div class="field">
            <div class="field-label">Venue</div>
            <div class="field-value">${submission.venue.name}</div>
          </div>
          ` : ''}
          ${submission.zone ? `
          <div class="field">
            <div class="field-label">Gym Zone / Area</div>
            <div class="field-value">${submission.zone.name}${submission.zone.venue ? ` (${submission.zone.venue.name})` : ''}</div>
          </div>
          ` : ''}
        </div>
        ${submission.equipment ? `
        <div class="field">
          <div class="field-label">Equipment / Apparatus</div>
          <div class="field-value">
            <div class="equipment-info">
              <strong>${submission.equipment.name}</strong>
              ${submission.equipment.serialNumber ? `<br>Serial: ${submission.equipment.serialNumber}` : ''}
              ${submission.equipment.category ? `<br>Category: <span class="status-badge" style="background: #dbeafe; color: #1e40af; border-color: #93c5fd;">${submission.equipment.category}</span>` : ''}
              ${submission.equipment.condition ? `<br>Condition: ${submission.equipment.condition}` : ''}
            </div>
          </div>
        </div>
        <div class="field">
          <div class="field-label">🔍 Equipment Safety Check Status</div>
          <div class="safety-check ${!submission.equipment.lastCheckedDate ? 'never-checked' : ''}">
            ${submission.equipment.lastCheckedDate ? `
              <div class="safety-check-row">
                <span class="safety-check-label">Last Checked:</span>
                <span class="safety-check-value">${new Date(submission.equipment.lastCheckedDate).toLocaleDateString()}</span>
              </div>
              ${submission.equipment.lastCheckStatus ? `
              <div class="safety-check-row">
                <span class="safety-check-label">Status:</span>
                <span class="safety-check-value">${submission.equipment.lastCheckStatus}</span>
              </div>
              ` : ''}
              ${submission.equipment.lastCheckedBy ? `
              <div class="safety-check-row">
                <span class="safety-check-label">Checked By:</span>
                <span class="safety-check-value">${submission.equipment.lastCheckedBy}</span>
              </div>
              ` : ''}
            ` : `
              <strong style="color: #92400e;">⚠️ Never Checked</strong><br>
              <span style="font-size: 12px; color: #78350f;">No safety check recorded for this equipment</span>
            `}
          </div>
        </div>
        ` : ''}
      </div>
    </div>
    ` : ''}

    <!-- Report Data -->
    <!-- Report Data -->
    <div class="section section-purple">
      <div class="section-header">
        📝 Report Data
      </div>
      <div class="section-content">
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
        // Handle Venue field
        else if (data.field.label.toLowerCase().includes('venue') && submission.venue) {
          displayValue = submission.venue.name;
        }
        // Handle Zone/Area field
        else if ((data.field.label.toLowerCase().includes('zone') || data.field.label.toLowerCase().includes('area')) && submission.zone) {
          displayValue = submission.zone.name;
        }
        // Handle Equipment field
        else if ((data.field.label.toLowerCase().includes('equipment') || data.field.label.toLowerCase().includes('apparatus')) && submission.equipment) {
          displayValue = submission.equipment.name;
        }
        // Handle array values
        else if (Array.isArray(value.value)) {
          displayValue = value.value.join(', ');
        }
        // Default
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
    </div>

    ${submission.assignedToName || submission.assignedTo ? `
    <div class="section section-gray">
      <div class="section-header">
        👤 Assignment
      </div>
      <div class="section-content">
        <div class="field">
          <div class="field-label">Assigned To</div>
          <div class="field-value">
            ${submission.assignedToName || (submission.assignedTo ? `${submission.assignedTo.fullName} (${submission.assignedTo.email})` : 'Not assigned')}
          </div>
        </div>
        ${submission.assignedAt ? `
        <div class="field">
          <div class="field-label">Assigned At</div>
          <div class="field-value">${new Date(submission.assignedAt).toLocaleString()}</div>
        </div>
        ` : ''}
      </div>
    </div>
    ` : ''}

    <!-- Footer -->
    <div class="footer">
      <div class="confidential">
        🔒 CONFIDENTIAL: This document contains sensitive information and should be handled in accordance with Australian WHS regulations and Privacy Act 1988.
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong>Retention Date:</strong> ${submission.retentionDate ? new Date(submission.retentionDate).toLocaleDateString() : 'To be determined'}
        </div>
        <div style="text-align: right;">
          Generated on ${new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })} at ${new Date().toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}<br>
          by ${authResult.user.fullName}
        </div>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    // Return HTML (client will use browser's print to PDF feature)
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="injury-report-${athleteName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${submission.id}.html"`,
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

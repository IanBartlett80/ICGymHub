import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/apiAuth';
import { sendEmail, getLogoHeaderHtml } from '@/lib/email';

const GYMHUB_LOGO_URL = 'https://longhornfloorplans.blob.core.windows.net/client-resources/GymHub_Logo.png';

// POST /api/injury-submissions/[id]/send-email - Email injury report
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { recipientEmail, recipientName } = body;

    if (!recipientEmail || typeof recipientEmail !== 'string') {
      return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 });
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail.trim())) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const submission = await prisma.injurySubmission.findFirst({
      where: {
        id: id,
        clubId: authResult.user.clubId,
      },
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
        venue: { select: { name: true } },
        zone: { select: { name: true, venue: { select: { name: true } } } },
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
        data: { include: { field: true } },
        assignedTo: { select: { fullName: true, email: true } },
      },
    });

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Resolve raw IDs to friendly names for venue/zone/equipment fields
    const cuidRegex = /^c[a-z0-9]{20,}$/;
    const idsToResolve: string[] = [];
    for (const d of submission.data) {
      try {
        const parsed = JSON.parse(d.value);
        const val = parsed.value || parsed.displayValue;
        if (typeof val === 'string' && cuidRegex.test(val)) idsToResolve.push(val);
      } catch {}
    }
    if (idsToResolve.length > 0) {
      const [rvenues, rzones, reqItems] = await Promise.all([
        prisma.venue.findMany({ where: { id: { in: idsToResolve } }, select: { id: true, name: true } }),
        prisma.zone.findMany({ where: { id: { in: idsToResolve } }, select: { id: true, name: true } }),
        prisma.equipment.findMany({ where: { id: { in: idsToResolve } }, select: { id: true, name: true } }),
      ]);
      const nameMap = new Map<string, string>();
      for (const v of rvenues) nameMap.set(v.id, v.name);
      for (const z of rzones) nameMap.set(z.id, z.name);
      for (const e of reqItems) nameMap.set(e.id, e.name);
      if (nameMap.size > 0) {
        for (const d of submission.data) {
          try {
            const parsed = JSON.parse(d.value);
            if (typeof parsed.value === 'string' && nameMap.has(parsed.value)) {
              parsed.displayValue = nameMap.get(parsed.value);
              d.value = JSON.stringify(parsed);
            }
          } catch {}
        }
      }
    }

    // Parse submitter info
    const submitterInfo = submission.submitterInfo ? JSON.parse(submission.submitterInfo) : {};

    // Helper to get display value for a field
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

    const athleteName = getFieldValue('athlete') || 'Unknown Athlete';
    const gymSport = getFieldValue('gymsport') || getFieldValue('gym sport');
    const classLevel = getFieldValue('class');
    const sportInfo = [gymSport, classLevel].filter(Boolean).join(' — ');

    // Build email HTML
    const htmlContent = buildInjuryReportEmailHtml({
      submission,
      submitterInfo,
      athleteName,
      sportInfo,
      senderName: authResult.user.fullName,
      recipientName: recipientName?.trim() || undefined,
    });

    const textContent = `Injury Report for ${athleteName} — ${submission.template.name}\n\nSubmitted: ${new Date(submission.submittedAt).toLocaleString()}\nStatus: ${submission.status}\nClub: ${submission.club.name}\n\nThis report was sent by ${authResult.user.fullName} via GymHub.\nPlease view the HTML version of this email for the full formatted report.`;

    const subject = `Injury Report: ${athleteName} — ${submission.template.name}`;

    await sendEmail({
      to: recipientEmail.trim(),
      subject,
      htmlContent,
      textContent,
    });

    return NextResponse.json({ success: true, message: 'Report sent successfully' });
  } catch (error) {
    console.error('Error sending injury report email:', error);
    return NextResponse.json(
      { error: 'Failed to send email. Please try again.' },
      { status: 500 }
    );
  }
}

// ────────────────────────────────────────────────────────
// HTML builder
// ────────────────────────────────────────────────────────

interface BuildEmailParams {
  submission: any;
  submitterInfo: any;
  athleteName: string;
  sportInfo: string;
  senderName: string;
  recipientName?: string;
}

function buildInjuryReportEmailHtml({
  submission,
  submitterInfo,
  athleteName,
  sportInfo,
  senderName,
  recipientName,
}: BuildEmailParams): string {
  const club = submission.club;

  const getConditionColor = (condition: string | null) => {
    if (!condition) return { bg: '#f3f4f6', text: '#6b7280', border: '#d1d5db' };
    const lower = condition.toLowerCase();
    if (lower === 'good') return { bg: '#dcfce7', text: '#166534', border: '#86efac' };
    if (lower === 'fair') return { bg: '#fef3c7', text: '#92400e', border: '#fde68a' };
    return { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' };
  };

  const getSafetyStatusColor = (status: string | null) => {
    if (!status) return { bg: '#fef3c7', text: '#92400e', border: '#fde68a' };
    const lower = status.toLowerCase();
    if (lower.includes('no issues') || lower.includes('passed'))
      return { bg: '#dcfce7', text: '#166534', border: '#86efac' };
    if (lower.includes('minor') || lower.includes('attention'))
      return { bg: '#fef3c7', text: '#92400e', border: '#fde68a' };
    return { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' };
  };

  const conditionColors = getConditionColor(submission.equipment?.condition || null);
  const safetyColors = getSafetyStatusColor(submission.equipment?.lastCheckStatus || null);

  const statusClass = submission.status.toLowerCase().replace('_', '-');
  const priorityClass = submission.priority ? submission.priority.toLowerCase() : null;

  // Status badge colors (inline for email clients)
  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    new: { bg: '#fff4e6', text: '#d46b08', border: '#ffd591' },
    'under-review': { bg: '#e6f7ff', text: '#0050b3', border: '#91d5ff' },
    resolved: { bg: '#f6ffed', text: '#389e0d', border: '#b7eb8f' },
    closed: { bg: '#f0f0f0', text: '#595959', border: '#d9d9d9' },
  };
  const priorityColors: Record<string, { bg: string; text: string; border: string }> = {
    critical: { bg: '#fff1f0', text: '#cf1322', border: '#ffa39e' },
    high: { bg: '#fff7e6', text: '#d46b08', border: '#ffd591' },
    medium: { bg: '#fffbe6', text: '#d48806', border: '#ffe58f' },
    low: { bg: '#f6ffed', text: '#389e0d', border: '#b7eb8f' },
  };

  const sc = statusColors[statusClass] || statusColors['new'];
  const pc = priorityClass ? priorityColors[priorityClass] || null : null;

  // Build report data rows
  const reportDataRows = submission.data
    .sort((a: any, b: any) => a.field.order - b.field.order)
    .map((data: any) => {
      const value = JSON.parse(data.value);
      let displayValue: string;

      if (data.field.fieldType === 'datetime' || data.field.label.toLowerCase().includes('date') || data.field.label.toLowerCase().includes('time')) {
        try {
          const dateValue = value.value || data.value;
          if (dateValue && dateValue !== 'N/A') {
            const date = new Date(dateValue);
            if (!isNaN(date.getTime())) {
              displayValue = date.toLocaleString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            } else {
              displayValue = value.displayValue || value.value || 'N/A';
            }
          } else {
            displayValue = 'N/A';
          }
        } catch {
          displayValue = value.displayValue || value.value || 'N/A';
        }
      } else if (data.field.label.toLowerCase().includes('venue') && submission.venue) {
        displayValue = submission.venue.name;
      } else if ((data.field.label.toLowerCase().includes('zone') || data.field.label.toLowerCase().includes('area')) && submission.zone) {
        displayValue = submission.zone.name;
      } else if ((data.field.label.toLowerCase().includes('equipment') || data.field.label.toLowerCase().includes('apparatus')) && submission.equipment) {
        displayValue = submission.equipment.name;
      } else if (Array.isArray(value.value)) {
        displayValue = value.value.join(', ');
      } else {
        displayValue = value.displayValue || value.value || 'N/A';
      }

      return `<tr>
        <td style="padding: 10px 16px; font-weight: 600; color: #4b5563; font-size: 14px; border-bottom: 1px solid #f3f4f6; width: 35%; vertical-align: top;">${data.field.label}</td>
        <td style="padding: 10px 16px; color: #1f2937; font-size: 14px; border-bottom: 1px solid #f3f4f6;">${displayValue}</td>
      </tr>`;
    })
    .join('');

  // Build equipment section
  let equipmentHtml = '';
  if (submission.equipment) {
    const eq = submission.equipment;
    equipmentHtml = `
    <!-- Equipment -->
    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      <tr>
        <td style="padding: 14px 20px; background: linear-gradient(90deg, #059669, #10b981); color: #ffffff; font-weight: bold; font-size: 15px; border-radius: 8px 8px 0 0;">
          &#x1F4CD; Location &amp; Equipment Information
        </td>
      </tr>
      <tr>
        <td style="padding: 20px; background: #ffffff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          ${submission.venue ? `<p style="margin: 0 0 8px; font-size: 14px;"><strong style="color: #4b5563;">Venue:</strong> <span style="color: #1f2937;">${submission.venue.name}</span></p>` : ''}
          ${submission.zone ? `<p style="margin: 0 0 8px; font-size: 14px;"><strong style="color: #4b5563;">Zone / Area:</strong> <span style="color: #1f2937;">${submission.zone.name}${submission.zone.venue ? ` (${submission.zone.venue.name})` : ''}</span></p>` : ''}
          <table role="presentation" style="width: 100%; border-collapse: collapse; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; margin-top: 12px;">
            <tr><td style="padding: 10px 16px; font-weight: 600; color: #4b5563; font-size: 13px; border-bottom: 1px solid #e5e7eb;">Equipment</td><td style="padding: 10px 16px; font-weight: 600; color: #1f2937;">${eq.name}</td></tr>
            ${eq.serialNumber ? `<tr><td style="padding: 10px 16px; font-weight: 600; color: #4b5563; font-size: 13px; border-bottom: 1px solid #e5e7eb;">Serial Number</td><td style="padding: 10px 16px; color: #1f2937;">${eq.serialNumber}</td></tr>` : ''}
            ${eq.category ? `<tr><td style="padding: 10px 16px; font-weight: 600; color: #4b5563; font-size: 13px; border-bottom: 1px solid #e5e7eb;">Category</td><td style="padding: 10px 16px;"><span style="display: inline-block; padding: 4px 12px; background: #dbeafe; color: #1e40af; border: 1px solid #93c5fd; border-radius: 12px; font-size: 13px; font-weight: 600;">${eq.category}</span></td></tr>` : ''}
            ${eq.condition ? `<tr><td style="padding: 10px 16px; font-weight: 600; color: #4b5563; font-size: 13px;">Condition</td><td style="padding: 10px 16px;"><span style="display: inline-block; padding: 4px 12px; background: ${conditionColors.bg}; color: ${conditionColors.text}; border: 2px solid ${conditionColors.border}; border-radius: 12px; font-size: 13px; font-weight: bold;">${eq.condition}</span></td></tr>` : ''}
          </table>
          ${eq.lastCheckedDate ? `
          <table role="presentation" style="width: 100%; border-collapse: collapse; background: #dbeafe; border: 2px solid #93c5fd; border-radius: 8px; margin-top: 12px;">
            <tr><td colspan="2" style="padding: 10px 16px; font-weight: bold; color: #1e40af; font-size: 14px; border-bottom: 1px solid #93c5fd;">&#x1F50D; Equipment Safety Check</td></tr>
            <tr><td style="padding: 8px 16px; font-weight: 600; color: #4b5563; font-size: 13px;">Last Checked</td><td style="padding: 8px 16px; font-weight: 500; color: #1f2937;">${new Date(eq.lastCheckedDate).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</td></tr>
            ${eq.lastCheckStatus ? `<tr><td style="padding: 8px 16px; font-weight: 600; color: #4b5563; font-size: 13px;">Status</td><td style="padding: 8px 16px;"><span style="display: inline-block; padding: 4px 12px; background: ${safetyColors.bg}; color: ${safetyColors.text}; border: 2px solid ${safetyColors.border}; border-radius: 12px; font-size: 13px; font-weight: bold;">${eq.lastCheckStatus}</span></td></tr>` : ''}
            ${eq.lastCheckedBy ? `<tr><td style="padding: 8px 16px; font-weight: 600; color: #4b5563; font-size: 13px;">Checked By</td><td style="padding: 8px 16px; font-weight: 500; color: #1f2937;">${eq.lastCheckedBy}</td></tr>` : ''}
          </table>
          ` : `
          <div style="background: #fef3c7; border: 2px solid #fde68a; padding: 12px 16px; border-radius: 8px; margin-top: 12px;">
            <strong style="color: #92400e;">&#x26A0;&#xFE0F; No safety check recorded for this equipment</strong>
          </div>
          `}
        </td>
      </tr>
    </table>`;
  } else if (submission.venue || submission.zone) {
    equipmentHtml = `
    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      <tr>
        <td style="padding: 14px 20px; background: linear-gradient(90deg, #059669, #10b981); color: #ffffff; font-weight: bold; font-size: 15px; border-radius: 8px 8px 0 0;">
          &#x1F4CD; Location Information
        </td>
      </tr>
      <tr>
        <td style="padding: 20px; background: #ffffff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          ${submission.venue ? `<p style="margin: 0 0 8px; font-size: 14px;"><strong style="color: #4b5563;">Venue:</strong> <span style="color: #1f2937;">${submission.venue.name}</span></p>` : ''}
          ${submission.zone ? `<p style="margin: 0; font-size: 14px;"><strong style="color: #4b5563;">Zone / Area:</strong> <span style="color: #1f2937;">${submission.zone.name}${submission.zone.venue ? ` (${submission.zone.venue.name})` : ''}</span></p>` : ''}
        </td>
      </tr>
    </table>`;
  }

  // Assignment section
  let assignmentHtml = '';
  if (submission.assignedToName || submission.assignedTo) {
    assignmentHtml = `
    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      <tr>
        <td style="padding: 14px 20px; background: linear-gradient(90deg, #4b5563, #64748b); color: #ffffff; font-weight: bold; font-size: 15px; border-radius: 8px 8px 0 0;">
          &#x1F464; Assignment
        </td>
      </tr>
      <tr>
        <td style="padding: 20px; background: #ffffff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="margin: 0; font-size: 14px;"><strong style="color: #4b5563;">Assigned To:</strong> <span style="color: #1f2937;">${submission.assignedToName || (submission.assignedTo ? `${submission.assignedTo.fullName} (${submission.assignedTo.email})` : 'Not assigned')}</span></p>
          ${submission.assignedAt ? `<p style="margin: 8px 0 0; font-size: 14px;"><strong style="color: #4b5563;">Assigned At:</strong> <span style="color: #1f2937;">${new Date(submission.assignedAt).toLocaleString('en-AU')}</span></p>` : ''}
        </td>
      </tr>
    </table>`;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Injury Report — ${athleteName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 30px 0; text-align: center;">
        <table role="presentation" style="width: 660px; max-width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          
          <!-- Logo -->
          <tr>
            <td style="padding: 20px 30px; text-align: center; background-color: #ffffff; border-radius: 8px 8px 0 0;">
              <img src="${GYMHUB_LOGO_URL}" alt="GymHub" width="160" style="display: block; margin: 0 auto; max-width: 160px; height: auto;" />
            </td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding: 30px 30px 24px; background: linear-gradient(135deg, #2563eb 0%, #4f46e5 50%, #7c3aed 100%); color: #ffffff;">
              <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: bold;">&#x1F4CB; Injury Report: ${athleteName}</h1>
              <p style="margin: 0 0 4px; font-size: 16px; color: #bfdbfe;">${submission.template.name}</p>
              ${sportInfo ? `<p style="margin: 0 0 4px; font-size: 14px; color: #bfdbfe;">${sportInfo}</p>` : ''}
              <p style="margin: 12px 0 0; font-size: 13px; color: rgba(255,255,255,0.9);">&#x1F4C5; Submitted on ${new Date(submission.submittedAt).toLocaleString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 24px 30px 8px;">
              <p style="margin: 0; font-size: 15px; color: #333333; line-height: 1.5;">
                ${recipientName ? `Hi ${recipientName},` : 'Hi,'}
              </p>
              <p style="margin: 8px 0 0; font-size: 15px; color: #333333; line-height: 1.5;">
                ${senderName} has shared the following injury report with you from GymHub.
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 16px 30px 30px;">

              <!-- Submission Info -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 14px 20px; background: linear-gradient(90deg, #2563eb, #4f46e5); color: #ffffff; font-weight: bold; font-size: 15px; border-radius: 8px 8px 0 0;">
                    &#x2139;&#xFE0F; Submission Information
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0; background: #ffffff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 10px 16px; font-weight: 600; color: #4b5563; font-size: 14px; border-bottom: 1px solid #f3f4f6; width: 35%;">Report ID</td>
                        <td style="padding: 10px 16px; color: #1f2937; font-size: 14px; border-bottom: 1px solid #f3f4f6;">${submission.id}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 16px; font-weight: 600; color: #4b5563; font-size: 14px; border-bottom: 1px solid #f3f4f6;">Submitted At</td>
                        <td style="padding: 10px 16px; color: #1f2937; font-size: 14px; border-bottom: 1px solid #f3f4f6;">${new Date(submission.submittedAt).toLocaleString('en-AU')}</td>
                      </tr>
                      ${submitterInfo.name ? `<tr><td style="padding: 10px 16px; font-weight: 600; color: #4b5563; font-size: 14px; border-bottom: 1px solid #f3f4f6;">Submitted By</td><td style="padding: 10px 16px; color: #1f2937; font-size: 14px; border-bottom: 1px solid #f3f4f6;">${submitterInfo.name}</td></tr>` : ''}
                      ${submitterInfo.email ? `<tr><td style="padding: 10px 16px; font-weight: 600; color: #4b5563; font-size: 14px; border-bottom: 1px solid #f3f4f6;">Email</td><td style="padding: 10px 16px; color: #1f2937; font-size: 14px; border-bottom: 1px solid #f3f4f6;">${submitterInfo.email}</td></tr>` : ''}
                      ${submitterInfo.phone ? `<tr><td style="padding: 10px 16px; font-weight: 600; color: #4b5563; font-size: 14px; border-bottom: 1px solid #f3f4f6;">Phone</td><td style="padding: 10px 16px; color: #1f2937; font-size: 14px; border-bottom: 1px solid #f3f4f6;">${submitterInfo.phone}</td></tr>` : ''}
                      <tr>
                        <td style="padding: 10px 16px; font-weight: 600; color: #4b5563; font-size: 14px; border-bottom: 1px solid #f3f4f6;">Status</td>
                        <td style="padding: 10px 16px; border-bottom: 1px solid #f3f4f6;">
                          <span style="display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: bold; background: ${sc.bg}; color: ${sc.text}; border: 2px solid ${sc.border};">${submission.status.replace('_', ' ')}</span>
                        </td>
                      </tr>
                      ${pc ? `<tr><td style="padding: 10px 16px; font-weight: 600; color: #4b5563; font-size: 14px;">Priority</td><td style="padding: 10px 16px;"><span style="display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: bold; background: ${pc.bg}; color: ${pc.text}; border: 2px solid ${pc.border};">${submission.priority}</span></td></tr>` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              ${equipmentHtml}

              <!-- Report Data -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 14px 20px; background: linear-gradient(90deg, #9333ea, #ec4899); color: #ffffff; font-weight: bold; font-size: 15px; border-radius: 8px 8px 0 0;">
                    &#x1F4DD; Report Data
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0; background: #ffffff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      ${reportDataRows}
                    </table>
                  </td>
                </tr>
              </table>

              ${assignmentHtml}

              <!-- Confidential Notice -->
              <div style="background: #fef3c7; border: 2px solid #fde68a; padding: 14px 18px; border-radius: 8px; margin-top: 8px;">
                <p style="margin: 0; font-size: 13px; font-weight: 600; color: #92400e;">
                  &#x1F512; CONFIDENTIAL: This document contains sensitive information and should be handled in accordance with Australian WHS regulations and Privacy Act 1988.
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #6b7280;">
                ${submission.retentionDate ? `Retention Date: ${new Date(submission.retentionDate).toLocaleDateString('en-AU')}` : ''}
              </p>
              <p style="margin: 6px 0 0; font-size: 12px; color: #6b7280;">
                Sent by ${senderName} via GymHub on ${new Date().toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <p style="margin: 6px 0 0; font-size: 11px; color: #9ca3af;">
                &copy; ${new Date().getFullYear()} ${club.name}. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

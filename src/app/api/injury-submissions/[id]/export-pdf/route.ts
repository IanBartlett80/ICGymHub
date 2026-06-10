import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/apiAuth';
import { ensureInjurySummary } from '@/lib/injurySummary';

const GYMHUB_LOGO_URL = 'https://longhornfloorplans.blob.core.windows.net/client-resources/GymHub_Logo.png';

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

    // Helper function to get equipment condition color
    const getConditionColor = (condition: string | null) => {
      if (!condition) return { bg: '#f3f4f6', text: '#6b7280', border: '#d1d5db' };
      const lower = condition.toLowerCase();
      if (lower === 'good') return { bg: '#dcfce7', text: '#166534', border: '#86efac' };
      if (lower === 'fair') return { bg: '#fef3c7', text: '#92400e', border: '#fde68a' };
      return { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' }; // Poor/Bad
    };

    // Helper function to get safety check status color
    const getSafetyStatusColor = (status: string | null) => {
      if (!status) return { bg: '#fef3c7', text: '#92400e', border: '#fde68a' };
      const lower = status.toLowerCase();
      if (lower.includes('no issues') || lower.includes('passed')) {
        return { bg: '#dcfce7', text: '#166534', border: '#86efac' };
      }
      if (lower.includes('minor') || lower.includes('attention')) {
        return { bg: '#fef3c7', text: '#92400e', border: '#fde68a' };
      }
      return { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' }; // Issues detected
    };

    const conditionColors = getConditionColor(submission.equipment?.condition || null);
    const safetyColors = getSafetyStatusColor(submission.equipment?.lastCheckStatus || null);

    // Ensure an AI incident summary exists (uses cache, generates if missing).
    let aiSummaryText: string | null = null;
    try {
      const summaryResult = await ensureInjurySummary(submission.id, authResult.user.clubId);
      aiSummaryText = summaryResult?.aiSummary ?? null;
    } catch (err) {
      console.error('Failed to ensure AI summary for PDF:', err);
    }

    // Determine the incident date — prefer an explicit incident/injury date
    // field from the report, falling back to the submission timestamp.
    let incidentDate = new Date(submission.submittedAt);
    for (const d of submission.data) {
      const label = d.field.label.toLowerCase();
      if (label.includes('date') && (label.includes('incident') || label.includes('injury') || label.includes('occur'))) {
        try {
          const v = JSON.parse(d.value);
          const dv = v.value || v.displayValue;
          const parsed = new Date(dv);
          if (!isNaN(parsed.getTime())) {
            incidentDate = parsed;
            break;
          }
        } catch {}
      }
    }

    // Human-readable incident reference number, e.g. INC-20260531-A1B2
    const idSuffix = submission.id.slice(-4).toUpperCase();
    const incidentNumber = `INC-${incidentDate.getFullYear()}${String(incidentDate.getMonth() + 1).padStart(2, '0')}${String(incidentDate.getDate()).padStart(2, '0')}-${idSuffix}`;

    const incidentDateStr = incidentDate.toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' });
    const packageGeneratedStr = new Date().toLocaleString('en-AU', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const facilityName = submission.template.club.name;

    // Build HTML for PDF
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Injury Report - ${athleteName}</title>
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
      padding: 20px;
    }

    /* Print/Save Buttons */
    .action-buttons {
      position: fixed;
      top: 20px;
      right: 20px;
      display: flex;
      gap: 12px;
      z-index: 1000;
    }

    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .btn-print {
      background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
      color: white;
    }

    .btn-print:hover {
      background: linear-gradient(135deg, #1d4ed8 0%, #4338ca 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    }

    .btn-save {
      background: linear-gradient(135deg, #059669 0%, #10b981 100%);
      color: white;
    }

    .btn-save:hover {
      background: linear-gradient(135deg, #047857 0%, #059669 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    }
    
    .page {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    /* Header with Gradient */
    .header {
      background: linear-gradient(135deg, #2563eb 0%, #4f46e5 50%, #7c3aed 100%);
      color: white;
      padding: 40px;
      margin: -40px -40px 40px -40px;
      border-radius: 8px 8px 0 0;
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
      page-break-inside: avoid;
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

    /* Status/Condition Cards */
    .status-card {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: bold;
      border: 2px solid;
      text-align: center;
    }

    .card-green {
      background: #dcfce7;
      color: #166534;
      border-color: #86efac;
    }

    .card-amber {
      background: #fef3c7;
      color: #92400e;
      border-color: #fde68a;
    }

    .card-red {
      background: #fee2e2;
      color: #991b1b;
      border-color: #fca5a5;
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
    
    /* Equipment info */
    .equipment-details {
      background: #f9fafb;
      padding: 16px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      margin-bottom: 16px;
    }

    .equipment-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
      align-items: center;
    }

    .equipment-row:last-child {
      margin-bottom: 0;
    }

    .equipment-label {
      font-weight: 600;
      color: #6b7280;
      font-size: 13px;
    }

    .equipment-value {
      font-weight: 500;
      color: #1f2937;
    }
    
    /* Safety check styling */
    .safety-check {
      background: #dbeafe;
      border: 2px solid #93c5fd;
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
      align-items: center;
    }

    .safety-check-row:last-child {
      margin-bottom: 0;
    }
    
    .safety-check-label {
      font-size: 13px;
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
      page-break-inside: avoid;
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

    /* ─── Formal Cover Page ─────────────────────────────── */
    .cover {
      page-break-after: always;
      padding: 0;
    }

    .cover-band {
      background: linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%);
      color: #ffffff;
      padding: 36px 40px;
      text-align: center;
      border-radius: 8px 8px 0 0;
      margin: -40px -40px 0 -40px;
    }

    .cover-logo {
      background: #ffffff;
      display: inline-block;
      padding: 12px 22px;
      border-radius: 10px;
      margin-bottom: 14px;
    }

    .cover-logo img {
      display: block;
      height: 42px;
      width: auto;
    }

    .cover-tagline {
      font-size: 12px;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: #c9a227;
      font-weight: 700;
    }

    .cover-body {
      text-align: center;
      padding: 48px 40px 32px;
    }

    .cover-emblem {
      width: 84px;
      height: 84px;
      border-radius: 50%;
      background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 24px;
      border: 4px solid #c9a227;
    }

    .cover-emblem svg { width: 42px; height: 42px; }

    .cover-title {
      font-size: 34px;
      font-weight: 800;
      color: #1e3a5f;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .cover-facility {
      font-size: 17px;
      color: #475569;
      margin-bottom: 4px;
    }

    .cover-divider {
      height: 3px;
      background: linear-gradient(90deg, transparent, #c9a227, transparent);
      margin: 28px 0;
    }

    .cover-meta {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 22px 40px;
      text-align: left;
      max-width: 620px;
      margin: 0 auto;
    }

    .cover-meta-label {
      font-size: 11px;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #94a3b8;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .cover-meta-value {
      font-size: 16px;
      color: #1e3a5f;
      font-weight: 700;
    }

    .cover-privileged {
      max-width: 620px;
      margin: 36px auto 0;
      background: #fff7ed;
      border: 1px solid #fdba74;
      border-left: 4px solid #c9a227;
      border-radius: 8px;
      padding: 16px 20px;
      text-align: left;
    }

    .cover-privileged-title {
      font-size: 12px;
      font-weight: 800;
      color: #9a3412;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }

    .cover-privileged-text {
      font-size: 12px;
      color: #7c2d12;
      line-height: 1.5;
    }

    /* ─── Branded continuation header ───────────────────── */
    .doc-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 24px;
      background: linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%);
      color: #ffffff;
      border-radius: 8px;
      margin-bottom: 28px;
    }

    .doc-header-logo {
      background: #ffffff;
      padding: 7px 14px;
      border-radius: 8px;
    }

    .doc-header-logo img { display: block; height: 26px; width: auto; }

    .doc-header-meta { text-align: right; font-size: 12px; line-height: 1.5; }
    .doc-header-meta strong { font-size: 14px; }

    /* ─── Incident Summary (AI) ─────────────────────────── */
    .summary-section {
      border: 1px solid #c7d2fe;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 30px;
      page-break-inside: avoid;
    }

    .summary-header {
      background: linear-gradient(90deg, #1e3a5f 0%, #4f46e5 100%);
      color: #ffffff;
      padding: 16px 24px;
      font-size: 16px;
      font-weight: bold;
    }

    .summary-content {
      padding: 24px;
      background: #f8fafc;
      color: #1f2937;
      font-size: 14px;
      line-height: 1.7;
      white-space: pre-wrap;
    }

    .summary-disclaimer {
      margin-top: 16px;
      font-size: 11px;
      color: #92400e;
      background: #fef3c7;
      border: 1px solid #fde68a;
      border-radius: 6px;
      padding: 8px 12px;
    }

    @media print {
      body {
        background: white;
        padding: 0;
      }
      
      .page {
        margin: 0;
        padding: 20px;
        box-shadow: none;
      }

      .action-buttons {
        display: none !important;
      }
      
      .section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <!-- Action Button -->
  <div class="action-buttons">
    <button onclick="window.print()" class="btn btn-print">
      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
      </svg>
      Print PDF
    </button>
  </div>

  <div class="page cover">
    <!-- Cover Band -->
    <div class="cover-band">
      <div class="cover-logo">
        <img src="${GYMHUB_LOGO_URL}" alt="GymHub" />
      </div>
      <div class="cover-tagline">Safety &amp; Risk Management Platform</div>
    </div>

    <!-- Cover Body -->
    <div class="cover-body">
      <div class="cover-emblem">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3z" fill="#1e3a5f" stroke="#c9a227" stroke-width="1.5"/>
          <path d="M9 12l2 2 4-4" stroke="#c9a227" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="cover-title">Incident Report</div>
      <div class="cover-facility">${facilityName}</div>
      ${sportInfo ? `<div class="cover-facility" style="font-size: 14px; color: #64748b;">${sportInfo}</div>` : ''}

      <div class="cover-divider"></div>

      <div class="cover-meta">
        <div>
          <div class="cover-meta-label">Facility Name</div>
          <div class="cover-meta-value">${facilityName}</div>
        </div>
        <div>
          <div class="cover-meta-label">Incident Number</div>
          <div class="cover-meta-value">${incidentNumber}</div>
        </div>
        <div>
          <div class="cover-meta-label">Incident Date</div>
          <div class="cover-meta-value">${incidentDateStr}</div>
        </div>
        <div>
          <div class="cover-meta-label">Participant</div>
          <div class="cover-meta-value">${athleteName}</div>
        </div>
        <div>
          <div class="cover-meta-label">Report Type</div>
          <div class="cover-meta-value">${submission.template.name}</div>
        </div>
        <div>
          <div class="cover-meta-label">Report Generated</div>
          <div class="cover-meta-value">${packageGeneratedStr}</div>
        </div>
      </div>

      <div class="cover-divider"></div>

      <div class="cover-privileged">
        <div class="cover-privileged-title">&#9888; CONFIDENTIAL &amp; PRIVILEGED</div>
        <div class="cover-privileged-text">
          This document contains sensitive personal and safety information. It is to be handled
          in accordance with Australian WHS regulations and the Privacy Act 1988. Unauthorised
          review, distribution, or disclosure is strictly prohibited.
        </div>
      </div>
    </div>
  </div>

  <div class="page">
    <!-- Branded continuation header -->
    <div class="doc-header">
      <div class="doc-header-logo">
        <img src="${GYMHUB_LOGO_URL}" alt="GymHub" />
      </div>
      <div class="doc-header-meta">
        <strong>${incidentNumber}</strong><br>
        ${athleteName} &middot; ${incidentDateStr}
      </div>
    </div>

    ${aiSummaryText ? `
    <!-- Incident Summary (AI-assisted) -->
    <div class="summary-section">
      <div class="summary-header">
        Incident Summary
      </div>
      <div class="summary-content">${aiSummaryText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
        <div class="summary-disclaimer">
          &#9888; AI-assisted summary generated from the submitted report details. Always verify against the original report data below.
        </div>
      </div>
    </div>
    ` : ''}


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
          <div class="equipment-details">
            <div class="equipment-row">
              <span class="equipment-label">Name:</span>
              <span class="equipment-value"><strong>${submission.equipment.name}</strong></span>
            </div>
            ${submission.equipment.serialNumber ? `
            <div class="equipment-row">
              <span class="equipment-label">Serial Number:</span>
              <span class="equipment-value">${submission.equipment.serialNumber}</span>
            </div>
            ` : ''}
            ${submission.equipment.category ? `
            <div class="equipment-row">
              <span class="equipment-label">Category:</span>
              <span class="equipment-value">
                <span class="status-badge" style="background: #dbeafe; color: #1e40af; border-color: #93c5fd;">${submission.equipment.category}</span>
              </span>
            </div>
            ` : ''}
            ${submission.equipment.condition ? `
            <div class="equipment-row">
              <span class="equipment-label">Condition:</span>
              <span class="equipment-value">
                <span class="status-card" style="background: ${conditionColors.bg}; color: ${conditionColors.text}; border-color: ${conditionColors.border};">
                  ${submission.equipment.condition}
                </span>
              </span>
            </div>
            ` : ''}
          </div>
        </div>
        <div class="field">
          <div class="field-label">🔍 Equipment Safety Check Status</div>
          <div class="safety-check ${!submission.equipment.lastCheckedDate ? 'never-checked' : ''}">
            ${submission.equipment.lastCheckedDate ? `
              <div class="safety-check-row">
                <span class="safety-check-label">Last Checked:</span>
                <span class="safety-check-value">${(() => {
                  const date = new Date(submission.equipment.lastCheckedDate);
                  const day = date.getDate();
                  const suffix = day === 1 || day === 21 || day === 31 ? 'st' : 
                               day === 2 || day === 22 ? 'nd' : 
                               day === 3 || day === 23 ? 'rd' : 'th';
                  const weekday = date.toLocaleDateString('en-AU', { weekday: 'long' });
                  const month = date.toLocaleDateString('en-AU', { month: 'long' });
                  const year = date.getFullYear();
                  return `${weekday}, ${day}${suffix} ${month}, ${year}`;
                })()}</span>
              </div>
              ${submission.equipment.lastCheckStatus ? `
              <div class="safety-check-row">
                <span class="safety-check-label">Status:</span>
                <span class="equipment-value">
                  <span class="status-card" style="background: ${safetyColors.bg}; color: ${safetyColors.text}; border-color: ${safetyColors.border};">
                    ${submission.equipment.lastCheckStatus}
                  </span>
                </span>
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

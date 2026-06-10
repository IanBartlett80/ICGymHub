import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/apiAuth';
import { prisma } from '@/lib/prisma';
import { getClubMetrics, type ClubMetrics } from '@/lib/analytics/snapshot';
import { generateNarrative } from '@/lib/analytics/ai';

const LOGO_URL = 'https://longhornfloorplans.blob.core.windows.net/client-resources/GymHub_Logo.png';

type Section = 'overview' | 'injuries' | 'equipment' | 'compliance' | 'rosters';
const SECTION_TITLES: Record<Section, string> = {
  overview: 'Operations & Safety Report',
  injuries: 'Injuries & Incidents Report',
  equipment: 'Equipment & Safety Report',
  compliance: 'Compliance Report',
  rosters: 'Rosters & Coaching Report',
};

const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

function card(label: string, value: string | number, tone: 'red' | 'amber' | 'green' | 'neutral' = 'neutral') {
  const colors: Record<string, string> = {
    red: '#dc2626',
    amber: '#d97706',
    green: '#059669',
    neutral: '#1e293b',
  };
  return `<div class="kpi"><div class="kpi-value" style="color:${colors[tone]}">${esc(value)}</div><div class="kpi-label">${esc(label)}</div></div>`;
}

function breakdownRows(rows: { label: string; value: number }[]) {
  if (!rows.length) return '<tr><td colspan="2" class="muted">No data</td></tr>';
  return rows.map((r) => `<tr><td>${esc(r.label)}</td><td class="num">${esc(r.value)}</td></tr>`).join('');
}

function sectionCards(section: Section, m: ClubMetrics): string {
  if (section === 'injuries') {
    return (
      card('Open incidents', m.injuries.open, m.injuries.open > 0 ? 'amber' : 'green') +
      card('High / critical', m.injuries.critical, m.injuries.critical > 0 ? 'red' : 'green') +
      card('New (30 days)', m.injuries.new30d) +
      card('Resolved (30 days)', m.injuries.resolved30d, 'green')
    );
  }
  if (section === 'equipment') {
    const oos = m.equipment.conditionBreakdown.find((c) => /out of service/i.test(c.label))?.value || 0;
    return (
      card('Active equipment', m.equipment.active) +
      card('Out of service', oos, oos > 0 ? 'red' : 'green') +
      card('Maintenance overdue', m.maintenance.overdue, m.maintenance.overdue > 0 ? 'red' : 'green') +
      card('Open safety issues', m.safety.open, m.safety.open > 0 ? 'amber' : 'green')
    );
  }
  if (section === 'compliance') {
    return (
      card('Completion rate', `${m.compliance.completionRate}%`, m.compliance.completionRate >= 85 ? 'green' : m.compliance.completionRate >= 65 ? 'amber' : 'red') +
      card('Open items', m.compliance.open) +
      card('Overdue', m.compliance.overdue, m.compliance.overdue > 0 ? 'red' : 'green') +
      card('Due within 7 days', m.compliance.due7, m.compliance.due7 > 0 ? 'amber' : 'green')
    );
  }
  if (section === 'rosters') {
    return (
      card('Sessions (window)', m.rosters.sessions) +
      card('Conflict slots', m.rosters.conflictSlots, m.rosters.conflictSlots > 0 ? 'amber' : 'green') +
      card('Upcoming conflicts', m.rosters.upcomingConflicts, m.rosters.upcomingConflicts > 0 ? 'red' : 'green') +
      card('Active coaches', m.rosters.activeCoaches)
    );
  }
  // overview
  return (
    card('Open incidents', m.injuries.open, m.injuries.open > 0 ? 'amber' : 'green') +
    card('Open safety issues', m.safety.open, m.safety.open > 0 ? 'amber' : 'green') +
    card('Maintenance overdue', m.maintenance.overdue, m.maintenance.overdue > 0 ? 'red' : 'green') +
    card('Compliance overdue', m.compliance.overdue, m.compliance.overdue > 0 ? 'red' : 'green') +
    card('Roster conflicts', m.rosters.conflictSlots, m.rosters.conflictSlots > 0 ? 'amber' : 'green') +
    card('Compliance rate', `${m.compliance.completionRate}%`, m.compliance.completionRate >= 85 ? 'green' : 'amber')
  );
}

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const clubId = auth.user.clubId;

    const url = new URL(req.url);
    const sectionParam = (url.searchParams.get('section') || 'overview') as Section;
    const section: Section = SECTION_TITLES[sectionParam] ? sectionParam : 'overview';

    const [club, metrics] = await Promise.all([
      prisma.club.findUnique({ where: { id: clubId }, select: { name: true } }),
      getClubMetrics(clubId),
    ]);

    const facts = await buildSnapshotForNarrative(section, metrics);
    const narrative = await generateNarrative(
      `You are an operations analyst preparing the executive summary for a gymnastics club "${esc(club?.name || 'Club')}" ${SECTION_TITLES[section]}. Write 2-3 short paragraphs in plain, professional language. Highlight the most material risks and what to prioritise. Use ONLY the figures provided — never invent numbers.`,
      facts,
      400
    );

    const generated = new Date(metrics.generatedAt);
    const dateStr = generated.toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${esc(SECTION_TITLES[section])} - ${esc(club?.name || 'Club')}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #1e293b; background: #f1f5f9; line-height: 1.55; }
  .actions { position: fixed; top: 18px; right: 18px; display: flex; gap: 10px; z-index: 50; }
  .btn { padding: 10px 18px; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; color: #fff; background: linear-gradient(135deg, #2563eb, #4f46e5); box-shadow: 0 2px 6px rgba(0,0,0,.15); }
  .page { max-width: 900px; margin: 0 auto; background: #fff; }
  .cover { background: linear-gradient(135deg, #1e3a8a 0%, #4338ca 55%, #6d28d9 100%); color: #fff; padding: 64px 56px; }
  .cover img { height: 54px; margin-bottom: 36px; }
  .cover .eyebrow { font-size: 13px; letter-spacing: .14em; text-transform: uppercase; color: #c7d2fe; }
  .cover h1 { font-size: 38px; font-weight: 800; margin: 10px 0 6px; }
  .cover .club { font-size: 19px; color: #e0e7ff; }
  .cover .meta { margin-top: 28px; padding-top: 18px; border-top: 1px solid rgba(255,255,255,.25); font-size: 13px; color: #dbeafe; }
  .body { padding: 44px 56px 56px; }
  h2 { font-size: 16px; text-transform: uppercase; letter-spacing: .06em; color: #475569; margin: 0 0 16px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
  .section { margin-bottom: 40px; }
  .kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  .kpi { border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; background: #f8fafc; }
  .kpi-value { font-size: 28px; font-weight: 800; }
  .kpi-label { font-size: 12px; color: #64748b; margin-top: 4px; }
  .summary { background: #f8fafc; border-left: 4px solid #4f46e5; border-radius: 0 10px 10px 0; padding: 18px 22px; font-size: 14px; color: #334155; }
  .summary p { margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: left; padding: 9px 12px; border-bottom: 1px solid #eef2f7; }
  th { color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; }
  td.num { text-align: right; font-weight: 600; }
  .muted { color: #94a3b8; font-style: italic; }
  .tables { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }
  .footer { padding: 22px 56px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  @media print { body { background: #fff; } .actions { display: none; } .page { max-width: none; } .cover { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .kpi, .summary { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="actions"><button class="btn" onclick="window.print()">Print / Save PDF</button></div>
  <div class="page">
    <div class="cover">
      <img src="${LOGO_URL}" alt="GymHub" onerror="this.style.display='none'">
      <div class="eyebrow">Analytics</div>
      <h1>${esc(SECTION_TITLES[section])}</h1>
      <div class="club">${esc(club?.name || 'Club')}</div>
      <div class="meta">Generated ${esc(dateStr)} &middot; Venues: ${esc(metrics.venues.map((v) => v.name).join(', ') || 'All')}</div>
    </div>
    <div class="body">
      <div class="section">
        <h2>Key metrics</h2>
        <div class="kpis">${sectionCards(section, metrics)}</div>
      </div>
      <div class="section">
        <h2>Executive summary</h2>
        <div class="summary">${
          narrative
            ? narrative.split('\n').map((l) => l.trim()).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join('')
            : '<p class="muted">AI narrative is not enabled for this workspace. The figures above reflect your current live data.</p>'
        }</div>
      </div>
      <div class="section">
        <h2>Breakdown</h2>
        <div class="tables">
          <div>
            <table>
              <thead><tr><th>Incident status</th><th class="num">Count</th></tr></thead>
              <tbody>${breakdownRows(metrics.injuries.statusBreakdown)}</tbody>
            </table>
          </div>
          <div>
            <table>
              <thead><tr><th>Equipment condition</th><th class="num">Count</th></tr></thead>
              <tbody>${breakdownRows(metrics.equipment.conditionBreakdown)}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    <div class="footer">
      GymHub Analytics &middot; This report is generated from live, club-only aggregate data and contains no personal information. Verify against detailed dashboards before acting on material decisions.
    </div>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="gymhub-${section}-report.html"`,
      },
    });
  } catch (err) {
    console.error('Analytics export failed:', err);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}

async function buildSnapshotForNarrative(section: Section, m: ClubMetrics): Promise<string> {
  const lines = [
    `Report focus: ${SECTION_TITLES[section]}.`,
    `Open incidents: ${m.injuries.open} (${m.injuries.critical} high/critical), ${m.injuries.new30d} new and ${m.injuries.resolved30d} resolved in last 30 days.`,
    `Equipment: ${m.equipment.active} active. Condition: ${m.equipment.conditionBreakdown.map((c) => `${c.label} ${c.value}`).join(', ') || 'none'}.`,
    `Safety issues: ${m.safety.open} open (${m.safety.critical} critical).`,
    `Maintenance: ${m.maintenance.overdue} overdue, ${m.maintenance.due7} due within 7 days.`,
    `Compliance: ${m.compliance.open} open, ${m.compliance.overdue} overdue, ${m.compliance.due7} due within 7 days, completion rate ${m.compliance.completionRate}%.`,
    `Rosters: ${m.rosters.sessions} sessions in window, ${m.rosters.conflictSlots} conflict slots, ${m.rosters.upcomingConflicts} upcoming conflicts, ${m.rosters.activeCoaches} active coaches.`,
  ];
  return lines.join('\n');
}

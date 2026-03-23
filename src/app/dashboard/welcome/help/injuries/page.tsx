'use client'

import { Shield, FileText, QrCode, Bell, BarChart3, Settings, CheckSquare } from 'lucide-react'
import HelpLayout from '../HelpLayout'

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10 last:mb-0">
      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
          <Icon className="w-5 h-5 text-red-600" />
        </div>
        {title}
      </h2>
      <div className="text-gray-700 space-y-3 ml-11">
        {children}
      </div>
    </div>
  )
}

export default function InjuriesHelpPage() {
  return (
    <HelpLayout
      title="Injuries & Incidents — Admin Guide"
      description="How to set up injury reporting forms, track incidents, and use analytics to improve safety."
    >
      <div className="prose prose-gray max-w-none">
        <Section icon={Shield} title="Overview">
          <p>
            The Injuries & Incidents module provides a complete system for reporting, tracking, and
            analysing injuries and safety incidents at your club. It includes customisable forms,
            QR code-based reporting, automated notifications, and trend analytics.
          </p>
          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg mt-4">
            <p className="text-sm text-blue-800">
              <strong>Prerequisites:</strong> Configure <strong>Gym Sports</strong> and
              <strong> Gym Zones</strong> in Club Settings. Injury forms can be customised per gym sport, and
              incidents are recorded with zone location data.
            </p>
          </div>
        </Section>

        <Section icon={FileText} title="Step 1: Configure Form Templates">
          <p>
            Injury form templates define what information gets collected when an incident is reported.
            You can create different templates for different gym sports.
          </p>
          <h4 className="font-semibold text-gray-900 mt-4 mb-2">How to set up:</h4>
          <ol className="list-decimal list-inside space-y-2">
            <li>Navigate to <strong>Injuries & Incidents → Form Templates</strong></li>
            <li>Click <strong>Create Template</strong></li>
            <li>Select the gym sport this template applies to</li>
            <li>Configure the fields: athlete details, injury type, body part, severity, description</li>
            <li>Add any custom fields specific to your club&apos;s reporting needs</li>
            <li>Activate the template to make it available for reporting</li>
          </ol>
          <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-lg mt-4">
            <p className="text-sm text-amber-800">
              <strong>Tip:</strong> Start with a general template that covers all sports, then create
              sport-specific templates as needed (e.g., apparatus-specific fields for MAG/WAG).
            </p>
          </div>
        </Section>

        <Section icon={QrCode} title="Step 2: Set Up QR Code Reporting">
          <p>
            GymHub generates QR codes that can be displayed at each zone or venue. Coaches and
            staff can scan the code to quickly submit an injury report from their phone.
          </p>
          <h4 className="font-semibold text-gray-900 mt-4 mb-2">How to deploy QR codes:</h4>
          <ol className="list-decimal list-inside space-y-2">
            <li>Each zone automatically generates a unique QR code</li>
            <li>Print the QR codes and display them in the corresponding zones</li>
            <li>When scanned, the form pre-fills the zone and venue information</li>
            <li>Reports can be submitted without a GymHub login (public access)</li>
          </ol>
        </Section>

        <Section icon={Bell} title="Step 3: Configure Notifications">
          <p>
            Set up automated email notifications so the right people are informed when incidents occur:
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>All incidents</strong> — Notify club admins of every report</li>
            <li><strong>Critical incidents</strong> — Immediate alerts for high-severity injuries</li>
            <li><strong>Custom rules</strong> — Route notifications by gym sport, zone, or severity</li>
          </ul>
          <p className="mt-3">
            Configure notification recipients in <strong>Club Settings → Notifications</strong>.
          </p>
        </Section>

        <Section icon={Settings} title="Reviewing Submissions">
          <p>
            All submitted injury reports appear in <strong>Injuries & Incidents → Reports</strong>:
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>View all submissions with filtering by date, sport, severity, and zone</li>
            <li>Review individual reports with full details and any attached images</li>
            <li>Update the status (Open, Under review, Resolved)</li>
            <li>Add follow-up notes and actions taken</li>
          </ul>
        </Section>

        <Section icon={BarChart3} title="Analytics & Trends">
          <p>
            The Analytics page helps you identify patterns and improve safety:
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Incident trends</strong> — Monthly and weekly incident counts over time</li>
            <li><strong>Severity distribution</strong> — Breakdown by injury severity level</li>
            <li><strong>Zone hotspots</strong> — Which zones have the most incidents</li>
            <li><strong>Sport breakdown</strong> — Injury rates by gym sport</li>
            <li><strong>Body part analysis</strong> — Most commonly injured body areas</li>
          </ul>
          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg mt-4">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> Review analytics monthly to identify concerning trends early.
              A spike in incidents at a specific zone may indicate an equipment or training issue.
            </p>
          </div>
        </Section>

        <Section icon={CheckSquare} title="Best Practices">
          <ul className="list-disc list-inside space-y-2">
            <li>Display QR codes prominently in every training zone for quick reporting</li>
            <li>Encourage coaches to report all incidents, even minor ones — this builds trend data</li>
            <li>Review and close submissions promptly to maintain accurate open/resolved counts</li>
            <li>Use sport-specific templates to capture relevant details (e.g., apparatus for WAG)</li>
            <li>Cross-reference injury analytics with equipment maintenance records for zones with high incident rates</li>
          </ul>
        </Section>
      </div>
    </HelpLayout>
  )
}

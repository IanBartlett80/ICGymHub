'use client'

import { Settings, Building2, Activity, MapPin, Users, Bell, ShieldCheck } from 'lucide-react'
import HelpLayout from '../HelpLayout'

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10 last:mb-0">
      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
          <Icon className="w-5 h-5 text-indigo-600" />
        </div>
        {title}
      </h2>
      <div className="text-gray-700 space-y-3 ml-11">
        {children}
      </div>
    </div>
  )
}

export default function SettingsHelpPage() {
  return (
    <HelpLayout
      title="Club Settings — Admin Guide"
      description="How to configure your club's foundational settings. Complete these steps to unlock all GymHub features."
    >
      <div className="prose prose-gray max-w-none">
        <Section icon={Settings} title="Overview">
          <p>
            Club Settings is where you configure the core data that powers every other module in GymHub.
            We recommend completing setup in the numbered order shown on the Club Settings page.
          </p>
          <p>
            You can use the <strong>Setup Wizard</strong> for a guided experience, or configure each
            section manually.
          </p>
        </Section>

        <Section icon={Building2} title="1. Venues">
          <p>
            Venues represent your physical locations. Most clubs have a single venue, but GymHub supports
            multiple locations.
          </p>
          <h4 className="font-semibold text-gray-900 mt-4 mb-2">How to set up:</h4>
          <ol className="list-decimal list-inside space-y-2">
            <li>Navigate to <strong>Club Settings → Venues</strong></li>
            <li>Click <strong>Add Venue</strong> and enter the venue name</li>
            <li>A URL slug is auto-generated — you can customise it if needed</li>
            <li>Add address details and contact information</li>
          </ol>
          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg mt-4">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> You need at least one venue before you can create zones or assign equipment to locations.
            </p>
          </div>
        </Section>

        <Section icon={Activity} title="2. Gym Sports">
          <p>
            Gym sports define the gymnastics disciplines your club offers (e.g., MAG, WAG, REC, ACRO).
            These are used for coach accreditations, class categorisation, and injury form templates.
          </p>
          <h4 className="font-semibold text-gray-900 mt-4 mb-2">How to set up:</h4>
          <ol className="list-decimal list-inside space-y-2">
            <li>Navigate to <strong>Club Settings → Gym Sports</strong></li>
            <li>Click on any predefined sport to <strong>activate</strong> it</li>
            <li>Use <strong>Add Custom Gym Sport</strong> if your discipline isn&apos;t listed</li>
            <li>Deactivate sports you don&apos;t offer — they won&apos;t appear in other modules</li>
          </ol>
        </Section>

        <Section icon={MapPin} title="3. Gym Zones">
          <p>
            Zones define specific training areas within each venue (e.g., Floor Area, Vault, Balance Beam).
            They&apos;re used for rostering, equipment tracking, and injury location reporting.
          </p>
          <h4 className="font-semibold text-gray-900 mt-4 mb-2">How to set up:</h4>
          <ol className="list-decimal list-inside space-y-2">
            <li>Navigate to <strong>Club Settings → Gym Zones</strong></li>
            <li>Use <strong>Quick Add</strong> to create common zones instantly, or create custom ones</li>
            <li>Assign each zone to a venue</li>
            <li>Enable <strong>Allow Overlap</strong> if multiple classes can use the zone simultaneously</li>
          </ol>
          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg mt-4">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> Zones are central to GymHub. Equipment gets assigned to zones, injuries are reported by zone, and rosters can be filtered by zone.
            </p>
          </div>
        </Section>

        <Section icon={Users} title="4. Coaches">
          <p>
            Add your coaching staff to enable roster creation and availability tracking.
            Coaches can be assigned to specific gym sports and classes.
          </p>
          <h4 className="font-semibold text-gray-900 mt-4 mb-2">How to set up:</h4>
          <ol className="list-decimal list-inside space-y-2">
            <li>Navigate to <strong>Club Settings → Coaches</strong></li>
            <li>Click <strong>Add Coach</strong> and enter their name and contact details</li>
            <li>Assign the gym sports they are accredited to coach</li>
            <li>Set their weekly availability for scheduling</li>
          </ol>
          <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-lg mt-4">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> Coach profiles are separate from user accounts. A coach doesn&apos;t need a GymHub login unless they need system access.
            </p>
          </div>
        </Section>

        <Section icon={Bell} title="5. Notifications">
          <p>
            Configure how your club receives alerts for injuries, safety issues, maintenance reminders,
            and compliance deadlines.
          </p>
          <h4 className="font-semibold text-gray-900 mt-4 mb-2">How to set up:</h4>
          <ol className="list-decimal list-inside space-y-2">
            <li>Navigate to <strong>Club Settings → Notifications</strong></li>
            <li>Configure email recipients for each notification type</li>
            <li>Set notification frequency and severity thresholds</li>
            <li>Test notifications to ensure delivery</li>
          </ol>
        </Section>

        <Section icon={ShieldCheck} title="6. Roles & Permissions">
          <p>
            Control who can access what within GymHub. Assign roles to team members to restrict
            or grant access to specific features.
          </p>
          <h4 className="font-semibold text-gray-900 mt-4 mb-2">Available roles:</h4>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Admin</strong> — Full access to all features and settings</li>
            <li><strong>Manager</strong> — Access to day-to-day operations without system configuration</li>
            <li><strong>Coach</strong> — View-only access to relevant rostering and class information</li>
          </ul>
        </Section>
      </div>
    </HelpLayout>
  )
}

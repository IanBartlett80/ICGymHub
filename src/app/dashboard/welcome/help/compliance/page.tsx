'use client'

import { ClipboardCheck, FolderOpen, Calendar, Bell, BarChart3, Upload, CheckSquare } from 'lucide-react'
import HelpLayout from '../HelpLayout'

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10 last:mb-0">
      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
          <Icon className="w-5 h-5 text-green-600" />
        </div>
        {title}
      </h2>
      <div className="text-gray-700 space-y-3 ml-11">
        {children}
      </div>
    </div>
  )
}

export default function ComplianceHelpPage() {
  return (
    <HelpLayout
      title="Compliance Manager — Admin Guide"
      description="How to set up and track compliance items, manage deadlines, and ensure your club meets all regulatory requirements."
    >
      <div className="prose prose-gray max-w-none">
        <Section icon={ClipboardCheck} title="Overview">
          <p>
            The Compliance Manager helps you track all regulatory requirements, certifications,
            insurances, and internal policies your club must maintain. It provides automated
            reminders, document storage, and completion tracking.
          </p>
          <p>
            Examples of compliance items: coach Working with Children checks, public liability
            insurance, first aid certifications, equipment safety audits, and venue permits.
          </p>
        </Section>

        <Section icon={FolderOpen} title="Step 1: Create Categories">
          <p>
            Categories help you organise compliance items into logical groups.
          </p>
          <h4 className="font-semibold text-gray-900 mt-4 mb-2">Suggested categories:</h4>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Insurance</strong> — Public liability, professional indemnity, equipment insurance</li>
            <li><strong>Staff Certifications</strong> — Working with Children, first aid, coaching accreditations</li>
            <li><strong>Venue Compliance</strong> — Fire safety, occupancy permits, health inspections</li>
            <li><strong>Equipment Audits</strong> — Annual apparatus inspections, safety certifications</li>
            <li><strong>Policies</strong> — Code of conduct, privacy policy, safeguarding policy</li>
          </ul>
          <h4 className="font-semibold text-gray-900 mt-4 mb-2">How to create:</h4>
          <ol className="list-decimal list-inside space-y-2">
            <li>Navigate to <strong>Compliance Manager</strong></li>
            <li>Click <strong>Manage Categories</strong></li>
            <li>Add categories that match your club&apos;s regulatory landscape</li>
          </ol>
        </Section>

        <Section icon={Calendar} title="Step 2: Add Compliance Items">
          <p>
            Each compliance item represents a specific requirement with a due date:
          </p>
          <h4 className="font-semibold text-gray-900 mt-4 mb-2">How to add items:</h4>
          <ol className="list-decimal list-inside space-y-2">
            <li>Click <strong>Add Compliance Item</strong></li>
            <li>Enter the item name and description</li>
            <li>Select the category</li>
            <li>Set the <strong>due date</strong> or renewal date</li>
            <li>Set the <strong>priority</strong> (Low, Medium, High, Critical)</li>
            <li>Assign a responsible person (optional)</li>
          </ol>
          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg mt-4">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> For recurring items (e.g., annual insurance renewals), set the
              due date to the next renewal. GymHub will remind you as it approaches.
            </p>
          </div>
        </Section>

        <Section icon={Upload} title="Step 3: Attach Documents">
          <p>
            Upload evidence and documentation for each compliance item:
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>Certificates, licences, and permits</li>
            <li>Inspection reports and audit results</li>
            <li>Insurance policy documents</li>
            <li>Signed policy acknowledgements</li>
          </ul>
          <p className="mt-3">
            Having documents attached makes compliance audits straightforward — everything is
            centralised and easy to find.
          </p>
        </Section>

        <Section icon={Bell} title="Reminders & Notifications">
          <p>
            GymHub automatically tracks compliance due dates and sends reminders:
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>30 days before due</strong> — Early warning for upcoming items</li>
            <li><strong>Overdue items</strong> — Highlighted on the dashboard with escalating urgency</li>
            <li><strong>Dashboard alerts</strong> — Compliance status appears on your main dashboard</li>
          </ul>
          <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-lg mt-4">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> Configure notification recipients in <strong>Club Settings → Notifications</strong>
              to ensure the right people receive compliance alerts.
            </p>
          </div>
        </Section>

        <Section icon={BarChart3} title="Dashboard & Tracking">
          <p>
            The Compliance Manager dashboard shows your club&apos;s compliance health at a glance:
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Completion rate</strong> — Percentage of items up to date</li>
            <li><strong>Overdue items</strong> — Count and list of expired items requiring attention</li>
            <li><strong>Due soon</strong> — Items due within the next 30 days</li>
            <li><strong>Category breakdown</strong> — Compliance status by category</li>
            <li><strong>Trend charts</strong> — Monthly created, completed, and overdue trends</li>
          </ul>
        </Section>

        <Section icon={CheckSquare} title="Best Practices">
          <ul className="list-disc list-inside space-y-2">
            <li>Add all known compliance requirements during initial setup — including annual renewals</li>
            <li>Upload documents as soon as you receive them to keep records current</li>
            <li>Review the compliance dashboard weekly to catch approaching deadlines</li>
            <li>Use categories consistently so reporting and filtering are meaningful</li>
            <li>Assign responsible people to items so accountability is clear</li>
            <li>Mark items as complete when fulfilled, and set the next due date for recurring items</li>
          </ul>
        </Section>
      </div>
    </HelpLayout>
  )
}

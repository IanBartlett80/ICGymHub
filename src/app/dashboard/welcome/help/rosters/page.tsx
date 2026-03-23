'use client'

import { Calendar, Layout, Users, FileText, BarChart3, AlertTriangle, Clock } from 'lucide-react'
import HelpLayout from '../HelpLayout'

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10 last:mb-0">
      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
          <Icon className="w-5 h-5 text-blue-600" />
        </div>
        {title}
      </h2>
      <div className="text-gray-700 space-y-3 ml-11">
        {children}
      </div>
    </div>
  )
}

export default function RostersHelpPage() {
  return (
    <HelpLayout
      title="Class Rostering — Admin Guide"
      description="How to create class templates, build rosters, assign coaches, and manage your class schedule."
    >
      <div className="prose prose-gray max-w-none">
        <Section icon={Calendar} title="Overview">
          <p>
            The Rostering module helps you plan and manage your weekly class schedule. You start by creating
            class templates, then build rosters from those templates and assign coaches.
          </p>
          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg mt-4">
            <p className="text-sm text-blue-800">
              <strong>Prerequisites:</strong> Before using Rostering, ensure you have configured
              <strong> Venues</strong>, <strong>Gym Sports</strong>, <strong>Gym Zones</strong>, and
              <strong> Coaches</strong> in Club Settings.
            </p>
          </div>
        </Section>

        <Section icon={Layout} title="Step 1: Create Class Templates">
          <p>
            Class templates define the structure of a class — its name, gym sport, level, duration,
            and which zone it occupies.
          </p>
          <h4 className="font-semibold text-gray-900 mt-4 mb-2">How to create a template:</h4>
          <ol className="list-decimal list-inside space-y-2">
            <li>Navigate to <strong>Rosters → Class Templates</strong></li>
            <li>Click <strong>Create Template</strong></li>
            <li>Enter the class name, select the gym sport, and assign a zone</li>
            <li>Set the class duration, capacity, and colour for visual identification</li>
            <li>Configure the day and time for the recurring schedule</li>
          </ol>
          <p className="mt-3">
            Templates are reusable — you can create a roster for any term or period using the same templates.
          </p>
        </Section>

        <Section icon={Users} title="Step 2: Assign Coaches">
          <p>
            Each class can have one or more coaches assigned. GymHub checks coach availability and
            alerts you to scheduling conflicts.
          </p>
          <h4 className="font-semibold text-gray-900 mt-4 mb-2">Coach assignment features:</h4>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Availability tracking</strong> — See which coaches are free at each time slot</li>
            <li><strong>Conflict detection</strong> — Automatic warnings when a coach is double-booked</li>
            <li><strong>Accreditation matching</strong> — Only coaches accredited for the gym sport are suggested</li>
            <li><strong>Cross-roster conflicts</strong> — Detects clashes across different rosters</li>
          </ul>
        </Section>

        <Section icon={FileText} title="Step 3: Build Rosters">
          <p>
            Rosters combine your class templates into a weekly schedule for a specific term or date range.
          </p>
          <h4 className="font-semibold text-gray-900 mt-4 mb-2">How to build a roster:</h4>
          <ol className="list-decimal list-inside space-y-2">
            <li>Navigate to <strong>Rosters → Rosters</strong></li>
            <li>Click <strong>Create Roster</strong> and set the name, date range, and venue</li>
            <li>Add class sessions from your templates</li>
            <li>Assign coaches to each session</li>
            <li>Review the weekly view for conflicts and gaps</li>
          </ol>
        </Section>

        <Section icon={AlertTriangle} title="Conflict Detection">
          <p>
            GymHub automatically detects scheduling conflicts:
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Coach conflicts</strong> — Same coach assigned to overlapping classes</li>
            <li><strong>Zone conflicts</strong> — Multiple classes in the same zone at the same time (unless overlap is allowed)</li>
            <li><strong>Cross-roster conflicts</strong> — Clashes between classes in different rosters</li>
          </ul>
          <p className="mt-3">
            Conflicts appear as warnings and do not prevent saving, allowing you to resolve them at your own pace.
          </p>
        </Section>

        <Section icon={BarChart3} title="Reports & Analytics">
          <p>
            The Reports section provides insights into your class operations:
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>Weekly class count and distribution by gym sport</li>
            <li>Coach utilisation and workload balance</li>
            <li>Zone usage and capacity analysis</li>
            <li>Export rosters for printing or sharing</li>
          </ul>
        </Section>

        <Section icon={Clock} title="Best Practices">
          <ul className="list-disc list-inside space-y-2">
            <li>Create templates for your most common class types first</li>
            <li>Use colour coding to visually distinguish gym sports on the roster</li>
            <li>Review conflicts before publishing a roster to staff</li>
            <li>Set coach availability before building rosters to avoid manual conflict resolution</li>
            <li>Use roster exports to share schedules with coaches who don&apos;t have GymHub access</li>
          </ul>
        </Section>
      </div>
    </HelpLayout>
  )
}

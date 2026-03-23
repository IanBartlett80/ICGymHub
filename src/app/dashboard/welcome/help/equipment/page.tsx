'use client'

import { Wrench, Package, AlertTriangle, Clock, DollarSign, BarChart3, Camera, CheckSquare } from 'lucide-react'
import HelpLayout from '../HelpLayout'

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10 last:mb-0">
      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
          <Icon className="w-5 h-5 text-amber-600" />
        </div>
        {title}
      </h2>
      <div className="text-gray-700 space-y-3 ml-11">
        {children}
      </div>
    </div>
  )
}

export default function EquipmentHelpPage() {
  return (
    <HelpLayout
      title="Equipment Management — Admin Guide"
      description="How to catalogue, maintain, and manage all your gymnastics equipment across every venue and zone."
    >
      <div className="prose prose-gray max-w-none">
        <Section icon={Wrench} title="Overview">
          <p>
            The Equipment module helps you track every piece of equipment in your club — from
            large apparatus like vaults and trampolines to smaller items like mats and springboards.
          </p>
          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg mt-4">
            <p className="text-sm text-blue-800">
              <strong>Prerequisites:</strong> Set up <strong>Venues</strong> and <strong>Gym Zones</strong> in
              Club Settings before adding equipment so you can assign items to their physical locations.
            </p>
          </div>
        </Section>

        <Section icon={Package} title="Adding Equipment">
          <h4 className="font-semibold text-gray-900 mb-2">How to add equipment:</h4>
          <ol className="list-decimal list-inside space-y-2">
            <li>Navigate to <strong>Equipment → All Equipment</strong></li>
            <li>Click <strong>Add Equipment</strong></li>
            <li>Enter the name, manufacturer, model, and serial number</li>
            <li>Assign to a venue and zone</li>
            <li>Set the purchase date and condition status</li>
            <li>Optionally upload a photo for easy identification</li>
          </ol>
          <h4 className="font-semibold text-gray-900 mt-4 mb-2">Equipment categories:</h4>
          <p>
            Create categories (e.g., Apparatus, Mats, Safety Equipment) to organise your inventory.
            Categories help with filtering and reporting.
          </p>
        </Section>

        <Section icon={Camera} title="Zone Overview">
          <p>
            The <strong>Zone Overview</strong> page shows all your equipment organised by zone —
            giving you a visual map of where everything is located.
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>See equipment counts per zone at a glance</li>
            <li>Quickly identify zones with maintenance or safety issues</li>
            <li>Click into any zone to see its full equipment list</li>
          </ul>
        </Section>

        <Section icon={AlertTriangle} title="Safety Issues">
          <p>
            When equipment has a safety concern, log it immediately:
          </p>
          <ol className="list-decimal list-inside space-y-2">
            <li>Navigate to the equipment item or go to <strong>Equipment → Safety Issues</strong></li>
            <li>Click <strong>Report Safety Issue</strong></li>
            <li>Set the severity (Low, Medium, High, Critical)</li>
            <li>Describe the issue and attach photos if needed</li>
            <li>The item can be flagged as <strong>Out of Service</strong> until resolved</li>
          </ol>
          <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded-r-lg mt-4">
            <p className="text-sm text-red-800">
              <strong>Critical Safety Issues</strong> trigger automated notifications to all configured
              admin emails so they can be addressed immediately.
            </p>
          </div>
        </Section>

        <Section icon={Clock} title="Maintenance Scheduling">
          <p>
            Set up preventive maintenance schedules to keep equipment in top condition:
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>One-off tasks</strong> — Schedule a single inspection or service</li>
            <li><strong>Recurring tasks</strong> — Set daily, weekly, monthly, or yearly maintenance cycles</li>
            <li><strong>Overdue tracking</strong> — See which tasks are past due at a glance</li>
            <li><strong>Completion logging</strong> — Record who completed the task and any notes</li>
          </ul>
        </Section>

        <Section icon={DollarSign} title="Repair Quotes">
          <p>
            When equipment needs professional repair:
          </p>
          <ol className="list-decimal list-inside space-y-2">
            <li>Create a <strong>Repair Quote Request</strong> from the equipment item</li>
            <li>Describe the issue and attach photos</li>
            <li>Track quote responses and costs</li>
            <li>Approve or decline quotes and track repair completion</li>
          </ol>
        </Section>

        <Section icon={BarChart3} title="Analytics">
          <p>
            The Equipment Analytics page provides insights into:
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>Equipment condition distribution across your club</li>
            <li>Maintenance completion rates and trends</li>
            <li>Most common safety issues and affected zones</li>
            <li>Equipment utilisation and lifecycle data</li>
          </ul>
        </Section>

        <Section icon={CheckSquare} title="Best Practices">
          <ul className="list-disc list-inside space-y-2">
            <li>Add all equipment during initial setup — it&apos;s easier to maintain a complete record from day one</li>
            <li>Upload photos for each equipment item to make identification easy for all staff</li>
            <li>Set up recurring maintenance tasks for critical apparatus (e.g., weekly vault checks)</li>
            <li>Review the Safety Issues dashboard regularly and resolve issues promptly</li>
            <li>Use categories to organise equipment for cleaner reporting</li>
          </ul>
        </Section>
      </div>
    </HelpLayout>
  )
}

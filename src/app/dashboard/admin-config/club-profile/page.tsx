'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { Globe, Save, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const TIMEZONE_OPTIONS = [
  { group: 'Australia', zones: [
    { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
    { value: 'Australia/Melbourne', label: 'Melbourne (AEST/AEDT)' },
    { value: 'Australia/Brisbane', label: 'Brisbane (AEST)' },
    { value: 'Australia/Perth', label: 'Perth (AWST)' },
    { value: 'Australia/Adelaide', label: 'Adelaide (ACST/ACDT)' },
    { value: 'Australia/Hobart', label: 'Hobart (AEST/AEDT)' },
    { value: 'Australia/Darwin', label: 'Darwin (ACST)' },
    { value: 'Australia/Lord_Howe', label: 'Lord Howe Island' },
  ]},
  { group: 'New Zealand & Pacific', zones: [
    { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)' },
    { value: 'Pacific/Fiji', label: 'Fiji' },
  ]},
  { group: 'Asia', zones: [
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
    { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
  ]},
  { group: 'Europe', zones: [
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
    { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  ]},
  { group: 'Americas', zones: [
    { value: 'America/New_York', label: 'New York (EST/EDT)' },
    { value: 'America/Chicago', label: 'Chicago (CST/CDT)' },
    { value: 'America/Denver', label: 'Denver (MST/MDT)' },
    { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
    { value: 'America/Toronto', label: 'Toronto (EST/EDT)' },
    { value: 'America/Vancouver', label: 'Vancouver (PST/PDT)' },
  ]},
]

export default function ClubProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [clubName, setClubName] = useState('')
  const [timezone, setTimezone] = useState('Australia/Sydney')
  const [originalTimezone, setOriginalTimezone] = useState('Australia/Sydney')
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchClubSettings()
  }, [])

  const fetchClubSettings = async () => {
    try {
      const res = await fetch('/api/clubs/settings')
      if (res.ok) {
        const data = await res.json()
        setClubName(data.club.name)
        setTimezone(data.club.timezone)
        setOriginalTimezone(data.club.timezone)
      } else {
        setError('Failed to load club settings')
      }
    } catch {
      setError('Failed to load club settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/clubs/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone }),
      })

      if (res.ok) {
        setOriginalTimezone(timezone)
        setSuccess('Timezone updated successfully. Please refresh the page for changes to take effect across the app.')

        // Update localStorage userData with new timezone
        const userData = localStorage.getItem('userData')
        if (userData) {
          const parsed = JSON.parse(userData)
          parsed.clubTimezone = timezone
          localStorage.setItem('userData', JSON.stringify(parsed))
        }

        setTimeout(() => setSuccess(''), 5000)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to update settings')
      }
    } catch {
      setError('Failed to update settings')
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = timezone !== originalTimezone

  // Get current time in the selected timezone
  const currentTimeInTz = new Date().toLocaleString('en-US', {
    timeZone: timezone,
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  return (
    <DashboardLayout title="Club Profile" showClubManagementNav={true}>
      <div className="p-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <Link
            href="/dashboard/admin-config"
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Club Settings
          </Link>
          <h2 className="text-2xl font-bold text-gray-900">Club Profile</h2>
          <p className="text-gray-600 mt-1">
            Manage your club&apos;s core settings that affect the entire application.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm">
            {success}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading club settings...</div>
        ) : (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            {/* Club Name (read-only) */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Club Name</label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-700">
                {clubName}
              </div>
              <p className="text-xs text-gray-500 mt-1">Club name cannot be changed here. Contact support if needed.</p>
            </div>

            {/* Timezone Setting */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Globe className="w-4 h-4 inline mr-1" />
                Club Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TIMEZONE_OPTIONS.map((group) => (
                  <optgroup key={group.group} label={group.group}>
                    {group.zones.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                This timezone is used for all roster scheduling, time displays, and email reports across the application.
              </p>
            </div>

            {/* Live Preview */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm font-medium text-blue-800 mb-1">Current time in {timezone}:</div>
              <div className="text-lg font-semibold text-blue-900">{currentTimeInTz}</div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={!hasChanges || saving}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition ${
                  hasChanges && !saving
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

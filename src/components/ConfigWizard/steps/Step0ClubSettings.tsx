'use client'

import { useState, useEffect } from 'react'
import { Globe, Info, Check } from 'lucide-react'
import type { WizardData } from '../ConfigWizard'

interface Step0ClubSettingsProps {
  onComplete: (data: Partial<WizardData>) => void
}

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

export default function Step0ClubSettings({ onComplete }: Step0ClubSettingsProps) {
  const [timezone, setTimezone] = useState('Australia/Sydney')
  const [originalTimezone, setOriginalTimezone] = useState('Australia/Sydney')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/clubs/settings')
      if (res.ok) {
        const data = await res.json()
        setTimezone(data.club.timezone)
        setOriginalTimezone(data.club.timezone)
        // Mark step as complete on load (timezone already has a default)
        onComplete({})
        setSaved(true)
      }
    } catch {
      // Default timezone is fine
      onComplete({})
      setSaved(true)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/clubs/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone }),
      })

      if (res.ok) {
        setOriginalTimezone(timezone)
        setSaved(true)
        onComplete({})

        // Update localStorage userData with new timezone
        const userData = localStorage.getItem('userData')
        if (userData) {
          const parsed = JSON.parse(userData)
          parsed.clubTimezone = timezone
          localStorage.setItem('userData', JSON.stringify(parsed))
        }
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to save timezone')
      }
    } catch {
      setError('Failed to save timezone')
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
  })

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header with explanation */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">About Club Timezone</h3>
            <p className="text-sm text-blue-800">
              Set the timezone for your club. This controls how all times are displayed across rosters, 
              reports, and email notifications. It defaults to Australia/Sydney — change it if your club 
              is in a different timezone.
            </p>
          </div>
        </div>
      </div>

      {/* Saved confirmation */}
      {saved && !hasChanges && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-green-900">
              Club Timezone: {timezone}
            </h3>
          </div>
        </div>
      )}

      {/* Timezone selector */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Select Your Timezone
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Club Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => {
                setTimezone(e.target.value)
                setSaved(false)
              }}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
          </div>

          {/* Live preview */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm font-medium text-blue-800 mb-1">Current time in {timezone}:</div>
            <div className="text-lg font-semibold text-blue-900">{currentTimeInTz}</div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {hasChanges && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg"
            >
              {saving ? 'Saving...' : 'Save Timezone'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

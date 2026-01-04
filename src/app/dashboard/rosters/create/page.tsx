'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'

type ClassTemplate = {
  id: string
  name: string
  level: string
  lengthMinutes: number
  defaultRotationMinutes: number
  startTimeLocal: string
  endTimeLocal: string
  activeDays: string
  allowedZones: Array<{ zone: { id: string; name: string } }>
  defaultCoaches: Array<{ coach: { id: string; name: string } }>
}

type Coach = {
  id: string
  name: string
}

type Zone = {
  id: string
  name: string
}

const DAYS_OF_WEEK = [
  { value: 'MON', label: 'Monday' },
  { value: 'TUE', label: 'Tuesday' },
  { value: 'WED', label: 'Wednesday' },
  { value: 'THU', label: 'Thursday' },
  { value: 'FRI', label: 'Friday' },
  { value: 'SAT', label: 'Saturday' },
  { value: 'SUN', label: 'Sunday' },
]

export default function RosterBuilderPage() {
  const router = useRouter()
  const [classes, setClasses] = useState<ClassTemplate[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Template mode fields
  const [templateName, setTemplateName] = useState('')
  const [startDate, setStartDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => {
    const today = new Date()
    const nextMonth = new Date(today.setMonth(today.getMonth() + 1))
    return nextMonth.toISOString().split('T')[0]
  })
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set())
  const [scope, setScope] = useState('WEEK')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [classesRes, coachesRes, zonesRes] = await Promise.all([
        fetch('/api/classes'),
        fetch('/api/coaches'),
        fetch('/api/zones'),
      ])

      if (classesRes.ok) {
        const data = await classesRes.json()
        setClasses(data.classes)
      }

      if (coachesRes.ok) {
        const data = await coachesRes.json()
        setCoaches(data.coaches)
      }

      if (zonesRes.ok) {
        const data = await zonesRes.json()
        setZones(data.zones)
      }
    } catch (err) {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const toggleDay = (day: string) => {
    const newSelected = new Set(selectedDays)
    if (newSelected.has(day)) {
      newSelected.delete(day)
    } else {
      newSelected.add(day)
    }
    setSelectedDays(newSelected)
  }

  const handleGenerate = async () => {
    if (!templateName.trim()) {
      setError('Please enter a template name')
      return
    }

    if (selectedDays.size === 0) {
      setError('Please select at least one day of the week')
      return
    }

    if (new Date(endDate) < new Date(startDate)) {
      setError('End date must be after start date')
      return
    }

    setGenerating(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/rosters/generate-from-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName,
          startDate,
          endDate,
          activeDays: Array.from(selectedDays),
          scope,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(
          `Roster template "${templateName}" created successfully! ${data.rosters.length} roster(s) generated.`
        )
        
        // Redirect to roster list after 2 seconds
        setTimeout(() => {
          router.push('/dashboard/rosters')
        }, 2000)
      } else {
        setError(data.error || 'Failed to generate roster template')
      }
    } catch (err) {
      setError('Failed to generate roster template')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return (
    <DashboardLayout 
      title="Create Roster Template"
      backTo={{ label: 'Back to Rosters', href: '/dashboard/rosters' }}
    >
      <div className="p-8">Loading...</div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout 
      title="Create Roster Template"
      backTo={{ label: 'Back to Rosters', href: '/dashboard/rosters' }}
    >
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <p className="text-gray-600">
              Create a roster template that will generate individual rosters for selected days of the week
            </p>
          </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Template Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Template Name</label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Monday Training, Weekend Classes"
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Active Days</label>
              <div className="grid grid-cols-7 gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`px-3 py-2 text-sm rounded transition-colors ${
                      selectedDays.has(day.value)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Select the days of the week for which rosters will be generated
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Scope</label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="WEEK">Week</option>
                <option value="DAY">Day</option>
                <option value="MONTH">Month</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>The template will generate individual rosters for each matching day in the date range</li>
            <li>Each roster day can be edited independently after creation</li>
            <li>Class times default from your Class Templates but can be customized per day</li>
            <li>You can regenerate the entire template if needed</li>
          </ul>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleGenerate}
            disabled={generating || !templateName.trim() || selectedDays.size === 0}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            {generating ? 'Generating...' : 'Create Template & Generate Rosters'}
          </button>
          <button
            onClick={() => router.push('/dashboard/rosters')}
            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 font-medium"
          >
            Cancel
          </button>
        </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

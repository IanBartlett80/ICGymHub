'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, startOfDay, endOfDay } from 'date-fns'

type Coach = {
  id: string
  name: string
  email: string | null
}

type Session = {
  id: string
  template: {
    id: string
    name: string
    color: string | null
  } | null
  coaches: Array<{
    id: string
    coach: Coach
  }>
}

type ReportSlot = {
  id: string
  startsAt: string
  endsAt: string
  rosterDate: string
  dayOfWeek: string | null
  zone: {
    id: string
    name: string
  }
  session: Session
}

export default function RosterReportsPage() {
  const [slots, setSlots] = useState<ReportSlot[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // View and filter states
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedCoachId, setSelectedCoachId] = useState<string>('all')
  const [emailingAll, setEmailingAll] = useState(false)
  const [emailingCoach, setEmailingCoach] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
    fetchCoaches()
  }, [currentDate, viewMode, selectedCoachId])

  const fetchCoaches = async () => {
    try {
      const res = await fetch('/api/coaches')
      if (res.ok) {
        const data = await res.json()
        setCoaches(data.coaches)
      }
    } catch (err) {
      console.error('Failed to fetch coaches')
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const startDate = viewMode === 'week' 
        ? startOfWeek(currentDate, { weekStartsOn: 1 })
        : startOfDay(currentDate)
      
      const endDate = viewMode === 'week'
        ? endOfWeek(currentDate, { weekStartsOn: 1 })
        : endOfDay(currentDate)

      const params = new URLSearchParams({
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        status: 'PUBLISHED',
      })

      if (selectedCoachId !== 'all') {
        params.append('coachId', selectedCoachId)
      }

      const res = await fetch(`/api/roster-reports?${params}`)
      if (res.ok) {
        const data = await res.json()
        setSlots(data.slots)
      } else {
        setError('Failed to load roster data')
      }
    } catch (err) {
      setError('Failed to load roster data')
    } finally {
      setLoading(false)
    }
  }

  const handlePrevious = () => {
    if (viewMode === 'week') {
      setCurrentDate(subWeeks(currentDate, 1))
    } else {
      setCurrentDate(new Date(currentDate.getTime() - 86400000))
    }
  }

  const handleNext = () => {
    if (viewMode === 'week') {
      setCurrentDate(addWeeks(currentDate, 1))
    } else {
      setCurrentDate(new Date(currentDate.getTime() + 86400000))
    }
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const handleEmailAll = async () => {
    if (!confirm('Send roster report to all coaches via email?')) return

    setEmailingAll(true)
    try {
      const startDate = viewMode === 'week' 
        ? startOfWeek(currentDate, { weekStartsOn: 1 })
        : startOfDay(currentDate)
      
      const endDate = viewMode === 'week'
        ? endOfWeek(currentDate, { weekStartsOn: 1 })
        : endOfDay(currentDate)

      const res = await fetch('/api/roster-reports/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
          sendToAll: true,
        }),
      })

      if (res.ok) {
        setSuccess('Emails sent successfully to all coaches')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError('Failed to send emails')
      }
    } catch (err) {
      setError('Failed to send emails')
    } finally {
      setEmailingAll(false)
    }
  }

  const handleEmailCoach = async (coachId: string) => {
    const coach = coaches.find(c => c.id === coachId)
    if (!coach?.email) {
      setError('Coach does not have an email address')
      return
    }

    if (!confirm(`Send individual roster report to ${coach.name}?`)) return

    setEmailingCoach(coachId)
    try {
      const startDate = viewMode === 'week' 
        ? startOfWeek(currentDate, { weekStartsOn: 1 })
        : startOfDay(currentDate)
      
      const endDate = viewMode === 'week'
        ? endOfWeek(currentDate, { weekStartsOn: 1 })
        : endOfDay(currentDate)

      const res = await fetch('/api/roster-reports/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
          coachId,
        }),
      })

      if (res.ok) {
        setSuccess(`Email sent successfully to ${coach.name}`)
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(`Failed to send email to ${coach.name}`)
      }
    } catch (err) {
      setError('Failed to send email')
    } finally {
      setEmailingCoach(null)
    }
  }

  // Group slots by day
  const groupSlotsByDay = () => {
    const grouped: { [key: string]: ReportSlot[] } = {}
    
    slots.forEach(slot => {
      const date = format(new Date(slot.startsAt), 'yyyy-MM-dd')
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date].push(slot)
    })

    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b))
  }

  const getDateRangeDisplay = () => {
    if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 })
      const end = endOfWeek(currentDate, { weekStartsOn: 1 })
      return `${format(start, 'MMM dd')} - ${format(end, 'MMM dd, yyyy')}`
    } else {
      return format(currentDate, 'EEEE, MMMM dd, yyyy')
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Roster Reports">
        <div className="p-8">Loading...</div>
      </DashboardLayout>
    )
  }

  const groupedSlots = groupSlotsByDay()

  return (
    <DashboardLayout title="Roster Reports">
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Staff Coaching Allocations</h2>
            <button
              onClick={handleEmailAll}
              disabled={emailingAll || slots.length === 0}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {emailingAll ? 'Sending...' : 'Email All Staff'}
            </button>
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

          {/* Controls */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex flex-wrap gap-4 items-center">
              {/* View Mode Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('week')}
                  className={`px-4 py-2 rounded font-medium ${
                    viewMode === 'week'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Week View
                </button>
                <button
                  onClick={() => setViewMode('day')}
                  className={`px-4 py-2 rounded font-medium ${
                    viewMode === 'day'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Day View
                </button>
              </div>

              {/* Navigation */}
              <div className="flex gap-2 items-center">
                <button
                  onClick={handlePrevious}
                  className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  ← Previous
                </button>
                <button
                  onClick={handleToday}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Today
                </button>
                <button
                  onClick={handleNext}
                  className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Next →
                </button>
              </div>

              {/* Date Display */}
              <div className="text-gray-700 font-medium">
                {getDateRangeDisplay()}
              </div>

              {/* Coach Filter */}
              <div className="ml-auto">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filter by Coach
                </label>
                <select
                  value={selectedCoachId}
                  onChange={(e) => setSelectedCoachId(e.target.value)}
                  className="border rounded px-3 py-2"
                >
                  <option value="all">All Coaches</option>
                  {coaches.map((coach) => (
                    <option key={coach.id} value={coach.id}>
                      {coach.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Report Table */}
          {groupedSlots.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              No published rosters found for this period.
            </div>
          ) : (
            <div className="space-y-6">
              {groupedSlots.map(([date, daySlots]) => (
                <div key={date} className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="bg-gray-50 px-6 py-3 border-b">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {format(new Date(date), 'EEEE, MMMM dd, yyyy')}
                    </h3>
                  </div>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Class
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Zone
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Coach(es)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {daySlots.map((slot) => {
                        const coachesForSlot = slot.session.coaches.map(c => c.coach)
                        return (
                          <tr key={slot.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="font-medium text-gray-900">
                                {format(new Date(slot.startsAt), 'h:mm a')} - {format(new Date(slot.endsAt), 'h:mm a')}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="font-medium text-gray-900">
                                {slot.session.template?.name || 'Unknown Class'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              {slot.zone.name}
                            </td>
                            <td className="px-6 py-4">
                              {coachesForSlot.length === 0 ? (
                                <span className="text-gray-400 italic">No coach assigned</span>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {coachesForSlot.map((coach) => (
                                    <span
                                      key={coach.id}
                                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                    >
                                      {coach.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {coachesForSlot.length > 0 && coachesForSlot[0].email && (
                                <button
                                  onClick={() => handleEmailCoach(coachesForSlot[0].id)}
                                  disabled={emailingCoach === coachesForSlot[0].id}
                                  className="text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                                >
                                  {emailingCoach === coachesForSlot[0].id ? 'Sending...' : 'Email'}
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

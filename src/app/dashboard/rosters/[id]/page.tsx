'use client'

import { useState, useEffect, use } from 'react'
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import DashboardLayout from '@/components/DashboardLayout'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const locales = {
  'en-US': require('date-fns/locale/en-US'),
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }), // Monday
  getDay,
  locales,
})

type Coach = {
  id: string
  name: string
}

type RosterSlot = {
  id: string
  startsAt: string
  endsAt: string
  conflictFlag: boolean
  zone: { id: string; name: string }
  session: {
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
}

type Roster = {
  id: string
  scope: string
  startDate: string
  endDate: string
  status: string
  templateId: string | null
  dayOfWeek: string | null
  slots: RosterSlot[]
}

type CalendarEvent = {
  id: string
  title: string
  start: Date
  end: Date
  resource: RosterSlot
}

export default function RosterViewPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [roster, setRoster] = useState<Roster | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)
  const [activeTab, setActiveTab] = useState<'calendar' | 'table'>('calendar')
  const [calendarView, setCalendarView] = useState<View>('week')
  const [calendarDate, setCalendarDate] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [editingSlot, setEditingSlot] = useState<RosterSlot | null>(null)
  const [availableCoaches, setAvailableCoaches] = useState<Coach[]>([])
  const [selectedCoachIds, setSelectedCoachIds] = useState<string[]>([])
  const [editScope, setEditScope] = useState<'single' | 'future'>('single')
  const [zoneScope, setZoneScope] = useState<'single' | 'all'>('single')
  const [editingTime, setEditingTime] = useState(false)
  const [sessionStartTime, setSessionStartTime] = useState('')
  const [sessionEndTime, setSessionEndTime] = useState('')

  useEffect(() => {
    fetchRoster()
    fetchCoaches()
  }, [resolvedParams.id])

  const fetchRoster = async () => {
    try {
      const res = await fetch(`/api/rosters/${resolvedParams.id}`)
      if (res.ok) {
        const data = await res.json()
        setRoster(data.roster)
      } else {
        setError('Failed to load roster')
      }
    } catch (err) {
      setError('Failed to load roster')
    } finally {
      setLoading(false)
    }
  }

  const fetchCoaches = async () => {
    try {
      const res = await fetch('/api/coaches')
      if (res.ok) {
        const data = await res.json()
        setAvailableCoaches(data.coaches)
      }
    } catch (err) {
      console.error('Failed to fetch coaches')
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch(`/api/rosters/${resolvedParams.id}/export`)
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `roster_${roster?.startDate}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        setError('Failed to export roster')
      }
    } catch (err) {
      setError('Failed to export roster')
    } finally {
      setExporting(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleEventClick = (event: CalendarEvent) => {
    const slot = event.resource
    setEditingSlot(slot)
    setSelectedCoachIds(slot.session.coaches.map((c) => c.coach.id))
    setEditScope('single')
    setEditingTime(false)
    
    // Set time fields
    const startDate = new Date(slot.startsAt)
    const endDate = new Date(slot.endsAt)
    setSessionStartTime(format(startDate, 'HH:mm'))
    setSessionEndTime(format(endDate, 'HH:mm'))
  }

  const toggleCoachSelection = (coachId: string) => {
    setSelectedCoachIds((prev) =>
      prev.includes(coachId)
        ? prev.filter((id) => id !== coachId)
        : [...prev, coachId]
    )
  }

  const handleSaveCoaches = async () => {
    if (!editingSlot) return

    try {
      const updateData: any = { 
        coachIds: selectedCoachIds,
        zoneScope: zoneScope // 'single' or 'all'
      }
      
      // If editing time, include time updates
      if (editingTime) {
        updateData.startTime = sessionStartTime
        updateData.endTime = sessionEndTime
      }
      
      // Determine endpoint based on edit scope
      const endpoint = editScope === 'future' && roster?.templateId
        ? `/api/rosters/bulk-update-future`
        : `/api/rosters/sessions/${editingSlot.session.id}/coaches`
      
      const body = editScope === 'future' && roster?.templateId
        ? {
            templateId: roster.templateId,
            dayOfWeek: roster.dayOfWeek,
            startDate: roster.startDate,
            sessionId: editingSlot.session.id,
            ...updateData
          }
        : updateData

      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        setEditingSlot(null)
        setSelectedCoachIds([])
        setEditScope('single')
        setZoneScope('single')
        setEditingTime(false)
        await fetchRoster() // Refresh to show updated coaches
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to update coaches')
      }
    } catch (err) {
      setError('Failed to update coaches')
    }
  }

  const handleNavigate = (date: Date) => {
    setCalendarDate(date)
  }

  const handleViewChange = (view: View) => {
    setCalendarView(view)
  }

  const handleToday = () => {
    setCalendarDate(startOfWeek(new Date(), { weekStartsOn: 1 }))
  }

  if (loading) {
    return (
      <DashboardLayout 
        title="Roster View" 
        backTo={{ label: 'Back to Rosters', href: '/dashboard/rosters' }}
      >
        <div className="p-8">Loading...</div>
      </DashboardLayout>
    )
  }

  if (error || !roster) {
    return (
      <DashboardLayout 
        title="Roster View" 
        backTo={{ label: 'Back to Rosters', href: '/dashboard/rosters' }}
      >
        <div className="p-8">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error || 'Roster not found'}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const events: CalendarEvent[] = roster.slots.map((slot) => {
    const coaches = slot.session.coaches.map((c) => c.coach.name).join(', ')
    const className = slot.session.template?.name || 'Unknown'
    const zoneName = slot.zone.name
    
    return {
      id: slot.id,
      title: `${className}\n${zoneName}\n${coaches}`,
      start: new Date(slot.startsAt),
      end: new Date(slot.endsAt),
      resource: slot,
    }
  })

  const conflictCount = roster.slots.filter((s) => s.conflictFlag).length

  return (
    <DashboardLayout 
      title={`Roster - ${new Date(roster.startDate).toLocaleDateString()}`}
      backTo={{ label: 'Back to Rosters', href: '/dashboard/rosters' }}
    >
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
        }
        .print-only {
          display: none;
        }
        .rbc-event {
          padding: 4px;
          border-radius: 4px;
          font-size: 0.8rem;
          line-height: 1.3;
          white-space: pre-wrap;
          font-weight: 500;
        }
        .rbc-time-slot {
          min-height: 40px;
        }
        .rbc-timeslot-group {
          min-height: 80px;
        }
        .rbc-toolbar button {
          color: #1f2937;
          border: 1px solid #d1d5db;
          padding: 0.5rem 1rem;
          margin: 0 0.25rem;
          background: white;
        }
        .rbc-toolbar button:hover {
          background: #f3f4f6;
        }
        .rbc-toolbar button.rbc-active {
          background: #3b82f6;
          color: white;
          border-color: #2563eb;
        }
      `}</style>

      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header Actions */}
          <div className="flex justify-between items-center mb-6 no-print">
            <div>
              <p className="text-gray-600 mt-1">
                {roster.scope} • {roster.status}
                {conflictCount > 0 && (
                  <span className="ml-2 text-red-600 font-medium">
                    ⚠️ {conflictCount} conflict{conflictCount !== 1 ? 's' : ''} detected
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                Print
              </button>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
              >
                {exporting ? 'Exporting...' : 'Export CSV'}
              </button>
            </div>
          </div>

          {conflictCount > 0 && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded mb-6 no-print">
              <strong>⚠️ Warning:</strong> {conflictCount} slot{conflictCount !== 1 ? 's have' : ' has'} conflicts.
              Conflicts are marked with red color in the calendar below.
            </div>
          )}

          {/* Tabs */}
          <div className="mb-4 no-print">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('calendar')}
                  className={`${
                    activeTab === 'calendar'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  📅 Calendar View
                </button>
                <button
                  onClick={() => setActiveTab('table')}
                  className={`${
                    activeTab === 'table'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  📋 Table View
                </button>
              </nav>
            </div>
          </div>

          {/* Calendar View */}
          {activeTab === 'calendar' && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="mb-4 flex justify-between items-center">
                <div className="flex gap-2">
                  <button
                    onClick={handleToday}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Today
                  </button>
                </div>
                <div className="text-sm text-gray-600">
                  <p>Click on any class to edit coach assignments</p>
                </div>
              </div>
              <div style={{ height: '700px' }}>
                <Calendar
                  localizer={localizer}
                  events={events}
                  startAccessor="start"
                  endAccessor="end"
                  view={calendarView}
                  views={['week', 'day']}
                  date={calendarDate}
                  onNavigate={handleNavigate}
                  onView={handleViewChange}
                  min={new Date(1970, 1, 1, 5, 0, 0)} // 5:00 AM
                  max={new Date(1970, 1, 1, 22, 0, 0)} // 10:00 PM
                  eventPropGetter={(event) => {
                    const slot = event.resource
                    const color = slot.conflictFlag 
                      ? '#ef4444' 
                      : slot.session.template?.color || '#3b82f6'
                    
                    return {
                      style: {
                        backgroundColor: color,
                        borderColor: slot.conflictFlag ? '#dc2626' : color,
                        color: '#ffffff',
                      },
                    }
                  }}
                  onSelectEvent={handleEventClick}
                  tooltipAccessor={(event) => {
                    const slot = event.resource
                    const coaches = slot.session.coaches.map((c) => c.coach.name).join(', ')
                    let tooltip = `${slot.session.template?.name}\nZone: ${slot.zone.name}\nCoaches: ${coaches || 'None'}`
                    
                    if (slot.conflictFlag) {
                      tooltip += '\n⚠️ CONFLICT: Coach double-booked or zone overlap'
                    }
                    
                    return tooltip
                  }}
                  step={15}
                  timeslots={4}
                />
              </div>
            </div>
          )}

          {/* Table View */}
          {activeTab === 'table' && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b">
                <h2 className="text-xl font-semibold">Roster Details</h2>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Coaches</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase no-print">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase no-print">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {roster.slots.map((slot) => {
                    const startTime = new Date(slot.startsAt).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                    const endTime = new Date(slot.endsAt).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                    const duration = Math.round((new Date(slot.endsAt).getTime() - new Date(slot.startsAt).getTime()) / 60000)

                    return (
                      <tr key={slot.id} className={slot.conflictFlag ? 'bg-red-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {startTime} - {endTime}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium">
                          <div className="flex items-center gap-2">
                            {slot.session.template?.color && (
                              <div 
                                className="w-3 h-3 rounded"
                                style={{ backgroundColor: slot.session.template.color }}
                              />
                            )}
                            {slot.session.template?.name || 'Unknown'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{slot.zone.name}</td>
                        <td className="px-6 py-4">
                          {slot.session.coaches.map((c) => c.coach.name).join(', ') || 'No coaches assigned'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{duration} min</td>
                        <td className="px-6 py-4 whitespace-nowrap no-print">
                          {slot.conflictFlag ? (
                            <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">⚠️ Conflict</span>
                          ) : (
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">✓ OK</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm no-print">
                          <button
                            onClick={() => {
                              setEditingSlot(slot)
                              setSelectedCoachIds(slot.session.coaches.map((c) => c.coach.id))
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Edit Coaches
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Coach Edit Modal */}
          {editingSlot && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 no-print">
              <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4">
                  Edit Session - {editingSlot.session.template?.name}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Zone: {editingSlot.zone.name}<br />
                  Time: {new Date(editingSlot.startsAt).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })} - {new Date(editingSlot.endsAt).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                
                {/* Edit Scope - Only show if part of a template */}
                  {/* Zone Scope Selection */}
                  <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded">
                    <label className="block text-sm font-medium mb-2">Apply coach changes to:</label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value="single"
                          checked={zoneScope === 'single'}
                          onChange={(e) => setZoneScope(e.target.value as 'single' | 'all')}
                          className="rounded"
                        />
                        <div>
                          <div className="font-medium">This Zone Only</div>
                          <div className="text-xs text-gray-600">
                            Update coaches only for {editingSlot.zone.name}
                          </div>
                        </div>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value="all"
                          checked={zoneScope === 'all'}
                          onChange={(e) => setZoneScope(e.target.value as 'single' | 'all')}
                          className="rounded"
                        />
                        <div>
                          <div className="font-medium">All Zones in This Session</div>
                          <div className="text-xs text-gray-600">
                            Update coaches for all zones at this time slot
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Day Scope Selection - Only show if part of a template */}
                  {roster?.templateId && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                    <label className="block text-sm font-medium mb-2">Apply changes across dates:</label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value="single"
                          checked={editScope === 'single'}
                          onChange={(e) => setEditScope(e.target.value as 'single' | 'future')}
                          className="rounded"
                        />
                        <div>
                          <div className="font-medium">This Day Only</div>
                          <div className="text-xs text-gray-600">
                            Changes apply only to {format(new Date(roster.startDate), 'MMM dd, yyyy')}
                          </div>
                        </div>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value="future"
                          checked={editScope === 'future'}
                          onChange={(e) => setEditScope(e.target.value as 'single' | 'future')}
                          className="rounded"
                        />
                        <div>
                          <div className="font-medium">All Future {roster.dayOfWeek}s</div>
                          <div className="text-xs text-gray-600">
                            Changes apply to this and all future {roster.dayOfWeek} rosters in template
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {/* Time Editing Toggle */}
                <div className="mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingTime}
                      onChange={(e) => setEditingTime(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm font-medium">Edit session times</span>
                  </label>
                </div>

                {/* Time Fields */}
                {editingTime && (
                  <div className="mb-4 p-3 bg-gray-50 border rounded">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Start Time</label>
                        <input
                          type="time"
                          value={sessionStartTime}
                          onChange={(e) => setSessionStartTime(e.target.value)}
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">End Time</label>
                        <input
                          type="time"
                          value={sessionEndTime}
                          onChange={(e) => setSessionEndTime(e.target.value)}
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Select Coaches:</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded p-3">
                    {availableCoaches.map((coach) => {
                      const isSelected = selectedCoachIds.includes(coach.id)
                      return (
                        <label key={coach.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleCoachSelection(coach.id)}
                            className="rounded"
                          />
                          <span>{coach.name}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setEditingSlot(null)
                      setSelectedCoachIds([])
                      setEditScope('single')
                      setZoneScope('single')
                      setEditingTime(false)
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveCoaches}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

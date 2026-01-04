'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { Calendar, momentLocalizer } from 'react-big-calendar'
import moment from 'moment'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns'

const localizer = momentLocalizer(moment)

interface UserData {
  id: string
  clubId: string
}

interface RosterTemplate {
  id: string
  name: string
  startDate: string
  endDate: string
}

interface RosterSlot {
  id: string
  rosterId: string
  rosterDate: string
  sessionId: string
  zoneId: string
  zoneName: string
  startsAt: string
  endsAt: string
  conflictFlag: boolean
  session: {
    template: {
      id: string
      name: string
      color: string
    }
  }
  coaches: Array<{
    coach: {
      id: string
      name: string
    }
  }>
}

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource: RosterSlot
}

export default function ClassRosteringPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [templates, setTemplates] = useState<RosterTemplate[]>([])
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([])
  const [rosterSlots, setRosterSlots] = useState<RosterSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'calendar' | 'table'>('calendar')
  const [selectedClass, setSelectedClass] = useState<string>('all')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [calendarView, setCalendarView] = useState<'week' | 'day'>('week')
  const [showModal, setShowModal] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<RosterSlot | null>(null)

  useEffect(() => {
    const userData = localStorage.getItem('userData')
    if (userData) {
      const parsed = JSON.parse(userData)
      setUser(parsed)
      fetchTemplates()
    } else {
      router.push('/sign-in')
    }
  }, [router])

  useEffect(() => {
    if (selectedTemplates.length > 0) {
      fetchRosterSlots()
    }
  }, [selectedTemplates, currentDate])

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/roster-templates')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates)
        // Select all templates by default
        setSelectedTemplates(data.templates.map((t: RosterTemplate) => t.id))
      }
      setLoading(false)
    } catch (error) {
      console.error('Error fetching templates:', error)
      setLoading(false)
    }
  }

  const fetchRosterSlots = async () => {
    try {
      const weekStart = format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      const weekEnd = format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      
      const response = await fetch(
        `/api/rosters/combined?templateIds=${selectedTemplates.join(',')}&startDate=${weekStart}&endDate=${weekEnd}`
      )
      if (response.ok) {
        const data = await response.json()
        setRosterSlots(data.slots)
      }
    } catch (error) {
      console.error('Error fetching roster slots:', error)
    }
  }

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedSlot(event.resource)
    setShowModal(true)
  }

  const navigateToRoster = (rosterId: string) => {
    router.push(`/dashboard/rosters/${rosterId}`)
  }

  const calendarEvents: CalendarEvent[] = rosterSlots.map(slot => ({
    id: slot.id,
    title: `${slot.session.template.name} - ${slot.zoneName}`,
    start: new Date(slot.startsAt),
    end: new Date(slot.endsAt),
    resource: slot,
  }))

  const uniqueClasses = Array.from(
    new Set(rosterSlots.map(slot => slot.session.template.name))
  )

  const filteredSlots = selectedClass === 'all'
    ? rosterSlots
    : rosterSlots.filter(slot => slot.session.template.name === selectedClass)

  const configSteps = [
    {
      title: 'Gymsports',
      description: 'Configure gymsports',
      icon: '🤸',
      href: '/dashboard/roster-config/gymsports',
    },
    {
      title: 'Gym Zones',
      description: 'Define training areas',
      icon: '🏛️',
      href: '/dashboard/roster-config/zones',
    },
    {
      title: 'Coaches',
      description: 'Add coach profiles',
      icon: '👨‍🏫',
      href: '/dashboard/roster-config/coaches',
    },
    {
      title: 'Class Templates',
      description: 'Create class templates',
      icon: '📚',
      href: '/dashboard/roster-config/classes',
    },
    {
      title: 'Create Rosters',
      description: 'Generate new rosters',
      icon: '📅',
      href: '/dashboard/rosters',
    },
  ]

  if (loading) {
    return (
      <DashboardLayout title="Class Rostering">
        <div className="p-6">
          <div className="text-gray-600">Loading...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Class Rostering" backTo={{ label: 'Back to Home', href: '/dashboard' }}>
      <div className="p-6">
        {/* Configuration Cards - Top of Page */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Configuration</h2>
          <div className="grid grid-cols-5 gap-4">
            {configSteps.map((step, index) => (
              <Link
                key={index}
                href={step.href}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition"
              >
                <div className="text-3xl mb-2">{step.icon}</div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">{step.title}</h3>
                <p className="text-xs text-gray-600">{step.description}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Roster Calendar View */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Header with Filter */}
          <div className="border-b border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Roster Calendar</h2>
              
              {/* Template Filter Dropdown */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">View Template:</label>
                <select
                  value={selectedTemplates.length === 1 ? selectedTemplates[0] : 'all'}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === 'all') {
                      setSelectedTemplates(templates.map(t => t.id))
                    } else {
                      setSelectedTemplates([value])
                    }
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Templates</option>
                  {templates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
              <button
                onClick={() => setActiveTab('calendar')}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition ${
                  activeTab === 'calendar'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Calendar View
              </button>
              <button
                onClick={() => setActiveTab('table')}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition ${
                  activeTab === 'table'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Table View
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            {activeTab === 'calendar' ? (
              <div>
                {/* Calendar Navigation and View Controls */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentDate(new Date())}
                      className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
                    >
                      Today
                    </button>
                    <button
                      onClick={() => {
                        const newDate = new Date(currentDate)
                        if (calendarView === 'week') {
                          newDate.setDate(newDate.getDate() - 7)
                        } else {
                          newDate.setDate(newDate.getDate() - 1)
                        }
                        setCurrentDate(newDate)
                      }}
                      className="px-3 py-1.5 text-sm bg-white hover:bg-gray-50 rounded border border-gray-300"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={() => {
                        const newDate = new Date(currentDate)
                        if (calendarView === 'week') {
                          newDate.setDate(newDate.getDate() + 7)
                        } else {
                          newDate.setDate(newDate.getDate() + 1)
                        }
                        setCurrentDate(newDate)
                      }}
                      className="px-3 py-1.5 text-sm bg-white hover:bg-gray-50 rounded border border-gray-300"
                    >
                      Next →
                    </button>
                    <span className="text-sm font-medium text-gray-700 ml-2">
                      {calendarView === 'week'
                        ? `Week of ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM dd, yyyy')}`
                        : format(currentDate, 'MMMM dd, yyyy')}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCalendarView('week')}
                      className={`px-3 py-1.5 text-sm rounded border ${
                        calendarView === 'week'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Week View
                    </button>
                    <button
                      onClick={() => setCalendarView('day')}
                      className={`px-3 py-1.5 text-sm rounded border ${
                        calendarView === 'day'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Day View
                    </button>
                  </div>
                </div>

                <div className="h-[600px]">
                  <Calendar
                    localizer={localizer}
                    events={calendarEvents}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    view={calendarView}
                    onView={(view) => setCalendarView(view as 'week' | 'day')}
                    views={['week', 'day']}
                    step={15}
                    timeslots={4}
                    date={currentDate}
                    onNavigate={(date) => setCurrentDate(date)}
                    eventPropGetter={(event) => ({
                      style: {
                        backgroundColor: event.resource.session.template.color || '#3b82f6',
                        borderColor: event.resource.conflictFlag ? '#ef4444' : event.resource.session.template.color || '#3b82f6',
                        borderWidth: event.resource.conflictFlag ? '2px' : '1px',
                      },
                    })}
                    onSelectEvent={handleEventClick}
                  />
                </div>
              </div>
            ) : (
              <div>
                {/* Class Filter for Table View */}
                <div className="mb-4 flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Filter by Class:</label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded text-sm"
                  >
                    <option value="all">All Classes</option>
                    {uniqueClasses.map(className => (
                      <option key={className} value={className}>{className}</option>
                    ))}
                  </select>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zone</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Coaches</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredSlots.map((slot) => (
                        <tr key={slot.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {format(new Date(slot.rosterDate), 'MMM dd, yyyy')}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {slot.session.template.name}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">{slot.zoneName}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {format(new Date(slot.startsAt), 'h:mm a')} - {format(new Date(slot.endsAt), 'h:mm a')}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {slot.coaches.map(c => c.coach.name).join(', ') || 'None'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <button
                              onClick={() => {
                                setSelectedSlot(slot)
                                setShowModal(true)
                              }}
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal for Slot Details */}
        {showModal && selectedSlot && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Session Details</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                  <div className="text-lg font-semibold">{selectedSlot.session.template.name}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Zone</label>
                    <div className="text-gray-900">{selectedSlot.zoneName}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <div className="text-gray-900">{format(new Date(selectedSlot.rosterDate), 'MMM dd, yyyy')}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                    <div className="text-gray-900">{format(new Date(selectedSlot.startsAt), 'h:mm a')}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                    <div className="text-gray-900">{format(new Date(selectedSlot.endsAt), 'h:mm a')}</div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Coaches</label>
                  <div className="text-gray-900">
                    {selectedSlot.coaches.map(c => c.coach.name).join(', ') || 'No coaches assigned'}
                  </div>
                </div>
                {selectedSlot.conflictFlag && (
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <div className="text-sm text-red-800 font-medium">⚠️ Conflict Detected</div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    navigateToRoster(selectedSlot.rosterId)
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  View Full Roster
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

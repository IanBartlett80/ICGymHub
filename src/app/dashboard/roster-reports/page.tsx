'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, startOfDay, endOfDay, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'

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

type ClassTemplate = {
  id: string
  name: string
  color: string | null
}

type CoachAllocation = {
  coachId: string
  coachName: string
  coachEmail: string | null
  className: string
  classColor: string | null
  date: string
  dayOfWeek: string
  startTime: string
  endTime: string
  sessionId: string
}

export default function RosterReportsPage() {
  const [slots, setSlots] = useState<ReportSlot[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [classTemplates, setClassTemplates] = useState<ClassTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Report type toggle
  const [reportType, setReportType] = useState<'allocations' | 'schedule'>('allocations')
  
  // View and filter states
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedCoachId, setSelectedCoachId] = useState<string>('all')
  const [selectedClassId, setSelectedClassId] = useState<string>('all')
  const [emailingAll, setEmailingAll] = useState(false)
  const [emailingCoach, setEmailingCoach] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
    fetchCoaches()
    fetchClassTemplates()
  }, [currentDate, viewMode, selectedCoachId, selectedClassId])

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

  const fetchClassTemplates = async () => {
    try {
      const res = await fetch('/api/classes')
      if (res.ok) {
        const data = await res.json()
        setClassTemplates(data.classes)
      }
    } catch (err) {
      console.error('Failed to fetch classes')
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      let startDate: Date
      let endDate: Date

      if (viewMode === 'day') {
        startDate = startOfDay(currentDate)
        endDate = endOfDay(currentDate)
      } else if (viewMode === 'week') {
        startDate = startOfWeek(currentDate, { weekStartsOn: 1 })
        endDate = endOfWeek(currentDate, { weekStartsOn: 1 })
      } else { // month
        startDate = startOfMonth(currentDate)
        endDate = endOfMonth(currentDate)
      }

      const params = new URLSearchParams({
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        status: 'PUBLISHED',
      })

      if (selectedCoachId !== 'all') {
        params.append('coachId', selectedCoachId)
      }

      if (selectedClassId !== 'all') {
        params.append('classId', selectedClassId)
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
    if (viewMode === 'month') {
      setCurrentDate(subMonths(currentDate, 1))
    } else if (viewMode === 'week') {
      setCurrentDate(subWeeks(currentDate, 1))
    } else {
      setCurrentDate(new Date(currentDate.getTime() - 86400000))
    }
  }

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1))
    } else if (viewMode === 'week') {
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
      let startDate: Date
      let endDate: Date

      if (viewMode === 'day') {
        startDate = startOfDay(currentDate)
        endDate = endOfDay(currentDate)
      } else if (viewMode === 'week') {
        startDate = startOfWeek(currentDate, { weekStartsOn: 1 })
        endDate = endOfWeek(currentDate, { weekStartsOn: 1 })
      } else { // month
        startDate = startOfMonth(currentDate)
        endDate = endOfMonth(currentDate)
      }

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
      let startDate: Date
      let endDate: Date

      if (viewMode === 'day') {
        startDate = startOfDay(currentDate)
        endDate = endOfDay(currentDate)
      } else if (viewMode === 'week') {
        startDate = startOfWeek(currentDate, { weekStartsOn: 1 })
        endDate = endOfWeek(currentDate, { weekStartsOn: 1 })
      } else { // month
        startDate = startOfMonth(currentDate)
        endDate = endOfMonth(currentDate)
      }

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

  // Transform slots into coach allocations for the allocations report
  const getCoachAllocations = (): CoachAllocation[] => {
    // First, group slots by coach, class session (same session ID means same class instance)
    const sessionMap = new Map<string, {
      coachId: string
      coachName: string
      coachEmail: string | null
      className: string
      classColor: string | null
      date: string
      sessionId: string
      slots: { startsAt: Date; endsAt: Date }[]
    }>()

    slots.forEach(slot => {
      slot.session.coaches.forEach(coachAssignment => {
        const key = `${coachAssignment.coach.id}-${slot.session.id}-${format(new Date(slot.startsAt), 'yyyy-MM-dd')}`
        
        if (!sessionMap.has(key)) {
          sessionMap.set(key, {
            coachId: coachAssignment.coach.id,
            coachName: coachAssignment.coach.name,
            coachEmail: coachAssignment.coach.email,
            className: slot.session.template?.name || 'Unknown Class',
            classColor: slot.session.template?.color || null,
            date: format(new Date(slot.startsAt), 'yyyy-MM-dd'),
            sessionId: slot.session.id,
            slots: []
          })
        }
        
        sessionMap.get(key)!.slots.push({
          startsAt: new Date(slot.startsAt),
          endsAt: new Date(slot.endsAt)
        })
      })
    })

    // Convert to allocations with consolidated times (earliest start, latest end)
    const allocations: CoachAllocation[] = Array.from(sessionMap.values()).map(session => {
      const startTimes = session.slots.map(s => s.startsAt.getTime())
      const endTimes = session.slots.map(s => s.endsAt.getTime())
      const earliestStart = new Date(Math.min(...startTimes))
      const latestEnd = new Date(Math.max(...endTimes))

      return {
        coachId: session.coachId,
        coachName: session.coachName,
        coachEmail: session.coachEmail,
        className: session.className,
        classColor: session.classColor,
        date: session.date,
        dayOfWeek: format(new Date(session.date), 'EEEE'),
        startTime: format(earliestStart, 'h:mm a'),
        endTime: format(latestEnd, 'h:mm a'),
        sessionId: session.sessionId
      }
    })

    // Sort by coach name, then date, then start time
    allocations.sort((a, b) => {
      if (a.coachName !== b.coachName) return a.coachName.localeCompare(b.coachName)
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return a.startTime.localeCompare(b.startTime)
    })

    return allocations
  }

  // Group slots by day for the schedule report
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

  // Build a time-slot grid for schedule view (similar to reference image 1)
  const buildScheduleGrid = (daySlots: ReportSlot[]) => {
    // Get unique class names for columns
    const classNames = Array.from(new Set(daySlots.map(slot => slot.session.template?.name || 'Unknown')))
    
    // Get unique time slots
    const timeSlots = Array.from(new Set(daySlots.map(slot => ({
      start: format(new Date(slot.startsAt), 'h:mm a'),
      end: format(new Date(slot.endsAt), 'h:mm a'),
      startTime: new Date(slot.startsAt).getTime()
    })))).sort((a, b) => a.startTime - b.startTime)

    // Build grid data structure with coach and zone info
    const grid: { time: string; classes: { [className: string]: Array<{ coachName: string; zoneName: string }> } }[] = []
    
    timeSlots.forEach(({ start, end }) => {
      const classData: { [className: string]: Array<{ coachName: string; zoneName: string }> } = {}
      
      classNames.forEach(className => {
        const slotsForThisTime = daySlots.filter(slot => 
          format(new Date(slot.startsAt), 'h:mm a') === start &&
          format(new Date(slot.endsAt), 'h:mm a') === end &&
          (slot.session.template?.name || 'Unknown') === className
        )
        
        classData[className] = slotsForThisTime.flatMap(slot =>
          slot.session.coaches.map(c => ({
            coachName: c.coach.name,
            zoneName: slot.zone.name
          }))
        )
      })
      
      grid.push({
        time: `${start} - ${end}`,
        classes: classData
      })
    })

    return { grid, classNames }
  }

  const getDateRangeDisplay = () => {
    if (viewMode === 'month') {
      return format(currentDate, 'MMMM yyyy')
    } else if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 })
      const end = endOfWeek(currentDate, { weekStartsOn: 1 })
      return `${format(start, 'MMM dd')} - ${format(end, 'MMM dd, yyyy')}`
    } else {
      return format(currentDate, 'EEEE, MMMM dd, yyyy')
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <DashboardLayout title="Reports" backTo={{ label: 'Back to Home', href: '/dashboard' }} showClassRosteringNav={true}>
        <div className="p-8">Loading...</div>
      </DashboardLayout>
    )
  }

  const coachAllocations = getCoachAllocations()
  const groupedSlots = groupSlotsByDay()

  return (
    <DashboardLayout title="Reports" backTo={{ label: 'Back to Home', href: '/dashboard' }} showClassRosteringNav={true}>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header with action buttons */}
          <div className="flex justify-between items-center mb-6 print:hidden">
            <h2 className="text-2xl font-bold text-gray-900">Reports</h2>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                🖨️ Print
              </button>
              <button
                onClick={handleEmailAll}
                disabled={emailingAll || slots.length === 0}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {emailingAll ? 'Sending...' : '📧 Email All Staff'}
              </button>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 print:hidden">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 print:hidden">
              {success}
            </div>
          )}

          {/* Report Type Tabs */}
          <div className="bg-white rounded-lg shadow mb-6 print:hidden">
            <div className="flex border-b">
              <button
                onClick={() => setReportType('allocations')}
                className={`flex-1 px-6 py-3 font-medium ${
                  reportType === 'allocations'
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                Staff Coaching Allocations
              </button>
              <button
                onClick={() => setReportType('schedule')}
                className={`flex-1 px-6 py-3 font-medium ${
                  reportType === 'schedule'
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                Daily Class Schedule
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-white rounded-lg shadow p-4 mb-6 print:hidden">
            <div className="flex flex-wrap gap-4 items-center">
              {/* View Mode Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('day')}
                  className={`px-4 py-2 rounded font-medium ${
                    viewMode === 'day'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Day
                </button>
                <button
                  onClick={() => setViewMode('week')}
                  className={`px-4 py-2 rounded font-medium ${
                    viewMode === 'week'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setViewMode('month')}
                  className={`px-4 py-2 rounded font-medium ${
                    viewMode === 'month'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Month
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

              {/* Class Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filter by Class
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="border rounded px-3 py-2"
                >
                  <option value="all">All Classes</option>
                  {classTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Report Content */}
          {slots.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              No published rosters found for this period.
            </div>
          ) : (
            <>
              {reportType === 'allocations' ? (
                <StaffAllocationsReport
                  allocations={coachAllocations}
                  onEmailCoach={handleEmailCoach}
                  emailingCoach={emailingCoach}
                  coaches={coaches}
                  dateRange={getDateRangeDisplay()}
                />
              ) : (
                <DailyScheduleReport
                  groupedSlots={groupedSlots}
                  buildScheduleGrid={buildScheduleGrid}
                  dateRange={getDateRangeDisplay()}
                />
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

// Staff Allocations Report Component
function StaffAllocationsReport({
  allocations,
  onEmailCoach,
  emailingCoach,
  coaches,
  dateRange,
}: {
  allocations: CoachAllocation[]
  onEmailCoach: (coachId: string) => void
  emailingCoach: string | null
  coaches: Coach[]
  dateRange: string
}) {
  // Group allocations by coach
  const allocationsByCoach: { [coachName: string]: CoachAllocation[] } = {}
  allocations.forEach(allocation => {
    if (!allocationsByCoach[allocation.coachName]) {
      allocationsByCoach[allocation.coachName] = []
    }
    allocationsByCoach[allocation.coachName].push(allocation)
  })

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Print header */}
      <div className="hidden print:block px-6 py-4 border-b">
        <h1 className="text-2xl font-bold text-gray-900">Staff Coaching Allocations</h1>
        <p className="text-gray-600 mt-1">{dateRange}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Coach
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Class
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Start Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                End Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:hidden">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {allocations.map((allocation, index) => {
              const coach = coaches.find(c => c.id === allocation.coachId)
              const isNewCoach = index === 0 || allocations[index - 1].coachName !== allocation.coachName
              
              return (
                <tr 
                  key={`${allocation.coachId}-${allocation.date}-${allocation.startTime}-${index}`}
                  className={`hover:bg-gray-50 ${isNewCoach ? 'border-t-2 border-gray-300' : ''}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isNewCoach && (
                      <div className="font-semibold text-gray-900">{allocation.coachName}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    <div>{format(new Date(allocation.date), 'EEE, MMM dd, yyyy')}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                      style={{
                        backgroundColor: allocation.classColor ? `${allocation.classColor}20` : '#E5E7EB',
                        color: allocation.classColor || '#374151',
                        border: `1px solid ${allocation.classColor || '#D1D5DB'}`
                      }}
                    >
                      {allocation.className}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {allocation.startTime}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {allocation.endTime}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm print:hidden">
                    {isNewCoach && coach?.email && (
                      <button
                        onClick={() => onEmailCoach(allocation.coachId)}
                        disabled={emailingCoach === allocation.coachId}
                        className="text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                      >
                        {emailingCoach === allocation.coachId ? 'Sending...' : '📧 Email'}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {Object.keys(allocationsByCoach).length === 0 && (
        <div className="px-6 py-8 text-center text-gray-500">
          No coach allocations found for this period.
        </div>
      )}
    </div>
  )
}

// Daily Schedule Report Component
function DailyScheduleReport({
  groupedSlots,
  buildScheduleGrid,
  dateRange,
}: {
  groupedSlots: [string, ReportSlot[]][]
  buildScheduleGrid: (slots: ReportSlot[]) => { grid: any[]; classNames: string[] }
  dateRange: string
}) {
  return (
    <div className="space-y-6">
      {/* Print header */}
      <div className="hidden print:block bg-white px-6 py-4 border-b">
        <h1 className="text-2xl font-bold text-gray-900">Daily Class Schedule</h1>
        <p className="text-gray-600 mt-1">{dateRange}</p>
      </div>

      {groupedSlots.map(([date, daySlots]) => {
        const { grid, classNames } = buildScheduleGrid(daySlots)
        
        return (
          <div key={date} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-gray-50 px-6 py-3 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {format(new Date(date), 'EEEE, MMMM dd, yyyy')}
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-r-2 border-gray-300">
                      Time
                    </th>
                    {classNames.map(className => (
                      <th 
                        key={className}
                        className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200"
                      >
                        {className}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {grid.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r-2 border-gray-300">
                        {row.time}
                      </td>
                      {classNames.map(className => {
                        const coachAssignments = row.classes[className] || []
                        return (
                          <td 
                            key={className}
                            className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200"
                          >
                            {coachAssignments.length > 0 ? (
                              <div className="flex flex-col gap-1">
                                {coachAssignments.map((assignment: { coachName: string; zoneName: string }, idx: number) => (
                                  <div
                                    key={idx}
                                    className="inline-flex flex-col bg-blue-50 rounded px-2 py-1 border border-blue-200"
                                  >
                                    <span className="text-xs font-semibold text-blue-900">
                                      {assignment.coachName}
                                    </span>
                                    <span className="text-xs text-blue-700">
                                      {assignment.zoneName}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400 italic text-xs">—</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}

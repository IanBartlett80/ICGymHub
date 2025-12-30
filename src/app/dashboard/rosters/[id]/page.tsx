'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const locales = {
  'en-US': require('date-fns/locale/en-US'),
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

type RosterSlot = {
  id: string
  startsAt: string
  endsAt: string
  conflictFlag: boolean
  zone: { id: string; name: string }
  session: {
    template: { name: string } | null
    coaches: Array<{ coach: { name: string } }>
  }
}

type Roster = {
  id: string
  scope: string
  startDate: string
  endDate: string
  status: string
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
  const router = useRouter()
  const [roster, setRoster] = useState<Roster | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    fetchRoster()
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

  if (loading) return <div className="p-8">Loading...</div>

  if (error || !roster) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error || 'Roster not found'}
          </div>
        </div>
      </div>
    )
  }

  const events: CalendarEvent[] = roster.slots.map((slot) => ({
    id: slot.id,
    title: `${slot.session.template?.name || 'Unknown'} - ${slot.zone.name}${
      slot.conflictFlag ? ' ⚠️' : ''
    }`,
    start: new Date(slot.startsAt),
    end: new Date(slot.endsAt),
    resource: slot,
  }))

  const conflictCount = roster.slots.filter((s) => s.conflictFlag).length

  return (
    <div className="min-h-screen bg-gray-50 p-8">
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
      `}</style>

      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6 no-print">
          <div>
            <h1 className="text-3xl font-bold">Roster for {new Date(roster.startDate).toLocaleDateString()}</h1>
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
            <button
              onClick={() => router.push('/dashboard/rosters')}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Back to Rosters
            </button>
          </div>
        </div>

        <div className="print-only mb-4">
          <h1 className="text-2xl font-bold">Roster for {new Date(roster.startDate).toLocaleDateString()}</h1>
          <p className="text-gray-600">Generated: {new Date().toLocaleString()}</p>
        </div>

        {conflictCount > 0 && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded mb-6 no-print">
            <strong>⚠️ Warning:</strong> {conflictCount} slot{conflictCount !== 1 ? 's have' : ' has'} conflicts.
            Conflicts are marked with ⚠️ in the calendar below.
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div style={{ height: '600px' }}>
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              defaultView="day"
              views={['day', 'agenda']}
              defaultDate={new Date(roster.startDate)}
              eventPropGetter={(event) => ({
                style: {
                  backgroundColor: event.resource.conflictFlag ? '#ef4444' : '#3b82f6',
                  borderColor: event.resource.conflictFlag ? '#dc2626' : '#2563eb',
                },
              })}
              tooltipAccessor={(event) => {
                const slot = event.resource
                const coaches = slot.session.coaches.map((c) => c.coach.name).join(', ')
                return `${slot.session.template?.name}\nZone: ${slot.zone.name}\nCoaches: ${coaches}${
                  slot.conflictFlag ? '\n⚠️ CONFLICT' : ''
                }`
              }}
            />
          </div>
        </div>

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
                      {slot.session.template?.name || 'Unknown'}
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
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

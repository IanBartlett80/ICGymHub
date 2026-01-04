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

type TemplateSelection = {
  templateId: string
  rotationMinutes: number
  allowedZoneIds: string[]
  coachIds: string[]
  allowOverlap: boolean
  startTimeLocal: string
  endTimeLocal: string
}

export default function RosterBuilderPage() {
  const router = useRouter()
  const [classes, setClasses] = useState<ClassTemplate[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [date, setDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set())
  const [customizations, setCustomizations] = useState<Map<string, Partial<TemplateSelection>>>(new Map())

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

  const toggleClass = (templateId: string) => {
    const newSelected = new Set(selectedClasses)
    if (newSelected.has(templateId)) {
      newSelected.delete(templateId)
      const newCustomizations = new Map(customizations)
      newCustomizations.delete(templateId)
      setCustomizations(newCustomizations)
    } else {
      newSelected.add(templateId)
    }
    setSelectedClasses(newSelected)
  }

  const updateCustomization = (templateId: string, field: keyof TemplateSelection, value: any) => {
    const newCustomizations = new Map(customizations)
    const current = newCustomizations.get(templateId) || {}
    newCustomizations.set(templateId, { ...current, [field]: value })
    setCustomizations(newCustomizations)
  }

  const toggleCoach = (templateId: string, coachId: string) => {
    const current = customizations.get(templateId)?.coachIds || []
    const newCoachIds = current.includes(coachId)
      ? current.filter((id) => id !== coachId)
      : [...current, coachId]
    updateCustomization(templateId, 'coachIds', newCoachIds)
  }

  const toggleZone = (templateId: string, zoneId: string) => {
    const current = customizations.get(templateId)?.allowedZoneIds || []
    const newZoneIds = current.includes(zoneId)
      ? current.filter((id) => id !== zoneId)
      : [...current, zoneId]
    updateCustomization(templateId, 'allowedZoneIds', newZoneIds)
  }

  const handleGenerate = async () => {
    if (selectedClasses.size === 0) {
      setError('Please select at least one class')
      return
    }

    setGenerating(true)
    setError('')
    setSuccess('')

    try {
      const templates = Array.from(selectedClasses).map((templateId) => {
        const classTemplate = classes.find((c) => c.id === templateId)
        const custom = customizations.get(templateId) || {}

        return {
          templateId,
          rotationMinutes: custom.rotationMinutes ?? classTemplate?.defaultRotationMinutes,
          allowedZoneIds: custom.allowedZoneIds?.length
            ? custom.allowedZoneIds
            : classTemplate?.allowedZones.map((z) => z.zone.id),
          coachIds: custom.coachIds?.length
            ? custom.coachIds
            : classTemplate?.defaultCoaches.map((c) => c.coach.id),
          allowOverlap: custom.allowOverlap ?? false,
          startTimeLocal: custom.startTimeLocal ?? classTemplate?.startTimeLocal,
          endTimeLocal: custom.endTimeLocal ?? classTemplate?.endTimeLocal,
        }
      })

      const res = await fetch('/api/rosters/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, templates }),
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(
          `Roster generated successfully! ${data.slotCount} slots created. ${
            data.conflicts.length > 0 ? `Warning: ${data.conflicts.length} conflicts detected.` : ''
          }`
        )
        
        // Redirect to roster view after 2 seconds
        setTimeout(() => {
          router.push(`/dashboard/rosters/${data.rosterId}`)
        }, 2000)
      } else {
        setError(data.error || 'Failed to generate roster')
      }
    } catch (err) {
      setError('Failed to generate roster')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return (
    <DashboardLayout 
      title="Create Class Roster"
      backTo={{ label: 'Back to Rosters', href: '/dashboard/rosters' }}
    >
      <div className="p-8">Loading...</div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout 
      title="Create Class Roster"
      backTo={{ label: 'Back to Rosters', href: '/dashboard/rosters' }}
    >
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <p className="text-gray-600">Select classes and customize settings to generate a daily roster</p>
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
          <h2 className="text-xl font-semibold mb-4">Roster Date</h2>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Select Classes</h2>
          {classes.length === 0 ? (
            <p className="text-gray-500">No classes available. Please create classes first.</p>
          ) : (
            <div className="space-y-4">
              {classes.map((classTemplate) => {
                const isSelected = selectedClasses.has(classTemplate.id)
                const custom = customizations.get(classTemplate.id) || {}

                return (
                  <div key={classTemplate.id} className="border rounded p-4">
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleClass(classTemplate.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold text-lg">{classTemplate.name}</h3>
                            <p className="text-sm text-gray-600">
                              {classTemplate.level} • {classTemplate.lengthMinutes} min • {classTemplate.startTimeLocal} - {classTemplate.endTimeLocal}
                            </p>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="mt-4 space-y-3 border-t pt-3">
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium mb-1">Rotation (min)</label>
                                <input
                                  type="number"
                                  value={custom.rotationMinutes ?? classTemplate.defaultRotationMinutes}
                                  onChange={(e) =>
                                    updateCustomization(classTemplate.id, 'rotationMinutes', parseInt(e.target.value))
                                  }
                                  className="w-full border rounded px-2 py-1 text-sm"
                                  min="1"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Start Time</label>
                                <input
                                  type="time"
                                  value={custom.startTimeLocal ?? classTemplate.startTimeLocal}
                                  onChange={(e) =>
                                    updateCustomization(classTemplate.id, 'startTimeLocal', e.target.value)
                                  }
                                  className="w-full border rounded px-2 py-1 text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">End Time</label>
                                <input
                                  type="time"
                                  value={custom.endTimeLocal ?? classTemplate.endTimeLocal}
                                  onChange={(e) =>
                                    updateCustomization(classTemplate.id, 'endTimeLocal', e.target.value)
                                  }
                                  className="w-full border rounded px-2 py-1 text-sm"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium mb-2">Coaches</label>
                              <div className="flex gap-2 flex-wrap">
                                {coaches.map((coach) => {
                                  const selectedCoaches = custom.coachIds || classTemplate.defaultCoaches.map((c) => c.coach.id)
                                  const isCoachSelected = selectedCoaches.includes(coach.id)

                                  return (
                                    <button
                                      key={coach.id}
                                      type="button"
                                      onClick={() => toggleCoach(classTemplate.id, coach.id)}
                                      className={`px-2 py-1 text-sm rounded ${
                                        isCoachSelected
                                          ? 'bg-purple-600 text-white'
                                          : 'bg-gray-200 text-gray-700'
                                      }`}
                                    >
                                      {coach.name}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium mb-2">Allowed Zones</label>
                              <div className="flex gap-2 flex-wrap">
                                {zones.map((zone) => {
                                  const selectedZones = custom.allowedZoneIds || classTemplate.allowedZones.map((z) => z.zone.id)
                                  const isZoneSelected = selectedZones.includes(zone.id)

                                  return (
                                    <button
                                      key={zone.id}
                                      type="button"
                                      onClick={() => toggleZone(classTemplate.id, zone.id)}
                                      className={`px-2 py-1 text-sm rounded ${
                                        isZoneSelected
                                          ? 'bg-green-600 text-white'
                                          : 'bg-gray-200 text-gray-700'
                                      }`}
                                    >
                                      {zone.name}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>

                            <div>
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={custom.allowOverlap ?? false}
                                  onChange={(e) =>
                                    updateCustomization(classTemplate.id, 'allowOverlap', e.target.checked)
                                  }
                                  className="rounded"
                                />
                                <span className="text-sm">Allow zone overlap</span>
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleGenerate}
            disabled={generating || selectedClasses.size === 0}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {generating ? 'Generating...' : 'Generate Roster'}
          </button>
          <button
            onClick={() => router.push('/dashboard/rosters')}
            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700"
          >
            View Existing Rosters
          </button>
        </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

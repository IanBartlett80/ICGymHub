'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/components/DashboardLayout'

type Zone = {
  id: string
  name: string
}

type Gymsport = {
  id: string
  name: string
}

type CoachGymsport = {
  gymsport: Gymsport
}

type Coach = {
  id: string
  name: string
  gymsports: CoachGymsport[]
}

type ClassTemplate = {
  id: string
  name: string
  gymsport: Gymsport | null
  gymsportId: string | null
  level: string
  lengthMinutes: number
  defaultRotationMinutes: number
  allowOverlap: boolean
  activeDays: string
  startTimeLocal: string
  endTimeLocal: string
  notes: string | null
  allowedZones: Array<{ zone: Zone }>
  defaultCoaches: Array<{ coach: Coach }>
}

const CLASS_LEVELS = ['REC', 'LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4', 'LEVEL_5', 'LEVEL_6', 'LEVEL_7', 'LEVEL_8', 'LEVEL_9', 'LEVEL_10', 'SNR', 'ADULT', 'SCHOOL', 'OTHER']
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

// Helper function to calculate session length in minutes
function calculateSessionLength(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 60 // default to 60 minutes if times are invalid
  
  const [startHour, startMin] = startTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)
  
  const startMinutes = startHour * 60 + startMin
  const endMinutes = endHour * 60 + endMin
  
  const diff = endMinutes - startMinutes
  return diff > 0 ? diff : 60 // default to 60 if end time is before start time
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassTemplate[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [gymsports, setGymsports] = useState<Gymsport[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [allCoaches, setAllCoaches] = useState<Coach[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showLevelDropdown, setShowLevelDropdown] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    gymsportId: '',
    level: 'REC',
    levels: [] as string[],
    lengthMinutes: 60,
    defaultRotationMinutes: 15,
    allowOverlap: false,
    activeDays: [] as string[],
    startTimeLocal: '16:00',
    endTimeLocal: '17:00',
    notes: '',
    color: '#3b82f6',
    allowedZoneIds: [] as string[],
    defaultCoachIds: [] as string[],
  })

  useEffect(() => {
    fetchData()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.level-dropdown-container')) {
        setShowLevelDropdown(false)
      }
    }
    if (showLevelDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showLevelDropdown])

  const fetchData = async () => {
    try {
      const [classesRes, zonesRes, gymsportsRes, coachesRes] = await Promise.all([
        fetch('/api/classes'),
        fetch('/api/zones'),
        fetch('/api/gymsports'),
        fetch('/api/coaches'),
      ])

      if (classesRes.ok) {
        const data = await classesRes.json()
        setClasses(data.classes)
      }

      if (zonesRes.ok) {
        const data = await zonesRes.json()
        setZones(data.zones)
      }

      if (gymsportsRes.ok) {
        const data = await gymsportsRes.json()
        setGymsports(data.gymsports)
      }

      if (coachesRes.ok) {
        const data = await coachesRes.json()
        setAllCoaches(data.coaches)
        setCoaches(data.coaches)
      }
    } catch (err) {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      const url = editingId ? `/api/classes/${editingId}` : '/api/classes'
      const method = editingId ? 'PATCH' : 'POST'

      const payload = {
        ...formData,
        gymsportId: formData.gymsportId || undefined,
        activeDays: formData.activeDays.join(','),
        level: formData.levels.join(','),
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        await fetchData()
        setShowForm(false)
        setEditingId(null)
        setFormData({
          name: '',
          gymsportId: '',
          level: 'REC',
          levels: [],
          lengthMinutes: 60,
          defaultRotationMinutes: 15,
          allowOverlap: false,
          activeDays: [],
          startTimeLocal: '16:00',
          endTimeLocal: '17:00',
          notes: '',
          color: '#3b82f6',
          allowedZoneIds: [],
          defaultCoachIds: [],
        })
        setSuccess('Class saved successfully')
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to save class')
      }
    } catch (err) {
      setError('Failed to save class')
    }
  }

  const handleEdit = (classTemplate: ClassTemplate) => {
    // Parse level field for backwards compatibility
    const levels = classTemplate.level ? classTemplate.level.split(',').filter(Boolean) : []
    
    setFormData({
      name: classTemplate.name,
      gymsportId: classTemplate.gymsportId || '',
      level: classTemplate.level,
      levels: levels,
      lengthMinutes: classTemplate.lengthMinutes,
      defaultRotationMinutes: classTemplate.defaultRotationMinutes,
      allowOverlap: classTemplate.allowOverlap,
      activeDays: classTemplate.activeDays.split(',').filter(Boolean),
      startTimeLocal: classTemplate.startTimeLocal,
      endTimeLocal: classTemplate.endTimeLocal,
      notes: classTemplate.notes || '',
      color: (classTemplate as any).color || '#3b82f6',
      allowedZoneIds: classTemplate.allowedZones.map((z) => z.zone.id),
      defaultCoachIds: classTemplate.defaultCoaches.map((c) => c.coach.id),
    })
    
    // Filter coaches by gymsport when editing
    if (classTemplate.gymsportId) {
      const filteredCoaches = allCoaches.filter((coach) =>
        coach.gymsports.some((cg) => cg.gymsport.id === classTemplate.gymsportId)
      )
      setCoaches(filteredCoaches.length > 0 ? filteredCoaches : allCoaches)
    } else {
      setCoaches(allCoaches)
    }
    
    setEditingId(classTemplate.id)
    setShowForm(true)
  }

  const handleDelete = async () => {
    if (!deleteConfirmId) return

    try {
      const res = await fetch(`/api/classes/${deleteConfirmId}`, { method: 'DELETE' })
      if (res.ok) {
        await fetchData()
        setSuccess('Class deleted successfully')
        setDeleteConfirmId(null)
      } else {
        setError('Failed to delete class')
      }
    } catch (err) {
      setError('Failed to delete class')
    }
  }

  const toggleDay = (day: string) => {
    setFormData({
      ...formData,
      activeDays: formData.activeDays.includes(day)
        ? formData.activeDays.filter((d) => d !== day)
        : [...formData.activeDays, day],
    })
  }

  const toggleZone = (zoneId: string) => {
    setFormData({
      ...formData,
      allowedZoneIds: formData.allowedZoneIds.includes(zoneId)
        ? formData.allowedZoneIds.filter((id) => id !== zoneId)
        : [...formData.allowedZoneIds, zoneId],
    })
  }

  const toggleCoach = (coachId: string) => {
    setFormData({
      ...formData,
      defaultCoachIds: formData.defaultCoachIds.includes(coachId)
        ? formData.defaultCoachIds.filter((id) => id !== coachId)
        : [...formData.defaultCoachIds, coachId],
    })
  }

  const handleGymsportChange = (gymsportId: string) => {
    // Filter coaches by selected gymsport
    if (gymsportId) {
      const filteredCoaches = allCoaches.filter((coach) =>
        coach.gymsports.some((cg) => cg.gymsport.id === gymsportId)
      )
      setCoaches(filteredCoaches.length > 0 ? filteredCoaches : allCoaches)
    } else {
      setCoaches(allCoaches)
    }
    
    // Reset selected coaches when gymsport changes
    setFormData({
      ...formData,
      gymsportId,
      defaultCoachIds: [],
    })
  }

  if (loading) return (
    <DashboardLayout title="Class Templates" backTo={{ label: 'Back to Home', href: '/dashboard' }} showClassRosteringNav={true}>
      <div className="p-8">Loading...</div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout title="Class Templates" backTo={{ label: 'Back to Home', href: '/dashboard' }} showClassRosteringNav={true}>
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Manage Class Templates</h2>
            <button
            onClick={() => {
              setShowForm(!showForm)
              setEditingId(null)
              setCoaches(allCoaches)
              setFormData({
                name: '',
                gymsportId: '',
                level: 'REC',
                levels: [],
                lengthMinutes: 60,
                defaultRotationMinutes: 15,
                allowOverlap: false,
                activeDays: [],
                startTimeLocal: '16:00',
                endTimeLocal: '17:00',
                notes: '',
                color: '#3b82f6',
                allowedZoneIds: [],
                defaultCoachIds: [],
              })
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {showForm ? 'Cancel' : 'Add Class'}
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

        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold mb-4">{editingId ? 'Edit Class' : 'Add New Class'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Class Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Gymsport</label>
                  <select
                    value={formData.gymsportId}
                    onChange={(e) => handleGymsportChange(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">-- Select Gymsport --</option>
                    {gymsports.map((gymsport) => (
                      <option key={gymsport.id} value={gymsport.id}>
                        {gymsport.name}
                      </option>
                    ))}
                  </select>
                  {formData.gymsportId && (
                    <p className="text-xs text-gray-600 mt-1">
                      Only coaches accredited in this gymsport will be available to select.
                    </p>
                  )}
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Levels *</label>
                  <div className="relative level-dropdown-container">
                    <button
                      type="button"
                      onClick={() => setShowLevelDropdown(!showLevelDropdown)}
                      className="w-full border rounded px-3 py-2 text-left flex items-center justify-between bg-white"
                    >
                      <span className="text-sm">
                        {formData.levels.length === 0 
                          ? 'Select levels...' 
                          : formData.levels.map(l => l.replace('LEVEL_', '')).join(', ')}
                      </span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {showLevelDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-64 overflow-y-auto">
                        {CLASS_LEVELS.map((level) => (
                          <label
                            key={level}
                            className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={formData.levels.includes(level)}
                              onChange={(e) => {
                                const newLevels = e.target.checked
                                  ? [...formData.levels, level]
                                  : formData.levels.filter((l) => l !== level)
                                setFormData({ ...formData, levels: newLevels })
                              }}
                              className="rounded mr-2"
                            />
                            <span className="text-sm">{level.replace('LEVEL_', '')}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{formData.levels.length} level(s) selected</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Session Length (minutes)</label>
                  <input
                    type="number"
                    value={formData.lengthMinutes}
                    className="w-full border rounded px-3 py-2 bg-gray-100"
                    readOnly
                    title="Automatically calculated from start and end time"
                  />
                  <p className="text-xs text-gray-500 mt-1">Auto-calculated from start and end time</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Rotation Time (minutes) *</label>
                  <input
                    type="number"
                    value={formData.defaultRotationMinutes}
                    onChange={(e) => setFormData({ ...formData, defaultRotationMinutes: parseInt(e.target.value) })}
                    className="w-full border rounded px-3 py-2"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Session Start Time *</label>
                  <input
                    type="time"
                    value={formData.startTimeLocal}
                    onChange={(e) => {
                      const newStartTime = e.target.value
                      const calculatedLength = calculateSessionLength(newStartTime, formData.endTimeLocal)
                      setFormData({ ...formData, startTimeLocal: newStartTime, lengthMinutes: calculatedLength })
                    }}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Session End Time *</label>
                  <input
                    type="time"
                    value={formData.endTimeLocal}
                    onChange={(e) => {
                      const newEndTime = e.target.value
                      const calculatedLength = calculateSessionLength(formData.startTimeLocal, newEndTime)
                      setFormData({ ...formData, endTimeLocal: newEndTime, lengthMinutes: calculatedLength })
                    }}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Calendar Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="h-10 w-20 border rounded cursor-pointer"
                    />
                    <span className="text-sm text-gray-600">{formData.color}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">This color will be used in the roster calendar view</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Active Days *</label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-3 py-1 rounded ${
                        formData.activeDays.includes(day)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Allowed Zones *</label>
                <div className="flex gap-2 flex-wrap">
                  {zones.map((zone) => (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => toggleZone(zone.id)}
                      className={`px-3 py-1 rounded ${
                        formData.allowedZoneIds.includes(zone.id)
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {zone.name}
                    </button>
                  ))}
                </div>
                {zones.length === 0 && <p className="text-sm text-gray-500">No zones available. Add zones first.</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Default Coaches</label>
                <div className="flex gap-2 flex-wrap">
                  {coaches.map((coach) => (
                    <button
                      key={coach.id}
                      type="button"
                      onClick={() => toggleCoach(coach.id)}
                      className={`px-3 py-1 rounded ${
                        formData.defaultCoachIds.includes(coach.id)
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {coach.name}
                    </button>
                  ))}
                </div>
                {coaches.length === 0 && <p className="text-sm text-gray-500">No coaches available. Add coaches first.</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.allowOverlap}
                    onChange={(e) => setFormData({ ...formData, allowOverlap: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Allow overlap with other classes in same zone</span>
                </label>
              </div>

              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                {editingId ? 'Update Class' : 'Create Class'}
              </button>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Level</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {classes.map((classTemplate) => (
                <tr key={classTemplate.id}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{classTemplate.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{classTemplate.level.replace('LEVEL_', '')}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{classTemplate.lengthMinutes} min</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {classTemplate.startTimeLocal} - {classTemplate.endTimeLocal}
                  </td>
                  <td className="px-6 py-4">{classTemplate.activeDays}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleEdit(classTemplate)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(classTemplate.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {classes.length === 0 && (
            <div className="text-center py-8 text-gray-500">No classes configured yet.</div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Confirm Deletion</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this class template? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete
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


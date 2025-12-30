'use client'

import { useState, useEffect } from 'react'

type Zone = {
  id: string
  name: string
}

type Coach = {
  id: string
  name: string
}

type ClassTemplate = {
  id: string
  name: string
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

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassTemplate[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    level: 'REC',
    lengthMinutes: 60,
    defaultRotationMinutes: 15,
    allowOverlap: false,
    activeDays: [] as string[],
    startTimeLocal: '16:00',
    endTimeLocal: '17:00',
    notes: '',
    allowedZoneIds: [] as string[],
    defaultCoachIds: [] as string[],
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [classesRes, zonesRes, coachesRes] = await Promise.all([
        fetch('/api/classes'),
        fetch('/api/zones'),
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

      if (coachesRes.ok) {
        const data = await coachesRes.json()
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
        activeDays: formData.activeDays.join(','),
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
          level: 'REC',
          lengthMinutes: 60,
          defaultRotationMinutes: 15,
          allowOverlap: false,
          activeDays: [],
          startTimeLocal: '16:00',
          endTimeLocal: '17:00',
          notes: '',
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
    setFormData({
      name: classTemplate.name,
      level: classTemplate.level,
      lengthMinutes: classTemplate.lengthMinutes,
      defaultRotationMinutes: classTemplate.defaultRotationMinutes,
      allowOverlap: classTemplate.allowOverlap,
      activeDays: classTemplate.activeDays.split(',').filter(Boolean),
      startTimeLocal: classTemplate.startTimeLocal,
      endTimeLocal: classTemplate.endTimeLocal,
      notes: classTemplate.notes || '',
      allowedZoneIds: classTemplate.allowedZones.map((z) => z.zone.id),
      defaultCoachIds: classTemplate.defaultCoaches.map((c) => c.coach.id),
    })
    setEditingId(classTemplate.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this class?')) return

    try {
      const res = await fetch(`/api/classes/${id}`, { method: 'DELETE' })
      if (res.ok) {
        await fetchData()
        setSuccess('Class deleted successfully')
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

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Classes</h1>
          <button
            onClick={() => {
              setShowForm(!showForm)
              setEditingId(null)
              setFormData({
                name: '',
                level: 'REC',
                lengthMinutes: 60,
                defaultRotationMinutes: 15,
                allowOverlap: false,
                activeDays: [],
                startTimeLocal: '16:00',
                endTimeLocal: '17:00',
                notes: '',
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
                  <label className="block text-sm font-medium mb-1">Level *</label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  >
                    {CLASS_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {level.replace('LEVEL_', '')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Length (minutes) *</label>
                  <input
                    type="number"
                    value={formData.lengthMinutes}
                    onChange={(e) => setFormData({ ...formData, lengthMinutes: parseInt(e.target.value) })}
                    className="w-full border rounded px-3 py-2"
                    min="1"
                    required
                  />
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
                  <label className="block text-sm font-medium mb-1">Start Time *</label>
                  <input
                    type="time"
                    value={formData.startTimeLocal}
                    onChange={(e) => setFormData({ ...formData, startTimeLocal: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Time *</label>
                  <input
                    type="time"
                    value={formData.endTimeLocal}
                    onChange={(e) => setFormData({ ...formData, endTimeLocal: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
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
                      onClick={() => handleDelete(classTemplate.id)}
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
      </div>
    </div>
  )
}

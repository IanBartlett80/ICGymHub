'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const CLASS_LEVELS = ['REC', 'LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4', 'LEVEL_5', 'LEVEL_6', 'LEVEL_7', 'LEVEL_8', 'LEVEL_9', 'LEVEL_10', 'SNR', 'ADULT', 'SCHOOL', 'OTHER']
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

interface ClassTemplate {
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

interface Zone {
  id: string
  name: string
}

interface Coach {
  id: string
  name: string
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassTemplate[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    level: 'REC',
    lengthMinutes: 60,
    defaultRotationMinutes: 15,
    startTimeLocal: '09:00',
    endTimeLocal: '10:00',
    activeDays: ['MON'],
    allowedZoneIds: [] as string[],
    coachIds: [] as string[],
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [classRes, zoneRes, coachRes] = await Promise.all([
        fetch('/api/classes'),
        fetch('/api/zones'),
        fetch('/api/coaches'),
      ])

      if (classRes.ok) setClasses((await classRes.json()).classes)
      if (zoneRes.ok) setZones((await zoneRes.json()).zones)
      if (coachRes.ok) setCoaches((await coachRes.json()).coaches)
    } catch (err) {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
        setFormData({
          name: '',
          level: 'REC',
          lengthMinutes: 60,
          defaultRotationMinutes: 15,
          startTimeLocal: '09:00',
          endTimeLocal: '10:00',
          activeDays: ['MON'],
          allowedZoneIds: [],
          coachIds: [],
        })
        setEditingId(null)
      } else {
        setError('Failed to save class')
      }
    } catch (err) {
      setError('Failed to save class')
    }
  }

  const handleEdit = (template: ClassTemplate) => {
    setEditingId(template.id)
    setFormData({
      name: template.name,
      level: template.level,
      lengthMinutes: template.lengthMinutes,
      defaultRotationMinutes: template.defaultRotationMinutes,
      startTimeLocal: template.startTimeLocal,
      endTimeLocal: template.endTimeLocal,
      activeDays: template.activeDays.split(','),
      allowedZoneIds: template.allowedZones.map((z) => z.zone.id),
      coachIds: template.defaultCoaches.map((c) => c.coach.id),
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return
    try {
      const res = await fetch(`/api/classes/${id}`, { method: 'DELETE' })
      if (res.ok) {
        await fetchData()
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
        ? formData.allowedZoneIds.filter((z) => z !== zoneId)
        : [...formData.allowedZoneIds, zoneId],
    })
  }

  const toggleCoach = (coachId: string) => {
    setFormData({
      ...formData,
      coachIds: formData.coachIds.includes(coachId)
        ? formData.coachIds.filter((c) => c !== coachId)
        : [...formData.coachIds, coachId],
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
      {/* Navigation */}
      <nav className="border-b border-neutral-700 bg-neutral-900/50 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-white hover:text-blue-400 transition">
              ← Back to Dashboard
            </Link>
            <span className="text-neutral-500">•</span>
            <h1 className="text-xl font-bold text-white">Manage Class Templates</h1>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8 max-w-5xl">
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">
            {editingId ? 'Edit Class Template' : 'Add New Class Template'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Class Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Recreation Level 1"
                  className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-500 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Level *</label>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                >
                  {CLASS_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Class Duration (min) *</label>
                <input
                  type="number"
                  value={formData.lengthMinutes}
                  onChange={(e) => setFormData({ ...formData, lengthMinutes: parseInt(e.target.value) })}
                  min="15"
                  className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Rotation Time (min)</label>
                <input
                  type="number"
                  value={formData.defaultRotationMinutes}
                  onChange={(e) => setFormData({ ...formData, defaultRotationMinutes: parseInt(e.target.value) })}
                  min="1"
                  className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Start Time *</label>
                <input
                  type="time"
                  value={formData.startTimeLocal}
                  onChange={(e) => setFormData({ ...formData, startTimeLocal: e.target.value })}
                  className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">End Time *</label>
              <input
                type="time"
                value={formData.endTimeLocal}
                onChange={(e) => setFormData({ ...formData, endTimeLocal: e.target.value })}
                className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-3">Active Days</label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${
                      formData.activeDays.includes(day)
                        ? 'bg-blue-600 text-white'
                        : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-3">Allowed Zones</label>
              <div className="flex flex-wrap gap-2">
                {zones.map((zone) => (
                  <button
                    key={zone.id}
                    type="button"
                    onClick={() => toggleZone(zone.id)}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${
                      formData.allowedZoneIds.includes(zone.id)
                        ? 'bg-green-600 text-white'
                        : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'
                    }`}
                  >
                    {zone.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-3">Default Coaches</label>
              <div className="flex flex-wrap gap-2">
                {coaches.map((coach) => (
                  <button
                    key={coach.id}
                    type="button"
                    onClick={() => toggleCoach(coach.id)}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${
                      formData.coachIds.includes(coach.id)
                        ? 'bg-purple-600 text-white'
                        : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'
                    }`}
                  >
                    {coach.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
              >
                {editingId ? 'Update Class' : 'Add Class'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null)
                    setFormData({
                      name: '',
                      level: 'REC',
                      lengthMinutes: 60,
                      defaultRotationMinutes: 15,
                      startTimeLocal: '09:00',
                      endTimeLocal: '10:00',
                      activeDays: ['MON'],
                      allowedZoneIds: [],
                      coachIds: [],
                    })
                  }}
                  className="px-6 py-2 bg-neutral-700 hover:bg-neutral-600 text-white font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Classes List */}
        <div className="bg-neutral-800 border border-neutral-700 rounded-xl overflow-hidden">
          <div className="px-6 py-4 bg-neutral-900 border-b border-neutral-700">
            <h2 className="text-xl font-bold text-white">Class Templates ({classes.length})</h2>
          </div>

          {classes.length === 0 ? (
            <div className="px-6 py-8 text-center text-neutral-400">
              No class templates created yet. Add your first class above.
            </div>
          ) : (
            <div className="divide-y divide-neutral-700">
              {classes.map((template) => (
                <div key={template.id} className="px-6 py-4 hover:bg-neutral-700/50 transition">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-white text-lg">{template.name}</h3>
                      <p className="text-neutral-400 text-sm">
                        {template.level} • {template.lengthMinutes} min • {template.startTimeLocal} - {template.endTimeLocal}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(template)}
                        className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg transition text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="px-4 py-2 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white rounded-lg transition text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-neutral-400 text-xs mb-1">Active Days</p>
                      <div className="flex gap-1 flex-wrap">
                        {template.activeDays.split(',').map((day) => (
                          <span key={day} className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                            {day}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-neutral-400 text-xs mb-1">Zones & Coaches</p>
                      <div className="flex gap-1 flex-wrap">
                        {template.allowedZones.map((z) => (
                          <span key={z.zone.id} className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">
                            {z.zone.name}
                          </span>
                        ))}
                        {template.defaultCoaches.map((c) => (
                          <span key={c.coach.id} className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                            {c.coach.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

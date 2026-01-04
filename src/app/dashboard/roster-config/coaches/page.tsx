'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/components/DashboardLayout'

type Gymsport = {
  id: string
  name: string
}

type CoachGymsport = {
  gymsport: Gymsport
}

type CoachAvailability = {
  id?: string
  dayOfWeek: string
  startTimeLocal: string
  endTimeLocal: string
}

type Coach = {
  id: string
  name: string
  accreditationLevel: string | null
  membershipNumber: string | null
  email: string | null
  phone: string | null
  importedFromCsv: boolean
  gymsports: CoachGymsport[]
  availability: CoachAvailability[]
}

const DAYS = [
  { value: 'MON', label: 'Monday' },
  { value: 'TUE', label: 'Tuesday' },
  { value: 'WED', label: 'Wednesday' },
  { value: 'THU', label: 'Thursday' },
  { value: 'FRI', label: 'Friday' },
  { value: 'SAT', label: 'Saturday' },
  { value: 'SUN', label: 'Sunday' },
]

export default function CoachesPage() {
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [gymsports, setGymsports] = useState<Gymsport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [showCustomGymsport, setShowCustomGymsport] = useState(false)
  const [customGymsportName, setCustomGymsportName] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    accreditationLevel: '',
    membershipNumber: '',
    email: '',
    phone: '',
    gymsportIds: [] as string[],
    availability: [] as CoachAvailability[],
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [coachesRes, gymsportsRes] = await Promise.all([
        fetch('/api/coaches'),
        fetch('/api/gymsports'),
      ])

      if (coachesRes.ok) {
        const data = await coachesRes.json()
        setCoaches(data.coaches)
      }

      if (gymsportsRes.ok) {
        const data = await gymsportsRes.json()
        setGymsports(data.gymsports)
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
      const url = editingId ? `/api/coaches/${editingId}` : '/api/coaches'
      const method = editingId ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        await fetchData()
        setShowForm(false)
        setEditingId(null)
        resetForm()
        setSuccess('Coach saved successfully')
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to save coach')
      }
    } catch (err) {
      setError('Failed to save coach')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      accreditationLevel: '',
      membershipNumber: '',
      email: '',
      phone: '',
      gymsportIds: [],
      availability: [],
    })
  }

  const handleEdit = (coach: Coach) => {
    setFormData({
      name: coach.name,
      accreditationLevel: coach.accreditationLevel || '',
      membershipNumber: coach.membershipNumber || '',
      email: coach.email || '',
      phone: coach.phone || '',
      gymsportIds: coach.gymsports.map((cg) => cg.gymsport.id),
      availability: coach.availability.map((a) => ({
        dayOfWeek: a.dayOfWeek,
        startTimeLocal: a.startTimeLocal,
        endTimeLocal: a.endTimeLocal,
      })),
    })
    setEditingId(coach.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coach?')) return

    try {
      const res = await fetch(`/api/coaches/${id}`, { method: 'DELETE' })
      if (res.ok) {
        await fetchData()
        setSuccess('Coach deleted successfully')
      } else {
        setError('Failed to delete coach')
      }
    } catch (err) {
      setError('Failed to delete coach')
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch('/api/coaches/template')
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'coach_import_template.csv'
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (err) {
      setError('Failed to download template')
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setError('')
    setSuccess('')

    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)

      const res = await fetch('/api/coaches/import', {
        method: 'POST',
        body: formDataUpload,
      })

      const data = await res.json()

      if (res.ok) {
        await fetchData()
        setSuccess(data.message)
        if (data.errors) {
          setError(`Import completed with errors:\n${data.errors.join('\n')}`)
        }
      } else {
        setError(data.error || 'Failed to import coaches')
      }
    } catch (err) {
      setError('Failed to import coaches')
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  const handleGymsportChange = (gymsportId: string) => {
    // Check if "Other" is selected
    const otherGymsport = gymsports.find((g) => g.name === 'Other')
    if (otherGymsport && gymsportId === otherGymsport.id) {
      setShowCustomGymsport(true)
      return
    }

    setFormData((prev) => {
      const exists = prev.gymsportIds.includes(gymsportId)
      return {
        ...prev,
        gymsportIds: exists
          ? prev.gymsportIds.filter((id) => id !== gymsportId)
          : [...prev.gymsportIds, gymsportId],
      }
    })
  }

  const handleAddCustomGymsport = async () => {
    if (!customGymsportName.trim()) return

    try {
      const res = await fetch('/api/gymsports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: customGymsportName.trim() }),
      })

      if (res.ok) {
        const data = await res.json()
        setGymsports([...gymsports, data.gymsport])
        setFormData((prev) => ({
          ...prev,
          gymsportIds: [...prev.gymsportIds, data.gymsport.id],
        }))
        setCustomGymsportName('')
        setShowCustomGymsport(false)
        setSuccess('Custom gymsport added successfully')
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to add custom gymsport')
      }
    } catch (err) {
      setError('Failed to add custom gymsport')
    }
  }

  const handleAddAvailability = () => {
    setFormData((prev) => ({
      ...prev,
      availability: [
        ...prev.availability,
        { dayOfWeek: 'MON', startTimeLocal: '16:00', endTimeLocal: '20:00' },
      ],
    }))
  }

  const handleRemoveAvailability = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      availability: prev.availability.filter((_, i) => i !== index),
    }))
  }

  const handleAvailabilityChange = (
    index: number,
    field: keyof CoachAvailability,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      availability: prev.availability.map((a, i) =>
        i === index ? { ...a, [field]: value } : a
      ),
    }))
  }

  if (loading) return (
    <DashboardLayout title="Coaches" backTo={{ label: 'Back to Class Rostering', href: '/dashboard/class-rostering' }}>
      <div className="p-8">Loading...</div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout title="Coaches" backTo={{ label: 'Back to Class Rostering', href: '/dashboard/class-rostering' }}>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Manage Coaches</h2>
            <div className="flex gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Download Template
            </button>
            <label className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 cursor-pointer">
              {importing ? 'Importing...' : 'Import CSV'}
              <input
                type="file"
                accept=".csv"
                onChange={handleImport}
                className="hidden"
                disabled={importing}
              />
            </label>
            <button
              onClick={() => {
                setShowForm(!showForm)
                setEditingId(null)
                resetForm()
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              {showForm ? 'Cancel' : 'Add Coach'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 whitespace-pre-line">
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
            <h2 className="text-xl font-semibold mb-4">
              {editingId ? 'Edit Coach' : 'Add New Coach'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="+61 400 000 000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Accreditation Level</label>
                  <input
                    type="text"
                    value={formData.accreditationLevel}
                    onChange={(e) =>
                      setFormData({ ...formData, accreditationLevel: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Membership Number</label>
                  <input
                    type="text"
                    value={formData.membershipNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, membershipNumber: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Gymsport Accreditations</label>
                <div className="grid grid-cols-2 gap-2 border rounded p-3 bg-gray-50">
                  {gymsports.map((gymsport) => (
                    <label key={gymsport.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.gymsportIds.includes(gymsport.id)}
                        onChange={() => handleGymsportChange(gymsport.id)}
                        className="rounded"
                      />
                      <span>{gymsport.name}</span>
                    </label>
                  ))}
                </div>

                {showCustomGymsport && (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={customGymsportName}
                      onChange={(e) => setCustomGymsportName(e.target.value)}
                      placeholder="Enter custom gymsport name"
                      className="flex-1 border rounded px-3 py-2"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomGymsport}
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomGymsport(false)
                        setCustomGymsportName('')
                      }}
                      className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium">Availability</label>
                  <button
                    type="button"
                    onClick={handleAddAvailability}
                    className="bg-blue-500 text-white text-sm px-3 py-1 rounded hover:bg-blue-600"
                  >
                    + Add Availability
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.availability.map((avail, index) => (
                    <div key={index} className="flex gap-2 items-center border rounded p-2">
                      <select
                        value={avail.dayOfWeek}
                        onChange={(e) =>
                          handleAvailabilityChange(index, 'dayOfWeek', e.target.value)
                        }
                        className="border rounded px-2 py-1 flex-1"
                      >
                        {DAYS.map((day) => (
                          <option key={day.value} value={day.value}>
                            {day.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="time"
                        value={avail.startTimeLocal}
                        onChange={(e) =>
                          handleAvailabilityChange(index, 'startTimeLocal', e.target.value)
                        }
                        className="border rounded px-2 py-1"
                      />
                      <span>to</span>
                      <input
                        type="time"
                        value={avail.endTimeLocal}
                        onChange={(e) =>
                          handleAvailabilityChange(index, 'endTimeLocal', e.target.value)
                        }
                        className="border rounded px-2 py-1"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveAvailability(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  {formData.availability.length === 0 && (
                    <div className="text-gray-500 text-sm italic">
                      No availability set. Click "Add Availability" to add days and times.
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                {editingId ? 'Update Coach' : 'Create Coach'}
              </button>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Gymsports
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Availability
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {coaches.map((coach) => (
                <tr key={coach.id}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">
                    {coach.name}
                    {coach.importedFromCsv && (
                      <span className="ml-2 text-xs text-gray-500">(Imported)</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{coach.email || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{coach.phone || '-'}</td>
                  <td className="px-6 py-4">
                    {coach.gymsports.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {coach.gymsports.map((cg) => (
                          <span
                            key={cg.gymsport.id}
                            className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                          >
                            {cg.gymsport.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {coach.availability.length > 0 ? (
                      <div className="text-xs space-y-1">
                        {coach.availability.map((avail, idx) => (
                          <div key={idx}>
                            {avail.dayOfWeek}: {avail.startTimeLocal}-{avail.endTimeLocal}
                          </div>
                        ))}
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleEdit(coach)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(coach.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {coaches.length === 0 && (
            <div className="text-center py-8 text-gray-500">No coaches added yet.</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}


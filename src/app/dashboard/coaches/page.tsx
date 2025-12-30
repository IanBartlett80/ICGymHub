'use client'

import { useState, useEffect } from 'react'

type Coach = {
  id: string
  name: string
  accreditationLevel: string | null
  membershipNumber: string | null
  email: string | null
  phone: string | null
  importedFromCsv: boolean
}

export default function CoachesPage() {
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    accreditationLevel: '',
    membershipNumber: '',
    email: '',
    phone: '',
  })

  useEffect(() => {
    fetchCoaches()
  }, [])

  const fetchCoaches = async () => {
    try {
      const res = await fetch('/api/coaches')
      if (res.ok) {
        const data = await res.json()
        setCoaches(data.coaches)
      } else {
        setError('Failed to load coaches')
      }
    } catch (err) {
      setError('Failed to load coaches')
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
        await fetchCoaches()
        setShowForm(false)
        setEditingId(null)
        setFormData({ name: '', accreditationLevel: '', membershipNumber: '', email: '', phone: '' })
        setSuccess('Coach saved successfully')
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to save coach')
      }
    } catch (err) {
      setError('Failed to save coach')
    }
  }

  const handleEdit = (coach: Coach) => {
    setFormData({
      name: coach.name,
      accreditationLevel: coach.accreditationLevel || '',
      membershipNumber: coach.membershipNumber || '',
      email: coach.email || '',
      phone: coach.phone || '',
    })
    setEditingId(coach.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coach?')) return

    try {
      const res = await fetch(`/api/coaches/${id}`, { method: 'DELETE' })
      if (res.ok) {
        await fetchCoaches()
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
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/coaches/import', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (res.ok) {
        await fetchCoaches()
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

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Coaches</h1>
          <div className="flex gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Download Template
            </button>
            <label className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 cursor-pointer">
              {importing ? 'Importing...' : 'Import CSV'}
              <input type="file" accept=".csv" onChange={handleImport} className="hidden" disabled={importing} />
            </label>
            <button
              onClick={() => {
                setShowForm(!showForm)
                setEditingId(null)
                setFormData({ name: '', accreditationLevel: '', membershipNumber: '', email: '', phone: '' })
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
            <h2 className="text-xl font-semibold mb-4">{editingId ? 'Edit Coach' : 'Add New Coach'}</h2>
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
                  <label className="block text-sm font-medium mb-1">Accreditation Level</label>
                  <input
                    type="text"
                    value={formData.accreditationLevel}
                    onChange={(e) => setFormData({ ...formData, accreditationLevel: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Membership Number</label>
                  <input
                    type="text"
                    value={formData.membershipNumber}
                    onChange={(e) => setFormData({ ...formData, membershipNumber: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                {editingId ? 'Update Coach' : 'Create Coach'}
              </button>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Accreditation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Membership #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
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
                  <td className="px-6 py-4 whitespace-nowrap">{coach.accreditationLevel || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{coach.membershipNumber || '-'}</td>
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
    </div>
  )
}

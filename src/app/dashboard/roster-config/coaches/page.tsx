'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Coach {
  id: string
  name: string
  email: string
  accreditationLevel: string | null
  membershipNumber: string | null
  active: boolean
}

export default function CoachesPage() {
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    accreditationLevel: '',
    membershipNumber: '',
    active: true,
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
      }
    } catch (err) {
      setError('Failed to load coaches')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
        setFormData({
          name: '',
          email: '',
          accreditationLevel: '',
          membershipNumber: '',
          active: true,
        })
        setEditingId(null)
      } else {
        setError('Failed to save coach')
      }
    } catch (err) {
      setError('Failed to save coach')
    }
  }

  const handleEdit = (coach: Coach) => {
    setEditingId(coach.id)
    setFormData({
      name: coach.name,
      email: coach.email,
      accreditationLevel: coach.accreditationLevel || '',
      membershipNumber: coach.membershipNumber || '',
      active: coach.active,
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return
    try {
      const res = await fetch(`/api/coaches/${id}`, { method: 'DELETE' })
      if (res.ok) {
        await fetchCoaches()
      }
    } catch (err) {
      setError('Failed to delete coach')
    }
  }

  const handleDownloadTemplate = () => {
    const csv = 'Name,Accreditation Level,Membership Number,Email\nEmma Smith,Level 10,M12345,emma@gym.com'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'coach_template.csv'
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
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
            <h1 className="text-xl font-bold text-white">Manage Coaches</h1>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">
            {editingId ? 'Edit Coach' : 'Add New Coach'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Coach Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Full name..."
                className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-500 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="coach@gym.com"
                className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-500 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Accreditation Level</label>
                <input
                  type="text"
                  value={formData.accreditationLevel}
                  onChange={(e) => setFormData({ ...formData, accreditationLevel: e.target.value })}
                  placeholder="e.g., Level 10, Senior"
                  className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Membership Number</label>
                <input
                  type="text"
                  value={formData.membershipNumber}
                  onChange={(e) => setFormData({ ...formData, membershipNumber: e.target.value })}
                  placeholder="M12345"
                  className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-white text-sm">Active</span>
            </label>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
              >
                {editingId ? 'Update Coach' : 'Add Coach'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null)
                    setFormData({
                      name: '',
                      email: '',
                      accreditationLevel: '',
                      membershipNumber: '',
                      active: true,
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

        {/* Import Section */}
        <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-8 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Bulk Import Coaches</h2>
          <p className="text-neutral-400 text-sm mb-4">
            Use a CSV file to import multiple coaches at once.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDownloadTemplate}
              className="px-4 py-2 bg-green-600/20 hover:bg-green-600 text-green-300 hover:text-white font-semibold rounded-lg transition"
            >
              Download Template
            </button>
          </div>
        </div>

        {/* Coaches List */}
        <div className="bg-neutral-800 border border-neutral-700 rounded-xl overflow-hidden">
          <div className="px-6 py-4 bg-neutral-900 border-b border-neutral-700">
            <h2 className="text-xl font-bold text-white">Coaches ({coaches.length})</h2>
          </div>

          {coaches.length === 0 ? (
            <div className="px-6 py-8 text-center text-neutral-400">
              No coaches created yet. Add your first coach above.
            </div>
          ) : (
            <div className="divide-y divide-neutral-700">
              {coaches.map((coach) => (
                <div key={coach.id} className="px-6 py-4 hover:bg-neutral-700/50 transition flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white text-lg">{coach.name}</h3>
                    <p className="text-neutral-400 text-sm">{coach.email}</p>
                    <div className="flex gap-3 mt-2">
                      {coach.accreditationLevel && (
                        <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                          {coach.accreditationLevel}
                        </span>
                      )}
                      {coach.membershipNumber && (
                        <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                          {coach.membershipNumber}
                        </span>
                      )}
                      {coach.active ? (
                        <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">
                          Active
                        </span>
                      ) : (
                        <span className="text-xs bg-neutral-500/20 text-neutral-300 px-2 py-1 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(coach)}
                      className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg transition text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(coach.id)}
                      className="px-4 py-2 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white rounded-lg transition text-sm font-medium"
                    >
                      Delete
                    </button>
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

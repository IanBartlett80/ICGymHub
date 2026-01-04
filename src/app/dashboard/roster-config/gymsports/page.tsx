'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'

interface Gymsport {
  id: string
  name: string
  isPredefined: boolean
  active: boolean
}

export default function GymsportsPage() {
  const [gymsports, setGymsports] = useState<Gymsport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', active: true })

  useEffect(() => {
    fetchGymsports()
  }, [])

  const fetchGymsports = async () => {
    try {
      const res = await fetch('/api/gymsports')
      if (res.ok) {
        const data = await res.json()
        setGymsports(data.gymsports)
      }
    } catch (err) {
      setError('Failed to load gymsports')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      const url = editingId ? `/api/gymsports/${editingId}` : '/api/gymsports'
      const method = editingId ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (res.ok) {
        await fetchGymsports()
        setFormData({ name: '', active: true })
        setEditingId(null)
        setSuccess(editingId ? 'Gymsport updated successfully' : 'Gymsport added successfully')
      } else {
        setError(data.error || 'Failed to save gymsport')
      }
    } catch (err) {
      setError('Failed to save gymsport')
    }
  }

  const handleEdit = (gymsport: Gymsport) => {
    setEditingId(gymsport.id)
    setFormData({ name: gymsport.name, active: gymsport.active })
    setError('')
    setSuccess('')
  }

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/gymsports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentActive }),
      })

      if (res.ok) {
        await fetchGymsports()
        setSuccess('Gymsport status updated')
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to update gymsport')
      }
    } catch (err) {
      setError('Failed to update gymsport')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this gymsport?')) return

    try {
      const res = await fetch(`/api/gymsports/${id}`, { method: 'DELETE' })
      
      if (res.ok) {
        await fetchGymsports()
        setSuccess('Gymsport deleted successfully')
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to delete gymsport')
      }
    } catch (err) {
      setError('Failed to delete gymsport')
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Gymsports" backTo={{ label: 'Back to Class Rostering', href: '/dashboard/class-rostering' }}>
        <div className="p-6">
          <div className="text-gray-600">Loading...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Gymsports" backTo={{ label: 'Back to Class Rostering', href: '/dashboard/class-rostering' }}>
      <div className="p-6 max-w-6xl mx-auto">
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-500/20 border border-green-500/50 text-green-200 px-4 py-3 rounded-lg mb-6">
            {success}
          </div>
        )}

        {/* Form */}
        <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">
            {editingId ? 'Edit Gymsport' : 'Add Custom Gymsport'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Gymsport Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Parkour, Ninja Warrior, Freestyle"
                className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-500 focus:border-blue-500 focus:outline-none"
                required
              />
              <p className="text-xs text-neutral-400 mt-1">
                Add custom gymsports specific to your club's offerings.
              </p>
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
                {editingId ? 'Update Gymsport' : 'Add Gymsport'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null)
                    setFormData({ name: '', active: true })
                  }}
                  className="px-6 py-2 bg-neutral-700 hover:bg-neutral-600 text-white font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Gymsports List */}
        <div className="bg-neutral-800 border border-neutral-700 rounded-xl overflow-hidden">
          <div className="px-6 py-4 bg-neutral-900 border-b border-neutral-700">
            <h2 className="text-xl font-bold text-white">Gymsports ({gymsports.length})</h2>
            <p className="text-sm text-neutral-400 mt-1">
              Manage which gymsports your club offers. Predefined gymsports can be toggled active/inactive.
            </p>
          </div>

          {gymsports.length === 0 ? (
            <div className="px-6 py-8 text-center text-neutral-400">
              No gymsports configured yet. Add your first gymsport above.
            </div>
          ) : (
            <div className="divide-y divide-neutral-700">
              {gymsports.map((gymsport) => (
                <div
                  key={gymsport.id}
                  className="px-6 py-4 hover:bg-neutral-700/50 transition flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-white text-lg">{gymsport.name}</h3>
                      {gymsport.isPredefined && (
                        <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                          Predefined
                        </span>
                      )}
                      {gymsport.active ? (
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
                      onClick={() => handleToggleActive(gymsport.id, gymsport.active)}
                      className={`px-4 py-2 ${
                        gymsport.active
                          ? 'bg-yellow-600/20 hover:bg-yellow-600 text-yellow-300'
                          : 'bg-green-600/20 hover:bg-green-600 text-green-300'
                      } hover:text-white rounded-lg transition text-sm font-medium`}
                    >
                      {gymsport.active ? 'Deactivate' : 'Activate'}
                    </button>
                    {!gymsport.isPredefined && (
                      <>
                        <button
                          onClick={() => handleEdit(gymsport)}
                          className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg transition text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(gymsport.id)}
                          className="px-4 py-2 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white rounded-lg transition text-sm font-medium"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

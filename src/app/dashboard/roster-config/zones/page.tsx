'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Zone {
  id: string
  name: string
  description: string | null
  allowOverlap: boolean
  active: boolean
}

export default function ZonesPage() {
  const router = useRouter()
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', description: '', allowOverlap: false, active: true })

  useEffect(() => {
    fetchZones()
  }, [])

  const fetchZones = async () => {
    try {
      const res = await fetch('/api/zones')
      if (res.ok) {
        const data = await res.json()
        setZones(data.zones)
      }
    } catch (err) {
      setError('Failed to load zones')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingId ? `/api/zones/${editingId}` : '/api/zones'
      const method = editingId ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        await fetchZones()
        setFormData({ name: '', description: '', allowOverlap: false, active: true })
        setEditingId(null)
      } else {
        setError('Failed to save zone')
      }
    } catch (err) {
      setError('Failed to save zone')
    }
  }

  const handleEdit = (zone: Zone) => {
    setEditingId(zone.id)
    setFormData({
      name: zone.name,
      description: zone.description || '',
      allowOverlap: zone.allowOverlap,
      active: zone.active,
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return
    try {
      const res = await fetch(`/api/zones/${id}`, { method: 'DELETE' })
      if (res.ok) {
        await fetchZones()
      }
    } catch (err) {
      setError('Failed to delete zone')
    }
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
            <h1 className="text-xl font-bold text-white">Manage Gym Zones</h1>
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
            {editingId ? 'Edit Zone' : 'Add New Zone'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Zone Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Floor, Vault, Bars, Beam"
                className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-500 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description..."
                className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allowOverlap}
                  onChange={(e) => setFormData({ ...formData, allowOverlap: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-white text-sm">Allow Overlap</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-white text-sm">Active</span>
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
              >
                {editingId ? 'Update Zone' : 'Add Zone'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null)
                    setFormData({ name: '', description: '', allowOverlap: false, active: true })
                  }}
                  className="px-6 py-2 bg-neutral-700 hover:bg-neutral-600 text-white font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Zones List */}
        <div className="bg-neutral-800 border border-neutral-700 rounded-xl overflow-hidden">
          <div className="px-6 py-4 bg-neutral-900 border-b border-neutral-700">
            <h2 className="text-xl font-bold text-white">Zones ({zones.length})</h2>
          </div>

          {zones.length === 0 ? (
            <div className="px-6 py-8 text-center text-neutral-400">
              No zones created yet. Add your first zone above.
            </div>
          ) : (
            <div className="divide-y divide-neutral-700">
              {zones.map((zone) => (
                <div key={zone.id} className="px-6 py-4 hover:bg-neutral-700/50 transition flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white text-lg">{zone.name}</h3>
                    {zone.description && <p className="text-neutral-400 text-sm mt-1">{zone.description}</p>}
                    <div className="flex gap-3 mt-2">
                      {zone.allowOverlap && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded">
                          Overlap Allowed
                        </span>
                      )}
                      {zone.active ? (
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
                      onClick={() => handleEdit(zone)}
                      className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg transition text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(zone.id)}
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

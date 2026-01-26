'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'

interface Zone {
  id: string
  name: string
  description: string | null
  allowOverlap: boolean
  active: boolean
  isFirst: boolean
}

export default function ZonesPage() {
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', description: '', allowOverlap: false, active: true, isFirst: false })

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
        setFormData({ name: '', description: '', allowOverlap: false, active: true, isFirst: false })
        setEditingId(null)
        setShowForm(false)
        setSuccess('Zone saved successfully')
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
      isFirst: zone.isFirst,
    })
    setShowForm(true)
  }

  const handleDelete = async () => {
    if (!deleteConfirmId) return
    try {
      const res = await fetch(`/api/zones/${deleteConfirmId}`, { method: 'DELETE' })
      if (res.ok) {
        await fetchZones()
        setDeleteConfirmId(null)
        setSuccess('Zone deleted successfully')
      } else {
        setError('Failed to delete zone')
      }
    } catch (err) {
      setError('Failed to delete zone')
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Gym Zones" backTo={{ label: 'Back to Home', href: '/dashboard' }} showClassRosteringNav={true}>
        <div className="p-8">Loading...</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Gym Zones" backTo={{ label: 'Back to Home', href: '/dashboard' }} showClassRosteringNav={true}>
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Manage Gym Zones</h2>
            <button
              onClick={() => {
                setShowForm(!showForm)
                setEditingId(null)
                setFormData({ name: '', description: '', allowOverlap: false, active: true, isFirst: false })
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              {showForm ? 'Cancel' : 'Add Zone'}
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
              <h2 className="text-xl font-semibold mb-4">{editingId ? 'Edit Zone' : 'Add New Zone'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Zone Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Floor, Vault, Bars, Beam"
                      className="w-full border rounded px-3 py-2"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description..."
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.allowOverlap}
                      onChange={(e) => setFormData({ ...formData, allowOverlap: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Allow Overlap</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Active</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isFirst}
                      onChange={(e) => setFormData({ ...formData, isFirst: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Priority First Zone</span>
                  </label>
                </div>

                <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                  {editingId ? 'Update Zone' : 'Create Zone'}
                </button>
              </form>
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Settings</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {zones.map((zone) => (
                  <tr key={zone.id}>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">{zone.name}</td>
                    <td className="px-6 py-4">{zone.description || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 flex-wrap">
                        {zone.isFirst && (
                          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded font-medium">
                            ⭐ Priority First
                          </span>
                        )}
                        {zone.allowOverlap && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                            Overlap Allowed
                          </span>
                        )}
                        {zone.active ? (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            Active
                          </span>
                        ) : (
                          <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleEdit(zone)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(zone.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {zones.length === 0 && (
              <div className="text-center py-8 text-gray-500">No zones configured yet.</div>
            )}
          </div>

          {/* Delete Confirmation Modal */}
          {deleteConfirmId && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold mb-4">Confirm Deletion</h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete this zone? This action cannot be undone.
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

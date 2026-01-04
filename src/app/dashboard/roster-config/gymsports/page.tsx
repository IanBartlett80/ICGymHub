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
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
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
        setShowForm(false)
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
    setShowForm(true)
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

  const handleDelete = async () => {
    if (!deleteConfirmId) return

    try {
      const res = await fetch(`/api/gymsports/${deleteConfirmId}`, { method: 'DELETE' })
      
      if (res.ok) {
        await fetchGymsports()
        setDeleteConfirmId(null)
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
        <div className="p-8">Loading...</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Gymsports" backTo={{ label: 'Back to Class Rostering', href: '/dashboard/class-rostering' }}>
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Manage Gymsports</h2>
            <button
              onClick={() => {
                setShowForm(!showForm)
                setEditingId(null)
                setFormData({ name: '', active: true })
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              {showForm ? 'Cancel' : 'Add Gymsport'}
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
              <h2 className="text-xl font-semibold mb-4">{editingId ? 'Edit Gymsport' : 'Add Custom Gymsport'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Gymsport Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Parkour, Ninja Warrior, Freestyle"
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Add custom gymsports specific to your club's offerings.
                  </p>
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Active</span>
                </label>

                <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                  {editingId ? 'Update Gymsport' : 'Create Gymsport'}
                </button>
              </form>
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Gymsports ({gymsports.length})</h3>
              <p className="text-sm text-gray-600 mt-1">
                Manage which gymsports your club offers. Predefined gymsports can be toggled active/inactive.
              </p>
            </div>

            {gymsports.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No gymsports configured yet.</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {gymsports.map((gymsport) => (
                    <tr key={gymsport.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{gymsport.name}</span>
                          {gymsport.isPredefined && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              Predefined
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {gymsport.active ? (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            Active
                          </span>
                        ) : (
                          <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleToggleActive(gymsport.id, gymsport.active)}
                          className={`${
                            gymsport.active
                              ? 'text-yellow-600 hover:text-yellow-800'
                              : 'text-green-600 hover:text-green-800'
                          } mr-3`}
                        >
                          {gymsport.active ? 'Deactivate' : 'Activate'}
                        </button>
                        {!gymsport.isPredefined && (
                          <>
                            <button
                              onClick={() => handleEdit(gymsport)}
                              className="text-blue-600 hover:text-blue-800 mr-3"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(gymsport.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Delete Confirmation Modal */}
          {deleteConfirmId && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold mb-4">Confirm Deletion</h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete this gymsport? This action cannot be undone and may affect associated coaches and class templates.
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

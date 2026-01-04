'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'

type Roster = {
  id: string
  scope: string
  startDate: string
  endDate: string
  status: string
  generatedAt: string | null
}

export default function RostersPage() {
  const router = useRouter()
  const [rosters, setRosters] = useState<Roster[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchRosters()
  }, [])

  const fetchRosters = async () => {
    try {
      const res = await fetch('/api/rosters')
      if (res.ok) {
        const data = await res.json()
        setRosters(data.rosters)
      } else {
        setError('Failed to load rosters')
      }
    } catch (err) {
      setError('Failed to load rosters')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this roster?')) return

    try {
      const res = await fetch(`/api/rosters/${id}`, { method: 'DELETE' })
      if (res.ok) {
        await fetchRosters()
      } else {
        setError('Failed to delete roster')
      }
    } catch (err) {
      setError('Failed to delete roster')
    }
  }

  if (loading) {
    return (
      <DashboardLayout 
        title="Class Rosters"
        backTo={{ label: 'Back to Class Rostering', href: '/dashboard/class-rostering' }}
      >
        <div className="p-8">Loading...</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout 
      title="Class Rosters"
      backTo={{ label: 'Back to Class Rostering', href: '/dashboard/class-rostering' }}
    >
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Manage Rosters</h2>
            <button
              onClick={() => router.push('/dashboard/rosters/create')}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Create New Roster
            </button>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scope</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Generated</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rosters.map((roster) => (
                  <tr key={roster.id}>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">
                      {new Date(roster.startDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{roster.scope}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          roster.status === 'PUBLISHED'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {roster.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {roster.generatedAt
                        ? new Date(roster.generatedAt).toLocaleString()
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => router.push(`/dashboard/rosters/${roster.id}`)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDelete(roster.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rosters.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No rosters created yet.{' '}
                <button
                  onClick={() => router.push('/dashboard/rosters/create')}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Create your first roster
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

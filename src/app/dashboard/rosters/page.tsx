'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { format } from 'date-fns'

type Roster = {
  id: string
  scope: string
  startDate: string
  endDate: string
  status: string
  generatedAt: string | null
  templateId: string | null
  dayOfWeek: string | null
  template?: {
    id: string
    name: string
    startDate: string
    endDate: string
    activeDays: string
  }
}

type GroupedRosters = {
  templateId: string | null
  templateName: string
  startDate: string
  endDate: string
  rosters: Roster[]
}

export default function RostersPage() {
  const router = useRouter()
  const [rosters, setRosters] = useState<Roster[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set())

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

  const groupRostersByTemplate = (): GroupedRosters[] => {
    const grouped = new Map<string, GroupedRosters>()
    
    rosters.forEach(roster => {
      const key = roster.templateId || `standalone-${roster.id}`
      
      if (!grouped.has(key)) {
        grouped.set(key, {
          templateId: roster.templateId,
          templateName: roster.template?.name || format(new Date(roster.startDate), 'MMM dd, yyyy'),
          startDate: roster.template?.startDate || roster.startDate,
          endDate: roster.template?.endDate || roster.endDate,
          rosters: []
        })
      }
      
      grouped.get(key)!.rosters.push(roster)
    })
    
    return Array.from(grouped.values()).sort((a, b) => 
      new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    )
  }

  const toggleTemplate = (templateId: string) => {
    const newExpanded = new Set(expandedTemplates)
    if (newExpanded.has(templateId)) {
      newExpanded.delete(templateId)
    } else {
      newExpanded.add(templateId)
    }
    setExpandedTemplates(newExpanded)
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

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template and all its rosters?')) return

    try {
      const res = await fetch(`/api/roster-templates/${templateId}`, { method: 'DELETE' })
      if (res.ok) {
        await fetchRosters()
      } else {
        setError('Failed to delete template')
      }
    } catch (err) {
      setError('Failed to delete template')
    }
  }

  const handleRegenerateTemplate = async (templateId: string) => {
    if (!confirm('This will delete all existing rosters and regenerate them from the template. Continue?')) return

    try {
      const res = await fetch(`/api/roster-templates/${templateId}/regenerate`, { method: 'POST' })
      if (res.ok) {
        await fetchRosters()
        alert('Template regenerated successfully!')
      } else {
        setError('Failed to regenerate template')
      }
    } catch (err) {
      setError('Failed to regenerate template')
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

  const groupedRosters = groupRostersByTemplate()

  return (
    <DashboardLayout 
      title="Class Rosters"
      backTo={{ label: 'Back to Class Rostering', href: '/dashboard/class-rostering' }}
    >
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Roster Templates & Schedules</h2>
            <button
              onClick={() => router.push('/dashboard/rosters/create')}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-medium"
            >
              Create New Template
            </button>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {groupedRosters.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500 mb-4">No roster templates created yet.</p>
              <button
                onClick={() => router.push('/dashboard/rosters/create')}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Create your first roster template
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedRosters.map((group) => {
                const isExpanded = expandedTemplates.has(group.templateId || 'standalone')
                const isTemplate = group.templateId !== null

                return (
                  <div key={group.templateId || 'standalone'} className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        {isTemplate && (
                          <button
                            onClick={() => toggleTemplate(group.templateId!)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            {isExpanded ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            )}
                          </button>
                        )}
                        <div>
                          <h3 className="font-semibold text-lg">{group.templateName}</h3>
                          <p className="text-sm text-gray-600">
                            {format(new Date(group.startDate), 'MMM dd, yyyy')} - {format(new Date(group.endDate), 'MMM dd, yyyy')}
                            {isTemplate && ` • ${group.rosters.length} roster(s)`}
                          </p>
                        </div>
                      </div>
                      {isTemplate && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRegenerateTemplate(group.templateId!)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Regenerate
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(group.templateId!)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Delete Template
                          </button>
                        </div>
                      )}
                    </div>

                    {(!isTemplate || isExpanded) && (
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Day</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scope</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {group.rosters.map((roster) => (
                            <tr key={roster.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap font-medium">
                                {format(new Date(roster.startDate), 'MMM dd, yyyy')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {roster.dayOfWeek || format(new Date(roster.startDate), 'EEE').toUpperCase()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">{roster.scope}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                  className={`px-2 py-1 text-xs rounded font-medium ${
                                    roster.status === 'PUBLISHED'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}
                                >
                                  {roster.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <button
                                  onClick={() => router.push(`/dashboard/rosters/${roster.id}`)}
                                  className="text-blue-600 hover:text-blue-800 mr-3 font-medium"
                                >
                                  View
                                </button>
                                {!isTemplate && (
                                  <button
                                    onClick={() => handleDelete(roster.id)}
                                    className="text-red-600 hover:text-red-800 font-medium"
                                  >
                                    Delete
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

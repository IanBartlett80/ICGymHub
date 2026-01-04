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
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<{ id: string; name: string; rosterCount: number } | null>(null)

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

  const groupRostersByTemplate = (): (GroupedRosters & { groupKey: string })[] => {
    const grouped = new Map<string, GroupedRosters & { groupKey: string }>()
    
    rosters.forEach(roster => {
      const key = roster.templateId || `standalone-${roster.id}`
      
      if (!grouped.has(key)) {
        grouped.set(key, {
          groupKey: key,
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
    const grouped = groupRostersByTemplate()
    const template = grouped.find(g => g.templateId === templateId)
    if (!template) return
    
    setTemplateToDelete({
      id: templateId,
      name: template.templateName,
      rosterCount: template.rosters.length
    })
    setShowDeleteModal(true)
  }

  const confirmDeleteTemplate = async () => {
    if (!templateToDelete) return

    try {
      const res = await fetch(`/api/roster-templates/${templateToDelete.id}`, { method: 'DELETE' })
      if (res.ok) {
        await fetchRosters()
        setShowDeleteModal(false)
        setTemplateToDelete(null)
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
                const isExpanded = expandedTemplates.has(group.groupKey)
                const isTemplate = group.templateId !== null

                return (
                  <div key={group.groupKey} className="bg-white rounded-lg shadow overflow-hidden">
                    {/* Template Header - Always Visible */}
                    <div 
                      className={`p-5 flex justify-between items-center ${isTemplate ? 'cursor-pointer hover:bg-gray-50' : 'bg-white'} transition-colors`}
                      onClick={isTemplate ? () => toggleTemplate(group.groupKey) : undefined}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {isTemplate && (
                          <div className="text-gray-500">
                            {isExpanded ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            )}
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {isTemplate && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                Template
                              </span>
                            )}
                            <h3 className="font-semibold text-lg text-gray-900">{group.templateName}</h3>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {format(new Date(group.startDate), 'MMM dd, yyyy')} - {format(new Date(group.endDate), 'MMM dd, yyyy')}
                            <span className="mx-2">•</span>
                            <span className="font-medium">{group.rosters.length} roster{group.rosters.length !== 1 ? 's' : ''}</span>
                            {isTemplate && (
                              <>
                                <span className="mx-2">•</span>
                                <span className="text-gray-500">Click to {isExpanded ? 'collapse' : 'expand'}</span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      {isTemplate && (
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleRegenerateTemplate(group.templateId!)}
                            className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-600 rounded transition-colors"
                          >
                            Regenerate
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(group.templateId!)}
                            className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-white hover:bg-red-600 border border-red-600 rounded transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Individual Rosters - Only shown when expanded (or for standalone rosters) */}
                    {(!isTemplate || isExpanded) && (
                      <div className="border-t">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scope</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {group.rosters.map((roster) => (
                              <tr key={roster.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {format(new Date(roster.startDate), 'MMM dd, yyyy')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                  {roster.dayOfWeek || format(new Date(roster.startDate), 'EEE').toUpperCase()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{roster.scope}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span
                                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
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
                                    className="text-blue-600 hover:text-blue-800 mr-4 font-medium"
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
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Delete Template Confirmation Modal */}
      {showDeleteModal && templateToDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Delete Roster Template</h2>
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setTemplateToDelete(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to delete <span className="font-semibold">{templateToDelete.name}</span>?
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-red-800">Warning: This action cannot be undone</p>
                    <p className="text-sm text-red-700 mt-1">
                      Deleting this template will also permanently delete <span className="font-semibold">{templateToDelete.rosterCount} associated roster{templateToDelete.rosterCount !== 1 ? 's' : ''}</span> and all their scheduled sessions.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setTemplateToDelete(null)
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteTemplate}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                Delete Template
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

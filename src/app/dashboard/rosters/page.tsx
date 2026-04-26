'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import VenueSelector from '@/components/VenueSelector'
import { format } from 'date-fns'
import { showToast, confirmAndDelete, confirmDelete } from '@/lib/toast'
import axiosInstance from '@/lib/axios'

const DAYS_OF_WEEK = [
 { value: 'MON', label: 'Monday' },
 { value: 'TUE', label: 'Tuesday' },
 { value: 'WED', label: 'Wednesday' },
 { value: 'THU', label: 'Thursday' },
 { value: 'FRI', label: 'Friday' },
 { value: 'SAT', label: 'Saturday' },
 { value: 'SUN', label: 'Sunday' },
]

type ClassTemplate = {
 id: string
 name: string
 level: string
 lengthMinutes: number
 defaultRotationMinutes: number
 startTimeLocal: string
 endTimeLocal: string
 activeDays: string
 venueId: string | null
 allowedZones: Array<{ zone: { id: string; name: string } }>
 defaultCoaches: Array<{ coach: { id: string; name: string } }>
}

type Coach = {
 id: string
 name: string
}

type Zone = {
 id: string
 name: string
 venueId?: string | null
}

type ClassConfig = {
 templateId: string
 rotationMinutes: number
 allowedZoneIds: string[]
 coachIds: string[]
 allowOverlap: boolean
 startTimeLocal: string
 endTimeLocal: string
}

type TemplateData = {
 id: string
 name: string
 startDate: string
 endDate: string
 activeDays: string
 classConfig: string
 venueId: string | null
}

type Roster = {
 id: string
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
 const [success, setSuccess] = useState('')
 const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set())
 const [showDeleteModal, setShowDeleteModal] = useState(false)
 const [templateToDelete, setTemplateToDelete] = useState<{ id: string; name: string; rosterCount: number } | null>(null)
 const [publishingTemplate, setPublishingTemplate] = useState<string | null>(null)

 // Regenerate modal state
 const [showRegenerateModal, setShowRegenerateModal] = useState(false)
 const [regenerateLoading, setRegenerateLoading] = useState(false)
 const [regenerateDataLoading, setRegenerateDataLoading] = useState(false)
 const [regenTemplateName, setRegenTemplateName] = useState('')
 const [regenStartDate, setRegenStartDate] = useState('')
 const [regenEndDate, setRegenEndDate] = useState('')
 const [regenActiveDays, setRegenActiveDays] = useState<Set<string>>(new Set())
 const [regenVenueId, setRegenVenueId] = useState<string | null>(null)
 const [regenTemplateId, setRegenTemplateId] = useState<string | null>(null)
 const [regenClasses, setRegenClasses] = useState<ClassTemplate[]>([])
 const [regenCoaches, setRegenCoaches] = useState<Coach[]>([])
 const [regenZones, setRegenZones] = useState<Zone[]>([])
 const [regenSelectedClasses, setRegenSelectedClasses] = useState<Set<string>>(new Set())
 const [regenCustomizations, setRegenCustomizations] = useState<Map<string, Partial<ClassConfig>>>(new Map())

 useEffect(() => {
  fetchRosters()
 }, [])

 const fetchRosters = async () => {
  try {
   const res = await axiosInstance.get('/api/rosters')
   setRosters(res.data.rosters)
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
  confirmAndDelete('roster', async () => {
   try {
    const res = await fetch(`/api/rosters/${id}`, { method: 'DELETE' })
    if (res.ok) {
     await fetchRosters()
    } else {
     showToast.error('Failed to delete roster')
    }
   } catch (err) {
    showToast.error('Failed to delete roster')
   }
  })
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
  setRegenTemplateId(templateId)
  setRegenerateDataLoading(true)
  setShowRegenerateModal(true)

  try {
   // Fetch template data + classes/coaches/zones in parallel
   const [templateRes, classesRes, coachesRes, zonesRes] = await Promise.all([
    axiosInstance.get(`/api/roster-templates/${templateId}`),
    axiosInstance.get('/api/classes'),
    axiosInstance.get('/api/coaches'),
    axiosInstance.get('/api/zones'),
   ])

   const tmpl: TemplateData = templateRes.data
   setRegenTemplateName(tmpl.name)
   setRegenStartDate(new Date(tmpl.startDate).toISOString().split('T')[0])
   setRegenEndDate(new Date(tmpl.endDate).toISOString().split('T')[0])
   setRegenActiveDays(new Set(tmpl.activeDays.split(',')))
   setRegenVenueId(tmpl.venueId)
   setRegenClasses(classesRes.data.classes)
   setRegenCoaches(coachesRes.data.coaches)
   setRegenZones(zonesRes.data.zones)

   // Parse existing class config and populate selections
   const existingConfigs: ClassConfig[] = JSON.parse(tmpl.classConfig)
   const selectedIds = new Set(existingConfigs.map((c: ClassConfig) => c.templateId))
   setRegenSelectedClasses(selectedIds)

   const customs = new Map<string, Partial<ClassConfig>>()
   existingConfigs.forEach((cfg: ClassConfig) => {
    customs.set(cfg.templateId, {
     rotationMinutes: cfg.rotationMinutes,
     allowedZoneIds: cfg.allowedZoneIds,
     coachIds: cfg.coachIds,
     allowOverlap: cfg.allowOverlap,
     startTimeLocal: cfg.startTimeLocal,
     endTimeLocal: cfg.endTimeLocal,
    })
   })
   setRegenCustomizations(customs)
  } catch (err) {
   showToast.error('Failed to load template data')
   setShowRegenerateModal(false)
  } finally {
   setRegenerateDataLoading(false)
  }
 }

 const closeRegenerateModal = () => {
  setShowRegenerateModal(false)
  setRegenTemplateId(null)
 }

 const toggleRegenDay = (day: string) => {
  const newDays = new Set(regenActiveDays)
  if (newDays.has(day)) {
   newDays.delete(day)
  } else {
   newDays.add(day)
  }
  setRegenActiveDays(newDays)
 }

 const toggleRegenClass = (templateId: string) => {
  const newSelected = new Set(regenSelectedClasses)
  if (newSelected.has(templateId)) {
   newSelected.delete(templateId)
   const newCustoms = new Map(regenCustomizations)
   newCustoms.delete(templateId)
   setRegenCustomizations(newCustoms)
  } else {
   newSelected.add(templateId)
  }
  setRegenSelectedClasses(newSelected)
 }

 const updateRegenCustomization = (templateId: string, field: keyof ClassConfig, value: unknown) => {
  const newCustoms = new Map(regenCustomizations)
  const current = newCustoms.get(templateId) || {}
  newCustoms.set(templateId, { ...current, [field]: value })
  setRegenCustomizations(newCustoms)
 }

 const toggleRegenCoach = (templateId: string, coachId: string) => {
  const current = regenCustomizations.get(templateId)?.coachIds || []
  const newCoachIds = current.includes(coachId)
   ? current.filter((id) => id !== coachId)
   : [...current, coachId]
  updateRegenCustomization(templateId, 'coachIds', newCoachIds)
 }

 const toggleRegenZone = (templateId: string, zoneId: string) => {
  const current = regenCustomizations.get(templateId)?.allowedZoneIds || []
  const newZoneIds = current.includes(zoneId)
   ? current.filter((id) => id !== zoneId)
   : [...current, zoneId]
  updateRegenCustomization(templateId, 'allowedZoneIds', newZoneIds)
 }

 const submitRegenerate = async () => {
  if (!regenTemplateId) return
  if (!regenTemplateName.trim()) {
   showToast.error('Please enter a template name')
   return
  }
  if (regenActiveDays.size === 0) {
   showToast.error('Please select at least one active day')
   return
  }
  if (regenSelectedClasses.size === 0) {
   showToast.error('Please select at least one class')
   return
  }
  if (new Date(regenEndDate) < new Date(regenStartDate)) {
   showToast.error('End date must be after start date')
   return
  }

  setRegenerateLoading(true)
  try {
   const classTemplateConfigs = Array.from(regenSelectedClasses).map((templateId) => {
    const classTemplate = regenClasses.find((c) => c.id === templateId)
    const custom = regenCustomizations.get(templateId) || {}
    return {
     templateId,
     rotationMinutes: custom.rotationMinutes ?? classTemplate?.defaultRotationMinutes,
     allowedZoneIds: custom.allowedZoneIds?.length
      ? custom.allowedZoneIds
      : classTemplate?.allowedZones.map((z) => z.zone.id),
     coachIds: custom.coachIds?.length
      ? custom.coachIds
      : classTemplate?.defaultCoaches.map((c) => c.coach.id),
     allowOverlap: custom.allowOverlap ?? false,
     startTimeLocal: custom.startTimeLocal ?? classTemplate?.startTimeLocal,
     endTimeLocal: custom.endTimeLocal ?? classTemplate?.endTimeLocal,
    }
   })

   await axiosInstance.post(`/api/roster-templates/${regenTemplateId}/regenerate`, {
    name: regenTemplateName,
    startDate: regenStartDate,
    endDate: regenEndDate,
    activeDays: Array.from(regenActiveDays),
    venueId: regenVenueId,
    classTemplates: classTemplateConfigs,
   })

   await fetchRosters()
   showToast.success('Template updated and regenerated successfully!')
   closeRegenerateModal()
  } catch (err) {
   showToast.error('Failed to regenerate template')
  } finally {
   setRegenerateLoading(false)
  }
 }

 const handlePublishTemplate = async (templateId: string, unpublish = false) => {
  const action = unpublish ? 'unpublish' : 'publish'
  
  confirmDelete(
   `This will ${action} all rosters in this template.`,
   async () => {
    setPublishingTemplate(templateId)
    try {
     const res = await fetch(`/api/roster-templates/${templateId}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unpublish })
     })
     if (res.ok) {
      const data = await res.json()
      await fetchRosters()
      showToast.success(`${data.count} rosters ${action}ed successfully`)
     } else {
      showToast.error(`Failed to ${action} template`)
     }
    } catch (err) {
     showToast.error(`Failed to ${action} template`)
    } finally {
     setPublishingTemplate(null)
    }
   },
   { title: `${action.charAt(0).toUpperCase() + action.slice(1)} Template`, confirmText: action.charAt(0).toUpperCase() + action.slice(1) }
  )
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
   showClassRosteringNav={true}
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

     {success && (
      <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
       {success}
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
        const allPublished = group.rosters.every(r => r.status === 'PUBLISHED')
        const hasAnyPublished = group.rosters.some(r => r.status === 'PUBLISHED')

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
             <div className="flex items-center gap-2 mt-1">
              {allPublished ? (
               <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                ✓ All Published
               </span>
              ) : hasAnyPublished ? (
               <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                Partially Published
               </span>
              ) : (
               <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                Draft
               </span>
              )}
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
             {!allPublished && (
              <button
               onClick={() => handlePublishTemplate(group.templateId!, false)}
               disabled={publishingTemplate === group.templateId}
               className="px-3 py-1.5 text-sm font-medium text-green-600 hover:text-white hover:bg-green-600 border border-green-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
>
               {publishingTemplate === group.templateId ? 'Publishing...' : 'Publish All'}
              </button>
             )}
             {allPublished && (
              <button
               onClick={() => handlePublishTemplate(group.templateId!, true)}
               disabled={publishingTemplate === group.templateId}
               className="px-3 py-1.5 text-sm font-medium text-orange-600 hover:text-white hover:bg-orange-600 border border-orange-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
>
               {publishingTemplate === group.templateId ? 'Unpublishing...' : 'Unpublish All'}
              </button>
             )}
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

   {/* Regenerate Template Modal */}
   {showRegenerateModal && (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
     <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
       <h2 className="text-xl font-bold text-gray-900">Edit & Regenerate Template</h2>
       <button
        onClick={closeRegenerateModal}
        className="text-gray-400 hover:text-gray-600"
       >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
       </button>
      </div>

      {regenerateDataLoading ? (
       <div className="p-8 text-center text-gray-500">Loading template data...</div>
      ) : (
       <div className="p-6 space-y-6">
        {/* Warning */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
         <div className="flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
           <p className="text-sm font-medium text-amber-800">This will delete all existing rosters and regenerate them</p>
           <p className="text-sm text-amber-700 mt-1">
            Any manual changes made to individual roster days will be lost.
           </p>
          </div>
         </div>
        </div>

        {/* Template Settings */}
        <div className="space-y-4">
         <h3 className="text-lg font-semibold text-gray-900">Template Settings</h3>

         <div>
          <label className="block text-sm font-medium mb-1">Template Name</label>
          <input
           type="text"
           value={regenTemplateName}
           onChange={(e) => setRegenTemplateName(e.target.value)}
           className="w-full border rounded px-3 py-2"
          />
         </div>

         <div>
          <label className="block text-sm font-medium mb-1">Venue</label>
          <VenueSelector
           value={regenVenueId}
           onChange={setRegenVenueId}
           showAllOption={false}
           showLabel={false}
          />
         </div>

         <div className="grid grid-cols-2 gap-4">
          <div>
           <label className="block text-sm font-medium mb-1">Start Date</label>
           <input
            type="date"
            value={regenStartDate}
            onChange={(e) => setRegenStartDate(e.target.value)}
            className="w-full border rounded px-3 py-2"
           />
          </div>
          <div>
           <label className="block text-sm font-medium mb-1">End Date</label>
           <input
            type="date"
            value={regenEndDate}
            onChange={(e) => setRegenEndDate(e.target.value)}
            className="w-full border rounded px-3 py-2"
           />
          </div>
         </div>

         <div>
          <label className="block text-sm font-medium mb-2">Active Days</label>
          <div className="grid grid-cols-7 gap-2">
           {DAYS_OF_WEEK.map((day) => (
            <button
             key={day.value}
             type="button"
             onClick={() => toggleRegenDay(day.value)}
             className={`px-3 py-2 text-sm rounded transition-colors ${
              regenActiveDays.has(day.value)
               ? 'bg-blue-600 text-white'
               : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
             }`}
            >
             {day.label}
            </button>
           ))}
          </div>
         </div>
        </div>

        {/* Class Selection */}
        <div className="space-y-4">
         <h3 className="text-lg font-semibold text-gray-900">Classes</h3>
         {regenClasses.filter(c => !regenVenueId || c.venueId === regenVenueId).length === 0 ? (
          <p className="text-gray-500">No classes available for the selected venue.</p>
         ) : (
          <div className="space-y-3">
           {regenClasses.filter(c => !regenVenueId || c.venueId === regenVenueId).map((classTemplate) => {
            const isSelected = regenSelectedClasses.has(classTemplate.id)
            const custom = regenCustomizations.get(classTemplate.id) || {}

            return (
             <div key={classTemplate.id} className="border rounded p-4">
              <div className="flex items-start gap-3">
               <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleRegenClass(classTemplate.id)}
                className="mt-1"
               />
               <div className="flex-1">
                <div className="flex justify-between items-start">
                 <div>
                  <h4 className="font-semibold">{classTemplate.name}</h4>
                  <p className="text-sm text-gray-600">
                   {classTemplate.level} • {classTemplate.lengthMinutes} min • {classTemplate.startTimeLocal} - {classTemplate.endTimeLocal}
                  </p>
                 </div>
                </div>

                {isSelected && (
                 <div className="mt-3 space-y-3 border-t pt-3">
                  <div className="grid grid-cols-3 gap-4">
                   <div>
                    <label className="block text-sm font-medium mb-1">Rotation (min)</label>
                    <input
                     type="number"
                     value={custom.rotationMinutes ?? classTemplate.defaultRotationMinutes}
                     onChange={(e) =>
                      updateRegenCustomization(classTemplate.id, 'rotationMinutes', parseInt(e.target.value))
                     }
                     className="w-full border rounded px-2 py-1 text-sm"
                     min="1"
                    />
                   </div>
                   <div>
                    <label className="block text-sm font-medium mb-1">Start Time</label>
                    <input
                     type="time"
                     value={custom.startTimeLocal ?? classTemplate.startTimeLocal}
                     onChange={(e) =>
                      updateRegenCustomization(classTemplate.id, 'startTimeLocal', e.target.value)
                     }
                     className="w-full border rounded px-2 py-1 text-sm"
                    />
                   </div>
                   <div>
                    <label className="block text-sm font-medium mb-1">End Time</label>
                    <input
                     type="time"
                     value={custom.endTimeLocal ?? classTemplate.endTimeLocal}
                     onChange={(e) =>
                      updateRegenCustomization(classTemplate.id, 'endTimeLocal', e.target.value)
                     }
                     className="w-full border rounded px-2 py-1 text-sm"
                    />
                   </div>
                  </div>

                  <div>
                   <label className="block text-sm font-medium mb-2">Coaches</label>
                   <div className="flex gap-2 flex-wrap">
                    {regenCoaches.map((coach) => {
                     const selectedCoaches = custom.coachIds || classTemplate.defaultCoaches.map((c) => c.coach.id)
                     const isCoachSelected = selectedCoaches.includes(coach.id)
                     return (
                      <button
                       key={coach.id}
                       type="button"
                       onClick={() => toggleRegenCoach(classTemplate.id, coach.id)}
                       className={`px-2 py-1 text-sm rounded ${
                        isCoachSelected ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'
                       }`}
                      >
                       {coach.name}
                      </button>
                     )
                    })}
                   </div>
                  </div>

                  <div>
                   <label className="block text-sm font-medium mb-2">Allowed Zones</label>
                   <div className="flex gap-2 flex-wrap">
                    {regenZones
                     .filter(zone => !regenVenueId || zone.venueId === regenVenueId)
                     .map((zone) => {
                     const selectedZones = custom.allowedZoneIds || classTemplate.allowedZones.map((z) => z.zone.id)
                     const isZoneSelected = selectedZones.includes(zone.id)
                     return (
                      <button
                       key={zone.id}
                       type="button"
                       onClick={() => toggleRegenZone(classTemplate.id, zone.id)}
                       className={`px-2 py-1 text-sm rounded ${
                        isZoneSelected ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
                       }`}
                      >
                       {zone.name}
                      </button>
                     )
                    })}
                   </div>
                  </div>

                  <label className="flex items-center gap-2">
                   <input
                    type="checkbox"
                    checked={custom.allowOverlap ?? false}
                    onChange={(e) =>
                     updateRegenCustomization(classTemplate.id, 'allowOverlap', e.target.checked)
                    }
                    className="rounded"
                   />
                   <span className="text-sm">Allow zone overlap</span>
                  </label>
                 </div>
                )}
               </div>
              </div>
             </div>
            )
           })}
          </div>
         )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
         <button
          onClick={closeRegenerateModal}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
         >
          Cancel
         </button>
         <button
          onClick={submitRegenerate}
          disabled={regenerateLoading || regenSelectedClasses.size === 0 || regenActiveDays.size === 0}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
         >
          {regenerateLoading ? 'Regenerating...' : 'Save & Regenerate'}
         </button>
        </div>
       </div>
      )}
     </div>
    </div>
   )}
  </DashboardLayout>
 )
}

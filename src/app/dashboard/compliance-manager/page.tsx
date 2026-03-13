'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import VenueSelector from '@/components/VenueSelector'
import IntelligenceFilter from '@/components/IntelligenceFilter'
import { confirmAndDelete, showToast } from '@/lib/toast'
import axiosInstance from '@/lib/axios'
import {
 Bar,
 BarChart,
 CartesianGrid,
 Legend,
 Line,
 LineChart,
 ResponsiveContainer,
 Tooltip,
 XAxis,
 YAxis,
} from 'recharts'
import {
 CheckCircleIcon,
 UserIcon,
 FolderIcon,
 ClockIcon,
 CalendarIcon,
} from '@heroicons/react/24/outline'

interface ComplianceCategory {
 id: string
 name: string
 description: string | null
}

interface ComplianceOwner {
 id: string
 fullName: string
 email: string
 role: string
}

interface ComplianceFileLink {
 name: string
 url: string
}

interface ComplianceUploadedFile {
 name: string
 data: string // base64 encoded file data
 type: string // MIME type
 size: number // file size in bytes
}

interface ComplianceItem {
 id: string
 title: string
 description: string | null
 notes: string | null
 status: string
 computedStatus: string
 deadlineDate: string
 categoryId: string | null
 ownerId: string | null
 ownerName: string | null
 ownerEmail: string | null
 recurringSchedule: string
 reminderSchedule: number[]
 fileLinks: ComplianceFileLink[]
 uploadedFiles: ComplianceUploadedFile[]
 category: ComplianceCategory | null
 owner: { id: string; fullName: string; email: string } | null
 parentItemId: string | null
 isTemplate: boolean
 instanceNumber: number | null
 parentItem?: { id: string; title: string; recurringSchedule: string } | null
}

interface ComplianceTrend {
 month: string
 created: number
 completed: number
 overdue: number
}

interface ComplianceAnalytics {
 totals: {
  totalItems: number
  openItems: number
  inProgressItems: number
  completedItems: number
  overdueItems: number
  dueIn7Days: number
  dueIn30Days: number
  completionRate: number
  configuredReminders: number
  withLinkedFiles: number
 }
 byCategory: Array<{ category: string; total: number; overdue: number; completed: number }>
 byOwner: Array<{ owner: string; total: number; overdue: number; dueSoon: number }>
 trend: ComplianceTrend[]
 upcomingDeadlines: Array<{
  id: string
  title: string
  deadlineDate: string
  computedStatus: string
  ownerName: string
  categoryName: string
 }>
}

interface ItemFormState {
 title: string
 description: string
 notes: string
 categoryId: string
 venueId: string
 ownerId: string
 ownerName: string
 ownerEmail: string
 deadlineDate: string
 status: string
 recurringSchedule: string
 reminderSchedule: number[]
 fileLinks: ComplianceFileLink[]
 uploadedFiles: ComplianceUploadedFile[]
}

const DEFAULT_REMINDER_SCHEDULE = [90, 30, 7, 1]

function buildDefaultItemForm(): ItemFormState {
 return {
  title: '',
  description: '',
  notes: '',
  categoryId: 'none',
  venueId: '',
  ownerId: 'none',
  ownerName: '',
  ownerEmail: '',
  deadlineDate: '',
  status: 'OPEN',
  recurringSchedule: 'NONE',
  reminderSchedule: [...DEFAULT_REMINDER_SCHEDULE],
  fileLinks: [],
  uploadedFiles: [],
 }
}

export default function ComplianceManagerPage() {
 const [items, setItems] = useState<ComplianceItem[]>([])
 const [categories, setCategories] = useState<ComplianceCategory[]>([])
 const [owners, setOwners] = useState<ComplianceOwner[]>([])
 const [analytics, setAnalytics] = useState<ComplianceAnalytics | null>(null)
 const [loading, setLoading] = useState(true)
 const [loadingMeta, setLoadingMeta] = useState(true)

 const [search, setSearch] = useState('')
 const [venueId, setVenueId] = useState<string | null>(null)
 const [categoryFilter, setCategoryFilter] = useState('all')
 const [ownerFilter, setOwnerFilter] = useState('all')
 const [statusFilter, setStatusFilter] = useState('all')
 const [dueWithinFilter, setDueWithinFilter] = useState('all')
 const [startDate, setStartDate] = useState('')
 const [endDate, setEndDate] = useState('')
 const [itemsView, setItemsView] = useState<'active' | 'closed' | 'all'>('active')

 const [showItemModal, setShowItemModal] = useState(false)
 const [showCategoryModal, setShowCategoryModal] = useState(false)
 const [showCategoryForm, setShowCategoryForm] = useState(false)
 const [itemForm, setItemForm] = useState<ItemFormState>(buildDefaultItemForm)
 const [categoryForm, setCategoryForm] = useState({ name: '', description: '' })
 const [editingItemId, setEditingItemId] = useState<string | null>(null)
 const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
 const [isAdmin, setIsAdmin] = useState(false)

 const loadMeta = useCallback(async () => {
  try {
   setLoadingMeta(true)
   const response = await axiosInstance.get('/api/compliance/meta')
   const data = response.data
   setCategories(data.categories || [])
   setOwners(data.owners || [])
  } catch (error) {
   console.error(error)
   showToast.error('Failed to load compliance metadata')
  } finally {
   setLoadingMeta(false)
  }
 }, [])

 const buildQueryParams = useCallback(() => {
  const params = new URLSearchParams()
  if (venueId && venueId !== 'all') params.append('venueId', venueId)
  if (search.trim()) params.append('search', search.trim())
  if (categoryFilter !== 'all') params.append('categoryId', categoryFilter)
  if (ownerFilter !== 'all') params.append('ownerId', ownerFilter)
  if (statusFilter !== 'all') params.append('status', statusFilter)
  if (dueWithinFilter !== 'all') params.append('dueWithin', dueWithinFilter)
  if (startDate) params.append('startDate', startDate)
  if (endDate) params.append('endDate', endDate)
  return params
 }, [search, venueId, categoryFilter, ownerFilter, statusFilter, dueWithinFilter, startDate, endDate])

 // Filter items based on Active/Closed view
 const filteredItems = useMemo(() => {
  if (itemsView === 'active') {
   // Active: exclude COMPLETED items
   return items.filter(item => item.computedStatus !== 'COMPLETED' && item.status !== 'COMPLETED')
  } else if (itemsView === 'closed') {
   // Closed: only COMPLETED items
   return items.filter(item => item.computedStatus === 'COMPLETED' || item.status === 'COMPLETED')
  }
  // All: show everything
  return items
 }, [items, itemsView])

 const loadData = useCallback(async () => {
  try {
   setLoading(true)
   const params = buildQueryParams()
   const [itemsResponse, analyticsResponse] = await Promise.all([
    axiosInstance.get(`/api/compliance/items?${params.toString()}`),
    axiosInstance.get(`/api/compliance/analytics?${params.toString()}`),
   ])

   setItems(itemsResponse.data.items || [])
   setAnalytics(analyticsResponse.data)
  } catch (error) {
   console.error(error)
   showToast.error('Failed to load compliance dashboard data')
  } finally {
   setLoading(false)
  }
 }, [buildQueryParams])

 useEffect(() => {
  const userDataRaw = localStorage.getItem('userData')
  if (!userDataRaw) return

  try {
   const userData = JSON.parse(userDataRaw) as { role?: string }
   setIsAdmin(userData.role === 'ADMIN')
  } catch {
   setIsAdmin(false)
  }
 }, [])

 useEffect(() => {
  void loadMeta()
 }, [loadMeta])

 useEffect(() => {
  void loadData()
 }, [loadData])

 const clearFilters = () => {
  setSearch('')
  setVenueId(null)
  setCategoryFilter('all')
  setOwnerFilter('all')
  setStatusFilter('all')
  setDueWithinFilter('all')
  setStartDate('')
  setEndDate('')
  setItemsView('active') // Reset to active view
 }

 const openCreateItemModal = () => {
  setEditingItemId(null)
  setItemForm(buildDefaultItemForm())
  setShowItemModal(true)
 }

 const openEditItemModal = (item: ComplianceItem) => {
  setEditingItemId(item.id)
  
  // Determine the correct ownerId value:
  // - If item has ownerId, use it (regular user)
  // - If item has ownerName but no ownerId, construct qa-* ID (quick-add owner)
  // - Otherwise, use 'none' (unassigned)
  let ownerIdValue = 'none'
  if (item.ownerId) {
   ownerIdValue = item.ownerId
  } else if (item.ownerName) {
   ownerIdValue = `qa-${item.ownerName}`
  }
  
  setItemForm({
   title: item.title,
   description: item.description || '',
   notes: item.notes || '',
   categoryId: item.categoryId || 'none',
   venueId: item.venueId || '',
   ownerId: ownerIdValue,
   ownerName: item.ownerName || '',
   ownerEmail: item.ownerEmail || '',
   deadlineDate: item.deadlineDate.split('T')[0],
   status: item.status,
   recurringSchedule: item.recurringSchedule || 'NONE',
   reminderSchedule: item.reminderSchedule || [],
   fileLinks: item.fileLinks || [],
   uploadedFiles: item.uploadedFiles || [],
  })
  setShowItemModal(true)
 }

 const openAddCategoryForm = () => {
  setEditingCategoryId(null)
  setCategoryForm({ name: '', description: '' })
  setShowCategoryForm(true)
 }

 const openEditCategoryForm = (category: ComplianceCategory) => {
  setEditingCategoryId(category.id)
  setCategoryForm({
   name: category.name,
   description: category.description || '',
  })
  setShowCategoryForm(true)
 }

 const submitCategory = async () => {
  try {
   const url = editingCategoryId
    ? `/api/compliance/categories/${editingCategoryId}`
    : '/api/compliance/categories'
   const method = editingCategoryId ? 'put' : 'post'

   await axiosInstance.request({
    url,
    method,
    data: categoryForm,
   })

   showToast.saveSuccess('Compliance category')
   setShowCategoryForm(false)
   setEditingCategoryId(null)
   setCategoryForm({ name: '', description: '' })
   await loadMeta()
  } catch (error) {
   showToast.error(error instanceof Error ? error.message : 'Failed to save category')
  }
 }

 const deleteCategory = async (category: ComplianceCategory) => {
  await confirmAndDelete(category.name, async () => {
   await axiosInstance.delete(`/api/compliance/categories/${category.id}`)
   await loadMeta()
  })
 }

 const submitItem = async () => {
  try {
   let payload = {
    ...itemForm,
    categoryId: itemForm.categoryId,
   }

   // Handle different owner scenarios:
   // 1. quick-add: New owner being created on the fly
   // 2. qa-OwnerName: Existing quick-add owner selected from dropdown
   // 3. Regular user ID: User account selected
   // 4. none: Unassigned
   if (itemForm.ownerId === 'quick-add') {
    payload.ownerId = 'none'
   } else if (itemForm.ownerId.startsWith('qa-')) {
    // Extract the owner name from the ID
    payload.ownerId = 'none'
    payload.ownerName = itemForm.ownerId.substring(3) // Remove 'qa-' prefix
    // Try to find the email from the owners list
    const quickAddOwner = owners.find(o => o.id === itemForm.ownerId)
    if (quickAddOwner) {
     payload.ownerEmail = quickAddOwner.email
    }
   } else if (itemForm.ownerId === 'none') {
    // Unassigned - clear owner fields
    payload.ownerId = 'none'
    payload.ownerName = ''
    payload.ownerEmail = ''
   } else {
    // Regular user ID - clear ownerName and ownerEmail as they're not needed
    // The user's name and email will come from the User relationship
    payload.ownerName = ''
    payload.ownerEmail = ''
   }

   const url = editingItemId ? `/api/compliance/items/${editingItemId}` : '/api/compliance/items'
   const method = editingItemId ? 'put' : 'post'

   await axiosInstance.request({
    url,
    method,
    data: payload,
   })

   showToast.saveSuccess('Compliance item')
   setShowItemModal(false)
   setEditingItemId(null)
   setItemForm(buildDefaultItemForm())
   await loadData()
  } catch (error) {
   showToast.error(error instanceof Error ? error.message : 'Failed to save compliance item')
  }
 }

 const markCompleted = async (item: ComplianceItem) => {
  try {
   // Enhanced confirmation for recurring items
   if (item.recurringSchedule !== 'NONE') {
    const instanceInfo = item.instanceNumber ? ` (Instance #${item.instanceNumber})` : ''
    const message = (
     `Complete Recurring Item: "${item.title}"${instanceInfo}\n\n` +
     `This is a ${item.recurringSchedule.toLowerCase()} recurring item.\n\n` +
     `When you mark it complete:\n\n` +
     `✓ THIS instance will move to Closed Items (completion history preserved)\n` +
     `✓ A NEW instance will be created for the next ${item.recurringSchedule.toLowerCase()} deadline\n` +
     `✓ The next instance will appear in Active Items\n\n` +
     `Continue?`
    )
    const confirmed = window.confirm(message)
    if (!confirmed) return
   }
   
   await axiosInstance.put(`/api/compliance/items/${item.id}`, { status: 'COMPLETED' })
   showToast.success(
    item.recurringSchedule !== 'NONE'
     ? `Instance completed! A new instance has been created for the next ${item.recurringSchedule.toLowerCase()} deadline. Check Active Items.`
     : 'Compliance item marked as completed'
   )
   await loadData()
  } catch (error) {
   console.error(error)
   showToast.error('Failed to mark compliance item as completed')
  }
 }

 const deleteItem = async (item: ComplianceItem) => {
  // Enhanced deletion confirmation for recurring items
  if (item.recurringSchedule !== 'NONE') {
    const instanceInfo = item.instanceNumber ? ` #${item.instanceNumber}` : ''
    const confirmed = window.confirm(
      `⚠️ DELETE RECURRING ITEM${instanceInfo}\n\n` +
      `"${item.title}" is a ${item.recurringSchedule.toLowerCase()} recurring item.\n\n` +
      `This will delete only THIS instance.\n` +
      `Other instances in the series will not be affected.\n\n` +
      `Are you sure you want to delete this instance?`
    )
    if (!confirmed) return
  }
  
  await confirmAndDelete(item.title, async () => {
   await axiosInstance.delete(`/api/compliance/items/${item.id}`)
   await loadData()
  })
 }

 const addFileLink = () => {
  setItemForm((prev) => ({
   ...prev,
   fileLinks: [...prev.fileLinks, { name: '', url: '' }],
  }))
 }

 const updateFileLink = (index: number, field: 'name' | 'url', value: string) => {
  setItemForm((prev) => ({
   ...prev,
   fileLinks: prev.fileLinks.map((link, i) => (i === index ? { ...link, [field]: value } : link)),
  }))
 }

 const removeFileLink = (index: number) => {
  setItemForm((prev) => ({
   ...prev,
   fileLinks: prev.fileLinks.filter((_, i) => i !== index),
  }))
 }

 const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files
  if (!files) return

  const maxFiles = 5
  const maxFileSize = 10 * 1024 * 1024 // 10MB
  const availableSlots = maxFiles - itemForm.uploadedFiles.length

  if (files.length > availableSlots) {
   showToast.error(`You can upload up to ${maxFiles} files total. You have ${availableSlots} slot(s) remaining.`)
   return
  }

  const newFiles: ComplianceUploadedFile[] = []
  
  for (let i = 0; i < files.length; i++) {
   const file = files[i]

   // Validate file size
   if (file.size > maxFileSize) {
    showToast.error(`File "${file.name}" is too large. Maximum size is 10MB.`)
    continue
   }

   // Convert to base64
   try {
    const base64 = await new Promise<string>((resolve, reject) => {
     const reader = new FileReader()
     reader.onloadend = () => resolve(reader.result as string)
     reader.onerror = reject
     reader.readAsDataURL(file)
    })

    newFiles.push({
     name: file.name,
     data: base64,
     type: file.type,
     size: file.size,
    })
   } catch (error) {
    console.error('Failed to read file:', error)
    showToast.error(`Failed to read file "${file.name}"`)
   }
  }

  if (newFiles.length > 0) {
   setItemForm((prev) => ({
    ...prev,
    uploadedFiles: [...prev.uploadedFiles, ...newFiles],
   }))
   showToast.success(`${newFiles.length} file(s) added successfully`)
  }

  // Clear the input
  e.target.value = ''
 }

 const removeUploadedFile = (index: number) => {
  setItemForm((prev) => ({
   ...prev,
   uploadedFiles: prev.uploadedFiles.filter((_, i) => i !== index),
  }))
 }

 const reminderOptions = useMemo(
  () => [
   { label: '3 months', value: 90 },
   { label: '1 month', value: 30 },
   { label: '1 week', value: 7 },
   { label: '1 day', value: 1 },
  ],
  []
 )

 const toggleReminder = (value: number) => {
  setItemForm((prev) => {
   const next = prev.reminderSchedule.includes(value)
    ? prev.reminderSchedule.filter((entry) => entry !== value)
    : [...prev.reminderSchedule, value]

   return {
    ...prev,
    reminderSchedule: next.sort((a, b) => b - a),
   }
  })
 }

 const formatStatusBadge = (status: string) => {
  if (status === 'COMPLETED') return 'bg-green-100 text-green-700'
  if (status === 'OVERDUE') return 'bg-red-100 text-red-700'
  if (status === 'IN_PROGRESS') return 'bg-yellow-100 text-yellow-700'
  return 'bg-blue-100 text-blue-700'
 }

 if (loadingMeta) {
  return (
   <DashboardLayout>
    <div className="flex h-64 items-center justify-center">
     <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-600" />
    </div>
   </DashboardLayout>
  )
 }

 return (
  <DashboardLayout>
   <div className="space-y-4 p-4">
    <div className="flex items-center justify-between">
     <div>
      <h1 className="text-2xl font-bold text-gray-900">Compliance Manager</h1>
      <p className="mt-1 text-sm text-gray-600">Track deadlines, ownership, reminders, notes, and linked records for club compliance obligations.</p>
     </div>
     <div className="flex items-center gap-2 print:hidden">
      <button
       onClick={() => window.print()}
       className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
>
       Print
      </button>
      {isAdmin && (
       <>
        <button
         onClick={() => setShowCategoryModal(true)}
         className="rounded-lg border border-blue-300 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50"
>
         Categories
        </button>
        <button
         onClick={openCreateItemModal}
         className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
>
         Add Compliance Item
        </button>
       </>
      )}
     </div>
    </div>

    {/* Active/Closed Items Navigation */}
    <div className="bg-white border-b border-gray-200">
     <div className="px-6 py-3">
      <nav className="flex items-center gap-1 overflow-x-auto">
       <button
        onClick={() => setItemsView('active')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-colors ${
         itemsView === 'active'
          ? 'bg-blue-50 text-blue-600'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`}
       >
        <span className="text-lg">📋</span>
        <span>Active Items</span>
        {items.filter(i => i.computedStatus !== 'COMPLETED' && i.status !== 'COMPLETED').length > 0 && (
         <span className="ml-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
          {items.filter(i => i.computedStatus !== 'COMPLETED' && i.status !== 'COMPLETED').length}
         </span>
        )}
       </button>
       <button
        onClick={() => setItemsView('closed')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-colors ${
         itemsView === 'closed'
          ? 'bg-blue-50 text-blue-600'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`}
       >
        <span className="text-lg">✅</span>
        <span>Closed Items</span>
        {items.filter(i => i.computedStatus === 'COMPLETED' || i.status === 'COMPLETED').length > 0 && (
         <span className="ml-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
          {items.filter(i => i.computedStatus === 'COMPLETED' || i.status === 'COMPLETED').length}
         </span>
        )}
       </button>
       <button
        onClick={() => setItemsView('all')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-colors ${
         itemsView === 'all'
          ? 'bg-blue-50 text-blue-600'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`}
       >
        <span className="text-lg">📊</span>
        <span>All Items</span>
        <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
         {items.length}
        </span>
       </button>
      </nav>
     </div>
    </div>

    {analytics && (
     <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
       <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-600">Total Items</p>
        <p className="mt-2 text-xl font-bold text-gray-900">{analytics.totals.totalItems}</p>
       </div>
       <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-600">Overdue</p>
        <p className="mt-2 text-xl font-bold text-red-600">{analytics.totals.overdueItems}</p>
       </div>
       <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-600">Due in 7 Days</p>
        <p className="mt-2 text-xl font-bold text-orange-600">{analytics.totals.dueIn7Days}</p>
       </div>
       <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-600">Completion Rate</p>
        <p className="mt-2 text-xl font-bold text-green-600">{analytics.totals.completionRate}%</p>
       </div>
       <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-600">Items With Files</p>
        <p className="mt-2 text-xl font-bold text-blue-600">{analytics.totals.withLinkedFiles}</p>
       </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
       <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Category Workload</h2>
        <p className="text-xs text-gray-600">Total, completed, and overdue items by category.</p>
        <div className="mt-3 h-48">
         <ResponsiveContainer width="100%" height="100%">
          <BarChart data={analytics.byCategory.slice(0, 8)}>
           <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
           <XAxis dataKey="category" tick={{ fontSize: 11 }} stroke="#6b7280" />
           <YAxis tick={{ fontSize: 11 }} stroke="#6b7280" />
           <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }} />
           <Legend wrapperStyle={{ fontSize: '12px' }} />
           <Bar dataKey="total" fill="#3b82f6" name="Total" radius={[4, 4, 0, 0]} />
           <Bar dataKey="completed" fill="#10b981" name="Completed" radius={[4, 4, 0, 0]} />
           <Bar dataKey="overdue" fill="#ef4444" name="Overdue" radius={[4, 4, 0, 0]} />
          </BarChart>
         </ResponsiveContainer>
        </div>
       </div>

       <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Compliance Trend</h2>
        <p className="text-xs text-gray-600">Six-month trend of created, completed, and overdue items.</p>
        <div className="mt-3 h-48">
         <ResponsiveContainer width="100%" height="100%">
          <LineChart data={analytics.trend}>
           <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
           <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#6b7280" />
           <YAxis tick={{ fontSize: 11 }} stroke="#6b7280" />
           <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }} />
           <Legend wrapperStyle={{ fontSize: '12px' }} />
           <Line type="monotone" dataKey="created" stroke="#3b82f6" strokeWidth={2} name="Created" dot={{ r: 3 }} />
           <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} name="Completed" dot={{ r: 3 }} />
           <Line type="monotone" dataKey="overdue" stroke="#ef4444" strokeWidth={2} name="Overdue" dot={{ r: 3 }} />
          </LineChart>
         </ResponsiveContainer>
        </div>
       </div>
      </div>
     </>
    )}

    <IntelligenceFilter
      title="Compliance Item Filters"
      subtitle="Filter and search compliance items"
      variant="gradient"
      filters={[
        {
          type: 'custom',
          label: 'Venue',
          value: venueId,
          onChange: setVenueId,
          customComponent: (
            <VenueSelector
              value={venueId}
              onChange={setVenueId}
              showAllOption={true}
            />
          ),
        },
        {
          type: 'search',
          label: 'Search',
          value: search,
          onChange: setSearch,
          placeholder: 'Search item title, description, notes',
        },
        {
          type: 'select',
          label: 'Category',
          value: categoryFilter,
          onChange: setCategoryFilter,
          icon: <FolderIcon className="h-4 w-4" />,
          options: [
            { value: 'all', label: 'All Categories' },
            ...categories.map((category) => ({
              value: category.id,
              label: category.name,
            })),
          ],
        },
        {
          type: 'select',
          label: 'Owner',
          value: ownerFilter,
          onChange: setOwnerFilter,
          icon: <UserIcon className="h-4 w-4" />,
          options: [
            { value: 'all', label: 'All Owners' },
            { value: 'none', label: 'Unassigned' },
            ...owners.map((owner) => ({
              value: owner.id,
              label: owner.fullName,
            })),
          ],
        },
        {
          type: 'select',
          label: 'Status',
          value: statusFilter,
          onChange: setStatusFilter,
          icon: <CheckCircleIcon className="h-4 w-4" />,
          options: [
            { value: 'all', label: 'All Statuses' },
            { value: 'OPEN', label: 'Open' },
            { value: 'IN_PROGRESS', label: 'In Progress' },
            { value: 'COMPLETED', label: 'Completed' },
            { value: 'OVERDUE', label: 'Overdue' },
          ],
        },
        {
          type: 'select',
          label: 'Deadline',
          value: dueWithinFilter,
          onChange: setDueWithinFilter,
          icon: <ClockIcon className="h-4 w-4" />,
          options: [
            { value: 'all', label: 'All Deadlines' },
            { value: '7', label: 'Due in 7 days' },
            { value: '30', label: 'Due in 30 days' },
            { value: '90', label: 'Due in 90 days' },
            { value: 'overdue', label: 'Overdue' },
          ],
        },
        {
          type: 'custom',
          label: 'Start Date',
          value: startDate,
          onChange: setStartDate,
          customComponent: (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          ),
        },
        {
          type: 'custom',
          label: 'End Date',
          value: endDate,
          onChange: setEndDate,
          customComponent: (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          ),
        },
      ]}
      onReset={clearFilters}
      filterCount={filteredItems.length}
      filterCountLabel="compliance items"
    />

    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
     <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
       <thead className="bg-gray-50">
        <tr>
         <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Item</th>
         <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Category</th>
         <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Owner</th>
         <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Deadline</th>
         <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
         <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Reminders</th>
         <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Files</th>
         <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Notes</th>
         <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 print:hidden">Actions</th>
        </tr>
       </thead>
       <tbody className="divide-y divide-gray-200 bg-white">
        {loading ? (
         <tr>
          <td colSpan={9} className="px-4 py-6 text-center text-sm text-gray-500">Loading compliance items...</td>
         </tr>
        ) : filteredItems.length === 0 ? (
         <tr>
          <td colSpan={9} className="px-4 py-6 text-center text-sm text-gray-500">
           {itemsView === 'active' ? 'No active compliance items. Great job!' : 
            itemsView === 'closed' ? 'No closed compliance items yet.' :
            'No compliance items match the current filters.'}
          </td>
         </tr>
        ) : (
         filteredItems.map((item) => (
          <tr key={item.id}>
           <td className="px-4 py-3 text-sm text-gray-900">
            <div className="flex items-center gap-2">
             {item.recurringSchedule !== 'NONE' && (
              <span className="text-blue-600" title="Recurring item">
               🔄
              </span>
             )}
             <div className="flex-1">
              <div className="font-medium">{item.title}</div>
              {item.description && <div className="text-xs text-gray-500">{item.description}</div>}
              {item.recurringSchedule !== 'NONE' && (
               <div className="mt-0.5 text-xs text-blue-600">
                Recurs: {item.recurringSchedule.toLowerCase()}
                {item.instanceNumber && ` • Instance #${item.instanceNumber}`}
               </div>
              )}
             </div>
            </div>
           </td>
           <td className="px-4 py-3 text-sm text-gray-700">{item.category?.name || 'Uncategorised'}</td>
           <td className="px-4 py-3 text-sm text-gray-700">{item.owner?.fullName || item.ownerName || 'Unassigned'}</td>
           <td className="px-4 py-3 text-sm text-gray-700">{new Date(item.deadlineDate).toLocaleDateString('en-AU')}</td>
           <td className="px-4 py-3 text-sm">
            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${formatStatusBadge(item.computedStatus)}`}>
             {item.computedStatus.replace('_', ' ')}
            </span>
           </td>
           <td className="px-4 py-3 text-sm text-gray-700">
            {item.reminderSchedule.length> 0 ? `${item.reminderSchedule.join(', ')}d` : 'None'}
           </td>
           <td className="px-4 py-3 text-sm text-gray-700">
            {(item.fileLinks.length> 0 || item.uploadedFiles.length > 0) ? (
             <div className="space-y-1">
              {item.fileLinks.slice(0, 2).map((link) => (
               <a
                key={`${item.id}-${link.url}`}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-blue-600 hover:underline"
                title="External link"
>
                🔗 {link.name}
               </a>
              ))}
              {item.uploadedFiles.slice(0, Math.max(0, 2 - item.fileLinks.length)).map((file) => (
               <button
                key={`${item.id}-${file.name}`}
                onClick={() => {
                 try {
                  const byteCharacters = atob(file.data);
                  const byteNumbers = new Array(byteCharacters.length);
                  for (let i = 0; i < byteCharacters.length; i++) {
                   byteNumbers[i] = byteCharacters.charCodeAt(i);
                  }
                  const byteArray = new Uint8Array(byteNumbers);
                  const blob = new Blob([byteArray], { type: file.type });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = file.name;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                 } catch (error) {
                  console.error('Download failed:', error);
                  showToast('Failed to download file', 'error');
                 }
                }}
                className="block text-left text-blue-600 hover:underline"
                title={`Download ${file.name} (${(file.size / 1024).toFixed(1)} KB)`}
>
                📎 {file.name}
               </button>
              ))}
              {(item.fileLinks.length + item.uploadedFiles.length) > 2 && (
               <span className="text-xs text-gray-500">
                +{item.fileLinks.length + item.uploadedFiles.length - 2} more
               </span>
              )}
             </div>
            ) : (
             <span className="text-gray-400">-</span>
            )}
           </td>
           <td className="px-4 py-3 text-sm text-gray-700">{item.notes || '-'}</td>
           <td className="px-4 py-3 text-right text-sm print:hidden">
            {isAdmin ? (
             <div className="flex justify-end gap-2">
              {item.computedStatus !== 'COMPLETED' && (
               <button
                onClick={() => void markCompleted(item)}
                className="rounded border border-green-300 px-2 py-1 text-xs text-green-700 hover:bg-green-50"
>
                Complete
               </button>
              )}
              <button
               onClick={() => openEditItemModal(item)}
               className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
>
               Edit
              </button>
              <button
               onClick={() => void deleteItem(item)}
               className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
>
               Delete
              </button>
             </div>
            ) : (
             <span className="text-xs text-gray-400">View only</span>
            )}
           </td>
          </tr>
         ))
        )}
       </tbody>
      </table>
     </div>
    </div>
   </div>

   {showCategoryModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
     <div className="w-full max-w-4xl rounded-lg bg-white p-6">
      <div className="flex items-center justify-between">
       <h3 className="text-lg font-semibold text-gray-900">Compliance Categories</h3>
       <div className="flex gap-2">
        <button
         onClick={openAddCategoryForm}
         className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
>
         Add Category
        </button>
        <button
         onClick={() => setShowCategoryModal(false)}
         className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
>
         Close
        </button>
       </div>
      </div>

      <div className="mt-4 overflow-x-auto">
       <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
         <tr>
          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Name</th>
          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Description</th>
          <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Items</th>
          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
         </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
         {categories.length === 0 ? (
          <tr>
           <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">
            No categories created yet. Click "Add Category" to create one.
           </td>
          </tr>
         ) : (
          categories.map((category) => (
           <tr key={category.id}>
            <td className="px-4 py-3 text-sm font-medium text-gray-900">{category.name}</td>
            <td className="px-4 py-3 text-sm text-gray-700">{category.description || '-'}</td>
            <td className="px-4 py-3 text-center text-sm text-gray-700">
             {(category as any)._count?.items || 0}
            </td>
            <td className="px-4 py-3 text-right text-sm">
             <div className="flex justify-end gap-2">
              <button
               onClick={() => openEditCategoryForm(category)}
               className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
>
               Edit
              </button>
              <button
               onClick={() => void deleteCategory(category)}
               className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
>
               Delete
              </button>
             </div>
            </td>
           </tr>
          ))
         )}
        </tbody>
       </table>
      </div>
     </div>
    </div>
   )}

   {showCategoryForm && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
     <div className="w-full max-w-lg rounded-lg bg-white p-6">
      <h3 className="text-lg font-semibold text-gray-900">
       {editingCategoryId ? 'Edit Category' : 'Add Category'}
      </h3>
      <div className="mt-4 space-y-3">
       <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Category Name</label>
        <input
         type="text"
         placeholder="e.g., Insurance, Safety, Training"
         value={categoryForm.name}
         onChange={(event) => setCategoryForm((prev) => ({ ...prev, name: event.target.value }))}
         className="w-full rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
       </div>
       <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Description (Optional)</label>
        <textarea
         placeholder="Brief description of this category"
         value={categoryForm.description}
         onChange={(event) => setCategoryForm((prev) => ({ ...prev, description: event.target.value }))}
         rows={3}
         className="w-full rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
       </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
       <button
        onClick={() => {
         setShowCategoryForm(false)
         setEditingCategoryId(null)
         setCategoryForm({ name: '', description: '' })
        }}
        className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
>
        Cancel
       </button>
       <button
        onClick={() => void submitCategory()}
        className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
>
        {editingCategoryId ? 'Update' : 'Create'} Category
       </button>
      </div>
     </div>
    </div>
   )}

   {showItemModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
     <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6">
      <h3 className="text-lg font-semibold text-gray-900">{editingItemId ? 'Edit Compliance Item' : 'Add Compliance Item'}</h3>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
       <div className="md:col-span-2">
        <label className="mb-1 block text-sm font-medium text-gray-700">Item</label>
        <input
         type="text"
         value={itemForm.title}
         onChange={(event) => setItemForm((prev) => ({ ...prev, title: event.target.value }))}
         className="w-full rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
       </div>

       <div className="md:col-span-2">
        <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
        <textarea
         value={itemForm.description}
         onChange={(event) => setItemForm((prev) => ({ ...prev, description: event.target.value }))}
         rows={3}
         className="w-full rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
       </div>

       <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
        <select
         value={itemForm.categoryId}
         onChange={(event) => setItemForm((prev) => ({ ...prev, categoryId: event.target.value }))}
         className="w-full rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
>
         <option value="none">Uncategorised</option>
         {categories.map((category) => (
          <option key={category.id} value={category.id}>{category.name}</option>
         ))}
        </select>
       </div>

       <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Venue</label>
        <VenueSelector
         value={itemForm.venueId || null}
         onChange={(venue) => setItemForm((prev) => ({ ...prev, venueId: venue || '' }))}
         showLabel={false}
        />
       </div>

       <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Owner</label>
        <select
         value={itemForm.ownerId}
         onChange={(event) => {
          const newOwnerId = event.target.value
          setItemForm((prev) => ({
           ...prev,
           ownerId: newOwnerId,
           // Clear ownerName and ownerEmail when selecting a regular user or unassigned
           // Only keep them for quick-add or qa-* owners
           ownerName: (newOwnerId === 'quick-add' || newOwnerId.startsWith('qa-')) ? prev.ownerName : '',
           ownerEmail: (newOwnerId === 'quick-add' || newOwnerId.startsWith('qa-')) ? prev.ownerEmail : '',
          }))
         }}
         className="w-full rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
>
         <option value="none">Unassigned</option>
         <option value="quick-add">➕ Add new owner (quick)</option>
         {owners.map((owner) => (
          <option key={owner.id} value={owner.id}>{owner.fullName}</option>
         ))}
        </select>
       </div>

       {itemForm.ownerId === 'quick-add' && (
        <>
         <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Owner Name</label>
          <input
           type="text"
           value={itemForm.ownerName}
           onChange={(event) => setItemForm((prev) => ({ ...prev, ownerName: event.target.value }))}
           placeholder="Enter owner name"
           className="w-full rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
         </div>

         <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Owner Email</label>
          <input
           type="email"
           value={itemForm.ownerEmail}
           onChange={(event) => setItemForm((prev) => ({ ...prev, ownerEmail: event.target.value }))}
           placeholder="owner@example.com"
           className="w-full rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
         </div>
        </>
       )}

       <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Recurring Schedule</label>
        <select
         value={itemForm.recurringSchedule}
         onChange={(event) => setItemForm((prev) => ({ ...prev, recurringSchedule: event.target.value }))}
         className="w-full rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
>
         <option value="NONE">None (One-time)</option>
         <option value="DAILY">Daily</option>
         <option value="WEEKLY">Weekly</option>
         <option value="MONTHLY">Monthly</option>
         <option value="YEARLY">Yearly</option>
        </select>
        {itemForm.recurringSchedule !== 'NONE' && (
         <p className="mt-1 text-xs text-gray-500">
          When marked complete, deadline will automatically advance by {itemForm.recurringSchedule.toLowerCase()} interval
         </p>
        )}
       </div>

       <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Deadline Date</label>
        <input
         type="date"
         value={itemForm.deadlineDate}
         onChange={(event) => setItemForm((prev) => ({ ...prev, deadlineDate: event.target.value }))}
         className="w-full rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
       </div>

       <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
        <select
         value={itemForm.status}
         onChange={(event) => setItemForm((prev) => ({ ...prev, status: event.target.value }))}
         className="w-full rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
>
         <option value="OPEN">Open</option>
         <option value="IN_PROGRESS">In Progress</option>
         <option value="COMPLETED">Completed</option>
        </select>
       </div>

       <div className="md:col-span-2">
        <label className="mb-1 block text-sm font-medium text-gray-700">Reminder Schedule</label>
        <div className="flex flex-wrap gap-3 rounded-md border border-gray-200 p-3">
         {reminderOptions.map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm text-gray-700">
           <input
            type="checkbox"
            checked={itemForm.reminderSchedule.includes(option.value)}
            onChange={() => toggleReminder(option.value)}
           />
           {option.label}
          </label>
         ))}
        </div>
        {itemForm.reminderSchedule.length > 0 && (
         <div className="mt-2 rounded-md bg-blue-50 border border-blue-200 px-3 py-2">
          <p className="text-sm text-blue-800">
           {itemForm.ownerId === 'none' ? (
            <span>⚠️ No owner assigned - reminder emails will not be sent</span>
           ) : itemForm.ownerId === 'quick-add' ? (
            itemForm.ownerEmail ? (
             <span>📧 Reminder emails will be sent to: <strong>{itemForm.ownerEmail}</strong></span>
            ) : (
             <span>⚠️ Please enter owner email to receive reminders</span>
            )
           ) : (
            (() => {
             const selectedOwner = owners.find(o => o.id === itemForm.ownerId)
             return selectedOwner ? (
              <span>📧 Reminder emails will be sent to: <strong>{selectedOwner.email}</strong></span>
             ) : (
              <span>⚠️ Owner not found</span>
             )
            })()
           )}
          </p>
         </div>
        )}
       </div>

       <div className="md:col-span-2">
        <div className="mb-1 flex items-center justify-between">
         <label className="block text-sm font-medium text-gray-700">Linked Files</label>
         <button onClick={addFileLink} className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50">Add Link</button>
        </div>
        <div className="space-y-2">
         {itemForm.fileLinks.length === 0 && (
          <div className="rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500">No file links added.</div>
         )}
         {itemForm.fileLinks.map((link, index) => (
          <div key={`file-link-${index}`} className="grid grid-cols-1 gap-2 md:grid-cols-12">
           <input
            type="text"
            value={link.name}
            placeholder="Display name"
            onChange={(event) => updateFileLink(index, 'name', event.target.value)}
            className="rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 md:col-span-4"
           />
           <input
            type="url"
            value={link.url}
            placeholder="https://..."
            onChange={(event) => updateFileLink(index, 'url', event.target.value)}
            className="rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 md:col-span-7"
           />
           <button
            onClick={() => removeFileLink(index)}
            className="rounded border border-red-300 px-3 py-2 text-xs text-red-700 hover:bg-red-50 md:col-span-1"
>
            Remove
           </button>
          </div>
         ))}
        </div>
       </div>

       <div className="md:col-span-2">
        <div className="mb-1 flex items-center justify-between">
         <label className="block text-sm font-medium text-gray-700">Uploaded Files</label>
         <label className="cursor-pointer rounded border border-indigo-600 bg-indigo-600 px-2 py-1 text-xs text-white hover:bg-indigo-700">
          <span>Upload Files</span>
          <input
           type="file"
           multiple
           accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
           onChange={handleFileUpload}
           className="hidden"
          />
         </label>
        </div>
        <div className="space-y-2">
         {itemForm.uploadedFiles.length === 0 && (
          <div className="rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500">
           No files uploaded. Click "Upload Files" to attach documents, images, or PDFs (max 5 files, 10MB each).
          </div>
         )}
         {itemForm.uploadedFiles.map((file, index) => (
          <div key={`uploaded-file-${index}`} className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
           <div className="flex items-center gap-2 flex-1 min-w-0">
            <svg className="w-5 h-5 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div className="flex-1 min-w-0">
             <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
             <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB • {file.type || 'Unknown type'}</p>
            </div>
           </div>
           <button
            type="button"
            onClick={() => removeUploadedFile(index)}
            className="ml-2 rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 flex-shrink-0"
           >
            Remove
           </button>
          </div>
         ))}
        </div>
        {itemForm.uploadedFiles.length > 0 && (
         <p className="mt-1 text-xs text-gray-500">
          {itemForm.uploadedFiles.length} / 5 files uploaded
         </p>
        )}
       </div>

       <div className="md:col-span-2">
        <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
        <textarea
         value={itemForm.notes}
         onChange={(event) => setItemForm((prev) => ({ ...prev, notes: event.target.value }))}
         rows={3}
         className="w-full rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
       </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
       <button
        onClick={() => {
         setShowItemModal(false)
         setEditingItemId(null)
        }}
        className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
>
        Cancel
       </button>
       <button onClick={() => void submitItem()} className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700">
        Save Item
       </button>
      </div>
     </div>
    </div>
   )}
  </DashboardLayout>
 )
}

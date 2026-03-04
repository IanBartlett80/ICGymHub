'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { confirmAndDelete, showToast } from '@/lib/toast'
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
  category: ComplianceCategory | null
  owner: { id: string; fullName: string; email: string } | null
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
  ownerId: string
  ownerName: string
  ownerEmail: string
  deadlineDate: string
  status: string
  recurringSchedule: string
  reminderSchedule: number[]
  fileLinks: ComplianceFileLink[]
}

const DEFAULT_REMINDER_SCHEDULE = [90, 30, 7, 1]

function buildDefaultItemForm(): ItemFormState {
  return {
    title: '',
    description: '',
    notes: '',
    categoryId: 'none',
    ownerId: 'none',
    ownerName: '',
    ownerEmail: '',
    deadlineDate: '',
    status: 'OPEN',
    recurringSchedule: 'NONE',
    reminderSchedule: [...DEFAULT_REMINDER_SCHEDULE],
    fileLinks: [],
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
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [ownerFilter, setOwnerFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dueWithinFilter, setDueWithinFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

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
      const response = await fetch('/api/compliance/meta')
      if (!response.ok) throw new Error('Failed to load compliance metadata')
      const data = await response.json()
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
    if (search.trim()) params.append('search', search.trim())
    if (categoryFilter !== 'all') params.append('categoryId', categoryFilter)
    if (ownerFilter !== 'all') params.append('ownerId', ownerFilter)
    if (statusFilter !== 'all') params.append('status', statusFilter)
    if (dueWithinFilter !== 'all') params.append('dueWithin', dueWithinFilter)
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    return params
  }, [search, categoryFilter, ownerFilter, statusFilter, dueWithinFilter, startDate, endDate])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const params = buildQueryParams()
      const [itemsResponse, analyticsResponse] = await Promise.all([
        fetch(`/api/compliance/items?${params.toString()}`),
        fetch(`/api/compliance/analytics?${params.toString()}`),
      ])

      if (!itemsResponse.ok) throw new Error('Failed to load compliance items')
      if (!analyticsResponse.ok) throw new Error('Failed to load compliance analytics')

      const itemsData = await itemsResponse.json()
      const analyticsData = await analyticsResponse.json()

      setItems(itemsData.items || [])
      setAnalytics(analyticsData)
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
    setCategoryFilter('all')
    setOwnerFilter('all')
    setStatusFilter('all')
    setDueWithinFilter('all')
    setStartDate('')
    setEndDate('')
  }

  const openCreateItemModal = () => {
    setEditingItemId(null)
    setItemForm(buildDefaultItemForm())
    setShowItemModal(true)
  }

  const openEditItemModal = (item: ComplianceItem) => {
    setEditingItemId(item.id)
    setItemForm({
      title: item.title,
      description: item.description || '',
      notes: item.notes || '',
      categoryId: item.categoryId || 'none',
      ownerId: item.ownerId || 'none',
      ownerName: item.ownerName || '',
      ownerEmail: item.ownerEmail || '',
      deadlineDate: item.deadlineDate.split('T')[0],
      status: item.status,
      recurringSchedule: item.recurringSchedule || 'NONE',
      reminderSchedule: item.reminderSchedule || [],
      fileLinks: item.fileLinks || [],
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
      const method = editingCategoryId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryForm),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save category')
      }

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
      const response = await fetch(`/api/compliance/categories/${category.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete category')
      }

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
      }
      // else: keep the regular ownerId as is

      const url = editingItemId ? `/api/compliance/items/${editingItemId}` : '/api/compliance/items'
      const method = editingItemId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save compliance item')
      }

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
      const response = await fetch(`/api/compliance/items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      })
      if (!response.ok) throw new Error('Failed to complete item')
      showToast.success('Compliance item marked as completed')
      await loadData()
    } catch (error) {
      console.error(error)
      showToast.error('Failed to mark compliance item as completed')
    }
  }

  const deleteItem = async (item: ComplianceItem) => {
    await confirmAndDelete(item.title, async () => {
      const response = await fetch(`/api/compliance/items/${item.id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Delete failed')
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
      <DashboardLayout hideSidebar={true}>
        <div className="flex h-64 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-600" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout hideSidebar={true}>
      <div className="space-y-6 p-6">
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

        {analytics && (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-600">Total Items</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{analytics.totals.totalItems}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="mt-2 text-3xl font-bold text-red-600">{analytics.totals.overdueItems}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-600">Due in 7 Days</p>
                <p className="mt-2 text-3xl font-bold text-orange-600">{analytics.totals.dueIn7Days}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-600">Completion Rate</p>
                <p className="mt-2 text-3xl font-bold text-green-600">{analytics.totals.completionRate}%</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-600">Items With Files</p>
                <p className="mt-2 text-3xl font-bold text-blue-600">{analytics.totals.withLinkedFiles}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-white p-5">
                <h2 className="text-lg font-semibold text-gray-900">Category Workload</h2>
                <p className="text-sm text-gray-600">Total, completed, and overdue items by category.</p>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.byCategory.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="total" fill="#3b82f6" name="Total" />
                      <Bar dataKey="completed" fill="#10b981" name="Completed" />
                      <Bar dataKey="overdue" fill="#ef4444" name="Overdue" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-5">
                <h2 className="text-lg font-semibold text-gray-900">Compliance Trend</h2>
                <p className="text-sm text-gray-600">Six-month trend of created, completed, and overdue items.</p>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.trend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="created" stroke="#3b82f6" strokeWidth={2} name="Created" />
                      <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} name="Completed" />
                      <Line type="monotone" dataKey="overdue" stroke="#ef4444" strokeWidth={2} name="Overdue" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="rounded-lg border border-gray-200 bg-white p-4 print:hidden">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-7">
            <input
              type="text"
              placeholder="Search item title, description, notes"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <select
              value={ownerFilter}
              onChange={(event) => setOwnerFilter(event.target.value)}
              className="rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="all">All Owners</option>
              <option value="none">Unassigned</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>{owner.fullName}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="OVERDUE">Overdue</option>
            </select>
            <select
              value={dueWithinFilter}
              onChange={(event) => setDueWithinFilter(event.target.value)}
              className="rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="all">All Deadlines</option>
              <option value="7">Due in 7 days</option>
              <option value="30">Due in 30 days</option>
              <option value="90">Due in 90 days</option>
              <option value="overdue">Overdue</option>
            </select>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
            <span>Showing {items.length} compliance item{items.length === 1 ? '' : 's'}</span>
            <button onClick={clearFilters} className="rounded border border-gray-300 px-3 py-1.5 hover:bg-gray-50">Clear filters</button>
          </div>
        </div>

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
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-6 text-center text-sm text-gray-500">No compliance items match the current filters.</td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="font-medium">{item.title}</div>
                        {item.description && <div className="text-xs text-gray-500">{item.description}</div>}
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
                        {item.reminderSchedule.length > 0 ? `${item.reminderSchedule.join(', ')}d` : 'None'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {item.fileLinks.length > 0 ? (
                          <div className="space-y-1">
                            {item.fileLinks.slice(0, 2).map((link) => (
                              <a
                                key={`${item.id}-${link.url}`}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-blue-600 hover:underline"
                              >
                                {link.name}
                              </a>
                            ))}
                            {item.fileLinks.length > 2 && <span className="text-xs text-gray-500">+{item.fileLinks.length - 2} more</span>}
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
                <label className="mb-1 block text-sm font-medium text-gray-700">Owner</label>
                <select
                  value={itemForm.ownerId}
                  onChange={(event) => setItemForm((prev) => ({ ...prev, ownerId: event.target.value }))}
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

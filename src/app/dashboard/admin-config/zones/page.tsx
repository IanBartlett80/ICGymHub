'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import VenueSelector from '@/components/VenueSelector'
import { showToast, confirmAndDelete } from '@/lib/toast'
import axiosInstance from '@/lib/axios'

interface Zone {
 id: string
 name: string
 description: string | null
 allowOverlap: boolean
 active: boolean
 isFirst: boolean
 venueId: string | null
 venue?: {
  id: string
  name: string
  slug: string
 } | null
}

export default function AdminZonesPage() {
 const [zones, setZones] = useState<Zone[]>([])
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState('')
 const [success, setSuccess] = useState('')
 const [showForm, setShowForm] = useState(false)
 const [editingId, setEditingId] = useState<string | null>(null)
 const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
 const [filterVenueId, setFilterVenueId] = useState<string | null>(null)
 const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active')
 const [formData, setFormData] = useState({ name: '', description: '', venueId: null as string | null, allowOverlap: false, active: true, isFirst: false })

 useEffect(() => {
  fetchZones()
 }, [])

 const fetchZones = async () => {
  try {
   const res = await axiosInstance.get('/api/zones')
   setZones(res.data.zones)
  } catch (err) {
   setError('Failed to load zones')
  } finally {
   setLoading(false)
  }
 }

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setError('')
  setSuccess('')

  try {
   if (editingId) {
    await axiosInstance.patch(`/api/zones/${editingId}`, formData)
   } else {
    await axiosInstance.post('/api/zones', formData)
   }

   await fetchZones()
   setFormData({ name: '', description: '', venueId: null, allowOverlap: false, active: true, isFirst: false })
   setEditingId(null)
   setShowForm(false)
   setSuccess(editingId ? 'Zone updated successfully' : 'Zone created successfully')
  } catch (err: any) {
   setError(err.response?.data?.error || 'Failed to save zone')
  }
 }

 const handleToggleActive = async (id: string, currentActive: boolean) => {
  try {
   await axiosInstance.patch(`/api/zones/${id}`, {
    active: !currentActive,
   })

   await fetchZones()
   setSuccess('Zone status updated')
  } catch (err: any) {
   setError(err.response?.data?.error || 'Failed to update zone')
  }
 }

 const handleEdit = (zone: Zone) => {
  setEditingId(zone.id)
  setFormData({
   name: zone.name,
   description: zone.description || '',
   venueId: zone.venueId || null,
   allowOverlap: zone.allowOverlap,
   active: zone.active,
   isFirst: zone.isFirst,
  })
  setShowForm(true)
 }

 const filteredZones = zones.filter(zone => {
  // Filter by venue
  const venueMatch = !filterVenueId || zone.venueId === filterVenueId
  
  // Filter by status
  const statusMatch = 
   statusFilter === 'all' ? true :
   statusFilter === 'active' ? zone.active :
   !zone.active // inactive
  
  return venueMatch && statusMatch
 })

 const handleDelete = async (id: string) => {
  const zone = zones.find(z => z.id === id)
  const zoneName = zone?.name || 'zone'
  
  confirmAndDelete(zoneName, async () => {
   try {
    await axiosInstance.delete(`/api/zones/${id}`)
    await fetchZones()
   } catch (err: any) {
    showToast.error(err.response?.data?.error || 'Failed to delete zone')
   }
  })
 }

 if (loading) {
  return (
   <DashboardLayout title="Gym Zones" backTo={{ label: 'Back to Club Management', href: '/dashboard/admin-config' }} showClubManagementNav={true}>
    <div className="p-8">Loading...</div>
   </DashboardLayout>
  )
 }

 return (
  <DashboardLayout title="Gym Zones" backTo={{ label: 'Back to Club Management', href: '/dashboard/admin-config' }} showClubManagementNav={true}>
   <div className="p-8">
    <div className="max-w-6xl mx-auto">
     {/* Help/Guidance Section */}
     <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <h3 className="text-lg font-semibold text-blue-900 mb-2">About Gym Zones</h3>
      <p className="text-sm text-blue-800 mb-2">
       Gym Zones define specific training areas and equipment zones within each venue. These zones are used throughout the system to organize and manage your facility:
      </p>
      <ul className="text-sm text-blue-800 mb-2 ml-4 list-disc space-y-1">
       <li><strong>Rostering:</strong> Assign classes to specific zones to manage space allocation and avoid conflicts</li>
       <li><strong>Injuries & Incidents:</strong> Record the location where incidents occurred for better tracking and safety analysis</li>
       <li><strong>Equipment Management:</strong> Associate equipment items to zones for easier inventory management and maintenance</li>
      </ul>
      <p className="text-sm text-blue-800">
       <strong>Examples:</strong> Floor Area, Vault Area, Uneven Bars Area, Parallel Bars Area, Beam Area, Pommel Horse Area, Rings Area, Tumble Track Area, Ballet Barre Area, Rec Beams Area, Foam Pit Area, Trampoline Area, Warm-up Area
      </p>
     </div>

     <div className="mb-6">
      <div className="flex justify-between items-center mb-4">
       <h2 className="text-2xl font-bold text-gray-900">Manage Gym Zones</h2>
       <button
        onClick={() => {
         setShowForm(!showForm)
         setEditingId(null)
         setFormData({ name: '', description: '', venueId: null, allowOverlap: false, active: true, isFirst: false })
        }}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
>
        {showForm ? 'Cancel' : 'Add Zone'}
       </button>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
       <div className="flex gap-4 items-end">
        <div className="flex-1 max-w-xs">
         <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Venue</label>
         <VenueSelector
          value={filterVenueId}
          onChange={setFilterVenueId}
          showAllOption={true}
         />
        </div>
        <div className="flex-1 max-w-xs">
         <label className="block text-sm font-medium text-gray-700 mb-2">Show:</label>
         <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
          className="w-full border rounded px-3 py-2 text-sm"
         >
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
          <option value="all">All Zones</option>
         </select>
        </div>
       </div>
      </div>
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
       <h2 className="text-xl font-semibold mb-4">
        {editingId ? 'Edit Zone' : 'Add New Zone'}
        {filterVenueId && zones.find(z => z.venueId === filterVenueId) && (
         <span className="text-sm font-normal text-gray-600 ml-2">
          for {zones.find(z => z.venueId === filterVenueId)?.venue?.name}
         </span>
        )}
       </h2>
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

        <div>
         <label className="block text-sm font-medium mb-1">Venue</label>
         <VenueSelector
          value={formData.venueId}
          onChange={(venueId) => setFormData({ ...formData, venueId })}
          showAllOption={false}
          showLabel={false}
         />
        </div>

        <div className="flex gap-4">
         <label className="flex items-center gap-2 group relative">
          <input
           type="checkbox"
           checked={formData.allowOverlap}
           onChange={(e) => setFormData({ ...formData, allowOverlap: e.target.checked })}
           className="rounded"
          />
          <span className="text-sm">Allow Overlap</span>
          <span className="text-gray-400 cursor-help" title="Allow multiple gymsports to be allocated to this zone at the same time">ℹ️</span>
         </label>

         <label className="flex items-center gap-2 group relative">
          <input
           type="checkbox"
           checked={formData.active}
           onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
           className="rounded"
          />
          <span className="text-sm">Active</span>
          <span className="text-gray-400 cursor-help" title="Show/hide this zone in dropdowns and active lists throughout the system">ℹ️</span>
         </label>

         <label className="flex items-center gap-2 group relative">
          <input
           type="checkbox"
           checked={formData.isFirst}
           onChange={(e) => setFormData({ ...formData, isFirst: e.target.checked })}
           className="rounded"
          />
          <span className="text-sm">Priority First Zone</span>
          <span className="text-gray-400 cursor-help" title="Mark this zone as a priority zone that should be filled/allocated first">ℹ️</span>
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
         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Venue</th>
         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Settings</th>
         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
        </tr>
       </thead>
       <tbody className="bg-white divide-y divide-gray-200">
        {filteredZones.map((zone) => (
         <tr key={zone.id} className={!zone.active ? 'bg-gray-50' : ''}>          <td className="px-6 py-4 whitespace-nowrap">
           {zone.venue ? (
            <span className={`text-sm font-medium ${!zone.active ? 'text-gray-500' : 'text-gray-900'}`}>{zone.venue.name}</span>
           ) : (
            <span className="text-sm text-gray-400 italic">No venue</span>
           )}
          </td>          <td className="px-6 py-4 whitespace-nowrap">
           <span className={`font-medium ${!zone.active ? 'text-gray-500' : ''}`}>{zone.name}</span>
          </td>
          <td className="px-6 py-4">
           <span className={!zone.active ? 'text-gray-500' : ''}>{zone.description || '-'}</span>
          </td>
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
            onClick={() => handleToggleActive(zone.id, zone.active)}
            className={`${
             zone.active
              ? 'text-yellow-600 hover:text-yellow-800'
              : 'text-green-600 hover:text-green-800'
            } mr-3`}
>
            {zone.active ? 'Deactivate' : 'Activate'}
           </button>
           <button
            onClick={() => handleEdit(zone)}
            className="text-blue-600 hover:text-blue-800 mr-3"
>
            Edit
           </button>
           <button
            onClick={() => handleDelete(zone.id)}
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
      {zones.length > 0 && filteredZones.length === 0 && (
       <div className="text-center py-8 text-gray-500">
        {statusFilter === 'inactive' && filterVenueId
         ? 'No inactive zones for the selected venue.'
         : statusFilter === 'inactive'
         ? 'No inactive zones. All zones are currently active.'
         : statusFilter === 'active' && filterVenueId
         ? 'No active zones for the selected venue.'
         : statusFilter === 'active'
         ? 'No active zones. All zones are currently inactive.'
         : filterVenueId
         ? 'No zones found for the selected venue.'
         : 'No zones found.'}
       </div>
      )}
     </div>
    </div>
   </div>
  </DashboardLayout>
 )
}

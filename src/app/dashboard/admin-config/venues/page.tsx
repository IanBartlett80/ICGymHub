'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { showToast, confirmAndDelete } from '@/lib/toast'

interface Venue {
 id: string
 name: string
 slug: string
 address: string | null
 city: string | null
 state: string | null
 postalCode: string | null
 phone: string | null
 timezone: string | null
 isDefault: boolean
 active: boolean
 _count?: {
  zones: number
  equipment: number
  rosters: number
 }
}

export default function AdminVenuesPage() {
 const [venues, setVenues] = useState<Venue[]>([])
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState('')
 const [showForm, setShowForm] = useState(false)
 const [editingId, setEditingId] = useState<string | null>(null)
 const [formData, setFormData] = useState({
  name: '',
  address: '',
  city: '',
  state: '',
  postalCode: '',
  phone: '',
  timezone: 'Australia/Sydney',
  active: true,
 })

 useEffect(() => {
  fetchVenues()
 }, [])

 const fetchVenues = async () => {
  try {
   const res = await fetch('/api/venues')
   if (res.ok) {
    const data = await res.json()
    setVenues(data.venues || [])
   } else {
    showToast.error('Failed to load venues')
   }
  } catch (err) {
   showToast.error('Failed to load venues')
  } finally {
   setLoading(false)
  }
 }

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setError('')

  try {
   const url = editingId ? `/api/venues/${editingId}` : '/api/venues'
   const method = editingId ? 'PATCH' : 'POST'

   const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
   })

   if (res.ok) {
    await fetchVenues()
    setFormData({
     name: '',
     address: '',
     city: '',
     state: '',
     postalCode: '',
     phone: '',
     timezone: 'Australia/Sydney',
     active: true,
    })
    setEditingId(null)
    setShowForm(false)
    showToast.success(editingId ? 'Venue updated successfully' : 'Venue created successfully')
   } else {
    const data = await res.json()
    showToast.error(data.error || 'Failed to save venue')
   }
  } catch (err) {
   showToast.error('Failed to save venue')
  }
 }

 const handleEdit = (venue: Venue) => {
  setEditingId(venue.id)
  setFormData({
   name: venue.name,
   address: venue.address || '',
   city: venue.city || '',
   state: venue.state || '',
   postalCode: venue.postalCode || '',
   phone: venue.phone || '',
   timezone: venue.timezone || 'Australia/Sydney',
   active: venue.active,
  })
  setShowForm(true)
 }

 const handleDelete = async (id: string) => {
  const venue = venues.find((v) => v.id === id)
  const venueName = venue?.name || 'venue'

  confirmAndDelete(venueName, async () => {
   try {
    const res = await fetch(`/api/venues/${id}`, { method: 'DELETE' })
    if (res.ok) {
     await fetchVenues()
     showToast.success('Venue deleted successfully')
    } else {
     const data = await res.json()
     showToast.error(data.error || 'Failed to delete venue')
    }
   } catch (err) {
    showToast.error('Failed to delete venue')
   }
  })
 }

 const handleSetDefault = async (id: string) => {
  try {
   const res = await fetch(`/api/venues/${id}/set-default`, {
    method: 'PATCH',
   })

   if (res.ok) {
    await fetchVenues()
    showToast.success('Default venue updated')
   } else {
    const data = await res.json()
    showToast.error(data.error || 'Failed to set default venue')
   }
  } catch (err) {
   showToast.error('Failed to set default venue')
  }
 }

 const handleCancel = () => {
  setShowForm(false)
  setEditingId(null)
  setFormData({
   name: '',
   address: '',
   city: '',
   state: '',
   postalCode: '',
   phone: '',
   timezone: 'Australia/Sydney',
   active: true,
  })
  setError('')
 }

 if (loading) {
  return (
   <DashboardLayout>
    <div className="p-6">
     <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
      <div className="space-y-3">
       <div className="h-16 bg-gray-200 rounded"></div>
       <div className="h-16 bg-gray-200 rounded"></div>
      </div>
     </div>
    </div>
   </DashboardLayout>
  )
 }

 return (
  <DashboardLayout>
   <div className="p-6">
    <div className="flex justify-between items-center mb-6">
     <div>
      <h1 className="text-2xl font-bold text-gray-900">Venue Management</h1>
      <p className="text-sm text-gray-600 mt-1">Manage physical locations for your club</p>
     </div>
     <button
      onClick={() => setShowForm(!showForm)}
      className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
>
      {showForm ? 'Cancel' : 'Add Venue'}
     </button>
    </div>

    {error && (
     <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
      {error}
     </div>
    )}

    {showForm && (
     <div className="mb-6 p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      <h2 className="text-lg font-semibold mb-4">{editingId ? 'Edit Venue' : 'Add New Venue'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
         <label className="block text-sm font-medium text-gray-700 mb-1">
          Venue Name *
         </label>
         <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="Main Gymnasium"
         />
        </div>

        <div>
         <label className="block text-sm font-medium text-gray-700 mb-1">
          Phone
         </label>
         <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="+61 2 1234 5678"
         />
        </div>

        <div className="md:col-span-2">
         <label className="block text-sm font-medium text-gray-700 mb-1">
          Street Address
         </label>
         <input
          type="text"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="123 Main Street"
         />
        </div>

        <div>
         <label className="block text-sm font-medium text-gray-700 mb-1">
          City
         </label>
         <input
          type="text"
          value={formData.city}
          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="Sydney"
         />
        </div>

        <div>
         <label className="block text-sm font-medium text-gray-700 mb-1">
          State/Province
         </label>
         <input
          type="text"
          value={formData.state}
          onChange={(e) => setFormData({ ...formData, state: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="NSW"
         />
        </div>

        <div>
         <label className="block text-sm font-medium text-gray-700 mb-1">
          Postal Code
         </label>
         <input
          type="text"
          value={formData.postalCode}
          onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="2000"
         />
        </div>

        <div>
         <label className="block text-sm font-medium text-gray-700 mb-1">
          Timezone
         </label>
         <select
          value={formData.timezone}
          onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
>
          <option value="Australia/Sydney">Australia/Sydney</option>
          <option value="Australia/Melbourne">Australia/Melbourne</option>
          <option value="Australia/Brisbane">Australia/Brisbane</option>
          <option value="Australia/Perth">Australia/Perth</option>
          <option value="Australia/Adelaide">Australia/Adelaide</option>
         </select>
        </div>

        <div className="flex items-center">
         <label className="flex items-center cursor-pointer">
          <input
           type="checkbox"
           checked={formData.active}
           onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
           className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 mr-2"
          />
          <span className="text-sm font-medium text-gray-700">Active</span>
         </label>
        </div>
       </div>

       <div className="flex gap-3 pt-2">
        <button
         type="submit"
         className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
>
         {editingId ? 'Update Venue' : 'Create Venue'}
        </button>
        <button
         type="button"
         onClick={handleCancel}
         className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
>
         Cancel
        </button>
       </div>
      </form>
     </div>
    )}

    <div className="bg-white rounded-lg shadow overflow-hidden">
     <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
       <tr>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
         Venue
        </th>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
         Location
        </th>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
         Phone
        </th>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
         Usage
        </th>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
         Status
        </th>
        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
         Actions
        </th>
       </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
       {venues.length === 0 ? (
        <tr>
         <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
          No venues found. Click &quot;Add Venue&quot; to create your first venue.
         </td>
        </tr>
       ) : (
        venues.map((venue) => (
         <tr key={venue.id} className="hover:bg-gray-50">
          <td className="px-6 py-4 whitespace-nowrap">
           <div className="flex items-center">
            <div>
             <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
              {venue.name}
              {venue.isDefault && (
               <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                Default
               </span>
              )}
             </div>
             <div className="text-sm text-gray-500">{venue.slug}</div>
            </div>
           </div>
          </td>
          <td className="px-6 py-4">
           <div className="text-sm text-gray-900">
            {venue.address && <div>{venue.address}</div>}
            {(venue.city || venue.state || venue.postalCode) && (
             <div className="text-gray-500">
              {[venue.city, venue.state, venue.postalCode].filter(Boolean).join(', ')}
             </div>
            )}
            {!venue.address && !venue.city && (
             <span className="text-gray-400">No address</span>
            )}
           </div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
           {venue.phone || '-'}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
           <div className="flex gap-3 text-xs">
            <span title="Zones">{venue._count?.zones || 0} zones</span>
            <span title="Equipment">{venue._count?.equipment || 0} equip</span>
            <span title="Rosters">{venue._count?.rosters || 0} rosters</span>
           </div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
           <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
             venue.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}
>
            {venue.active ? 'Active' : 'Inactive'}
           </span>
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
           <div className="flex justify-end gap-2">
            {!venue.isDefault && (
             <button
              onClick={() => handleSetDefault(venue.id)}
              className="text-blue-600 hover:text-blue-900"
              title="Set as default venue"
>
              Set Default
             </button>
            )}
            <button
             onClick={() => handleEdit(venue)}
             className="text-orange-600 hover:text-orange-900"
>
             Edit
            </button>
            {!venue.isDefault && (
             <button
              onClick={() => handleDelete(venue.id)}
              className="text-red-600 hover:text-red-900"
>
              Delete
             </button>
            )}
           </div>
          </td>
         </tr>
        ))
       )}
      </tbody>
     </table>
    </div>
   </div>
  </DashboardLayout>
 )
}

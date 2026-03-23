'use client'

import { useState, useEffect } from 'react'
import { MapPin, Info, Check, Plus } from 'lucide-react'
import axiosInstance from '@/lib/axios'
import VenueSelector from '@/components/VenueSelector'
import type { WizardData } from '../ConfigWizard'

interface Step3ZonesProps {
  onComplete: (data: Partial<WizardData>) => void
}

interface Zone {
  id: string
  name: string
  venueId: string | null
  venue?: { name: string }
}

export default function Step3Zones({ onComplete }: Step3ZonesProps) {
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    venueId: null as string | null,
    allowOverlap: false,
    active: true,
  })
  const [error, setError] = useState('')

  useEffect(() => {
    fetchZones()
  }, [])

  const fetchZones = async () => {
    try {
      const res = await axiosInstance.get('/api/zones')
      setZones(res.data.zones || [])
      if (res.data.zones && res.data.zones.length > 0) {
        onComplete({ zonesCount: res.data.zones.length })
      }
    } catch (err) {
      console.error('Failed to fetch zones', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setCreating(true)

    try {
      await axiosInstance.post('/api/zones', formData)
      await fetchZones()
      setFormData({
        name: '',
        description: '',
        venueId: null,
        allowOverlap: false,
        active: true,
      })
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create zone')
    } finally {
      setCreating(false)
    }
  }

  const commonZones = [
    { name: 'Floor Area', desc: 'Tumbling and floor routines' },
    { name: 'Vault', desc: 'Vaulting apparatus area' },
    { name: 'Uneven Bars', desc: 'Bars training zone' },
    { name: 'Balance Beam', desc: 'Beam practice area' },
    { name: 'Trampoline Area', desc: 'Trampolines and pit' },
    { name: 'Foam Pit', desc: 'Soft landing area' },
  ]

  const [quickAdding, setQuickAdding] = useState<string | null>(null)

  const handleQuickAdd = async (zoneName: string) => {
    setQuickAdding(zoneName)
    setError('')
    try {
      await axiosInstance.post('/api/zones', {
        name: zoneName,
        active: true,
        allowOverlap: false,
      })
      await fetchZones()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create zone')
    } finally {
      setQuickAdding(null)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header with explanation */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">About Gym Zones</h3>
            <p className="text-sm text-blue-800 mb-2">
              Zones define specific training areas and equipment zones within each venue. These zones are used throughout the system:
            </p>
            <ul className="text-sm text-blue-800 mb-2 ml-4 list-disc space-y-1">
              <li><strong>Rostering:</strong> Assign classes to zones for space management</li>
              <li><strong>Injuries & Incidents:</strong> Track incident locations</li>
              <li><strong>Equipment Management:</strong> Associate equipment items to zones</li>
            </ul>
            <p className="text-sm text-blue-800">
              Create zones that match your facility's layout (e.g., Floor Area, Vault Area, Beam Area, Warm-up Area).
            </p>
          </div>
        </div>
      </div>

      {/* Existing zones */}
      {zones.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Check className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-green-900">
              Configured Zones ({zones.length})
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {zones.map((zone) => (
              <div key={zone.id} className="flex items-center gap-2 bg-white rounded px-3 py-2 border border-green-200">
                <MapPin className="w-4 h-4 text-green-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-gray-900 block truncate">{zone.name}</span>
                  {zone.venue && (
                    <span className="text-xs text-gray-500">{zone.venue.name}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help text - shown above form when no zones exist */}
      {zones.length === 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <strong>Create at least one zone</strong> to organize your training areas. You can always add more zones later as your needs grow.
            </div>
          </div>
        </div>
      )}

      {/* Quick add buttons */}
      {zones.length === 0 && (
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Quick Add Common Zones</h3>
          <p className="text-sm text-gray-500 mb-3">Click a zone below to instantly create it, or use the form to create a custom zone.</p>
          <div className="grid grid-cols-2 gap-2">
            {commonZones.map((zone) => (
              <button
                key={zone.name}
                onClick={() => handleQuickAdd(zone.name)}
                disabled={quickAdding === zone.name}
                className={`text-left border rounded-lg px-3 py-2 transition-all text-sm ${
                  quickAdding === zone.name
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                <div className="font-medium text-gray-900">{quickAdding === zone.name ? '✓ Created!' : zone.name}</div>
                <div className="text-xs text-gray-500">{zone.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Create zone form */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          {zones.length > 0 ? 'Add Another Zone (Optional)' : 'Create Your First Zone'}
        </h3>

        <form onSubmit={handleCreate} className="space-y-4">
          {/* Zone Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center">
              Zone Name *
              <span 
                className="ml-2 text-gray-400 cursor-help" 
                title="Name of the training area or equipment zone"
              >
                <Info className="w-4 h-4" />
              </span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Floor, Vault, Uneven Bars, Beam"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              💡 <strong>Examples:</strong> Floor Area, Vault, Uneven Bars, Balance Beam, Trampoline Area, Foam Pit
            </p>
          </div>

          {/* Venue Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Assign to Venue
            </label>
            <VenueSelector
              value={formData.venueId}
              onChange={(venueId) => setFormData({ ...formData, venueId })}
              showAllOption={false}
              showLabel={false}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description (Optional)
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this zone..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Allow Overlap */}
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="allowOverlap"
              checked={formData.allowOverlap}
              onChange={(e) => setFormData({ ...formData, allowOverlap: e.target.checked })}
              className="mt-1 rounded"
            />
            <label htmlFor="allowOverlap" className="text-sm text-gray-700 cursor-pointer">
              <span className="font-medium">Allow Overlap</span>
              <span className="block text-gray-500">Allow multiple gymsports to be allocated to this zone at the same time</span>
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={creating || !formData.name}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg"
          >
            {creating ? 'Creating...' : zones.length > 0 ? 'Add Another Zone' : 'Create Zone'}
          </button>
        </form>
      </div>

    </div>
  )
}

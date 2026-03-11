'use client'

import { useState, useEffect } from 'react'
import { Building2, Info, Plus, Check } from 'lucide-react'
import axiosInstance from '@/lib/axios'
import type { WizardData } from '../ConfigWizard'

interface Step1VenuesProps {
  onComplete: (data: Partial<WizardData>) => void
}

interface Venue {
  id: string
  name: string
  slug: string
}

export default function Step1Venues({ onComplete }: Step1VenuesProps) {
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({ name: '', slug: '' })
  const [error, setError] = useState('')

  useEffect(() => {
    fetchVenues()
  }, [])

  const fetchVenues = async () => {
    try {
      const res = await axiosInstance.get('/api/venues')
      setVenues(res.data.venues || [])
      if (res.data.venues && res.data.venues.length > 0) {
        onComplete({ venuesCount: res.data.venues.length })
      }
    } catch (err) {
      console.error('Failed to fetch venues', err)
    } finally {
      setLoading(false)
    }
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const handleNameChange = (name: string) => {
    setFormData({
      name,
      slug: generateSlug(name),
    })
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setCreating(true)

    try {
      await axiosInstance.post('/api/venues', formData)
      await fetchVenues()
      setFormData({ name: '', slug: '' })
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create venue')
    } finally {
      setCreating(false)
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
            <h3 className="font-semibold text-blue-900 mb-1">About Venues</h3>
            <p className="text-sm text-blue-800">
              Venues represent your physical locations. Most clubs have one main venue, but you can add multiple if you operate in different locations. Venues are used to organize zones, equipment, and classes.
            </p>
          </div>
        </div>
      </div>

      {/* Existing venues */}
      {venues.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Check className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-green-900">
              Configured Venues ({venues.length})
            </h3>
          </div>
          <div className="space-y-2">
            {venues.map((venue) => (
              <div key={venue.id} className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-green-600" />
                <span className="font-medium text-green-900">{venue.name}</span>
                <span className="text-green-600">({venue.slug})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create venue form */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          {venues.length > 0 ? 'Add Another Venue (Optional)' : 'Create Your First Venue'}
        </h3>

        <form onSubmit={handleCreate} className="space-y-4">
          {/* Venue Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Venue Name *
              <span 
                className="ml-2 text-gray-400 cursor-help" 
                title="The name of your gymnastics facility or location"
              >
                ℹ️
              </span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Main Gymnasium, North Campus, Downtown Location"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              💡 <strong>Examples:</strong> "Springfield Gymnastics Center", "Main Training Facility", "City North Location"
            </p>
          </div>

          {/* Slug (auto-generated) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              URL Slug (auto-generated)
              <span 
                className="ml-2 text-gray-400 cursor-help" 
                title="A URL-friendly identifier used in web addresses"
              >
                ℹ️
              </span>
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="auto-generated-from-name"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              This is automatically generated from your venue name. You can edit it if needed.
            </p>
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
            {creating ? 'Creating...' : venues.length > 0 ? 'Add Another Venue' : 'Create Venue'}
          </button>
        </form>
      </div>

      {/* Help text */}
      {venues.length === 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <strong>First-time setup?</strong> You need at least one venue to continue. Most clubs start with a single main venue and can add more later if needed.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

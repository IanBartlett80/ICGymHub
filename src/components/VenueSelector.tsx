'use client'

import { useEffect, useState } from 'react'

interface Venue {
  id: string
  name: string
  slug: string
  isDefault: boolean
  active: boolean
}

interface VenueSelectorProps {
  value: string | null // null means "All Venues"
  onChange: (venueId: string | null) => void
  className?: string
  showAllOption?: boolean
}

export default function VenueSelector({
  value,
  onChange,
  className = '',
  showAllOption = true,
}: VenueSelectorProps) {
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchVenues() {
      try {
        const res = await fetch('/api/venues')
        if (!res.ok) {
          throw new Error('Failed to fetch venues')
        }
        const data = await res.json()
        setVenues(data.venues || [])
        
        // If no value is set and there's a default venue, select it
        if (value === undefined && data.venues?.length > 0) {
          const defaultVenue = data.venues.find((v: Venue) => v.isDefault)
          if (defaultVenue) {
            onChange(defaultVenue.id)
          }
        }
      } catch (err) {
        console.error('Failed to fetch venues:', err)
        setError('Failed to load venues')
      } finally {
        setLoading(false)
      }
    }

    fetchVenues()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`text-red-600 text-sm ${className}`}>
        {error}
      </div>
    )
  }

  // If only one venue and no "All" option needed, don't show selector
  if (venues.length === 1 && !showAllOption) {
    return null
  }

  return (
    <div className={className}>
      <label htmlFor="venue-selector" className="block text-sm font-medium text-gray-700 mb-1">
        Venue
      </label>
      <select
        id="venue-selector"
        value={value || 'all'}
        onChange={(e) => onChange(e.target.value === 'all' ? null : e.target.value)}
        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
      >
        {showAllOption && <option value="all">All Venues</option>}
        {venues.map((venue) => (
          <option key={venue.id} value={venue.id}>
            {venue.name} {venue.isDefault ? '(Default)' : ''}
          </option>
        ))}
      </select>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import axiosInstance from '@/lib/axios'

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
  showLabel?: boolean // Whether to show the "Venue" label
}

export default function VenueSelector({
  value,
  onChange,
  className = '',
  showAllOption = true,
  showLabel = true,
}: VenueSelectorProps) {
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchVenues() {
      try {
        const res = await axiosInstance.get('/api/venues')
        const data = res.data
        setVenues(data.venues || [])
        
        // If no value is set and there's a default venue, select it
        // Also auto-select if showAllOption is false (venue is required)
        if ((value === undefined || value === null) && data.venues?.length > 0) {
          if (!showAllOption && data.venues.length > 0) {
            // When venue is required, auto-select default or first venue
            const defaultVenue = data.venues.find((v: Venue) => v.isDefault)
            onChange(defaultVenue ? defaultVenue.id : data.venues[0].id)
          } else if (value === undefined) {
            // When "All Venues" option exists, only auto-select on undefined (not null)
            const defaultVenue = data.venues.find((v: Venue) => v.isDefault)
            if (defaultVenue) {
              onChange(defaultVenue.id)
            }
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
      {showLabel && (
        <label htmlFor="venue-selector" className="block text-sm font-medium text-gray-700 mb-1">
          Venue
        </label>
      )}
      <select
        id="venue-selector"
        value={value || (showAllOption ? 'all' : '')}
        onChange={(e) => {
          const val = e.target.value
          onChange(val  === 'all' || val === '' ? null : val)
        }}
        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
        required={!showAllOption}
      >
        {showAllOption && <option value="all">All Venues</option>}
        {!showAllOption && <option value="">-- Select Venue --</option>}
        {venues.map((venue) => (
          <option key={venue.id} value={venue.id}>
            {venue.name} {venue.isDefault ? '(Default)' : ''}
          </option>
        ))}
      </select>
    </div>
  )
}

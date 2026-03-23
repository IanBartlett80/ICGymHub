'use client'

import { useState, useEffect } from 'react'
import { Users, Info, Check, Plus, SkipForward } from 'lucide-react'
import axiosInstance from '@/lib/axios'
import type { WizardData } from '../ConfigWizard'

interface Step4CoachesProps {
  onComplete: (data: Partial<WizardData>) => void
}

interface Coach {
  id: string
  name: string
  email?: string
  active: boolean
}

interface Gymsport {
  id: string
  name: string
  active: boolean
}

export default function Step4Coaches({ onComplete }: Step4CoachesProps) {
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [gymsports, setGymsports] = useState<Gymsport[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    gymsportIds: [] as string[],
  })
  const [error, setError] = useState('')
  const [canSkip, setCanSkip] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [coachesRes, gymsportsRes] = await Promise.all([
        axiosInstance.get('/api/coaches'),
        axiosInstance.get('/api/gymsports'),
      ])
      
      setCoaches(coachesRes.data.coaches || [])
      const activeGymsports = gymsportsRes.data.gymsports?.filter((g: Gymsport) => g.active) || []
      setGymsports(activeGymsports)
      
      const activeCoaches = coachesRes.data.coaches?.filter((c: Coach) => c.active).length || 0
      if (activeCoaches > 0) {
        onComplete({ coachesCount: activeCoaches })
      } else {
        // Allow skip if no coaches added yet
        onComplete({ coachesCount: 0 })
        setCanSkip(true)
      }
    } catch (err) {
      console.error('Failed to fetch data', err)
      setCanSkip(true) // Allow skip on error
      onComplete({ coachesCount: 0 })
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setCreating(true)

    try {
      await axiosInstance.post('/api/coaches', {
        ...formData,
        active: true,
      })
      await fetchData()
      setFormData({
        name: '',
        email: '',
        phone: '',
        gymsportIds: [],
      })
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create coach')
    } finally {
      setCreating(false)
    }
  }

  const toggleGymsport = (gymsportId: string) => {
    setFormData({
      ...formData,
      gymsportIds: formData.gymsportIds.includes(gymsportId)
        ? formData.gymsportIds.filter(id => id !== gymsportId)
        : [...formData.gymsportIds, gymsportId]
    })
  }

  const activeCoaches = coaches.filter(c => c.active)

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
            <h3 className="font-semibold text-blue-900 mb-1">About Coaches</h3>
            <p className="text-sm text-blue-800 mb-2">
              Add your coaching staff to enable roster creation and class scheduling. You'll be able to assign coaches to specific classes and track their availability.
            </p>
            <p className="text-sm text-blue-800">
              <strong>This step is optional</strong> - you can skip it and add coaches later if you prefer.
            </p>
          </div>
        </div>
      </div>

      {/* Existing coaches */}
      {activeCoaches.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Check className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-green-900">
              Added Coaches ({activeCoaches.length})
            </h3>
          </div>
          <div className="space-y-2">
            {activeCoaches.map((coach) => (
              <div key={coach.id} className="flex items-center gap-2 bg-white rounded px-3 py-2 border border-green-200">
                <Users className="w-4 h-4 text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gray-900 block">{coach.name}</span>
                  {coach.email && (
                    <span className="text-xs text-gray-500">{coach.email}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create coach form */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          {activeCoaches.length > 0 ? 'Add Another Coach (Optional)' : 'Add Your First Coach'}
        </h3>

        <form onSubmit={handleCreate} className="space-y-4">
          {/* Coach Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center">
              Coach Name *
              <span 
                className="ml-2 text-gray-400 cursor-help" 
                title="Full name of the coach"
              >
                <Info className="w-4 h-4" />
              </span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Sarah Johnson"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email (Optional)
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="coach@example.com"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Phone (Optional)
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(555) 123-4567"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Gymsports */}
          {gymsports.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Disciplines They Coach (Optional)
              </label>
              <div className="flex flex-wrap gap-2">
                {gymsports.map((sport) => (
                  <button
                    key={sport.id}
                    type="button"
                    onClick={() => toggleGymsport(sport.id)}
                    className={`
                      px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                      ${formData.gymsportIds.includes(sport.id)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    {sport.name}
                  </button>
                ))}
              </div>
            </div>
          )}

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
            {creating ? 'Adding...' : activeCoaches.length > 0 ? 'Add Another Coach' : 'Add Coach'}
          </button>
        </form>
      </div>

      {/* Skip notice */}
      {activeCoaches.length === 0 && canSkip && (
        <div className="bg-purple-50 border-l-4 border-purple-400 p-4 rounded-r-lg">
          <div className="flex items-start gap-3">
            <SkipForward className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-purple-800">
              <strong>Want to add coaches later?</strong> No problem! You can skip this step and add coaches anytime from Club Management. Click "Finish Setup" or "Skip for now" to complete the wizard.
            </div>
          </div>
        </div>
      )}

      {/* info about what you can do with coaches */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2 text-sm">What you can do with coaches:</h4>
        <ul className="text-sm text-gray-700 space-y-1">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>Assign coaches to specific classes in your rosters</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>Track coach availability and prevent double-booking</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>Filter classes by coach and see their schedule</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>Manage coach accreditations and qualifications</span>
          </li>
        </ul>
      </div>
    </div>
  )
}

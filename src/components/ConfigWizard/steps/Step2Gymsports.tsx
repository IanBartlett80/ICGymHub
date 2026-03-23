'use client'

import { useState, useEffect } from 'react'
import { Activity, Info, Check, Plus } from 'lucide-react'
import axiosInstance from '@/lib/axios'
import type { WizardData } from '../ConfigWizard'

interface Step2GymsportsProps {
  onComplete: (data: Partial<WizardData>) => void
}

interface Gymsport {
  id: string
  name: string
  isPredefined: boolean
  active: boolean
}

export default function Step2Gymsports({ onComplete }: Step2GymsportsProps) {
  const [gymsports, setGymsports] = useState<Gymsport[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newSportName, setNewSportName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchGymsports()
  }, [])

  const fetchGymsports = async () => {
    try {
      const res = await axiosInstance.get('/api/gymsports')
      setGymsports(res.data.gymsports || [])
      const activeCount = res.data.gymsports?.filter((g: Gymsport) => g.active).length || 0
      if (activeCount > 0) {
        onComplete({ gymsportsCount: activeCount })
      }
    } catch (err) {
      console.error('Failed to fetch gymsports', err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (id: string, currentActive: boolean) => {
    try {
      await axiosInstance.patch(`/api/gymsports/${id}`, { active: !currentActive })
      await fetchGymsports()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update gymsport')
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setCreating(true)

    try {
      await axiosInstance.post('/api/gymsports', { name: newSportName, active: true })
      await fetchGymsports()
      setNewSportName('')
      setShowAddForm(false)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create gymsport')
    } finally {
      setCreating(false)
    }
  }

  const activeGymsports = gymsports.filter(g => g.active)
  const inactiveGymsports = gymsports.filter(g => !g.active)

  const sportDescriptions: Record<string, string> = {
    'MAG': 'Men\'s Artistic Gymnastics - apparatus-based competitive program',
    'WAG': 'Women\'s Artistic Gymnastics - apparatus-based competitive program',
    'REC': 'Recreational Gymnastics - fun and fitness focused',
    'ACRO': 'Acrobatics - partner and group acrobatic skills',
    'T&D': 'Tumbling & Double Mini - trampoline-based disciplines',
    'TUM': 'Tumbling - floor tumbling skills',
    'RG': 'Rhythmic Gymnastics - dance and apparatus manipulation',
    'TRP': 'Trampoline - competitive jumping',
    'NINJA': 'Ninja Warrior - obstacle course training',
    'Parkour': 'Parkour - urban movement and obstacle navigation',
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
            <h3 className="font-semibold text-blue-900 mb-1">About Gym Sports</h3>
            <p className="text-sm text-blue-800 mb-2">
              Gymsports define which gymnastics disciplines your club offers. These are used throughout the system for coach accreditations, class categorization, and zone allocation.
            </p>
            <p className="text-sm text-blue-800">
              <strong>Activate the sports you offer</strong> - you can always change these later.
            </p>
          </div>
        </div>
      </div>

      {/* Active gymsports */}
      {activeGymsports.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Check className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-green-900">
              Activated Gym Sports ({activeGymsports.length})
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {activeGymsports.map((sport) => (
              <div key={sport.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-green-200">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-gray-900">{sport.name}</span>
                </div>
                <button
                  onClick={() => handleToggle(sport.id, sport.active)}
                  className="text-xs text-yellow-600 hover:text-yellow-700 font-medium"
                >
                  Deactivate
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available gymsports to activate */}
      {inactiveGymsports.length > 0 && (
        <div className="border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            Available Gym Sports (Click to Activate)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {inactiveGymsports.map((sport) => (
              <button
                key={sport.id}
                onClick={() => handleToggle(sport.id, sport.active)}
                className="text-left border-2 border-gray-200 hover:border-blue-400 rounded-lg px-4 py-3 transition-all hover:shadow-md group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 group-hover:text-blue-600 mb-1">
                      {sport.name}
                    </div>
                    {sportDescriptions[sport.name] && (
                      <div className="text-xs text-gray-500">
                        {sportDescriptions[sport.name]}
                      </div>
                    )}
                  </div>
                  <div className="ml-2 text-2xl opacity-0 group-hover:opacity-100 transition-opacity">
                    →
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Help text - shown before custom form when none active */}
      {activeGymsports.length === 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <strong>Activate at least one gym sport</strong> to continue. Click on any sport above to activate it for your club.
            </div>
          </div>
        </div>
      )}

      {/* Add custom gymsport */}
      <div className="border border-gray-200 rounded-lg p-6">
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 font-medium py-2"
          >
            <Plus className="w-5 h-5" />
            Add Custom Gym Sport
          </button>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Custom Gym Sport Name
              </label>
              <input
                type="text"
                value={newSportName}
                onChange={(e) => setNewSportName(e.target.value)}
                placeholder="e.g., Freestyle, XCEL, Ninja Warrior"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                autoFocus
              />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg"
              >
                {creating ? 'Adding...' : 'Add Sport'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false)
                  setNewSportName('')
                  setError('')
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

    </div>
  )
}

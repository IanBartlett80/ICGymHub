'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'

interface UserData {
  id: string
  clubId: string
}

interface Roster {
  id: string
  name: string
  startDate: string
  endDate: string
}

export default function ClassRosteringPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [rosters, setRosters] = useState<Roster[]>([])
  const [loading, setLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)
  const [hasConfiguration, setHasConfiguration] = useState(false)

  useEffect(() => {
    const userData = localStorage.getItem('userData')
    if (userData) {
      const parsed = JSON.parse(userData)
      setUser(parsed)
      checkConfiguration(parsed.clubId)
      fetchRosters(parsed.clubId)
    } else {
      router.push('/sign-in')
    }
  }, [router])

  const checkConfiguration = async (_clubId: string) => {
    try {
      // Check if zones, coaches, and classes exist
      const [zonesRes, coachesRes, classesRes] = await Promise.all([
        fetch('/api/zones'),
        fetch('/api/coaches'),
        fetch('/api/classes')
      ])

      const zones = await zonesRes.json()
      const coaches = await coachesRes.json()
      const classes = await classesRes.json()

      setHasConfiguration(
        zones.length > 0 && coaches.length > 0 && classes.length > 0
      )
      setLoading(false)
    } catch (error) {
      console.error('Error checking configuration:', error)
      setLoading(false)
    }
  }

  const fetchRosters = async (_clubId: string) => {
    try {
      const response = await fetch('/api/rosters')
      if (response.ok) {
        const data = await response.json()
        setRosters(data)
      }
    } catch (error) {
      console.error('Error fetching rosters:', error)
    }
  }

  const configSteps = [
    {
      title: 'Gym Zones',
      description: 'Define your gym zones and training areas',
      icon: '🏛️',
      href: '/dashboard/roster-config/zones',
      status: 'pending' as const,
    },
    {
      title: 'Gymsports',
      description: 'Configure gymsports offered at your club',
      icon: '🤸',
      href: '/dashboard/roster-config/gymsports',
      status: 'pending' as const,
    },
    {
      title: 'Coaches',
      description: 'Add coaches with their gymsports and availability',
      icon: '👨‍🏫',
      href: '/dashboard/roster-config/coaches',
      status: 'pending' as const,
    },
    {
      title: 'Class Templates',
      description: 'Create class templates with gymsports and levels',
      icon: '📚',
      href: '/dashboard/roster-config/classes',
      status: 'pending' as const,
    },
  ]

  if (loading) {
    return (
      <DashboardLayout title="Class Rostering">
        <div className="p-6">
          <div className="text-gray-600">Loading...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Class Rostering" backTo={{ label: 'Back to Home', href: '/dashboard' }}>
      <div className="p-6">
        {/* Configuration Wizard Modal */}
        {showWizard && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Let's Get Started!</h2>
              <p className="text-gray-600 mb-6">
                Follow these steps to configure your Class Rostering system:
              </p>

              <div className="space-y-4 mb-8">
                {configSteps.map((step, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg">
                    <div className="text-3xl">{step.icon}</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{step.title}</h3>
                      <p className="text-sm text-gray-600">{step.description}</p>
                    </div>
                    <div className="w-8 h-8 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowWizard(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Close
                </button>
                <Link
                  href={configSteps[0].href}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-center"
                >
                  Start Configuration
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Empty State or Calendar View */}
        {!hasConfiguration ? (
          <div className="max-w-3xl mx-auto text-center py-12">
            <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-12">
              <div className="text-6xl mb-4">📅</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Class Rostering!</h2>
              <p className="text-gray-600 mb-8">
                Before you can generate rosters, you need to configure your zones, coaches, and class templates.
              </p>
              <button
                onClick={() => setShowWizard(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                Start Configuration Wizard
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Class Roster Calendar</h2>
                <p className="text-gray-600">View and manage your class rosters</p>
              </div>
              <Link
                href="/dashboard/rosters/create"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Generate New Roster
              </Link>
            </div>

            {/* Calendar View */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
              {rosters.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">📅</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Rosters Yet</h3>
                  <p className="text-gray-600 mb-4">Create your first roster to get started</p>
                  <Link
                    href="/dashboard/rosters/create"
                    className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Generate Roster
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {rosters.map((roster) => (
                    <Link
                      key={roster.id}
                      href={`/dashboard/rosters/${roster.id}`}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow transition"
                    >
                      <h3 className="font-semibold text-gray-900 mb-2">{roster.name}</h3>
                      <p className="text-sm text-gray-600">
                        {new Date(roster.startDate).toLocaleDateString()} -{' '}
                        {new Date(roster.endDate).toLocaleDateString()}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Configuration Cards */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {configSteps.map((step, index) => (
              <Link
                key={index}
                href={step.href}
                className="bg-white border border-gray-200 rounded-xl p-6 hover:border-blue-500 hover:shadow-lg transition"
              >
                <div className="text-4xl mb-4">{step.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-600 mb-4">{step.description}</p>
                <div className="text-blue-600 text-sm font-medium">Configure →</div>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">View All Rosters</h3>
            <p className="text-sm text-gray-600 mb-4">
              Access all your generated rosters, past and present
            </p>
            <Link
              href="/dashboard/rosters"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
            >
              View Rosters
            </Link>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Getting Started Guide</h3>
            <p className="text-sm text-gray-600 mb-4">
              Learn how to set up and manage your class rostering system
            </p>
            <button
              onClick={() => setShowWizard(true)}
              className="inline-block px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
            >
              View Guide
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

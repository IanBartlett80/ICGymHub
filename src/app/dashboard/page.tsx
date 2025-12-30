'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import axios from 'axios'

interface UserData {
  id: string
  username: string
  email: string
  fullName: string
  role: string
  clubId: string
  clubName: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get user data from session/token
    const userData = localStorage.getItem('userData')
    if (userData) {
      setUser(JSON.parse(userData))
    } else {
      router.push('/sign-in')
    }
    setLoading(false)
  }, [router])

  const handleLogout = async () => {
    try {
      localStorage.removeItem('userData')
      router.push('/sign-in')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  const services = [
    {
      id: 'roster',
      title: 'Class Rostering',
      description: 'Manage class schedules, instructors, and student enrollment',
      icon: '📅',
      color: 'from-blue-500 to-blue-600',
      stats: { current: 0, total: 0 },
      cta: 'Manage Classes',
    },
    {
      id: 'incident',
      title: 'Injury / Incident Management',
      description: 'Track incidents, create reports, and maintain compliance records',
      icon: '🏥',
      color: 'from-red-500 to-red-600',
      stats: { current: 0, total: 0 },
      cta: 'View Reports',
    },
    {
      id: 'equipment',
      title: 'Equipment Safety Management',
      description: 'Schedule equipment inspections and maintain safety logs',
      icon: '🔧',
      color: 'from-orange-500 to-orange-600',
      stats: { current: 0, total: 0 },
      cta: 'View Equipment',
    },
    {
      id: 'icscore',
      title: 'ICScore Competition Management',
      description: 'Manage competitions, scores, and athlete competition tracking',
      icon: '🏆',
      color: 'from-yellow-500 to-yellow-600',
      stats: { current: 0, total: 0 },
      cta: 'Manage Competitions',
    },
    {
      id: 'maintenance',
      title: 'ICMaintenance',
      description: 'Track facility and equipment maintenance tasks and schedules',
      icon: '🛠️',
      color: 'from-green-500 to-green-600',
      stats: { current: 0, total: 0 },
      cta: 'View Tasks',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
      {/* Navigation */}
      <nav className="border-b border-neutral-700 bg-neutral-900/50 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/dashboard" className="text-2xl font-bold text-primary hover:text-primary-dark transition">
                GymHub
              </Link>
              <p className="text-sm text-neutral-400 mt-1">{user.clubName}</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right hidden sm:block">
                <p className="text-white font-medium">{user.fullName}</p>
                <p className="text-xs text-neutral-400">{user.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition text-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome, {user.fullName}!
          </h1>
          <p className="text-neutral-400">
            Manage your gymnastics club with our comprehensive platform
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6">
            <p className="text-neutral-400 text-sm mb-2">Active Staff Members</p>
            <p className="text-3xl font-bold text-white">0</p>
          </div>
          <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6">
            <p className="text-neutral-400 text-sm mb-2">Total Classes</p>
            <p className="text-3xl font-bold text-white">0</p>
          </div>
          <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6">
            <p className="text-neutral-400 text-sm mb-2">Open Incidents</p>
            <p className="text-3xl font-bold text-white">0</p>
          </div>
          <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6">
            <p className="text-neutral-400 text-sm mb-2">Equipment Due</p>
            <p className="text-3xl font-bold text-white">0</p>
          </div>
        </div>

        {/* Services Grid */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Available Solutions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {services.map(service => (
              <div
                key={service.id}
                className="group bg-neutral-800 border border-neutral-700 rounded-xl overflow-hidden hover:border-primary transition hover:shadow-xl hover:shadow-primary/20"
              >
                {/* Color Header */}
                <div className={`h-20 bg-gradient-to-br ${service.color}`} />

                {/* Content */}
                <div className="p-6">
                  <div className="text-4xl mb-3">{service.icon}</div>
                  <h3 className="text-lg font-bold text-white mb-2">{service.title}</h3>
                  <p className="text-sm text-neutral-400 mb-6">{service.description}</p>

                  {/* Stats */}
                  {(service.stats.current > 0 || service.stats.total > 0) && (
                    <div className="mb-6 p-3 bg-neutral-700/50 rounded-lg text-sm text-neutral-300">
                      <p>{service.stats.current} of {service.stats.total}</p>
                    </div>
                  )}

                  {/* CTA */}
                  <button 
                    onClick={() => {
                      if (service.id === 'roster') {
                        router.push('/dashboard/class-rostering')
                      }
                    }}
                    className="w-full px-4 py-2 bg-primary/10 hover:bg-primary hover:text-white text-primary rounded-lg font-semibold transition text-sm"
                  >
                    {service.cta}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Announcements Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Announcements</h2>
          <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-8 text-center">
            <p className="text-neutral-400">
              Welcome to GymHub! Your platform is ready to use. Explore the solutions above to get started.
            </p>
            <p className="text-neutral-500 text-sm mt-4">
              New features coming soon • Next update: January 2025
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-3">Quick Setup</h3>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full" />
                Invite staff members
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full" />
                Configure club settings
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full" />
                Import existing data
              </li>
            </ul>
            <button className="mt-4 w-full px-4 py-2 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg font-semibold transition text-sm">
              Get Started
            </button>
          </div>

          <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-3">Club Settings</h3>
            <p className="text-sm text-neutral-400 mb-4">
              Manage your club profile, team members, and preferences.
            </p>
            <button className="w-full px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg font-semibold transition text-sm">
              Settings
            </button>
          </div>

          <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-3">Need Help?</h3>
            <p className="text-sm text-neutral-400 mb-4">
              View documentation or contact our support team.
            </p>
            <button className="w-full px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg font-semibold transition text-sm">
              Support
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-neutral-700 bg-neutral-900 py-8 mt-16">
        <div className="container mx-auto px-6 text-center text-neutral-400 text-sm">
          <p>&copy; 2025 GymHub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

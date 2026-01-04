'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'

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
    const userData = localStorage.getItem('userData')
    if (userData) {
      setUser(JSON.parse(userData))
    } else {
      router.push('/sign-in')
    }
    setLoading(false)
  }, [router])

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-900">Loading...</div>
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
      href: '/dashboard/class-rostering',
      cta: 'Manage Classes',
      disabled: false,
    },
    {
      id: 'incident',
      title: 'Injury / Incident Management',
      description: 'Track incidents, create reports, and maintain compliance records',
      icon: '🏥',
      color: 'from-red-500 to-red-600',
      href: '#',
      cta: 'Coming Soon',
      disabled: true,
    },
    {
      id: 'equipment',
      title: 'Equipment Safety Management',
      description: 'Schedule equipment inspections and maintain safety logs',
      icon: '🔧',
      color: 'from-orange-500 to-orange-600',
      href: '#',
      cta: 'Coming Soon',
      disabled: true,
    },
    {
      id: 'icscore',
      title: 'ICScore Competition Management',
      description: 'Manage competitions, scores, and athlete competition tracking',
      icon: '🏆',
      color: 'from-yellow-500 to-yellow-600',
      href: '#',
      cta: 'Coming Soon',
      disabled: true,
    },
    {
      id: 'maintenance',
      title: 'ICMaintenance',
      description: 'Track facility and equipment maintenance tasks and schedules',
      icon: '🛠️',
      color: 'from-green-500 to-green-600',
      href: '#',
      cta: 'Coming Soon',
      disabled: true,
    },
  ]

  return (
    <DashboardLayout title="GymHub">
      <div className="p-6">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, {user.fullName}!
          </h2>
          <p className="text-gray-600">
            Manage your gymnastics club with our comprehensive platform
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <p className="text-gray-600 text-sm mb-2">Active Staff Members</p>
            <p className="text-3xl font-bold text-gray-900">0</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <p className="text-gray-600 text-sm mb-2">Total Classes</p>
            <p className="text-3xl font-bold text-gray-900">0</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <p className="text-gray-600 text-sm mb-2">Open Incidents</p>
            <p className="text-3xl font-bold text-gray-900">0</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <p className="text-gray-600 text-sm mb-2">Upcoming Inspections</p>
            <p className="text-3xl font-bold text-gray-900">0</p>
          </div>
        </div>

        {/* Services Section */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Platform Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <div
                key={service.id}
                className={`bg-white border rounded-xl overflow-hidden transition-all group ${
                  service.disabled
                    ? 'border-gray-200 opacity-60 cursor-not-allowed'
                    : 'border-gray-200 hover:border-blue-500 hover:shadow-lg'
                }`}
              >
                {/* Service Header with Gradient */}
                <div className={`bg-gradient-to-br ${service.color} p-6`}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-4xl">{service.icon}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white">{service.title}</h3>
                </div>

                {/* Service Body */}
                <div className="p-6">
                  <p className="text-gray-600 text-sm mb-6">
                    {service.description}
                  </p>

                  {/* CTA */}
                  {service.disabled ? (
                    <div className="w-full px-4 py-2 bg-gray-100 text-gray-400 rounded-lg font-semibold text-sm text-center">
                      {service.cta}
                    </div>
                  ) : (
                    <Link
                      href={service.href}
                      className="block w-full px-4 py-2 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 rounded-lg font-semibold transition text-sm text-center"
                    >
                      {service.cta}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

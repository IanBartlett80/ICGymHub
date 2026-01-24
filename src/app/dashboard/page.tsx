'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import Image from 'next/image'

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
  const [weeklyClassCount, setWeeklyClassCount] = useState<number>(0)
  const [activeConflicts, setActiveConflicts] = useState<number>(0)
  const [showIcscoreInfo, setShowIcscoreInfo] = useState(false)

  useEffect(() => {
    const userData = localStorage.getItem('userData')
    if (userData) {
      setUser(JSON.parse(userData))
      fetchWeeklyStats()
    } else {
      router.push('/sign-in')
    }
    setLoading(false)
  }, [router])

  const fetchWeeklyStats = async () => {
    try {
      const response = await fetch('/api/dashboard/weekly-stats', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setWeeklyClassCount(data.weeklyClassCount || 0)
        setActiveConflicts(data.activeConflicts || 0)
      }
    } catch (error) {
      console.error('Failed to fetch weekly stats:', error)
    }
  }

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
      title: 'Roster Management',
      description: 'Manage class schedules, instructors, and student enrollment',
      icon: '📅',
      color: 'from-blue-600 to-blue-700',
      href: '/dashboard/class-rostering',
      cta: 'Manage Classes',
      disabled: false,
      hasInfoBadge: false,
    },
    {
      id: 'incident',
      title: 'Injury / Incident Management',
      description: 'Track incidents, create reports, and maintain compliance records',
      icon: '🏥',
      color: 'from-red-600 to-red-700',
      href: '/dashboard/injury-reports',
      cta: 'Manage Reports',
      disabled: false,
      hasInfoBadge: false,
    },
    {
      id: 'equipment',
      title: 'Equipment Management',
      description: 'Schedule equipment inspections and maintain safety logs',
      icon: '🔧',
      color: 'from-orange-600 to-orange-700',
      href: '#',
      cta: 'Coming Soon',
      disabled: true,
      hasInfoBadge: false,
    },
    {
      id: 'icscore',
      title: '',
      description: 'Manage competitions, scores, and athlete competition tracking',
      logo: '/imgs/main_logo_small.png',
      color: 'bg-white',
      href: 'https://devbox.icscore.club/',
      cta: 'Competition Management',
      disabled: false,
      hasInfoBadge: true,
      external: true,
    },
    {
      id: 'maintenance',
      title: 'Maintenance Management',
      description: 'Track facility and equipment maintenance tasks and schedules',
      icon: '🛠️',
      color: 'from-green-600 to-green-700',
      href: '#',
      cta: 'Coming Soon',
      disabled: true,
      hasInfoBadge: false,
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
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <p className="text-gray-600 text-sm mb-2">Total Classes This Week</p>
                <p className="text-3xl font-bold text-gray-900 mt-auto">{weeklyClassCount}</p>
              </div>
              <div className="flex flex-col">
                <p className="text-gray-600 text-sm mb-2">Active Conflicts</p>
                <p className={`text-3xl font-bold mt-auto ${activeConflicts > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {activeConflicts}
                </p>
              </div>
            </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {services.map((service) => {
              const isIcscore = service.id === 'icscore'
              const CardWrapper = service.external ? 'a' : Link
              const wrapperProps = service.external 
                ? { href: service.href, target: '_blank', rel: 'noopener noreferrer' }
                : { href: service.href }
              
              return (
                <div
                  key={service.id}
                  className={`bg-white border rounded-lg overflow-hidden transition-all duration-300 group ${
                    service.disabled
                      ? 'border-gray-200 opacity-60 cursor-not-allowed'
                      : 'border-gray-200 hover:border-blue-500 hover:shadow-xl hover:scale-105 hover:-translate-y-1'
                  }`}
                >
                  {/* Service Header with Gradient */}
                  <div className={`${service.logo ? service.color : `bg-gradient-to-br ${service.color}`} p-4 relative min-h-[72px] flex flex-col justify-center`}>
                    {service.logo ? (
                      <>
                        <div className="flex items-center justify-center pb-3">
                          <div className="relative h-12 w-full">
                            <Image 
                              src={service.logo} 
                              alt="ICScore"
                              fill
                              className="object-contain group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        </div>
                        {service.hasInfoBadge && (
                          <div className="absolute top-2 right-2">
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setShowIcscoreInfo(!showIcscoreInfo)
                              }}
                              className="w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-700 transition-all hover:scale-110 shadow-lg"
                              title="Additional licensing required"
                            >
                              i
                            </button>
                            {showIcscoreInfo && isIcscore && (
                              <div className="absolute right-0 top-8 z-10 w-64 bg-white border border-gray-300 rounded-lg shadow-xl p-3 text-sm text-gray-700">
                                <p className="font-medium text-yellow-600 mb-1">⚠️ Additional License Required</p>
                                <p className="text-xs">ICScore requires additional licensing. However as a GymHub member you will recieve free hosting for all of your competitions. Vists ICScore for more information</p>
                                <button 
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setShowIcscoreInfo(false)
                                  }}
                                  className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  Got it
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-3xl group-hover:scale-110 transition-transform duration-300">{service.icon}</span>
                        </div>
                        <h3 className="text-base font-bold text-white group-hover:text-white/90 transition-colors">{service.title}</h3>
                      </>
                    )}
                  </div>

                  {/* Service Body */}
                  <div className={`p-4 ${service.logo ? 'pt-6' : ''}`}>
                    <p className="text-gray-600 text-xs mb-4 line-clamp-2">
                      {service.description}
                    </p>

                    {/* CTA */}
                    {service.disabled ? (
                      <div className="w-full px-3 py-2 bg-gray-100 text-gray-400 rounded-lg font-semibold text-xs text-center">
                        {service.cta}
                      </div>
                    ) : (
                      <CardWrapper
                        {...wrapperProps}
                        className="block w-full px-3 py-2 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 rounded-lg font-semibold transition-all duration-300 text-xs text-center group-hover:shadow-md"
                      >
                        {service.cta}
                      </CardWrapper>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

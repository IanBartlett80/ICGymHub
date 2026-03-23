'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Calendar, Shield, Wrench, ClipboardCheck, Settings,
  ArrowRight, Sparkles, CheckCircle, BookOpen,
  BarChart3, Users, MapPin, Bell,
} from 'lucide-react'
import ConfigWizard from '@/components/ConfigWizard/ConfigWizard'

const modules = [
  {
    id: 'rosters',
    title: 'Class Rostering',
    icon: Calendar,
    color: 'from-blue-500 to-blue-600',
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    description: 'Streamline your class scheduling and coach management with intelligent rostering tools.',
    capabilities: [
      'Create and manage class templates with recurring schedules',
      'Assign coaches to classes with availability tracking',
      'Detect and resolve scheduling conflicts automatically',
      'Generate roster reports and analytics',
    ],
    helpHref: '/dashboard/welcome/help/rosters',
  },
  {
    id: 'equipment',
    title: 'Equipment Management',
    icon: Wrench,
    color: 'from-amber-500 to-amber-600',
    bgLight: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    description: 'Track, maintain, and manage all your gymnastics equipment across every venue and zone.',
    capabilities: [
      'Catalogue equipment by zone and venue with photos',
      'Schedule preventive maintenance and track service history',
      'Log safety issues and manage repair quotes',
      'Monitor equipment utilisation and lifecycle analytics',
    ],
    helpHref: '/dashboard/welcome/help/equipment',
  },
  {
    id: 'safety',
    title: 'Injuries & Incidents',
    icon: Shield,
    color: 'from-red-500 to-red-600',
    bgLight: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    description: 'Comprehensive injury reporting and incident tracking to keep your athletes safe.',
    capabilities: [
      'Customisable injury report forms per gym sport',
      'QR code-based reporting for quick incident logging',
      'Automated email notifications for critical incidents',
      'Trend analytics and injury pattern identification',
    ],
    helpHref: '/dashboard/welcome/help/injuries',
  },
  {
    id: 'compliance',
    title: 'Compliance Manager',
    icon: ClipboardCheck,
    color: 'from-green-500 to-green-600',
    bgLight: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    description: 'Stay on top of regulatory requirements, certifications, and compliance deadlines.',
    capabilities: [
      'Track compliance items with due dates and categories',
      'Automated reminders for upcoming and overdue items',
      'Document attachment and evidence management',
      'Compliance completion rate dashboards',
    ],
    helpHref: '/dashboard/welcome/help/compliance',
  },
  {
    id: 'settings',
    title: 'Club Settings',
    icon: Settings,
    color: 'from-indigo-500 to-indigo-600',
    bgLight: 'bg-indigo-50',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-200',
    description: 'Configure your club\'s foundations — venues, sports, zones, coaches, and notifications.',
    capabilities: [
      'Multi-venue support with zone and area management',
      'Define gym sports and coaching disciplines',
      'Manage coach profiles, accreditations, and availability',
      'Configure system notifications and access controls',
    ],
    helpHref: '/dashboard/welcome/help/settings',
  },
]

export default function WelcomePage() {
  const router = useRouter()
  const [showWizard, setShowWizard] = useState(false)
  const [clubName, setClubName] = useState('')

  useEffect(() => {
    const userData = localStorage.getItem('userData')
    if (userData) {
      const parsed = JSON.parse(userData)
      setClubName(parsed.clubName || 'your club')
    }
    // Mark welcome page as seen
    localStorage.setItem('gymhub_welcome_seen', 'true')
    localStorage.setItem('gymhub_welcome_seen_at', new Date().toISOString())
  }, [])

  const handleStartWizard = () => {
    setShowWizard(true)
  }

  const handleGoToDashboard = () => {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">
      {/* Header Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="px-6 py-3 flex items-center justify-between max-w-7xl mx-auto">
          <div className="relative w-40 h-14">
            <Image
              src="/imgs/GymHub_Logo.png"
              alt="GymHub"
              fill
              className="object-contain object-left"
              priority
            />
          </div>
          <button
            onClick={handleGoToDashboard}
            className="text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
          >
            Skip to Dashboard →
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <section className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-sm font-medium px-4 py-2 rounded-full mb-6">
            <Sparkles className="w-4 h-4" />
            Welcome to GymHub
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
            Welcome, {clubName}
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8 leading-relaxed">
            GymHub is your all-in-one club management platform. From class scheduling to equipment tracking,
            injury reporting to compliance — everything you need to run a safe, organised, and efficient
            gymnastics club.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleStartWizard}
              className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 text-lg"
            >
              <Sparkles className="w-5 h-5" />
              Start Setup Wizard
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={handleGoToDashboard}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium px-6 py-4 rounded-xl border border-gray-200 hover:border-gray-300 transition-all"
            >
              Go to Dashboard
            </button>
          </div>
        </section>

        {/* Feature Overview Grid */}
        <section className="mb-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Everything You Need to Manage Your Club
            </h2>
            <p className="text-gray-600">
              Explore GymHub&apos;s core modules and what they can do for your club.
            </p>
          </div>

          <div className="space-y-6">
            {modules.map((mod) => {
              const Icon = mod.icon
              return (
                <div
                  key={mod.id}
                  className={`bg-white rounded-xl border ${mod.borderColor} shadow-sm hover:shadow-md transition-shadow overflow-hidden`}
                >
                  <div className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row md:items-start gap-6">
                      {/* Module header */}
                      <div className="flex-shrink-0">
                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${mod.color} flex items-center justify-center shadow-sm`}>
                          <Icon className="w-7 h-7 text-white" />
                        </div>
                      </div>

                      {/* Module content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          {mod.title}
                        </h3>
                        <p className="text-gray-600 mb-4">
                          {mod.description}
                        </p>

                        {/* Capabilities */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {mod.capabilities.map((cap, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <CheckCircle className={`w-4 h-4 ${mod.textColor} mt-0.5 flex-shrink-0`} />
                              <span className="text-sm text-gray-700">{cap}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Help link */}
                      <div className="flex-shrink-0 self-center">
                        <a
                          href={mod.helpHref}
                          className={`inline-flex items-center gap-2 ${mod.bgLight} ${mod.textColor} text-sm font-medium px-4 py-2 rounded-lg hover:opacity-80 transition-opacity`}
                        >
                          <BookOpen className="w-4 h-4" />
                          Admin Guide
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Quick Stats / At a Glance */}
        <section className="mb-16">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 md:p-12 text-white">
            <h2 className="text-2xl font-bold mb-2 text-center">
              Your Club at a Glance
            </h2>
            <p className="text-blue-100 text-center mb-8">
              Once configured, your dashboard will show real-time insights across all modules.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="bg-white/10 rounded-xl p-4 mb-2">
                  <BarChart3 className="w-8 h-8 mx-auto text-blue-100" />
                </div>
                <p className="text-sm text-blue-100 font-medium">Live Analytics</p>
              </div>
              <div className="text-center">
                <div className="bg-white/10 rounded-xl p-4 mb-2">
                  <Users className="w-8 h-8 mx-auto text-blue-100" />
                </div>
                <p className="text-sm text-blue-100 font-medium">Coach Scheduling</p>
              </div>
              <div className="text-center">
                <div className="bg-white/10 rounded-xl p-4 mb-2">
                  <MapPin className="w-8 h-8 mx-auto text-blue-100" />
                </div>
                <p className="text-sm text-blue-100 font-medium">Multi-Venue</p>
              </div>
              <div className="text-center">
                <div className="bg-white/10 rounded-xl p-4 mb-2">
                  <Bell className="w-8 h-8 mx-auto text-blue-100" />
                </div>
                <p className="text-sm text-blue-100 font-medium">Smart Alerts</p>
              </div>
            </div>
          </div>
        </section>

        {/* Getting Started CTA */}
        <section className="text-center mb-12">
          <div className="bg-white border border-gray-200 rounded-2xl p-8 md:p-12 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Ready to Get Started?
            </h2>
            <p className="text-gray-600 mb-6 max-w-xl mx-auto">
              The Setup Wizard will guide you through configuring your venues, gym sports, 
              training zones, and coaching staff. It only takes a few minutes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={handleStartWizard}
                className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
              >
                <Sparkles className="w-5 h-5" />
                Start Setup Wizard
              </button>
              <a
                href="/dashboard/welcome/help/settings"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium px-6 py-4 rounded-xl border border-gray-200 hover:border-gray-300 transition-all"
              >
                <BookOpen className="w-4 h-4" />
                Read Admin Guides
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-sm text-gray-400 pb-8">
          <p>&copy; {new Date().getFullYear()} GymHub by ICB Solutions. All rights reserved.</p>
        </footer>
      </div>

      {/* Config Wizard Modal */}
      {showWizard && (
        <ConfigWizard
          isOpen={showWizard}
          onClose={() => {
            setShowWizard(false)
            router.push('/dashboard')
          }}
        />
      )}
    </div>
  )
}

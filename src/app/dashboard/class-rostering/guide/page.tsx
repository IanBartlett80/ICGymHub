'use client'

import Link from 'next/link'
import DashboardLayout from '@/components/DashboardLayout'

export default function GetStartedGuidePage() {
  const configSteps = [
    {
      title: 'Step 1: Configure Gymsports',
      description: 'Set up the different gymnastics disciplines offered at your club (e.g., Artistic, Rhythmic, Trampoline).',
      icon: '🤸',
      href: '/dashboard/roster-config/gymsports',
    },
    {
      title: 'Step 2: Define Gym Zones',
      description: 'Create zones or training areas in your facility where classes will take place.',
      icon: '🏛️',
      href: '/dashboard/roster-config/zones',
    },
    {
      title: 'Step 3: Add Coaches',
      description: 'Add your coaching staff with their qualifications, gymsports, and availability.',
      icon: '👨‍🏫',
      href: '/dashboard/roster-config/coaches',
    },
    {
      title: 'Step 4: Create Class Templates',
      description: 'Set up class templates with default settings for times, duration, zones, and coaches.',
      icon: '📚',
      href: '/dashboard/roster-config/classes',
    },
    {
      title: 'Step 5: Generate Rosters',
      description: 'Create roster templates that generate schedules for multiple days with your class configurations.',
      icon: '📅',
      href: '/dashboard/rosters/create',
    },
  ]

  return (
    <DashboardLayout 
      title="Get Started Guide" 
      backTo={{ label: 'Back to Class Rostering', href: '/dashboard/class-rostering' }}
    >
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎓</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Class Rostering!</h1>
            <p className="text-lg text-gray-600">
              Follow these steps to set up your class rostering system
            </p>
          </div>

          <div className="space-y-6">
            {configSteps.map((step, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-md transition">
                <div className="flex items-start gap-4">
                  <div className="text-4xl flex-shrink-0">{step.icon}</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                    <p className="text-gray-600 mb-4">{step.description}</p>
                    <Link
                      href={step.href}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                    >
                      Configure Now →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Need Help?</h3>
            <p className="text-gray-700 mb-4">
              Each configuration page includes detailed instructions and examples. You can complete these steps in any order, but we recommend following them sequentially for the best experience.
            </p>
            <Link
              href="/dashboard/class-rostering"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Return to Dashboard →
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

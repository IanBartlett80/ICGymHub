'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ClassRosteringPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
      {/* Navigation */}
      <nav className="border-b border-neutral-700 bg-neutral-900/50 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-white hover:text-blue-400 transition">
              ← Back to Dashboard
            </Link>
            <span className="text-neutral-500">•</span>
            <h1 className="text-xl font-bold text-white">Class Rostering</h1>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">Class Rostering System</h1>
          <p className="text-neutral-400">
            Manage your gym zones, coaches, class templates, and generate rosters
          </p>
        </div>

        {/* Configuration Cards */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <button
              onClick={() => router.push('/dashboard/roster-config/zones')}
              className="bg-neutral-800 border border-neutral-700 rounded-xl p-8 hover:border-blue-500 transition hover:shadow-lg hover:shadow-blue-500/20 text-left group"
            >
              <div className="text-5xl mb-4">📍</div>
              <h3 className="text-xl font-bold text-white mb-2">Gym Zones</h3>
              <p className="text-sm text-neutral-400 mb-4">
                Define your gym areas such as Floor, Vault, Bars, Beam, and Tumble Track
              </p>
              <div className="text-sm font-semibold text-blue-400 group-hover:text-blue-300">
                Manage Zones →
              </div>
            </button>

            <button
              onClick={() => router.push('/dashboard/roster-config/coaches')}
              className="bg-neutral-800 border border-neutral-700 rounded-xl p-8 hover:border-blue-500 transition hover:shadow-lg hover:shadow-blue-500/20 text-left group"
            >
              <div className="text-5xl mb-4">👥</div>
              <h3 className="text-xl font-bold text-white mb-2">Coaches</h3>
              <p className="text-sm text-neutral-400 mb-4">
                Add and manage your coaching staff with certifications and contact info
              </p>
              <div className="text-sm font-semibold text-blue-400 group-hover:text-blue-300">
                Manage Coaches →
              </div>
            </button>

            <button
              onClick={() => router.push('/dashboard/roster-config/classes')}
              className="bg-neutral-800 border border-neutral-700 rounded-xl p-8 hover:border-blue-500 transition hover:shadow-lg hover:shadow-blue-500/20 text-left group"
            >
              <div className="text-5xl mb-4">📚</div>
              <h3 className="text-xl font-bold text-white mb-2">Class Templates</h3>
              <p className="text-sm text-neutral-400 mb-4">
                Create class templates with levels, times, zones, and coaches
              </p>
              <div className="text-sm font-semibold text-blue-400 group-hover:text-blue-300">
                Manage Classes →
              </div>
            </button>

            <button
              onClick={() => router.push('/dashboard/rosters')}
              className="bg-neutral-800 border border-neutral-700 rounded-xl p-8 hover:border-green-500 transition hover:shadow-lg hover:shadow-green-500/20 text-left group"
            >
              <div className="text-5xl mb-4">📋</div>
              <h3 className="text-xl font-bold text-white mb-2">Generate Rosters</h3>
              <p className="text-sm text-neutral-400 mb-4">
                Generate and manage daily/weekly class rosters with conflict detection
              </p>
              <div className="text-sm font-semibold text-green-400 group-hover:text-green-300">
                View Rosters →
              </div>
            </button>
          </div>
        </div>

        {/* Quick Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-8">
            <h3 className="text-lg font-bold text-white mb-4">Getting Started</h3>
            <ol className="space-y-3 text-sm text-neutral-300">
              <li className="flex gap-3">
                <span className="text-blue-400 font-bold">1</span>
                <span>Create gym zones (Floor, Vault, Bars, etc.)</span>
              </li>
              <li className="flex gap-3">
                <span className="text-blue-400 font-bold">2</span>
                <span>Add your coaching staff with certifications</span>
              </li>
              <li className="flex gap-3">
                <span className="text-blue-400 font-bold">3</span>
                <span>Define class templates with schedules and assignments</span>
              </li>
              <li className="flex gap-3">
                <span className="text-blue-400 font-bold">4</span>
                <span>Generate rosters and view them in the calendar</span>
              </li>
            </ol>
          </div>

          <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-8">
            <h3 className="text-lg font-bold text-white mb-4">Features</h3>
            <ul className="space-y-2 text-sm text-neutral-300">
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Automatic conflict detection
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Zone rotation and balance
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Coach scheduling and assignments
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Calendar view with drag & drop
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                CSV export and print capabilities
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

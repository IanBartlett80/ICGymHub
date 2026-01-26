'use client'

import Link from 'next/link'
import DashboardLayout from '@/components/DashboardLayout'

export default function AdminConfigPage() {
  return (
    <DashboardLayout title="Club Management" showClubManagementNav={true}>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <p className="text-gray-600">
            Manage club-wide settings and master data that are used across all features in the application.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* GymSports Card */}
          <Link href="/dashboard/admin-config/gymsports">
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition cursor-pointer">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">🏃</span>
                <h2 className="text-xl font-bold text-gray-900">GymSports</h2>
              </div>
              <p className="text-gray-600 text-sm">
                Manage the master list of gymnastics sports available across the system.
              </p>
              <div className="mt-4 text-blue-600 text-sm font-medium">
                Configure →
              </div>
            </div>
          </Link>

          {/* Zones Card */}
          <Link href="/dashboard/admin-config/zones">
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition cursor-pointer">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">📍</span>
                <h2 className="text-xl font-bold text-gray-900">Gym Zones</h2>
              </div>
              <p className="text-gray-600 text-sm">
                Define and manage gym zones/areas used for equipment and class organization.
              </p>
              <div className="mt-4 text-blue-600 text-sm font-medium">
                Configure →
              </div>
            </div>
          </Link>

          {/* Coaches Card */}
          <Link href="/dashboard/admin-config/coaches">
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition cursor-pointer">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">👥</span>
                <h2 className="text-xl font-bold text-gray-900">Coaches</h2>
              </div>
              <p className="text-gray-600 text-sm">
                Manage coach profiles, templates, and availability settings.
              </p>
              <div className="mt-4 text-blue-600 text-sm font-medium">
                Configure →
              </div>
            </div>
          </Link>

          {/* System Notifications Card */}
          <Link href="/dashboard/admin-config/notifications">
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition cursor-pointer">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">🔔</span>
                <h2 className="text-xl font-bold text-gray-900">System Notifications</h2>
              </div>
              <p className="text-gray-600 text-sm">
                Configure global notification settings and preferences.
              </p>
              <div className="mt-4 text-blue-600 text-sm font-medium">
                Configure →
              </div>
            </div>
          </Link>

          {/* Roles & Permissions Card (Placeholder) */}
          <Link href="/dashboard/admin-config/roles">
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition cursor-pointer opacity-75">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">🔐</span>
                <h2 className="text-xl font-bold text-gray-900">Roles & Permissions</h2>
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Coming Soon</span>
              </div>
              <p className="text-gray-600 text-sm">
                Manage user roles and permissions across the application.
              </p>
              <div className="mt-4 text-gray-400 text-sm font-medium">
                Coming Soon →
              </div>
            </div>
          </Link>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <span className="text-2xl">ℹ️</span>
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">About Club Management</h3>
              <p className="text-sm text-blue-800">
                Changes made here affect all features across the application. These same settings can also be 
                accessed from feature-specific configuration pages (e.g., Roster Configuration) and are synchronized 
                automatically.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

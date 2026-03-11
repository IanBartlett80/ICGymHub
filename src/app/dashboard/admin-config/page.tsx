'use client'

import Link from 'next/link'
import DashboardLayout from '@/components/DashboardLayout'

export default function AdminConfigPage() {
 return (
  <DashboardLayout title="Club Settings and Management" showClubManagementNav={true}>
   <div className="p-6 max-w-7xl mx-auto">
    <div className="mb-6">
     <h2 className="text-2xl font-bold text-gray-900 mb-2">Currently Set Up</h2>
     <p className="text-gray-600">
      Manage club-wide settings and master data that are used across all features in the application. 
      Complete setup in numerical order for best results.
     </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
     {/* Venues Card */}
     <Link href="/dashboard/admin-config/venues">
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition cursor-pointer relative">
       <div className="absolute top-3 right-3 bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
        1
       </div>
       <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">🏢</span>
        <h2 className="text-xl font-bold text-gray-900">Venues</h2>
       </div>
       <p className="text-gray-600 text-sm">
        Manage physical locations and facilities. Define where your club operates and assign equipment, zones, and classes to specific locations.
       </p>
       <div className="mt-4 text-blue-600 text-sm font-medium">
        Configure →
       </div>
      </div>
     </Link>

     {/* Gym Sports Card */}
     <Link href="/dashboard/admin-config/gymsports">
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition cursor-pointer relative">
       <div className="absolute top-3 right-3 bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
        2
       </div>
       <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">🤸</span>
        <h2 className="text-xl font-bold text-gray-900">Gym Sports</h2>
       </div>
       <p className="text-gray-600 text-sm">
        Define gymnastics disciplines offered at your club (MAG, WAG, REC, ACRO, T&D, etc.). Used for class organization and coach accreditations.
       </p>
       <div className="mt-4 text-blue-600 text-sm font-medium">
        Configure →
       </div>
      </div>
     </Link>

     {/* Zones Card */}
     <Link href="/dashboard/admin-config/zones">
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition cursor-pointer relative">
       <div className="absolute top-3 right-3 bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
        3
       </div>
       <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">📍</span>
        <h2 className="text-xl font-bold text-gray-900">Gym Zones</h2>
       </div>
       <p className="text-gray-600 text-sm">
        Define training areas and equipment zones (Floor, Vault, Bars, Beam, etc.). Used for equipment organization and class scheduling.
       </p>
       <div className="mt-4 text-blue-600 text-sm font-medium">
        Configure →
       </div>
      </div>
     </Link>

     {/* Coaches Card */}
     <Link href="/dashboard/admin-config/coaches">
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition cursor-pointer relative">
       <div className="absolute top-3 right-3 bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
        4
       </div>
       <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">👥</span>
        <h2 className="text-xl font-bold text-gray-900">Coaches</h2>
       </div>
       <p className="text-gray-600 text-sm">
        Manage coach profiles, accreditations, and availability. Assign coaches to gymsports and set their weekly availability for class rostering.
       </p>
       <div className="mt-4 text-blue-600 text-sm font-medium">
        Configure →
       </div>
      </div>
     </Link>

     {/* System Notifications Card */}
     <Link href="/dashboard/admin-config/notifications">
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition cursor-pointer relative">
       <div className="absolute top-3 right-3 bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
        5
       </div>
       <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">🔔</span>
        <h2 className="text-xl font-bold text-gray-900">System Notifications</h2>
       </div>
       <p className="text-gray-600 text-sm">
        Configure global notification settings and preferences for automated emails and system alerts.
       </p>
       <div className="mt-4 text-blue-600 text-sm font-medium">
        Configure →
       </div>
      </div>
     </Link>

     {/* Roles & Permissions Card (Placeholder) */}
     <Link href="/dashboard/admin-config/roles">
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition cursor-pointer opacity-75 relative">
       <div className="absolute top-3 right-3 bg-gray-400 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
        6
       </div>
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
      <span className="text-2xl">💡</span>
      <div>
       <h3 className="font-semibold text-blue-900 mb-1">Setup Tips</h3>
       <p className="text-sm text-blue-800 mb-2">
        Follow the numbered order above for best results. Changes made here affect all features across the application.
       </p>
       <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
        <li>Start with <strong>Venues</strong> to define your physical locations</li>
        <li>Add <strong>Gym Sports</strong> (MAG, WAG, REC, etc.) next</li>
        <li>Create <strong>Gym Zones</strong> for equipment areas</li>
        <li>Import or add <strong>Coaches</strong> with their availability</li>
        <li>Configure <strong>Notifications</strong> for automated alerts</li>
       </ul>
       <p className="text-xs text-blue-700 mt-3">
        <strong>Note:</strong> These settings are also accessible from feature-specific pages (e.g., Roster Configuration) and are synchronized automatically.
       </p>
      </div>
     </div>
    </div>
   </div>
  </DashboardLayout>
 )
}

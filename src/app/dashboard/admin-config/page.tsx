'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Wand2 } from 'lucide-react'
import DashboardLayout from '@/components/DashboardLayout'
import ConfigWizard from '@/components/ConfigWizard/ConfigWizard'

export default function AdminConfigPage() {
 const [showWizard, setShowWizard] = useState(false)

 return (
  <DashboardLayout title="Club Settings and Management" showClubManagementNav={true}>
   <div className="p-6 max-w-7xl mx-auto">
    <div className="mb-6 flex justify-between items-start">
     <div className="flex-1">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Currently Set Up</h2>
      <p className="text-gray-600">
       Manage club-wide settings and master data that are used across all features in the application. 
       Complete setup in numerical order for best results.
      </p>
     </div>
     
     {/* Run Setup Wizard Button */}
     <button
      onClick={() => setShowWizard(true)}
      className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
     >
      <Wand2 className="w-5 h-5" />
      Run Setup Wizard
     </button>
    </div>

    {/* Setup Tips */}
    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-6">
     <h3 className="font-semibold text-blue-900 mb-2">Setup Tips</h3>
     <p className="text-sm text-blue-800 mb-2">
      For first-time setup, we recommend following this order:
     </p>
     <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
      <li><strong>Venues</strong> → Set up your physical locations first</li>
      <li><strong>Gym Sports</strong> → Define which disciplines you offer</li>
      <li><strong>Gym Zones</strong> → Create training areas for each venue</li>
      <li><strong>Coaches</strong> → Add your coaching staff</li>
      <li><strong>Notifications</strong> → Configure how your club receives alerts</li>
      <li><strong>Roles & Permissions</strong> → Set up access levels for your team</li>
     </ol>
     <p className="text-sm text-blue-800 mt-2">
      💡 <strong>New to GymHub?</strong> Click "<strong>Run Setup Wizard</strong>" above for guided step-by-step configuration!
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

     {/* Roles & Permissions Card */}
     <Link href="/dashboard/admin-config/access-control">
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition cursor-pointer relative">
       <div className="absolute top-3 right-3 bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
        6
       </div>
       <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">🔐</span>
        <h2 className="text-xl font-bold text-gray-900">Access Control</h2>
       </div>
       <p className="text-gray-600 text-sm">
        Secure your QR codes with a PIN and manage access permissions for staff members.
       </p>
       <div className="mt-4 text-blue-600 text-sm font-medium">
        Configure →
       </div>
      </div>
     </Link>
    </div>
   </div>

   {/* Configuration Wizard */}
   {showWizard && (
    <ConfigWizard
     isOpen={showWizard}
     onClose={() => setShowWizard(false)}
    />
   )}
  </DashboardLayout>
 )
}

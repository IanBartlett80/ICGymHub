'use client'

import { useState, useEffect, ReactNode } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import ClassRosteringSubNav from './ClassRosteringSubNav'
import ClubManagementSubNav from './ClubManagementSubNav'
import NotificationBell from './NotificationBell'

interface UserData {
  id: string
  username: string
  email: string
  fullName: string
  role: string
  clubId: string
  clubName: string
}

interface DashboardLayoutProps {
  children: ReactNode
  title?: string
  backTo?: { label: string; href: string }
  showClassRosteringNav?: boolean
  showClubManagementNav?: boolean
}

export default function DashboardLayout({ children, title, backTo, showClassRosteringNav = false, showClubManagementNav = false }: DashboardLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<UserData | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showConfigMenu, setShowConfigMenu] = useState(false)
  const [showInjuryMenu, setShowInjuryMenu] = useState(false)
  const [showEquipmentMenu, setShowEquipmentMenu] = useState(false)
  const [showAdminMenu, setShowAdminMenu] = useState(false)

  useEffect(() => {
    const userData = localStorage.getItem('userData')
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('userData')
    router.push('/sign-in')
  }

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/')

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarCollapsed ? 'w-16' : 'w-64'
        } bg-white border-r border-gray-200 transition-all duration-300 flex flex-col fixed h-full z-30 print:hidden`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-end">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            <li>
              <Link
                href="/dashboard"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                  pathname === '/dashboard'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-xl">🏠</span>
                {!sidebarCollapsed && <span>Home</span>}
              </Link>
            </li>

            {/* Club Configuration */}
            <li>
              <button
                onClick={() => setShowAdminMenu(!showAdminMenu)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition ${
                  isActive('/dashboard/admin-config')
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">⚙️</span>
                  {!sidebarCollapsed && <span>Club Management</span>}
                </div>
                {!sidebarCollapsed && (
                  <span className="text-sm">{showAdminMenu ? '▼' : '▶'}</span>
                )}
              </button>

              {/* Club Config Submenu */}
              {showAdminMenu && !sidebarCollapsed && (
                <ul className="ml-9 mt-2 space-y-1">
                  <li>
                    <Link
                      href="/dashboard/admin-config"
                      className={`block px-3 py-2 text-sm rounded-lg ${
                        pathname === '/dashboard/admin-config'
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Overview
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/dashboard/admin-config/gymsports"
                      className={`block px-3 py-2 text-sm rounded-lg ${
                        isActive('/dashboard/admin-config/gymsports')
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      GymSports
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/dashboard/admin-config/zones"
                      className={`block px-3 py-2 text-sm rounded-lg ${
                        isActive('/dashboard/admin-config/zones')
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Gym Zones
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/dashboard/admin-config/coaches"
                      className={`block px-3 py-2 text-sm rounded-lg ${
                        isActive('/dashboard/admin-config/coaches')
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Coaches
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/dashboard/admin-config/notifications"
                      className={`block px-3 py-2 text-sm rounded-lg ${
                        isActive('/dashboard/admin-config/notifications')
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Notifications
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/dashboard/admin-config/roles"
                      className={`block px-3 py-2 text-sm rounded-lg ${
                        isActive('/dashboard/admin-config/roles')
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Roles & Permissions
                    </Link>
                  </li>
                </ul>
              )}
            </li>

            {/* Roster Management */}
            <li>
              <button
                onClick={() => setShowConfigMenu(!showConfigMenu)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition ${
                  isActive('/dashboard/class-rostering') || isActive('/dashboard/roster')
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">📅</span>
                  {!sidebarCollapsed && <span>Roster Management</span>}
                </div>
                {!sidebarCollapsed && (
                  <span className="text-sm">{showConfigMenu ? '▼' : '▶'}</span>
                )}
              </button>

              {/* Class Rostering Submenu */}
              {showConfigMenu && !sidebarCollapsed && (
                <ul className="ml-9 mt-2 space-y-1">
                  <li>
                    <Link
                      href="/dashboard/class-rostering"
                      className={`block px-3 py-2 text-sm rounded-lg ${
                        pathname === '/dashboard/class-rostering'
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/dashboard/rosters"
                      className={`block px-3 py-2 text-sm rounded-lg ${
                        isActive('/dashboard/rosters')
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Rosters
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/dashboard/roster-reports"
                      className={`block px-3 py-2 text-sm rounded-lg ${
                        isActive('/dashboard/roster-reports')
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Reports
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/dashboard/class-rostering/guide"
                      className={`block px-3 py-2 text-sm rounded-lg ${
                        pathname === '/dashboard/class-rostering/guide'
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Get Started Guide
                    </Link>
                  </li>
                </ul>
              )}
            </li>

            {/* Injury Management */}
            <li>
              <button
                onClick={() => setShowInjuryMenu(!showInjuryMenu)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition ${
                  isActive('/dashboard/injury-reports')
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🏥</span>
                  {!sidebarCollapsed && <span>Injury Management</span>}
                </div>
                {!sidebarCollapsed && (
                  <span className="text-sm">{showInjuryMenu ? '▼' : '▶'}</span>
                )}
              </button>

              {/* Injury Management Submenu */}
              {showInjuryMenu && !sidebarCollapsed && (
                <ul className="ml-9 mt-2 space-y-1">
                  <li>
                    <Link
                      href="/dashboard/injury-reports"
                      className={`block px-3 py-2 text-sm rounded-lg ${
                        pathname === '/dashboard/injury-reports'
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/dashboard/injury-reports/forms"
                      className={`block px-3 py-2 text-sm rounded-lg ${
                        isActive('/dashboard/injury-reports/forms')
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Manage Forms
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/dashboard/injury-reports/submissions"
                      className={`block px-3 py-2 text-sm rounded-lg ${
                        isActive('/dashboard/injury-reports/submissions')
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Reports
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/dashboard/injury-reports/analytics"
                      className={`block px-3 py-2 text-sm rounded-lg ${
                        isActive('/dashboard/injury-reports/analytics')
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Analytics
                    </Link>
                  </li>
                </ul>
              )}
            </li>

            {/* Equipment Management */}
            <li>
              <button
                onClick={() => setShowEquipmentMenu(!showEquipmentMenu)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition ${
                  isActive('/dashboard/equipment')
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🔧</span>
                  {!sidebarCollapsed && <span>Equipment Management</span>}
                </div>
                {!sidebarCollapsed && (
                  <span className="text-sm">{showEquipmentMenu ? '▼' : '▶'}</span>
                )}
              </button>

              {/* Equipment Submenu */}
              {showEquipmentMenu && !sidebarCollapsed && (
                <ul className="ml-9 mt-2 space-y-1">
                  <li>
                    <Link
                      href="/dashboard/equipment"
                      className={`block px-3 py-2 text-sm rounded-lg ${
                        pathname === '/dashboard/equipment'
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      All Equipment
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/dashboard/equipment/maintenance"
                      className={`block px-3 py-2 text-sm rounded-lg ${
                        isActive('/dashboard/equipment/maintenance')
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Maintenance Due
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/dashboard/equipment/analytics"
                      className={`block px-3 py-2 text-sm rounded-lg ${
                        isActive('/dashboard/equipment/analytics')
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Analytics
                    </Link>
                  </li>
                </ul>
              )}
            </li>

            {/* Other Services - Coming Soon */}
            <li>
              <div className="flex items-center gap-3 px-3 py-2 text-gray-400 cursor-not-allowed">
                <span className="text-xl">🏆</span>
                {!sidebarCollapsed && <span className="text-sm">ICScore</span>}
              </div>
            </li>
            <li>
              <div className="flex items-center gap-3 px-3 py-2 text-gray-400 cursor-not-allowed">
                <span className="text-xl">🛠️</span>
                {!sidebarCollapsed && <span className="text-sm">Maintenance</span>}
              </div>
            </li>
          </ul>
        </nav>

        {/* Club Info */}
        {!sidebarCollapsed && user && (
          <div className="p-4 border-t border-gray-200">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Club</p>
            <p className="text-sm text-gray-700 truncate">{user.clubName}</p>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className={`flex-1 ${sidebarCollapsed ? 'ml-16' : 'ml-64'} transition-all duration-300 print:ml-0`}>
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-20 print:hidden">
          <div className="pl-4 pr-6 py-3 flex items-center justify-between">
            {/* Logo and Back Navigation section */}
            <div className="flex flex-col gap-2">
              <Link href="/dashboard" className="flex items-center">
                <div className="relative w-96 h-24">
                  <Image 
                    src="/imgs/GymHub_Logo.png" 
                    alt="GymHub"
                    fill
                    className="object-contain object-left"
                    priority
                  />
                </div>
              </Link>
              {backTo && (
                <Link
                  href={backTo.href}
                  className="text-gray-600 hover:text-blue-600 transition flex items-center gap-2 whitespace-nowrap font-medium text-sm pl-1"
                >
                  <span>←</span>
                  <span>{backTo.label}</span>
                </Link>
              )}
            </div>

            {/* Page title centered */}
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <h1 className="text-2xl font-bold text-gray-900">{title || 'Dashboard'}</h1>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              {/* Notification Bell */}
              <NotificationBell />
              
              {/* User Profile */}
              {user && (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100 transition"
                  >
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{user.fullName}</p>
                      <p className="text-xs text-gray-500">{user.role}</p>
                    </div>
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {user.fullName.charAt(0).toUpperCase()}
                    </div>
                  </button>

                {showUserMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowUserMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                      <div className="p-4 border-b border-gray-200">
                        <p className="font-medium text-gray-900">{user.fullName}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                      <ul className="py-2">
                        <li>
                          <Link
                            href="/dashboard/profile"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setShowUserMenu(false)}
                          >
                            Profile Settings
                          </Link>
                        </li>
                        <li>
                          <button
                            onClick={() => {
                              setShowUserMenu(false)
                              handleLogout()
                            }}
                            className="w-full text-left block px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            Logout
                          </button>
                        </li>
                      </ul>
                    </div>
                  </>
                )}
              </div>
            )}
            </div>
          </div>
        </header>

        {/* Class Rostering Sub Navigation */}
        {showClassRosteringNav && (
          <div className="print:hidden">
            <ClassRosteringSubNav />
          </div>
        )}

        {/* Club Management Sub Navigation */}
        {showClubManagementNav && (
          <div className="print:hidden">
            <ClubManagementSubNav />
          </div>
        )}

        {/* Page Content */}
        <main>{children}</main>
      </div>
    </div>
  )
}

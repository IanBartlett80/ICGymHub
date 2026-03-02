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

type ServiceType = 'dashboard' | 'rosters' | 'safety' | 'equipment'

export default function DashboardLayout({ children, title, backTo, showClassRosteringNav = false, showClubManagementNav = false }: DashboardLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<UserData | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeService, setActiveService] = useState<ServiceType>('dashboard')

  useEffect(() => {
    const userData = localStorage.getItem('userData')
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  // Determine active service based on current pathname
  useEffect(() => {
    if (pathname?.startsWith('/dashboard/class-rostering') || pathname?.startsWith('/dashboard/rosters') || pathname?.startsWith('/dashboard/roster-reports')) {
      setActiveService('rosters')
    } else if (pathname?.startsWith('/dashboard/injury-reports') || pathname?.startsWith('/injury-report')) {
      setActiveService('safety')
    } else if (pathname?.startsWith('/dashboard/equipment')) {
      setActiveService('equipment')
    } else if (pathname === '/dashboard') {
      setActiveService('dashboard')
    }
  }, [pathname])

  const handleLogout = () => {
    localStorage.removeItem('userData')
    router.push('/sign-in')
  }

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/')

  const services = [
    { id: 'rosters' as ServiceType, name: 'Rosters', basePath: '/dashboard/class-rostering' },
    { id: 'safety' as ServiceType, name: 'Safety', basePath: '/dashboard/injury-reports' },
    { id: 'equipment' as ServiceType, name: 'Equipment', basePath: '/dashboard/equipment' },
    { id: 'icscore', name: 'ICScore', basePath: 'https://icscore.club', external: true },
  ]

  const renderSidebarContent = () => {
    switch (activeService) {
      case 'dashboard':
        return (
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
                <span className="text-xl">📊</span>
                {!sidebarCollapsed && <span>Analytics Overview</span>}
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/quick-stats"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                  pathname === '/dashboard/quick-stats'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-xl">⚡</span>
                {!sidebarCollapsed && <span>Quick Stats</span>}
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/reports"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                  isActive('/dashboard/reports')
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-xl">📈</span>
                {!sidebarCollapsed && <span>All Reports</span>}
              </Link>
            </li>
          </ul>
        )

      case 'rosters':
        return (
          <ul className="space-y-2">
            <li>
              <Link
                href="/dashboard/class-rostering"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                  pathname === '/dashboard/class-rostering'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-xl">📊</span>
                {!sidebarCollapsed && <span>Dashboard</span>}
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/rosters"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                  isActive('/dashboard/rosters')
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-xl">📋</span>
                {!sidebarCollapsed && <span>Rosters</span>}
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/roster-reports"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                  isActive('/dashboard/roster-reports')
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-xl">📈</span>
                {!sidebarCollapsed && <span>Reports</span>}
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/class-rostering/guide"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                  pathname === '/dashboard/class-rostering/guide'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-xl">📖</span>
                {!sidebarCollapsed && <span>Get Started Guide</span>}
              </Link>
            </li>
          </ul>
        )

      case 'safety':
        return (
          <ul className="space-y-2">
            <li>
              <Link
                href="/dashboard/injury-reports"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                  pathname === '/dashboard/injury-reports'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-xl">📊</span>
                {!sidebarCollapsed && <span>Dashboard</span>}
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/injury-reports/forms"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                  isActive('/dashboard/injury-reports/forms')
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-xl">📝</span>
                {!sidebarCollapsed && <span>Manage Forms</span>}
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/injury-reports/submissions"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                  isActive('/dashboard/injury-reports/submissions')
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-xl">📋</span>
                {!sidebarCollapsed && <span>Reports</span>}
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/injury-reports/analytics"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                  isActive('/dashboard/injury-reports/analytics')
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-xl">📈</span>
                {!sidebarCollapsed && <span>Analytics</span>}
              </Link>
            </li>
          </ul>
        )

      case 'equipment':
        return (
          <ul className="space-y-2">
            <li>
              <Link
                href="/dashboard/equipment"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                  pathname === '/dashboard/equipment'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-xl">📊</span>
                {!sidebarCollapsed && <span>Zone Overview</span>}
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/equipment/all"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                  pathname === '/dashboard/equipment/all'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-xl">🔧</span>
                {!sidebarCollapsed && <span>All Equipment</span>}
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/equipment/maintenance"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                  isActive('/dashboard/equipment/maintenance')
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-xl">🛠️</span>
                {!sidebarCollapsed && <span>Maintenance Due</span>}
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/equipment/analytics"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                  isActive('/dashboard/equipment/analytics')
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-xl">📈</span>
                {!sidebarCollapsed && <span>Analytics</span>}
              </Link>
            </li>
          </ul>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarCollapsed ? 'w-16' : 'w-64'
        } bg-white border-r border-gray-200 transition-all duration-300 flex flex-col fixed h-full z-30 print:hidden`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          {!sidebarCollapsed && (
            <h2 className="font-semibold text-gray-900 truncate">
              {activeService === 'dashboard' && 'Dashboard'}
              {activeService === 'rosters' && 'Rosters'}
              {activeService === 'safety' && 'Safety'}
              {activeService === 'equipment' && 'Equipment'}
            </h2>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          {renderSidebarContent()}
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
          <div className="px-4 py-2 flex items-center justify-between">
            {/* Logo */}
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

            {/* Google-Style Service Navigation Tabs */}
            <div className="flex items-center gap-4 ml-8">
              {services.map((service) => {
                if (service.external) {
                  return (
                    <a
                      key={service.id}
                      href={service.basePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative px-2 py-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      {service.name}
                    </a>
                  )
                }
                return (
                  <Link
                    key={service.id}
                    href={service.basePath}
                    onClick={() => setActiveService(service.id as ServiceType)}
                    className={`relative px-2 py-1 text-sm transition-colors ${
                      activeService === service.id
                        ? 'text-blue-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {service.name}
                    {activeService === service.id && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                    )}
                  </Link>
                )
              })}
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-3">
              {/* Notification Bell */}
              <NotificationBell />

              {/* Settings Icon */}
              <Link
                href="/dashboard/admin-config"
                className="p-2 hover:bg-gray-100 rounded-lg transition"
                title="Club Settings"
              >
                <span className="text-2xl">⚙️</span>
              </Link>
              
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

          {/* Back Navigation (if provided) */}
          {backTo && (
            <div className="px-4 pb-3">
              <Link
                href={backTo.href}
                className="text-gray-600 hover:text-blue-600 transition flex items-center gap-2 whitespace-nowrap font-medium text-sm"
              >
                <span>←</span>
                <span>{backTo.label}</span>
              </Link>
            </div>
          )}
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
        <main>
          {title && (
            <div className="px-6 pt-6 pb-2 print:hidden">
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, ReactNode } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'

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
}

export default function DashboardLayout({ children, title, backTo }: DashboardLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<UserData | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showConfigMenu, setShowConfigMenu] = useState(false)

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
        } bg-white border-r border-gray-200 transition-all duration-300 flex flex-col fixed h-full z-30`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          {!sidebarCollapsed && (
            <Link href="/dashboard" className="text-xl font-bold text-blue-600">
              ICGymHub
            </Link>
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

            {/* Class Rostering */}
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
                  {!sidebarCollapsed && <span>Class Rostering</span>}
                </div>
                {!sidebarCollapsed && (
                  <span className="text-sm">{showConfigMenu ? '▼' : '▶'}</span>
                )}
              </button>

              {/* Configuration Submenu */}
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
                  <li className="pt-1 border-t border-gray-200 mt-2">
                    <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase">
                      Configuration
                    </p>
                  </li>
                  <li>
                    <Link
                      href="/dashboard/roster-config/zones"
                      className={`block px-3 py-2 text-sm rounded-lg ${
                        isActive('/dashboard/roster-config/zones')
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Gym Zones
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/dashboard/roster-config/coaches"
                      className={`block px-3 py-2 text-sm rounded-lg ${
                        isActive('/dashboard/roster-config/coaches')
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Coaches
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/dashboard/roster-config/classes"
                      className={`block px-3 py-2 text-sm rounded-lg ${
                        isActive('/dashboard/roster-config/classes')
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Class Templates
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/dashboard/roster-config/gymsports"
                      className={`block px-3 py-2 text-sm rounded-lg ${
                        isActive('/dashboard/roster-config/gymsports')
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Gymsports
                    </Link>
                  </li>
                </ul>
              )}
            </li>

            {/* Other Services - Coming Soon */}
            <li>
              <div className="flex items-center gap-3 px-3 py-2 text-gray-400 cursor-not-allowed">
                <span className="text-xl">🏥</span>
                {!sidebarCollapsed && <span className="text-sm">Incident Mgmt</span>}
              </div>
            </li>
            <li>
              <div className="flex items-center gap-3 px-3 py-2 text-gray-400 cursor-not-allowed">
                <span className="text-xl">🔧</span>
                {!sidebarCollapsed && <span className="text-sm">Equipment</span>}
              </div>
            </li>
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
      <div className={`flex-1 ${sidebarCollapsed ? 'ml-16' : 'ml-64'} transition-all duration-300`}>
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {backTo && (
                <>
                  <Link
                    href={backTo.href}
                    className="text-gray-600 hover:text-blue-600 transition flex items-center gap-2"
                  >
                    <span>←</span>
                    <span>{backTo.label}</span>
                  </Link>
                  <span className="text-gray-300">|</span>
                </>
              )}
              <h1 className="text-2xl font-bold text-gray-900">{title || 'Dashboard'}</h1>
            </div>

            {/* User Menu */}
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
        </header>

        {/* Page Content */}
        <main>{children}</main>
      </div>
    </div>
  )
}

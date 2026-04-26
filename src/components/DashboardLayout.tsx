'use client'

import { useState, useEffect, ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from './AuthProvider'
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
  clubTimezone: string
  paymentStatus?: string
  paymentCancelledAt?: string | null
  clubCreatedAt?: string | null
}

interface DashboardLayoutProps {
  children: ReactNode
  title?: string
  backTo?: { label: string; href: string }
  showClassRosteringNav?: boolean
  showClubManagementNav?: boolean
}

type ServiceType = 'dashboard' | 'rosters' | 'safety' | 'equipment' | 'compliance' | 'guides' | 'settings'

export default function DashboardLayout({ children, title, backTo, showClassRosteringNav = false, showClubManagementNav = false }: DashboardLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user: authUser, logout } = useAuth()
  const [user, setUser] = useState<UserData | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [activeService, setActiveService] = useState<ServiceType>('dashboard')

  useEffect(() => {
    // Use auth context user or fallback to localStorage
    if (authUser) {
      setUser(authUser)
    } else {
      const userData = localStorage.getItem('userData')
      if (userData) {
        setUser(JSON.parse(userData))
      }
    }
  }, [authUser])

  // Determine active service based on current pathname
  useEffect(() => {
    if (pathname?.startsWith('/dashboard/class-rostering') || pathname?.startsWith('/dashboard/rosters') || pathname?.startsWith('/dashboard/roster-reports')) {
      setActiveService('rosters')
    } else if (pathname?.startsWith('/dashboard/injury-reports') || pathname?.startsWith('/injury-report')) {
      setActiveService('safety')
    } else if (pathname?.startsWith('/dashboard/equipment') || pathname?.startsWith('/dashboard/safety-issues')) {
      setActiveService('equipment')
    } else if (pathname?.startsWith('/dashboard/compliance-manager')) {
      setActiveService('compliance')
    } else if (pathname?.startsWith('/dashboard/welcome/help')) {
      setActiveService('guides')
    } else if (pathname?.startsWith('/dashboard/admin-config') || pathname?.startsWith('/dashboard/profile')) {
      setActiveService('settings')
    } else if (pathname === '/dashboard') {
      setActiveService('dashboard')
    }
  }, [pathname])

  const handleLogout = () => {
    logout()
  }

  // Subscription cancellation state
  const isCancelled = user?.paymentStatus === 'CANCELLED'
  const cancelledAt = user?.paymentCancelledAt ? new Date(user.paymentCancelledAt) : null
  const now = new Date()
  const gracePeriodMs = 30 * 24 * 60 * 60 * 1000 // 30 days
  const gracePeriodExpiry = cancelledAt ? new Date(cancelledAt.getTime() + gracePeriodMs) : null
  const daysRemaining = gracePeriodExpiry ? Math.max(0, Math.ceil((gracePeriodExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : null
  const isGracePeriodExpired = isCancelled && daysRemaining !== null && daysRemaining <= 0
  const isOnProfilePage = pathname?.startsWith('/dashboard/profile')

  // Trial period state (SKIPPED payment - 30 days from club creation)
  const isSkipped = user?.paymentStatus === 'SKIPPED'
  const clubCreatedAt = user?.clubCreatedAt ? new Date(user.clubCreatedAt) : null
  const trialPeriodMs = 30 * 24 * 60 * 60 * 1000 // 30 days
  const trialExpiry = clubCreatedAt ? new Date(clubCreatedAt.getTime() + trialPeriodMs) : null
  const trialDaysRemaining = trialExpiry ? Math.max(0, Math.ceil((trialExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : null
  const isTrialExpired = isSkipped && trialDaysRemaining !== null && trialDaysRemaining <= 0

  // After 30-day grace/trial period, redirect non-profile pages to profile
  useEffect(() => {
    if ((isGracePeriodExpired || isTrialExpired) && !isOnProfilePage) {
      router.push('/dashboard/profile')
    }
  }, [isGracePeriodExpired, isTrialExpired, isOnProfilePage, router])

  const mainServices = [
    { id: 'dashboard' as ServiceType, name: 'Home', basePath: '/dashboard' },
    { id: 'rosters' as ServiceType, name: 'Rosters', basePath: '/dashboard/class-rostering' },
    { id: 'safety' as ServiceType, name: 'Injury & Incidents', basePath: '/dashboard/injury-reports' },
    { id: 'equipment' as ServiceType, name: 'Equipment', basePath: '/dashboard/equipment' },
    { id: 'compliance' as ServiceType, name: 'Compliance', basePath: '/dashboard/compliance-manager' },
    { id: 'guides' as ServiceType, name: 'Admin Guides', basePath: '/dashboard/welcome/help/settings' },
    { id: 'icscore', name: 'ICScore', basePath: 'https://icscore.club', external: true },
  ]

  const settingsService = { id: 'settings' as ServiceType, name: 'Club Settings', basePath: '/dashboard/admin-config' }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="w-full">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-20 print:hidden">
          <div className="px-4 py-1.5 flex items-center justify-between">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center">
              <div className="relative w-40 h-14">
                <Image 
                  src="/imgs/GymHub_Logo.png" 
                  alt="GymHub"
                  fill
                  className="object-contain object-left"
                  priority
                />
              </div>
            </Link>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2">
              {/* Notification Bell */}
              <NotificationBell />
              
              {/* User Profile */}
              {user && (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition"
                  >
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{user.fullName}</p>
                      <p className="text-xs text-gray-500">{user.role}</p>
                    </div>
                    <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
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

          {/* Service Navigation Tabs */}
          <div className="px-4 border-t border-gray-100">
            <div className="flex items-center justify-between min-h-10">
              {/* Main Services */}
              <div className="flex items-center gap-5">
                {mainServices.map((service) => {
                  if (service.external) {
                    return (
                      <a
                        key={service.id}
                        href={service.basePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative px-1 py-2.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
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
                      className={`relative px-1 py-2.5 text-sm transition-colors ${
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

              {/* Separator and Settings */}
              <div className="flex items-center gap-5">
                <div className="h-6 w-px bg-gray-300"></div>
                <Link
                  href={settingsService.basePath}
                  onClick={() => setActiveService(settingsService.id)}
                  className={`relative px-1 py-2.5 text-sm transition-colors ${
                    activeService === settingsService.id
                      ? 'text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {settingsService.name}
                  {activeService === settingsService.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                  )}
                </Link>
              </div>
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

        {/* Trial Period Banner (SKIPPED payment) */}
        {isSkipped && !isTrialExpired && trialDaysRemaining !== null && (
          <div className="bg-blue-50 border-b border-blue-200 px-4 py-3 print:hidden">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
              <div className="flex items-center gap-3">
                <span className="text-xl">ℹ️</span>
                <div>
                  <p className="text-sm font-semibold text-blue-800">
                    Trial Period — {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} remaining
                  </p>
                  <p className="text-sm text-blue-700">
                    Your free trial ends in <strong>{trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''}</strong>. Enable your subscription to continue using GymHub.
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/profile/billing"
                className="ml-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition whitespace-nowrap"
              >
                Enable Subscription
              </Link>
            </div>
          </div>
        )}

        {/* Trial Expired Banner */}
        {isTrialExpired && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-3 print:hidden">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
              <div className="flex items-center gap-3">
                <span className="text-xl">🚫</span>
                <div>
                  <p className="text-sm font-semibold text-red-800">
                    Your free trial has expired
                  </p>
                  <p className="text-sm text-red-700">
                    Your 30-day trial period has ended. Enable your subscription to restore full access, or delete your club.
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/profile/billing"
                className="ml-4 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition whitespace-nowrap"
              >
                Enable Subscription
              </Link>
            </div>
          </div>
        )}

        {/* Subscription Cancellation Banner */}
        {isCancelled && !isGracePeriodExpired && daysRemaining !== null && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 print:hidden">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
              <div className="flex items-center gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    Your subscription has been cancelled
                  </p>
                  <p className="text-sm text-amber-700">
                    Your data will be permanently deleted in <strong>{daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</strong>. Re-enable your subscription to continue using GymHub.
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/profile/billing"
                className="ml-4 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition whitespace-nowrap"
              >
                Re-Enable Subscription
              </Link>
            </div>
          </div>
        )}

        {/* Grace Period Expired Banner */}
        {isGracePeriodExpired && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-3 print:hidden">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
              <div className="flex items-center gap-3">
                <span className="text-xl">🚫</span>
                <div>
                  <p className="text-sm font-semibold text-red-800">
                    Your subscription has expired
                  </p>
                  <p className="text-sm text-red-700">
                    Your 30-day grace period has ended. Re-enable your subscription to restore full access, or delete your club.
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/profile/billing"
                className="ml-4 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition whitespace-nowrap"
              >
                Re-Enable Subscription
              </Link>
            </div>
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

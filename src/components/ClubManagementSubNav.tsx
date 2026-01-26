'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function ClubManagementSubNav() {
  const pathname = usePathname()

  const isActive = (path: string) => {
    if (path === '/dashboard/admin-config') {
      return pathname === path
    }
    return pathname?.startsWith(path)
  }

  const navItems = [
    {
      label: 'Overview',
      href: '/dashboard/admin-config',
      icon: '📊',
    },
    {
      label: 'GymSports',
      href: '/dashboard/admin-config/gymsports',
      icon: '🏃',
    },
    {
      label: 'Gym Zones',
      href: '/dashboard/admin-config/zones',
      icon: '📍',
    },
    {
      label: 'Coaches',
      href: '/dashboard/admin-config/coaches',
      icon: '👥',
    },
    {
      label: 'Notifications',
      href: '/dashboard/admin-config/notifications',
      icon: '🔔',
    },
    {
      label: 'Roles & Permissions',
      href: '/dashboard/admin-config/roles',
      icon: '🔐',
    },
  ]

  return (
    <div className="bg-white border-b border-gray-200 sticky top-[97px] z-10">
      <div className="px-6 py-3">
        <nav className="flex items-center gap-1 overflow-x-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}

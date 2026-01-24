'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function InjuryReportsSubNav() {
  const pathname = usePathname()

  const isActive = (path: string) => {
    if (path === '/dashboard/injury-reports') {
      return pathname === path
    }
    return pathname?.startsWith(path)
  }

  const navItems = [
    {
      label: 'Dashboard',
      href: '/dashboard/injury-reports',
      icon: '📊',
    },
    {
      label: 'Manage Forms',
      href: '/dashboard/injury-reports/forms',
      icon: '📝',
    },
    {
      label: 'Reports',
      href: '/dashboard/injury-reports/submissions',
      icon: '📋',
    },
    {
      label: 'Analytics',
      href: '/dashboard/injury-reports/analytics',
      icon: '📈',
    },
    {
      label: 'Configuration',
      href: '/dashboard/injury-reports/configuration',
      icon: '⚙️',
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

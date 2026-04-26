'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen } from 'lucide-react'
import DashboardLayout from '@/components/DashboardLayout'

interface HelpLayoutProps {
  children: ReactNode
  title: string
  description: string
}

const guides = [
  { label: 'Club Settings', href: '/dashboard/welcome/help/settings' },
  { label: 'Rosters', href: '/dashboard/welcome/help/rosters' },
  { label: 'Equipment', href: '/dashboard/welcome/help/equipment' },
  { label: 'Injuries & Incidents', href: '/dashboard/welcome/help/injuries' },
  { label: 'Compliance', href: '/dashboard/welcome/help/compliance' },
  { label: 'Club Profile Management', href: '/dashboard/welcome/help/profile' },
]

export default function HelpLayout({ children, title, description }: HelpLayoutProps) {
  const pathname = usePathname()

  return (
    <DashboardLayout title="Admin Guides">
      <div className="max-w-7xl mx-auto px-6 py-6 flex gap-8">
        {/* Sidebar navigation */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-36 bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Admin Guides
            </h3>
            <nav className="space-y-1">
              {guides.map((guide) => (
                <Link
                  key={guide.href}
                  href={guide.href}
                  className={`block px-3 py-2 text-sm rounded-lg transition-colors ${
                    pathname === guide.href
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {guide.label}
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {/* Mobile guide nav */}
          <div className="lg:hidden mb-6 flex flex-wrap gap-2">
            {guides.map((guide) => (
              <Link
                key={guide.href}
                href={guide.href}
                className={`text-xs border px-3 py-1.5 rounded-full transition-colors ${
                  pathname === guide.href
                    ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {guide.label}
              </Link>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            {/* Page header */}
            <div className="border-b border-gray-200 p-6 md:p-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
              <p className="text-gray-600 text-lg">{description}</p>
            </div>

            {/* Page content */}
            <div className="p-6 md:p-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </DashboardLayout>
  )
}

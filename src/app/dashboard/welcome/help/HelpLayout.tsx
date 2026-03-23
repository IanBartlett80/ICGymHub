'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, BookOpen } from 'lucide-react'

interface HelpLayoutProps {
  children: ReactNode
  title: string
  description: string
  backLabel?: string
}

const guides = [
  { label: 'Club Settings', href: '/dashboard/welcome/help/settings' },
  { label: 'Rosters', href: '/dashboard/welcome/help/rosters' },
  { label: 'Equipment', href: '/dashboard/welcome/help/equipment' },
  { label: 'Injuries & Incidents', href: '/dashboard/welcome/help/injuries' },
  { label: 'Compliance', href: '/dashboard/welcome/help/compliance' },
]

export default function HelpLayout({ children, title, description, backLabel = 'Back to Welcome' }: HelpLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="px-6 py-3 flex items-center justify-between max-w-7xl mx-auto">
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
          <Link
            href="/dashboard/welcome"
            className="text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            {backLabel}
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-8">
        {/* Sidebar navigation */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-24 bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Admin Guides
            </h3>
            <nav className="space-y-1">
              {guides.map((guide) => (
                <Link
                  key={guide.href}
                  href={guide.href}
                  className="block px-3 py-2 text-sm rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
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
                className="text-xs bg-white border border-gray-200 px-3 py-1.5 rounded-full text-gray-600 hover:bg-gray-100"
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
    </div>
  )
}

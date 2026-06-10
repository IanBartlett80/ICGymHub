'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getSubNavSection, SubNavItem } from './navConfig'

/**
 * Static left sub-navigation sidebar shown on every dashboard page. It is
 * always expanded (icons + labels) and lives in the normal document flow so the
 * main content reflows beside it. Sticks below the header and scrolls
 * independently when its content overflows.
 */
export default function DashboardSideNav() {
  const pathname = usePathname() || ''
  const section = getSubNavSection(pathname)

  const isActive = (item: SubNavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href)

  // The Home dashboard has its own full-width layout and needs no sub-nav.
  if (pathname === '/dashboard') {
    return null
  }

  return (
    <aside className="hidden w-60 shrink-0 border-r border-gray-200 bg-white md:block print:hidden">
      <div className="sticky top-[97px] flex max-h-[calc(100vh-97px)] flex-col overflow-y-auto">
        {/* Section header */}
        <div className="flex h-12 shrink-0 items-center border-b border-gray-100 px-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            {section.title}
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-2 py-3">
          {section.items.map((item) => {
            const active = isActive(item)
            const itemClass = `flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
              active
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`

            const content = (
              <>
                <span className="w-6 shrink-0 text-center text-xl">{item.icon}</span>
                <span className="whitespace-nowrap">{item.label}</span>
              </>
            )

            if (item.external) {
              return (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={itemClass}
                >
                  {content}
                </a>
              )
            }

            return (
              <Link key={item.href} href={item.href} className={itemClass}>
                {content}
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}

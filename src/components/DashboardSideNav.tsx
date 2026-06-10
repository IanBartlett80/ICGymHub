'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { getSubNavSection, SubNavItem } from './navConfig'

/**
 * Collapsed icon rail that sits on the left of every dashboard page. It shows
 * only icons by default and expands to reveal labels on hover (fly-out). A pin
 * toggle keeps it expanded for touch users. State resets to collapsed on every
 * page load (not persisted).
 */
export default function DashboardSideNav() {
  const pathname = usePathname() || ''
  const [pinned, setPinned] = useState(false)
  const section = getSubNavSection(pathname)

  const isActive = (item: SubNavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href)

  const labelClass = `whitespace-nowrap transition-opacity duration-150 ${
    pinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
  }`

  return (
    <aside
      className={`group fixed left-0 top-[97px] bottom-0 z-30 flex flex-col overflow-hidden border-r border-gray-200 bg-white transition-[width] duration-200 ease-out print:hidden ${
        pinned ? 'w-60 shadow-xl' : 'w-16 hover:w-60 hover:shadow-xl'
      }`}
    >
      {/* Section header / pin toggle */}
      <button
        type="button"
        onClick={() => setPinned((v) => !v)}
        aria-label={pinned ? 'Collapse navigation' : 'Expand navigation'}
        aria-pressed={pinned}
        className="flex h-12 shrink-0 items-center gap-3 border-b border-gray-100 px-3 text-gray-400 transition-colors hover:text-gray-700"
      >
        <span className="w-6 shrink-0 text-center text-lg">{pinned ? '«' : '☰'}</span>
        <span className={`text-xs font-semibold uppercase tracking-wide ${labelClass}`}>
          {section.title}
        </span>
      </button>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-3">
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
              <span className={labelClass}>{item.label}</span>
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
    </aside>
  )
}

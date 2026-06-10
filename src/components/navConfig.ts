// Centralized sub-navigation definitions used by the left fly-out rail
// (DashboardSideNav). Each dashboard "section" maps to a list of sub-pages.

export interface SubNavItem {
  label: string
  href: string
  icon: string
  /** When true, the item is only active on an exact pathname match. */
  exact?: boolean
  /** When true, render as an external anchor that opens in a new tab. */
  external?: boolean
}

export interface SubNavSection {
  id: string
  title: string
  items: SubNavItem[]
}

const rosteringSection: SubNavSection = {
  id: 'rosters',
  title: 'Class Rostering',
  items: [
    { label: 'Dashboard', href: '/dashboard/class-rostering', icon: '📊', exact: true },
    { label: 'Coaches', href: '/dashboard/roster-config/coaches', icon: '👨‍🏫' },
    { label: 'Class Templates', href: '/dashboard/roster-config/classes', icon: '📋' },
    { label: 'Rosters', href: '/dashboard/rosters', icon: '📅' },
    { label: 'Reports', href: '/dashboard/roster-reports', icon: '📄' },
  ],
}

const injurySection: SubNavSection = {
  id: 'safety',
  title: 'Injury & Incidents',
  items: [
    { label: 'Dashboard', href: '/dashboard/injury-reports', icon: '📊', exact: true },
    { label: 'Injury Form Templates', href: '/dashboard/injury-reports/forms', icon: '📝' },
    { label: 'Reports', href: '/dashboard/injury-reports/submissions', icon: '📋' },
    { label: 'Analytics', href: '/dashboard/analytics/injuries', icon: '📈' },
  ],
}

const equipmentSection: SubNavSection = {
  id: 'equipment',
  title: 'Equipment & Safety',
  items: [
    { label: 'Zone Overview', href: '/dashboard/equipment', icon: '📊', exact: true },
    { label: 'All Equipment', href: '/dashboard/equipment/all', icon: '📦' },
    { label: 'Safety Issues', href: '/dashboard/safety-issues', icon: '⚠️' },
    { label: 'Maintenance Due', href: '/dashboard/equipment/maintenance', icon: '🔧' },
    { label: 'Repair Quotes', href: '/dashboard/equipment/repair-quotes', icon: '💰' },
    { label: 'Analytics', href: '/dashboard/analytics/equipment', icon: '📈' },
  ],
}

const analyticsSection: SubNavSection = {
  id: 'analytics',
  title: 'Analytics',
  items: [
    { label: 'Overview', href: '/dashboard/analytics', icon: '🧭', exact: true },
    { label: 'Injuries & Incidents', href: '/dashboard/analytics/injuries', icon: '🩹' },
    { label: 'Equipment & Safety', href: '/dashboard/analytics/equipment', icon: '🛠️' },
    { label: 'Compliance', href: '/dashboard/analytics/compliance', icon: '✅' },
    { label: 'Rosters & Coaching', href: '/dashboard/analytics/rosters', icon: '📅' },
    { label: 'AI Insights', href: '/dashboard/analytics/insights', icon: '✨' },
  ],
}

const clubSection: SubNavSection = {
  id: 'settings',
  title: 'Club Management',
  items: [
    { label: 'Overview', href: '/dashboard/admin-config', icon: '📊', exact: true },
    { label: 'Venues', href: '/dashboard/admin-config/venues', icon: '🏢' },
    { label: 'Gym Sports', href: '/dashboard/admin-config/gymsports', icon: '🏃' },
    { label: 'Gym Zones', href: '/dashboard/admin-config/zones', icon: '📍' },
    { label: 'Coaches', href: '/dashboard/admin-config/coaches', icon: '👥' },
    { label: 'Notifications', href: '/dashboard/admin-config/notifications', icon: '🔔' },
    { label: 'Access Control', href: '/dashboard/admin-config/access-control', icon: '🔐' },
  ],
}

// Fallback shown on dashboard pages that have no dedicated sub-navigation
// (Home, Compliance Manager, Profile, Guides, etc.). Mirrors the top main
// menu so the left rail is consistently present and useful on every page.
const mainFallbackSection: SubNavSection = {
  id: 'main',
  title: 'Navigation',
  items: [
    { label: 'Home', href: '/dashboard', icon: '🏠', exact: true },
    { label: 'Rosters', href: '/dashboard/class-rostering', icon: '📅' },
    { label: 'Injury & Incidents', href: '/dashboard/injury-reports', icon: '🩹' },
    { label: 'Equipment', href: '/dashboard/equipment', icon: '🛠️' },
    { label: 'Compliance', href: '/dashboard/compliance-manager', icon: '✅' },
    { label: 'Analytics', href: '/dashboard/analytics', icon: '📊' },
    { label: 'Club Settings', href: '/dashboard/admin-config', icon: '⚙️' },
  ],
}

/**
 * Resolve which sub-navigation section applies to the given pathname.
 * Order matters: more specific prefixes are checked first.
 */
export function getSubNavSection(pathname: string): SubNavSection {
  if (pathname.startsWith('/dashboard/analytics')) return analyticsSection
  if (
    pathname.startsWith('/dashboard/class-rostering') ||
    pathname.startsWith('/dashboard/rosters') ||
    pathname.startsWith('/dashboard/roster-reports') ||
    pathname.startsWith('/dashboard/roster-config')
  ) {
    return rosteringSection
  }
  if (pathname.startsWith('/dashboard/injury-reports')) return injurySection
  if (pathname.startsWith('/dashboard/equipment') || pathname.startsWith('/dashboard/safety-issues')) {
    return equipmentSection
  }
  if (pathname.startsWith('/dashboard/admin-config')) return clubSection
  return mainFallbackSection
}

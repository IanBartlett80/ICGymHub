/**
 * Timezone-aware formatting utilities.
 * 
 * All times in the database are stored as UTC DateTime values.
 * These helpers convert UTC dates to the club's configured timezone for display.
 */

const DEFAULT_TIMEZONE = 'Australia/Sydney'

/**
 * Get the club timezone from localStorage userData, or fall back to default.
 */
export function getClubTimezone(): string {
  if (typeof window === 'undefined') return DEFAULT_TIMEZONE
  try {
    const userData = localStorage.getItem('userData')
    if (userData) {
      const parsed = JSON.parse(userData)
      if (parsed.clubTimezone) return parsed.clubTimezone
    }
  } catch {
    // ignore
  }
  return DEFAULT_TIMEZONE
}

/**
 * Format a UTC date's time component in the club timezone.
 * Example: formatTime(date) => "2:30 PM"
 */
export function formatTime(date: Date | string, timezone?: string): string {
  const tz = timezone || getClubTimezone()
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz,
  })
}

/**
 * Format a UTC date's time component in short format (no leading zero).
 * Example: formatTimeShort(date) => "2:30 PM"
 */
export function formatTimeShort(date: Date | string, timezone?: string): string {
  const tz = timezone || getClubTimezone()
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: tz,
  })
}

/**
 * Format a full date+time in the club timezone.
 * Example: formatDateTime(date) => "3/23/2026, 2:30:00 PM"
 */
export function formatDateTime(date: Date | string, timezone?: string): string {
  const tz = timezone || getClubTimezone()
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('en-US', { timeZone: tz })
}

/**
 * Format a timestamp for display with day info.
 * Example: formatTimestamp(date) => "Mon, Mar 23, 2026, 2:30 PM"
 */
export function formatTimestamp(date: Date | string, timezone?: string): string {
  const tz = timezone || getClubTimezone()
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: tz,
  })
}

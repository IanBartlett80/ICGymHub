export const ALLOWED_REMINDER_DAYS = [90, 30, 7, 1] as const

export type ReminderDay = typeof ALLOWED_REMINDER_DAYS[number]

export interface FileLink {
  name: string
  url: string
}

export function normalizeReminderSchedule(input: unknown): number[] {
  if (!Array.isArray(input)) return []
  const sanitized = input
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && ALLOWED_REMINDER_DAYS.includes(value as ReminderDay))
  return Array.from(new Set(sanitized)).sort((a, b) => b - a)
}

export function parseJsonArray<T>(value: string | null | undefined, fallback: T[] = []): T[] {
  if (!value) return fallback
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

export function normalizeFileLinks(input: unknown): FileLink[] {
  if (!Array.isArray(input)) return []

  return input
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null
      const record = entry as { name?: unknown; url?: unknown }
      const rawUrl = typeof record.url === 'string' ? record.url.trim() : ''
      const rawName = typeof record.name === 'string' ? record.name.trim() : ''
      if (!rawUrl) return null

      try {
        const parsed = new URL(rawUrl)
        if (!['http:', 'https:'].includes(parsed.protocol)) return null
      } catch {
        return null
      }

      return {
        name: rawName || rawUrl,
        url: rawUrl,
      }
    })
    .filter((entry): entry is FileLink => entry !== null)
}

export function getDerivedComplianceStatus(status: string, deadlineDate: Date): string {
  if (status === 'COMPLETED') return 'COMPLETED'
  const now = new Date()
  if (deadlineDate.getTime() < now.getTime()) return 'OVERDUE'
  return status
}

export function calculateNextReminderDate(deadlineDate: Date, reminderDays: number[], now = new Date()): Date | null {
  if (!reminderDays.length) return null

  const sorted = [...reminderDays].sort((a, b) => b - a)
  for (const daysBefore of sorted) {
    const reminderDate = new Date(deadlineDate)
    reminderDate.setDate(reminderDate.getDate() - daysBefore)
    reminderDate.setHours(0, 0, 0, 0)
    if (reminderDate.getTime() >= now.getTime()) {
      return reminderDate
    }
  }

  return null
}

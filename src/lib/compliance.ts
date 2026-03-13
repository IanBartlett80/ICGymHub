export const ALLOWED_REMINDER_DAYS = [90, 30, 7, 1] as const

export type ReminderDay = typeof ALLOWED_REMINDER_DAYS[number]

export const RECURRING_SCHEDULES = ['NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const
export type RecurringSchedule = typeof RECURRING_SCHEDULES[number]

export interface FileLink {
  name: string
  url: string
}

export interface UploadedFile {
  name: string
  data: string // base64 encoded file data
  type: string // MIME type
  size: number // file size in bytes
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

export function normalizeUploadedFiles(input: unknown): UploadedFile[] {
  if (!Array.isArray(input)) return []

  return input
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null
      const record = entry as { name?: unknown; data?: unknown; type?: unknown; size?: unknown }
      
      const rawName = typeof record.name === 'string' ? record.name.trim() : ''
      const rawData = typeof record.data === 'string' ? record.data.trim() : ''
      const rawType = typeof record.type === 'string' ? record.type.trim() : ''
      const rawSize = typeof record.size === 'number' ? record.size : 0

      // Validate required fields
      if (!rawName || !rawData) return null

      // Validate base64 format (should start with data:)
      if (!rawData.startsWith('data:')) return null

      // Validate file size (max 10MB)
      if (rawSize > 10 * 1024 * 1024) return null

      return {
        name: rawName,
        data: rawData,
        type: rawType,
        size: rawSize,
      }
    })
    .filter((entry): entry is UploadedFile => entry !== null)
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

export function normalizeRecurringSchedule(input: unknown): RecurringSchedule {
  if (typeof input === 'string' && RECURRING_SCHEDULES.includes(input as RecurringSchedule)) {
    return input as RecurringSchedule
  }
  return 'NONE'
}

export function calculateNextDeadline(currentDeadline: Date, recurringSchedule: RecurringSchedule): Date {
  const nextDeadline = new Date(currentDeadline)
  
  switch (recurringSchedule) {
    case 'DAILY':
      nextDeadline.setDate(nextDeadline.getDate() + 1)
      break
    case 'WEEKLY':
      nextDeadline.setDate(nextDeadline.getDate() + 7)
      break
    case 'MONTHLY':
      nextDeadline.setMonth(nextDeadline.getMonth() + 1)
      break
    case 'YEARLY':
      nextDeadline.setFullYear(nextDeadline.getFullYear() + 1)
      break
    case 'NONE':
    default:
      return currentDeadline
  }
  
  return nextDeadline
}

'use client'

import { useCallback, useEffect, useState } from 'react'
import axiosInstance from '@/lib/axios'

type MetricTone = 'red' | 'amber' | 'green' | 'neutral'

interface SummaryMetric {
  label: string
  value: string | number
  tone: MetricTone
}

interface AISummaryData {
  narrative: string | null
  metrics: SummaryMetric[]
  aiEnabled: boolean
  generatedAt: string
}

interface AISummaryPanelProps {
  /** API endpoint that returns an AISummaryData payload. */
  endpoint: string
  /** Panel heading, e.g. "Roster Intelligence". */
  title: string
  /** Emoji or short glyph shown in the header badge. */
  icon: string
  /** Tailwind gradient classes for the header accent, e.g. "from-indigo-600 to-blue-600". */
  accent: string
}

const TONE_CHIP: Record<MetricTone, string> = {
  red: 'bg-red-50 text-red-700 ring-red-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  green: 'bg-green-50 text-green-700 ring-green-200',
  neutral: 'bg-gray-50 text-gray-700 ring-gray-200',
}

// Cache successful summaries per-endpoint for the session so navigating back to
// a page does not trigger a fresh OpenAI call every time. Manual refresh and
// the TTL below force regeneration.
const CACHE_TTL_MS = 10 * 60 * 1000

function cacheKey(endpoint: string) {
  return `ai-summary:${endpoint}`
}

function readCache(endpoint: string): AISummaryData | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(cacheKey(endpoint))
    if (!raw) return null
    const parsed = JSON.parse(raw) as AISummaryData
    if (!parsed.generatedAt) return null
    if (Date.now() - new Date(parsed.generatedAt).getTime() > CACHE_TTL_MS) return null
    return parsed
  } catch {
    return null
  }
}

function writeCache(endpoint: string, data: AISummaryData) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(cacheKey(endpoint), JSON.stringify(data))
  } catch {
    // sessionStorage may be unavailable (private mode / quota) — ignore.
  }
}

export default function AISummaryPanel({ endpoint, title, icon, accent }: AISummaryPanelProps) {
  const [data, setData] = useState<AISummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (force: boolean) => {
      if (force) {
        setRefreshing(true)
      } else {
        const cached = readCache(endpoint)
        if (cached) {
          setData(cached)
          setLoading(false)
          return
        }
        setLoading(true)
      }
      setError(null)
      try {
        const res = await axiosInstance.get<AISummaryData>(endpoint, {
          params: force ? { refresh: 1 } : undefined,
        })
        setData(res.data)
        writeCache(endpoint, res.data)
      } catch {
        setError('Unable to load summary right now.')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [endpoint]
  )

  useEffect(() => {
    load(false)
  }, [load])

  if (loading) {
    return (
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-48 rounded bg-gray-200" />
          <div className="h-4 w-full rounded bg-gray-100" />
          <div className="h-4 w-5/6 rounded bg-gray-100" />
          <div className="flex gap-2 pt-1">
            <div className="h-7 w-24 rounded-full bg-gray-100" />
            <div className="h-7 w-24 rounded-full bg-gray-100" />
            <div className="h-7 w-24 rounded-full bg-gray-100" />
          </div>
        </div>
      </div>
    )
  }

  // Fail silently if the summary cannot be loaded at all — never block the page.
  if (error && !data) {
    return null
  }

  if (!data) return null

  const generatedLabel = new Date(data.generatedAt).toLocaleString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'short',
  })

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className={`flex items-center justify-between bg-gradient-to-r ${accent} px-5 py-3`}>
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-lg" aria-hidden>
            {icon}
          </span>
          <div>
            <h2 className="text-sm font-semibold text-white">{title}</h2>
            <p className="text-[11px] text-white/70">AI overview • updated {generatedLabel}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={refreshing}
          className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/25 disabled:opacity-60"
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="p-5">
        {data.metrics.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {data.metrics.map((m) => (
              <span
                key={m.label}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${TONE_CHIP[m.tone]}`}
              >
                <span className="font-semibold">{m.value}</span>
                <span className="opacity-80">{m.label}</span>
              </span>
            ))}
          </div>
        )}

        {data.narrative ? (
          <div className="space-y-2 text-sm leading-relaxed text-gray-700">
            {data.narrative
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line, i) => (
                <p key={i}>{line.replace(/^[-•*]\s*/, '• ')}</p>
              ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            {data.aiEnabled
              ? 'AI narrative is temporarily unavailable. The metrics above are current.'
              : 'AI narratives are not enabled for this workspace. The metrics above are current.'}
          </p>
        )}

        <p className="mt-3 text-[11px] text-gray-400">
          AI-generated overview — verify against the live records below before acting.
        </p>
      </div>
    </div>
  )
}

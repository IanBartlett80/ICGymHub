'use client'

import Link from 'next/link'
import type { Kpi, InsightAction, Tone } from '@/lib/analytics/types'

const TONE_CARD: Record<Tone, string> = {
  red: 'border-red-200 bg-red-50',
  amber: 'border-amber-200 bg-amber-50',
  green: 'border-green-200 bg-green-50',
  neutral: 'border-gray-200 bg-white',
}

const TONE_VALUE: Record<Tone, string> = {
  red: 'text-red-700',
  amber: 'text-amber-700',
  green: 'text-green-700',
  neutral: 'text-gray-900',
}

export function KpiCards({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {kpis.map((k) => (
        <div key={k.key} className={`rounded-xl border p-4 ${TONE_CARD[k.tone]}`}>
          <p className="text-xs font-medium text-gray-500">{k.label}</p>
          <p className={`mt-1 text-2xl font-bold ${TONE_VALUE[k.tone]}`}>{k.value}</p>
          {k.hint && <p className="mt-0.5 text-[11px] text-gray-500">{k.hint}</p>}
        </div>
      ))}
    </div>
  )
}

export function ScoreGauge({ score, tone, label }: { score: number; tone: Tone; label: string }) {
  const ring =
    tone === 'green' ? 'text-green-500' : tone === 'amber' ? 'text-amber-500' : 'text-red-500'
  const circumference = 2 * Math.PI * 42
  const offset = circumference - (score / 100) * circumference
  return (
    <div className="flex items-center gap-4">
      <div className="relative h-28 w-28 shrink-0">
        <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" strokeWidth="10" className="stroke-gray-100" />
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={`${ring} transition-all duration-700`}
            stroke="currentColor"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-gray-900">{score}</span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">/ 100</span>
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <p className="mt-1 text-xs text-gray-500">
          {score >= 85
            ? 'Healthy — no major risks detected.'
            : score >= 65
            ? 'Watch — some items need attention.'
            : 'Action needed — urgent risks present.'}
        </p>
      </div>
    </div>
  )
}

const SEVERITY_STYLE: Record<InsightAction['severity'], { dot: string; chip: string; label: string }> = {
  critical: { dot: 'bg-red-500', chip: 'bg-red-50 text-red-700', label: 'Critical' },
  warning: { dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700', label: 'Warning' },
  info: { dot: 'bg-blue-500', chip: 'bg-blue-50 text-blue-700', label: 'Info' },
}

interface InsightPanelProps {
  title: string
  icon: string
  accent: string
  narrative: string | null
  actions: InsightAction[]
  aiEnabled: boolean
  generatedAt?: string
  refreshing?: boolean
  onRefresh?: () => void
}

export function InsightPanel({
  title,
  icon,
  accent,
  narrative,
  actions,
  aiEnabled,
  generatedAt,
  refreshing,
  onRefresh,
}: InsightPanelProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className={`flex items-center justify-between bg-gradient-to-r ${accent} px-5 py-3`}>
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-lg" aria-hidden>
            {icon}
          </span>
          <div>
            <h2 className="text-sm font-semibold text-white">{title}</h2>
            {generatedAt && (
              <p className="text-[11px] text-white/70">
                AI overview • updated{' '}
                {new Date(generatedAt).toLocaleString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                  day: 'numeric',
                  month: 'short',
                })}
              </p>
            )}
          </div>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/25 disabled:opacity-60"
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        )}
      </div>

      <div className="grid gap-5 p-5 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Briefing</h3>
          {narrative ? (
            <div className="space-y-2 text-sm leading-relaxed text-gray-700">
              {narrative
                .split('\n')
                .map((l) => l.trim())
                .filter(Boolean)
                .map((line, i) => (
                  <p key={i}>{line.replace(/^[-•*]\s*/, '• ')}</p>
                ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              {aiEnabled
                ? 'AI narrative is temporarily unavailable. The metrics and actions are current.'
                : 'AI narratives are not enabled for this workspace. The metrics and actions are current.'}
            </p>
          )}
          <p className="mt-3 text-[11px] text-gray-400">
            AI-generated overview — verify against live records before acting.
          </p>
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Recommended actions</h3>
          <ul className="space-y-2">
            {actions.map((a, i) => {
              const s = SEVERITY_STYLE[a.severity]
              const body = (
                <div className="flex items-start gap-3 rounded-lg border border-gray-100 p-3 transition hover:border-gray-200 hover:bg-gray-50">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${s.chip}`}>{s.label}</span>
                      <p className="text-sm font-medium text-gray-900">{a.title}</p>
                    </div>
                    {a.detail && <p className="mt-0.5 text-xs text-gray-500">{a.detail}</p>}
                  </div>
                </div>
              )
              return (
                <li key={i}>{a.href ? <Link href={a.href}>{body}</Link> : body}</li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}

export function ChartCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

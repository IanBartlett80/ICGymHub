'use client'

import { useCallback, useEffect, useState } from 'react'
import axiosInstance from '@/lib/axios'
import DashboardLayout from '@/components/DashboardLayout'
import { KpiCards, ScoreGauge, InsightPanel, ChartCard } from '@/components/analytics/AnalyticsKit'
import type { Kpi, InsightAction, Tone, SeriesPoint } from '@/lib/analytics/types'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface VenueRisk {
  venueId: string
  venueName: string
  openIncidents: number
  openSafetyIssues: number
  overdueMaintenance: number
  riskScore: number
}

interface OverviewData {
  score: number
  scoreTone: Tone
  kpis: Kpi[]
  trend: SeriesPoint[]
  venueRisk: VenueRisk[]
  insight: {
    narrative: string | null
    actions: InsightAction[]
    aiEnabled: boolean
    generatedAt: string
  }
  generatedAt: string
}

function riskBadge(score: number) {
  if (score >= 12) return 'bg-red-50 text-red-700'
  if (score >= 5) return 'bg-amber-50 text-amber-700'
  return 'bg-green-50 text-green-700'
}

export default function AnalyticsOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (refresh: boolean) => {
    if (refresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const res = await axiosInstance.get<OverviewData>('/api/analytics/overview')
      setData(res.data)
    } catch {
      setError('Unable to load analytics overview right now.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load(false)
  }, [load])

  return (
    <DashboardLayout showAnalyticsNav>
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Overview</h1>
            <p className="text-sm text-gray-500">
              Club-wide safety &amp; operations command centre, backed by AI.
            </p>
          </div>
          <a
            href="/api/analytics/export?section=overview"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            <span aria-hidden>📄</span> Export report
          </a>
        </div>

        {loading && (
          <div className="space-y-4">
            <div className="h-32 animate-pulse rounded-2xl bg-gray-100" />
            <div className="h-24 animate-pulse rounded-2xl bg-gray-100" />
          </div>
        )}

        {error && !data && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">{error}</div>
        )}

        {data && (
          <>
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <ScoreGauge score={data.score} tone={data.scoreTone} label="Safety & Operations Score" />
              </div>
              <div className="lg:col-span-2">
                <KpiCards kpis={data.kpis} />
              </div>
            </div>

            <InsightPanel
              title="Executive Briefing"
              icon="🧭"
              accent="from-indigo-600 to-blue-600"
              narrative={data.insight.narrative}
              actions={data.insight.actions}
              aiEnabled={data.insight.aiEnabled}
              generatedAt={data.insight.generatedAt}
              refreshing={refreshing}
              onRefresh={() => load(true)}
            />

            <div className="grid gap-5 lg:grid-cols-2">
              <ChartCard title="Incident trend" subtitle="Last 6 months — total vs high/critical">
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={data.trend}>
                    <defs>
                      <linearGradient id="ovTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="ovCrit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="incidents" stroke="#6366f1" fill="url(#ovTotal)" name="Incidents" />
                    <Area type="monotone" dataKey="critical" stroke="#ef4444" fill="url(#ovCrit)" name="High/Critical" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Venue risk ranking" subtitle="Composite of open incidents, safety issues & overdue maintenance">
                {data.venueRisk.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">No venues configured.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                          <th className="py-2 pr-3 font-medium">Venue</th>
                          <th className="py-2 px-2 text-center font-medium">Incidents</th>
                          <th className="py-2 px-2 text-center font-medium">Safety</th>
                          <th className="py-2 px-2 text-center font-medium">Maint.</th>
                          <th className="py-2 pl-2 text-right font-medium">Risk</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.venueRisk.map((v) => (
                          <tr key={v.venueId} className="border-b border-gray-50 last:border-0">
                            <td className="py-2.5 pr-3 font-medium text-gray-900">{v.venueName}</td>
                            <td className="py-2.5 px-2 text-center text-gray-600">{v.openIncidents}</td>
                            <td className="py-2.5 px-2 text-center text-gray-600">{v.openSafetyIssues}</td>
                            <td className="py-2.5 px-2 text-center text-gray-600">{v.overdueMaintenance}</td>
                            <td className="py-2.5 pl-2 text-right">
                              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${riskBadge(v.riskScore)}`}>
                                {v.riskScore}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </ChartCard>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

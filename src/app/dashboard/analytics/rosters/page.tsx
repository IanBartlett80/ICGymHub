'use client'

import { useCallback, useEffect, useState } from 'react'
import axiosInstance from '@/lib/axios'
import DashboardLayout from '@/components/DashboardLayout'
import VenueSelector from '@/components/VenueSelector'
import { KpiCards, InsightPanel, ChartCard } from '@/components/analytics/AnalyticsKit'
import type { Kpi, InsightAction, SeriesPoint, Bucket } from '@/lib/analytics/types'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface CoachUtil {
  coach: string
  sessions: number
  accreditation: string
}
interface Coverage {
  gymsport: string
  coaches: number
  atRisk: boolean
}
interface RosterData {
  kpis: Kpi[]
  conflictByType: Bucket[]
  coachUtilization: CoachUtil[]
  idleCoaches: string[]
  accreditationCoverage: Coverage[]
  conflictTrend: SeriesPoint[]
  insight: { narrative: string | null; actions: InsightAction[]; aiEnabled: boolean; generatedAt: string }
  generatedAt: string
}

export default function RosterAnalyticsPage() {
  const [data, setData] = useState<RosterData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [venueId, setVenueId] = useState<string | null>(null)

  const load = useCallback(
    async (refresh: boolean) => {
      if (refresh) setRefreshing(true)
      else setLoading(true)
      try {
        const params = new URLSearchParams()
        if (venueId && venueId !== 'all') params.append('venueId', venueId)
        const res = await axiosInstance.get<RosterData>(`/api/analytics/rosters?${params}`)
        setData(res.data)
      } catch {
        // fail silently
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [venueId]
  )

  useEffect(() => {
    load(false)
  }, [load])

  const topCoaches = data?.coachUtilization.filter((c) => c.sessions > 0).slice(0, 10) ?? []

  return (
    <DashboardLayout showAnalyticsNav>
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rosters &amp; Coaching Analytics</h1>
            <p className="text-sm text-gray-500">Coach utilisation, conflict patterns and accreditation coverage.</p>
          </div>
          <div className="flex items-center gap-3">
            <VenueSelector value={venueId} onChange={setVenueId} showLabel={false} />
            <a
              href={`/api/analytics/export?section=rosters${venueId && venueId !== 'all' ? `&venueId=${venueId}` : ''}`}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <span aria-hidden>📄</span> Export
            </a>
          </div>
        </div>

        {loading && <div className="h-32 animate-pulse rounded-2xl bg-gray-100" />}

        {data && (
          <>
            <KpiCards kpis={data.kpis} />

            <InsightPanel
              title="Workforce Intelligence"
              icon="📅"
              accent="from-violet-600 to-fuchsia-600"
              narrative={data.insight.narrative}
              actions={data.insight.actions}
              aiEnabled={data.insight.aiEnabled}
              generatedAt={data.insight.generatedAt}
              refreshing={refreshing}
              onRefresh={() => load(true)}
            />

            <div className="grid gap-5 lg:grid-cols-2">
              <ChartCard title="Conflict trend" subtitle="Conflicts vs total slots, last 6 months">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.conflictTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" fill="#c7d2fe" name="Total slots" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="conflicts" fill="#f59e0b" name="Conflicts" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Accreditation coverage" subtitle="Active coaches accredited per gymsport">
                {data.accreditationCoverage.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">No gymsports configured.</p>
                ) : (
                  <div className="space-y-2">
                    {data.accreditationCoverage.map((g) => (
                      <div key={g.gymsport} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                        <span className="text-sm font-medium text-gray-900">{g.gymsport}</span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            g.atRisk ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                          }`}
                        >
                          {g.coaches} coach{g.coaches === 1 ? '' : 'es'}
                          {g.atRisk ? ' • at risk' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </ChartCard>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <ChartCard title="Top coach utilisation" subtitle="Sessions in window">
                {topCoaches.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">No sessions assigned in this window.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(220, topCoaches.length * 34)}>
                    <BarChart data={topCoaches} layout="vertical" margin={{ left: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                      <YAxis type="category" dataKey="coach" width={110} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="sessions" fill="#8b5cf6" name="Sessions" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Idle coaches" subtitle="Active coaches with no sessions in window">
                {data.idleCoaches.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">All active coaches are rostered. 🎉</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {data.idleCoaches.map((c) => (
                      <span key={c} className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                        {c}
                      </span>
                    ))}
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

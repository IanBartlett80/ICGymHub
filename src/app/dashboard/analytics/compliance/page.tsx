'use client'

import { useCallback, useEffect, useState } from 'react'
import axiosInstance from '@/lib/axios'
import DashboardLayout from '@/components/DashboardLayout'
import VenueSelector from '@/components/VenueSelector'
import { KpiCards, InsightPanel, ChartCard } from '@/components/analytics/AnalyticsKit'
import type { Kpi, InsightAction, SeriesPoint } from '@/lib/analytics/types'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface CategoryRisk {
  category: string
  open: number
  overdue: number
}
interface OwnerPerf {
  owner: string
  open: number
  overdue: number
}
interface Upcoming {
  title: string
  ownerName: string | null
  category: string | null
  deadlineDate: string
  daysUntil: number
}
interface ComplianceData {
  kpis: Kpi[]
  completionTrend: SeriesPoint[]
  categoryRisk: CategoryRisk[]
  ownerPerformance: OwnerPerf[]
  upcoming: Upcoming[]
  insight: { narrative: string | null; actions: InsightAction[]; aiEnabled: boolean; generatedAt: string }
  generatedAt: string
}

export default function ComplianceAnalyticsPage() {
  const [data, setData] = useState<ComplianceData | null>(null)
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
        const res = await axiosInstance.get<ComplianceData>(`/api/analytics/compliance?${params}`)
        setData(res.data)
      } catch {
        // fail silently — page shows empty state
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

  return (
    <DashboardLayout showAnalyticsNav>
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Compliance Analytics</h1>
            <p className="text-sm text-gray-500">Completion performance, category risk and upcoming deadlines.</p>
          </div>
          <div className="flex items-center gap-3">
            <VenueSelector value={venueId} onChange={setVenueId} showLabel={false} />
            <a
              href={`/api/analytics/export?section=compliance${venueId && venueId !== 'all' ? `&venueId=${venueId}` : ''}`}
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
              title="Compliance Intelligence"
              icon="✅"
              accent="from-emerald-600 to-teal-600"
              narrative={data.insight.narrative}
              actions={data.insight.actions}
              aiEnabled={data.insight.aiEnabled}
              generatedAt={data.insight.generatedAt}
              refreshing={refreshing}
              onRefresh={() => load(true)}
            />

            <div className="grid gap-5 lg:grid-cols-2">
              <ChartCard title="Completed vs created" subtitle="Last 6 months">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.completionTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="completed" fill="#10b981" name="Completed" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="created" fill="#6366f1" name="Created" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Category risk" subtitle="Open and overdue items by category">
                {data.categoryRisk.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">No compliance items yet.</p>
                ) : (
                  <div className="space-y-2">
                    {data.categoryRisk.slice(0, 8).map((c) => (
                      <div key={c.category} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                        <span className="text-sm font-medium text-gray-900">{c.category}</span>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-gray-50 px-2.5 py-0.5 text-xs text-gray-600">{c.open} open</span>
                          {c.overdue > 0 && (
                            <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">{c.overdue} overdue</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ChartCard>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <ChartCard title="Owner workload" subtitle="Open and overdue by owner">
                {data.ownerPerformance.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">No assigned owners.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                          <th className="py-2 pr-3 font-medium">Owner</th>
                          <th className="py-2 px-2 text-center font-medium">Open</th>
                          <th className="py-2 pl-2 text-right font-medium">Overdue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.ownerPerformance.map((o) => (
                          <tr key={o.owner} className="border-b border-gray-50 last:border-0">
                            <td className="py-2.5 pr-3 font-medium text-gray-900">{o.owner}</td>
                            <td className="py-2.5 px-2 text-center text-gray-600">{o.open}</td>
                            <td className="py-2.5 pl-2 text-right">
                              <span className={o.overdue > 0 ? 'font-semibold text-red-600' : 'text-gray-400'}>{o.overdue}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </ChartCard>

              <ChartCard title="Upcoming deadlines" subtitle="Next 30 days">
                {data.upcoming.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">Nothing due in the next 30 days.</p>
                ) : (
                  <ul className="space-y-2">
                    {data.upcoming.map((u, i) => (
                      <li key={i} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900">{u.title}</p>
                          <p className="text-xs text-gray-500">
                            {u.category ? `${u.category} • ` : ''}
                            {u.ownerName || 'No owner'}
                          </p>
                        </div>
                        <span
                          className={`ml-3 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            u.daysUntil <= 7 ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-600'
                          }`}
                        >
                          {u.daysUntil <= 0 ? 'due today' : `${u.daysUntil}d`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </ChartCard>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

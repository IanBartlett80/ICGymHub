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
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface VenueHealth {
  venueName: string
  equipment: number
  outOfService: number
  openSafety: number
  overdueMaintenance: number
  riskScore: number
}
interface Upcoming {
  title: string
  equipment: string | null
  priority: string
  dueDate: string | null
  daysUntil: number | null
}
interface EquipmentData {
  kpis: Kpi[]
  conditionBreakdown: Bucket[]
  categoryBreakdown: { category: string; count: number }[]
  safetyByType: Bucket[]
  maintStatus: Bucket[]
  safetyTrend: SeriesPoint[]
  venueHealth: VenueHealth[]
  upcoming: Upcoming[]
  insight: { narrative: string | null; actions: InsightAction[]; aiEnabled: boolean; generatedAt: string }
  generatedAt: string
}

const TONE_HEX: Record<NonNullable<Bucket['tone']>, string> = {
  red: '#ef4444',
  amber: '#f59e0b',
  green: '#10b981',
  neutral: '#94a3b8',
}

function riskBadge(score: number) {
  if (score >= 12) return 'bg-red-50 text-red-700'
  if (score >= 5) return 'bg-amber-50 text-amber-700'
  return 'bg-green-50 text-green-700'
}

export default function EquipmentAnalyticsPage() {
  const [data, setData] = useState<EquipmentData | null>(null)
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
        const res = await axiosInstance.get<EquipmentData>(`/api/analytics/equipment?${params}`)
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
            <h1 className="text-2xl font-bold text-gray-900">Equipment &amp; Safety Analytics</h1>
            <p className="text-sm text-gray-500">Fleet condition, safety issues and maintenance backlog, backed by AI.</p>
          </div>
          <div className="flex items-center gap-3">
            <VenueSelector value={venueId} onChange={setVenueId} showLabel={false} />
            <a
              href={`/api/analytics/export?section=equipment${venueId && venueId !== 'all' ? `&venueId=${venueId}` : ''}`}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <span aria-hidden>📄</span> Export
            </a>
          </div>
        </div>

        {loading && (
          <div className="space-y-4">
            <div className="h-32 animate-pulse rounded-2xl bg-gray-100" />
            <div className="h-24 animate-pulse rounded-2xl bg-gray-100" />
          </div>
        )}

        {data && (
          <>
            <KpiCards kpis={data.kpis} />

            <InsightPanel
              title="Equipment Intelligence"
              icon="🛠️"
              accent="from-amber-600 to-orange-600"
              narrative={data.insight.narrative}
              actions={data.insight.actions}
              aiEnabled={data.insight.aiEnabled}
              generatedAt={data.insight.generatedAt}
              refreshing={refreshing}
              onRefresh={() => load(true)}
            />

            <div className="grid gap-5 lg:grid-cols-2">
              <ChartCard title="Condition distribution" subtitle="Active equipment by condition">
                {data.conditionBreakdown.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">No equipment recorded.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={data.conditionBreakdown}
                        dataKey="value"
                        nameKey="label"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={2}
                      >
                        {data.conditionBreakdown.map((c, i) => (
                          <Cell key={i} fill={TONE_HEX[c.tone || 'neutral']} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Safety issue trend" subtitle="Reported vs resolved, last 6 months">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.safetyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="reported" fill="#f59e0b" name="Reported" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="resolved" fill="#10b981" name="Resolved" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <ChartCard title="Open safety issues by type" subtitle="What's being reported">
                {data.safetyByType.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">No open safety issues. 🎉</p>
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(220, data.safetyByType.length * 34)}>
                    <BarChart data={data.safetyByType} layout="vertical" margin={{ left: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                      <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#f59e0b" name="Open" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Maintenance status" subtitle="All maintenance tasks by status">
                {data.maintStatus.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">No maintenance tasks.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={data.maintStatus}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="value" name="Tasks" radius={[4, 4, 0, 0]}>
                        {data.maintStatus.map((m, i) => (
                          <Cell key={i} fill={TONE_HEX[m.tone || 'neutral']} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>

            <ChartCard title="Venue health" subtitle="Equipment risk by venue">
              {data.venueHealth.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">No venue-linked equipment.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                        <th className="py-2 pr-3 font-medium">Venue</th>
                        <th className="py-2 px-2 text-center font-medium">Equipment</th>
                        <th className="py-2 px-2 text-center font-medium">Out of service</th>
                        <th className="py-2 px-2 text-center font-medium">Open safety</th>
                        <th className="py-2 px-2 text-center font-medium">Overdue maint.</th>
                        <th className="py-2 pl-2 text-right font-medium">Risk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.venueHealth.map((v) => (
                        <tr key={v.venueName} className="border-b border-gray-50 last:border-0">
                          <td className="py-2.5 pr-3 font-medium text-gray-900">{v.venueName}</td>
                          <td className="py-2.5 px-2 text-center text-gray-600">{v.equipment}</td>
                          <td className="py-2.5 px-2 text-center">
                            <span className={v.outOfService > 0 ? 'font-semibold text-red-600' : 'text-gray-400'}>{v.outOfService}</span>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span className={v.openSafety > 0 ? 'font-semibold text-amber-600' : 'text-gray-400'}>{v.openSafety}</span>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span className={v.overdueMaintenance > 0 ? 'font-semibold text-red-600' : 'text-gray-400'}>{v.overdueMaintenance}</span>
                          </td>
                          <td className="py-2.5 pl-2 text-right">
                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${riskBadge(v.riskScore)}`}>{v.riskScore}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ChartCard>

            <div className="grid gap-5 lg:grid-cols-2">
              <ChartCard title="Upcoming maintenance" subtitle="Due in the next 30 days">
                {data.upcoming.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">Nothing due in the next 30 days.</p>
                ) : (
                  <ul className="space-y-2">
                    {data.upcoming.map((u, i) => (
                      <li key={i} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900">{u.title}</p>
                          <p className="text-xs text-gray-500">{u.equipment || 'Unassigned equipment'}</p>
                        </div>
                        <span
                          className={`ml-3 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            u.daysUntil !== null && u.daysUntil <= 7 ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-600'
                          }`}
                        >
                          {u.daysUntil === null ? '—' : u.daysUntil <= 0 ? 'due today' : `${u.daysUntil}d`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </ChartCard>

              <ChartCard title="Equipment by category" subtitle="Active fleet composition">
                {data.categoryBreakdown.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">No categories configured.</p>
                ) : (
                  <div className="space-y-2">
                    {data.categoryBreakdown.map((c) => (
                      <div key={c.category} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                        <span className="text-sm font-medium text-gray-900">{c.category}</span>
                        <span className="rounded-full bg-gray-50 px-2.5 py-0.5 text-xs text-gray-600">{c.count} item{c.count === 1 ? '' : 's'}</span>
                      </div>
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

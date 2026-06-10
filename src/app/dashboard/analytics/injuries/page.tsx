'use client'

import { useCallback, useEffect, useState } from 'react'
import axiosInstance from '@/lib/axios'
import DashboardLayout from '@/components/DashboardLayout'
import VenueSelector from '@/components/VenueSelector'
import { KpiCards, InsightPanel, ChartCard } from '@/components/analytics/AnalyticsKit'
import type { Kpi, InsightAction, SeriesPoint, Bucket } from '@/lib/analytics/types'
import {
  AreaChart,
  Area,
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

interface VenueRow {
  venueName: string
  total: number
  open: number
  critical: number
}
interface InjuryData {
  kpis: Kpi[]
  trend: SeriesPoint[]
  statusBreakdown: Bucket[]
  priorityBreakdown: Bucket[]
  venueBreakdown: VenueRow[]
  zoneHotspots: { zone: string; count: number }[]
  equipmentInjuries: { equipment: string; count: number }[]
  dayOfWeek: SeriesPoint[]
  insight: { narrative: string | null; actions: InsightAction[]; aiEnabled: boolean; generatedAt: string }
  generatedAt: string
}

const TONE_HEX: Record<NonNullable<Bucket['tone']>, string> = {
  red: '#ef4444',
  amber: '#f59e0b',
  green: '#10b981',
  neutral: '#94a3b8',
}

export default function InjuryAnalyticsPage() {
  const [data, setData] = useState<InjuryData | null>(null)
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
        const res = await axiosInstance.get<InjuryData>(`/api/analytics/injuries?${params}`)
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
            <h1 className="text-2xl font-bold text-gray-900">Injuries &amp; Incidents Analytics</h1>
            <p className="text-sm text-gray-500">Open load, resolution performance and incident hotspots, backed by AI.</p>
          </div>
          <div className="flex items-center gap-3">
            <VenueSelector value={venueId} onChange={setVenueId} showLabel={false} />
            <a
              href={`/api/analytics/export?section=injuries${venueId && venueId !== 'all' ? `&venueId=${venueId}` : ''}`}
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
              title="Safety Intelligence"
              icon="🩹"
              accent="from-rose-600 to-red-600"
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
                      <linearGradient id="injTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="injCrit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="incidents" stroke="#6366f1" fill="url(#injTotal)" name="Incidents" />
                    <Area type="monotone" dataKey="critical" stroke="#ef4444" fill="url(#injCrit)" name="High/Critical" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Status distribution" subtitle="Current incident status mix">
                {data.statusBreakdown.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">No incidents recorded.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={data.statusBreakdown}
                        dataKey="value"
                        nameKey="label"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={2}
                      >
                        {data.statusBreakdown.map((s, i) => (
                          <Cell key={i} fill={TONE_HEX[s.tone || 'neutral']} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <ChartCard title="Priority breakdown" subtitle="Severity levels of incidents">
                {data.priorityBreakdown.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">No priority data.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={data.priorityBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="value" name="Incidents" radius={[4, 4, 0, 0]}>
                        {data.priorityBreakdown.map((p, i) => (
                          <Cell key={i} fill={TONE_HEX[p.tone || 'neutral']} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Day-of-week pattern" subtitle="When incidents occur — last 6 months">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.dayOfWeek}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="incidents" fill="#6366f1" name="Incidents" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <ChartCard title="Venue breakdown" subtitle="Incident load by venue">
              {data.venueBreakdown.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">No venue-linked incidents.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                        <th className="py-2 pr-3 font-medium">Venue</th>
                        <th className="py-2 px-2 text-center font-medium">Total</th>
                        <th className="py-2 px-2 text-center font-medium">Open</th>
                        <th className="py-2 pl-2 text-right font-medium">High/Critical</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.venueBreakdown.map((v) => (
                        <tr key={v.venueName} className="border-b border-gray-50 last:border-0">
                          <td className="py-2.5 pr-3 font-medium text-gray-900">{v.venueName}</td>
                          <td className="py-2.5 px-2 text-center text-gray-600">{v.total}</td>
                          <td className="py-2.5 px-2 text-center text-gray-600">{v.open}</td>
                          <td className="py-2.5 pl-2 text-right">
                            <span className={v.critical > 0 ? 'font-semibold text-red-600' : 'text-gray-400'}>{v.critical}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ChartCard>

            <div className="grid gap-5 lg:grid-cols-2">
              <ChartCard title="Zone hotspots" subtitle="Incidents linked to gym zones">
                {data.zoneHotspots.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">No zone-linked incidents.</p>
                ) : (
                  <div className="space-y-2">
                    {data.zoneHotspots.map((z) => (
                      <div key={z.zone} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                        <span className="text-sm font-medium text-gray-900">{z.zone}</span>
                        <span className="rounded-full bg-gray-50 px-2.5 py-0.5 text-xs text-gray-600">{z.count} incident{z.count === 1 ? '' : 's'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </ChartCard>

              <ChartCard title="Equipment-linked incidents" subtitle="Incidents associated with equipment">
                {data.equipmentInjuries.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">No equipment-linked incidents.</p>
                ) : (
                  <div className="space-y-2">
                    {data.equipmentInjuries.map((e) => (
                      <div key={e.equipment} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                        <span className="text-sm font-medium text-gray-900">{e.equipment}</span>
                        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">{e.count} incident{e.count === 1 ? '' : 's'}</span>
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

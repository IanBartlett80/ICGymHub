'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import axiosInstance from '@/lib/axios'

interface BriefingMetrics {
 overdueCompliance: number
 complianceDueIn30Days: number
 openIncidents: number
 criticalSafetyIssues: number
 overdueMaintenance: number
 maintenanceDueThisWeek: number
 rosterConflicts: number
 weeklyClasses: number
}

interface BriefingData {
 clubName: string
 healthScore: number
 status: 'GREEN' | 'YELLOW' | 'RED'
 metrics: BriefingMetrics
 narrative: string | null
 aiEnabled: boolean
 generatedAt: string
}

const STATUS_STYLES: Record<BriefingData['status'], { ring: string; text: string; label: string }> = {
 GREEN: { ring: 'text-green-500', text: 'text-green-700', label: 'On Track' },
 YELLOW: { ring: 'text-amber-500', text: 'text-amber-700', label: 'Needs Attention' },
 RED: { ring: 'text-red-500', text: 'text-red-700', label: 'Action Required' },
}

function HealthRing({ score, status }: { score: number; status: BriefingData['status'] }) {
 const radius = 34
 const circumference = 2 * Math.PI * radius
 const offset = circumference - (score / 100) * circumference
 const styles = STATUS_STYLES[status]

 return (
  <div className="relative w-24 h-24 flex-shrink-0">
   <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
    <circle cx="40" cy="40" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-200" />
    <circle
     cx="40"
     cy="40"
     r={radius}
     fill="none"
     stroke="currentColor"
     strokeWidth="8"
     strokeLinecap="round"
     strokeDasharray={circumference}
     strokeDashoffset={offset}
     className={`${styles.ring} transition-all duration-700`}
    />
   </svg>
   <div className="absolute inset-0 flex flex-col items-center justify-center">
    <span className="text-2xl font-bold text-gray-900">{score}</span>
    <span className="text-[10px] font-medium text-gray-500">/ 100</span>
   </div>
  </div>
 )
}

interface PriorityItem {
 label: string
 count: number
 href: string
 tone: 'red' | 'amber'
}

export default function DailyBriefing() {
 const [data, setData] = useState<BriefingData | null>(null)
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState<string | null>(null)

 useEffect(() => {
  let active = true
  const load = async () => {
   try {
    const res = await axiosInstance.get('/api/dashboard/briefing')
    if (active) setData(res.data)
   } catch (err: any) {
    if (active && err.response?.status !== 401) {
     setError('Unable to load your daily briefing right now.')
    }
   } finally {
    if (active) setLoading(false)
   }
  }
  load()
  return () => {
   active = false
  }
 }, [])

 if (loading) {
  return (
   <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
    <div className="h-5 w-48 bg-gray-200 rounded mb-4" />
    <div className="flex gap-4">
     <div className="w-24 h-24 bg-gray-200 rounded-full" />
     <div className="flex-1 space-y-2">
      <div className="h-3 bg-gray-200 rounded w-full" />
      <div className="h-3 bg-gray-200 rounded w-5/6" />
      <div className="h-3 bg-gray-200 rounded w-2/3" />
     </div>
    </div>
   </div>
  )
 }

 if (error || !data) {
  return null
 }

 const styles = STATUS_STYLES[data.status]
 const m = data.metrics

 const priorities: PriorityItem[] = [
  { label: 'overdue compliance item', count: m.overdueCompliance, href: '/dashboard/compliance-manager', tone: 'red' },
  { label: 'critical equipment safety issue', count: m.criticalSafetyIssues, href: '/dashboard/equipment', tone: 'red' },
  { label: 'open incident', count: m.openIncidents, href: '/dashboard/injury-reports', tone: 'amber' },
  { label: 'overdue maintenance task', count: m.overdueMaintenance, href: '/dashboard/maintenance', tone: 'amber' },
  { label: 'roster conflict this week', count: m.rosterConflicts, href: '/dashboard/class-rostering', tone: 'amber' },
 ].filter((p) => p.count > 0)

 return (
  <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl border border-indigo-200 p-5">
   <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2">
     <span className="text-xl">🌅</span>
     <div>
      <h3 className="text-base font-bold text-gray-900">Daily Briefing</h3>
      <p className="text-xs text-gray-500">Your facility status for today</p>
     </div>
    </div>
    <span className={`text-xs font-semibold px-3 py-1 rounded-full bg-white border ${styles.text} border-current/20`}>
     {styles.label}
    </span>
   </div>

   <div className="flex flex-col sm:flex-row gap-5">
    <div className="flex flex-col items-center">
     <HealthRing score={data.healthScore} status={data.status} />
     <span className="text-xs font-medium text-gray-600 mt-2">Health Score</span>
    </div>

    <div className="flex-1">
     {data.narrative ? (
      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{data.narrative}</p>
     ) : (
      <div className="text-sm text-gray-800">
       <p className="mb-2">
        Good day! Your facility health score is{' '}
        <span className="font-bold">{data.healthScore}/100</span> ({styles.label.toLowerCase()}).
       </p>
       {priorities.length === 0 ? (
        <p>Everything looks in good shape — no overdue items or open critical issues. Nice work!</p>
       ) : (
        <p>Here are the items that need your attention this week:</p>
       )}
      </div>
     )}

     {priorities.length > 0 && (
      <div className="mt-3 space-y-1.5">
       {priorities.map((p) => (
        <Link
         key={p.label}
         href={p.href}
         className={`flex items-center gap-2 text-sm font-medium hover:underline ${
          p.tone === 'red' ? 'text-red-700' : 'text-amber-700'
         }`}
        >
         <span className={`w-2 h-2 rounded-full ${p.tone === 'red' ? 'bg-red-500' : 'bg-amber-500'}`} />
         {p.count} {p.label}
         {p.count > 1 ? 's' : ''}
         <span className="text-gray-400">→</span>
        </Link>
       ))}
      </div>
     )}
    </div>
   </div>

   {!data.aiEnabled && (
    <p className="mt-4 text-[11px] text-gray-400">
     Tip: Configure an OpenAI API key to enable AI-written briefings.
    </p>
   )}
  </div>
 )
}

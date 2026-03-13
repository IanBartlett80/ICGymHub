'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DashboardLayout from '@/components/DashboardLayout'
import ConfigWizard from '@/components/ConfigWizard/ConfigWizard'
import axiosInstance from '@/lib/axios'
import { 
 BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
 XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts'

interface UserData {
 id: string
 username: string
 email: string
 fullName: string
 role: string
 clubId: string
 clubName: string
}

interface DashboardStats {
 rosters: {
  weeklyClasses: number
  activeConflicts: number
  upcomingClasses: number
  totalCoaches: number
  totalGymsports: number
  coachUtilization: number
  classGrowth: number
 }
 safety: {
  openIncidents: number
  totalThisMonth: number
  criticalIssues: number
  resolvedThisMonth: number
  avgResponseTime: number
  injuryTrend: number
 }
 equipment: {
  totalItems: number
  maintenanceDue: number
  criticalIssues: number
  inUse: number
  openSafetyIssues: number
  utilizationRate: number
 }
 maintenance: {
  pendingTasks: number
  overdueTasks: number
  completedThisMonth: number
  recurringTasks: number
  completionRate: number
 }
 compliance: {
  overdueItems: number
  dueInThirtyDays: number
  completionRate: number
  totalItems: number
 }
 charts: {
  weeklyClasses: Array<{ day: string; classes: number; conflicts: number }>
  injuryTrends: Array<{ month: string; incidents: number; critical: number }>
  equipmentStatus: Array<{ name: string; value: number; color: string }>
  maintenanceTrends: Array<{ month: string; completed: number; pending: number }>
  injurySeverity: Array<{ name: string; value: number; color: string }>
  safetyIssueTrends: Array<{ month: string; total: number; critical: number }>
 }
}

interface ComplianceTrend {
 month: string
 created: number
 completed: number
 overdue: number
}

export default function DashboardPage() {
 const router = useRouter()
 const [user, setUser] = useState<UserData | null>(null)
 const [loading, setLoading] = useState(true)
 const [stats, setStats] = useState<DashboardStats | null>(null)
 const [complianceTrend, setComplianceTrend] = useState<ComplianceTrend[]>([])
 const [analyticsError, setAnalyticsError] = useState<string | null>(null)
 const [showWizard, setShowWizard] = useState(false)

 useEffect(() => {
  const userData = localStorage.getItem('userData')
  if (userData) {
   setUser(JSON.parse(userData))
   fetchDashboardStats()
  } else {
   router.push('/sign-in')
  }
  setLoading(false)
 }, [router])

 // Auto-launch Configuration Wizard for new admins
 useEffect(() => {
  const checkAndLaunchWizard = async () => {
   if (!user) return
   
   // Only auto-launch for admins
   if (user.role !== 'ADMIN') return
   
   // Check if wizard was recently completed or dismissed
   const completed = localStorage.getItem('gymhub_wizard_completed')
   const dismissed = localStorage.getItem('gymhub_wizard_dismissed')
   
   if (completed) return
   
   if (dismissed) {
    const dismissedAt = localStorage.getItem('gymhub_wizard_dismissed_at')
    if (dismissedAt) {
     const dismissedDate = new Date(dismissedAt)
     const hoursSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60)
     // Don't auto-launch if dismissed within last 24 hours
     if (hoursSinceDismissed < 24) return
    }
   }
   
   try {
    // Check if venues exist (indicates if club is configured)
    const venuesRes = await axiosInstance.get('/api/venues')
    if (venuesRes.data.venues?.length === 0) {
     // No venues = new/unconfigured club, launch wizard
     setShowWizard(true)
    }
   } catch (err) {
    console.error('Failed to check venues for wizard auto-launch', err)
   }
  }
  
  checkAndLaunchWizard()
 }, [user])

 const fetchDashboardStats = async () => {
  try {
   setAnalyticsError(null)
   const [dashboardResponse, complianceResponse] = await Promise.all([
    axiosInstance.get('/api/dashboard/analytics'),
    axiosInstance.get('/api/compliance/analytics')
   ])

   if (dashboardResponse.data) {
    console.log('Dashboard analytics:', dashboardResponse.data)
    setStats(dashboardResponse.data)
   }

   // Set compliance trend data
   if (complianceResponse.data) {
    setComplianceTrend(complianceResponse.data.trend || [])
   }
  } catch (error: any) {
   console.error('Failed to fetch dashboard stats:', error)
   // The axios interceptor will handle 401 errors automatically
   // Only set error for other types of failures
   if (error.response?.status !== 401) {
    setAnalyticsError('Unable to load analytics data right now.')
   }
  }
 }

 const hasAnalyticsData = !!stats && (
  stats.rosters.weeklyClasses> 0 ||
  stats.rosters.activeConflicts> 0 ||
  stats.safety.totalThisMonth> 0 ||
  stats.safety.openIncidents> 0 ||
  stats.equipment.totalItems> 0 ||
  stats.maintenance.pendingTasks> 0 ||
  stats.maintenance.completedThisMonth> 0 ||
  stats.charts.weeklyClasses.some(item => item.classes> 0 || item.conflicts> 0) ||
  stats.charts.injuryTrends.some(item => item.incidents> 0 || item.critical> 0) ||
  stats.charts.equipmentStatus.some(item => item.value> 0) ||
  stats.charts.maintenanceTrends.some(item => item.completed> 0 || item.pending> 0) ||
  stats.charts.injurySeverity.some(item => item.value> 0) ||
  stats.charts.safetyIssueTrends.some(item => item.total> 0 || item.critical> 0)
 )

 const getTrendIndicator = (value: number) => {
  if (value> 0) return <span className="text-green-600 text-sm">↑ {value}%</span>
  if (value < 0) return <span className="text-red-600 text-sm">↓ {Math.abs(value)}%</span>
  return <span className="text-gray-600 text-sm">→ 0%</span>
 }

 if (loading || !user) {
  return (
   <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-gray-900">Loading...</div>
   </div>
  )
 }

 return (
  <DashboardLayout>
   <div className="p-4 space-y-4">
    {/* Welcome Section */}
    <div className="mb-2">
     <h2 className="text-3xl font-bold text-gray-900">
      Welcome back, {user.fullName}!
     </h2>
     <p className="text-gray-600 mt-1">
      Here's what's happening at {user.clubName} today
     </p>
    </div>

    {analyticsError && (
     <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {analyticsError}
     </div>
    )}

    {stats && !hasAnalyticsData && !analyticsError && (
     <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
      No analytics data yet for your club. Add classes, injury reports, equipment, or maintenance tasks to populate the dashboard graphs.
     </div>
    )}

    {/* Quick Actions */}
    <div className="bg-white rounded-xl border border-gray-200 p-4">
     <h3 className="text-base font-semibold text-gray-900 mb-3">Quick Actions</h3>
     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
      <Link href="/dashboard/class-rostering" className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition">
       <span className="text-3xl">📋</span>
       <div>
        <p className="font-medium text-gray-900">View Rosters</p>
        <p className="text-xs text-gray-600">Manage class schedules</p>
       </div>
      </Link>

      <Link href="/dashboard/injury-reports" className="flex items-center gap-3 p-4 bg-red-50 hover:bg-red-100 rounded-lg transition">
       <span className="text-3xl">📝</span>
       <div>
        <p className="font-medium text-gray-900">Review Incidents</p>
        <p className="text-xs text-gray-600">Review Injury Reports</p>
       </div>
      </Link>

      <Link href="/dashboard/equipment" className="flex items-center gap-3 p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition">
       <span className="text-3xl">🔧</span>
       <div>
        <p className="font-medium text-gray-900">Equipment</p>
        <p className="text-xs text-gray-600">Manage equipment</p>
       </div>
      </Link>

      <Link href="/dashboard/compliance-manager" className="flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition">
       <span className="text-3xl">✅</span>
       <div>
        <p className="font-medium text-gray-900">Compliance</p>
        <p className="text-xs text-gray-600">Manage compliance</p>
       </div>
      </Link>

      <Link href="/dashboard/admin-config" className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition">
       <span className="text-3xl">⚙️</span>
       <div>
        <p className="font-medium text-gray-900">Settings</p>
        <p className="text-xs text-gray-600">Configure club</p>
       </div>
      </Link>
     </div>
    </div>

    {/* Key Metrics Overview */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
     <Link href="/dashboard/class-rostering" className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white hover:shadow-lg transition-all hover:scale-105">
      <div className="flex items-center justify-between mb-2">
       <span className="text-3xl">📅</span>
       <span className="text-blue-100 text-xs">This Week</span>
      </div>
      <p className="text-2xl font-bold mb-1">{stats?.rosters.weeklyClasses || 0}</p>
      <p className="text-blue-100 text-xs mb-2">Scheduled Classes</p>
      <div className="flex items-center justify-between">
       {stats && stats.rosters.activeConflicts> 0 ? (
        <span className="text-xs bg-red-500 bg-opacity-20 border border-red-200 rounded px-2 py-1">
         ⚠️ {stats.rosters.activeConflicts} conflict{stats.rosters.activeConflicts> 1 ? 's' : ''}
        </span>
       ) : (
        <span className="text-xs text-blue-100">No conflicts</span>
       )}
       {stats && stats.rosters.classGrowth !== undefined && (
        getTrendIndicator(stats.rosters.classGrowth)
       )}
      </div>
     </Link>

     <Link href="/dashboard/injury-reports" className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 text-white hover:shadow-lg transition-all hover:scale-105">
      <div className="flex items-center justify-between mb-2">
       <span className="text-3xl">🏥</span>
       <span className="text-red-100 text-xs">Active</span>
      </div>
      <p className="text-2xl font-bold mb-1">{stats?.safety.openIncidents || 0}</p>
      <p className="text-red-100 text-xs mb-2">Open Incidents</p>
      <div className="flex items-center justify-between">
       {stats && stats.safety.criticalIssues> 0 ? (
        <span className="text-xs bg-yellow-500 bg-opacity-20 border border-yellow-200 rounded px-2 py-1">
         ⚠️ {stats.safety.criticalIssues} critical
        </span>
       ) : (
        <span className="text-xs text-red-100">No critical issues</span>
       )}
       {stats && stats.safety.injuryTrend !== undefined && (
        <span className="text-xs text-red-100">
         {stats.safety.injuryTrend> 0 ? '↑' : stats.safety.injuryTrend < 0 ? '↓' : '→'} {Math.abs(stats.safety.injuryTrend)}%
        </span>
       )}
      </div>
     </Link>

     <Link href="/dashboard/equipment" className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white hover:shadow-lg transition-all hover:scale-105">
      <div className="flex items-center justify-between mb-2">
       <span className="text-3xl">🔧</span>
       <span className="text-orange-100 text-xs">Total Items</span>
      </div>
      <p className="text-2xl font-bold mb-1">{stats?.equipment.totalItems || 0}</p>
      <p className="text-orange-100 text-xs mb-2">Equipment Tracked</p>
      <div className="flex items-center justify-between">
       {stats && stats.equipment.maintenanceDue> 0 ? (
        <span className="text-xs bg-red-500 bg-opacity-20 border border-red-200 rounded px-2 py-1">
         🛠️ {stats.equipment.maintenanceDue} due
        </span>
       ) : (
        <span className="text-xs text-orange-100">Up to date</span>
       )}
       {stats && (
        <span className="text-xs text-orange-100">{stats.equipment.utilizationRate}% in use</span>
       )}
      </div>
     </Link>

     <Link href="/dashboard/maintenance" className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white hover:shadow-lg transition-all hover:scale-105">
      <div className="flex items-center justify-between mb-2">
       <span className="text-3xl">📊</span>
       <span className="text-green-100 text-xs">Maintenance</span>
      </div>
      <p className="text-2xl font-bold mb-1">{stats?.maintenance.completedThisMonth || 0}</p>
      <p className="text-green-100 text-xs mb-2">Completed This Month</p>
      <div className="flex items-center justify-between">
       {stats && stats.maintenance.overdueTasks> 0 ? (
        <span className="text-xs bg-red-500 bg-opacity-20 border border-red-200 rounded px-2 py-1">
         ⏰ {stats.maintenance.overdueTasks} overdue
        </span>
       ) : (
        <span className="text-xs text-green-100">On track</span>
       )}
       {stats && (
        <span className="text-xs text-green-100">{stats.maintenance.completionRate}% rate</span>
       )}
      </div>
     </Link>

     <Link href="/dashboard/compliance-manager" className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white hover:shadow-lg transition-all hover:scale-105">
      <div className="flex items-center justify-between mb-2">
       <span className="text-3xl">✅</span>
       <span className="text-purple-100 text-xs">Compliance</span>
      </div>
      <p className="text-2xl font-bold mb-1">{stats?.compliance.totalItems || 0}</p>
      <p className="text-purple-100 text-xs mb-2">Total Items</p>
      <div className="flex items-center justify-between">
       {stats && stats.compliance.overdueItems> 0 ? (
        <span className="text-xs bg-red-500 bg-opacity-20 border border-red-200 rounded px-2 py-1">
         ⚠️ {stats.compliance.overdueItems} overdue
        </span>
       ) : (
        <span className="text-xs text-purple-100">All current</span>
       )}
       {stats && (
        <span className="text-xs text-purple-100">{stats.compliance.completionRate}% done</span>
       )}
      </div>
     </Link>
    </div>

    {/* Charts Section - Row 1 */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
     {/* Weekly Class Schedule */}
     <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
       <div>
        <h3 className="text-sm font-semibold text-gray-900">Weekly Class Schedule</h3>
        <p className="text-xs text-gray-600">Next 7 days</p>
       </div>
       <Link href="/dashboard/rosters" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
        View All →
       </Link>
      </div>
      <ResponsiveContainer width="100%" height={160}>
       <BarChart data={stats?.charts?.weeklyClasses || []}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="day" stroke="#6b7280" style={{ fontSize: '12px' }} />
        <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
        <Tooltip 
         contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
        />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Bar dataKey="classes" fill="#3b82f6" name="Classes" radius={[4, 4, 0, 0]} />
        <Bar dataKey="conflicts" fill="#ef4444" name="Conflicts" radius={[4, 4, 0, 0]} />
       </BarChart>
      </ResponsiveContainer>
     </div>

     {/* Injury Trends */}
     <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
       <div>
        <h3 className="text-sm font-semibold text-gray-900">Injury Report Trends</h3>
        <p className="text-xs text-gray-600">Last 6 months</p>
       </div>
       <Link href="/dashboard/injury-reports/analytics" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
        View Analytics →
       </Link>
      </div>
      <ResponsiveContainer width="100%" height={160}>
       <AreaChart data={stats?.charts?.injuryTrends || []}>
        <defs>
         <linearGradient id="colorIncidents" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
         </linearGradient>
         <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
         </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
        <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
        <Tooltip 
         contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
        />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Area type="monotone" dataKey="incidents" stroke="#f59e0b" fillOpacity={1} fill="url(#colorIncidents)" name="Total Incidents" strokeWidth={2} />
        <Area type="monotone" dataKey="critical" stroke="#ef4444" fillOpacity={1} fill="url(#colorCritical)" name="Critical" strokeWidth={2} />
       </AreaChart>
      </ResponsiveContainer>
     </div>

     {/* Compliance Trend */}
     <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
       <div>
        <h3 className="text-sm font-semibold text-gray-900">Compliance Trend</h3>
        <p className="text-xs text-gray-600">Six-month trend</p>
       </div>
       <Link href="/dashboard/compliance-manager" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
        View Manager →
       </Link>
      </div>
      <ResponsiveContainer width="100%" height={160}>
       <LineChart data={complianceTrend}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
        <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
        <Tooltip 
         contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
        />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Line type="monotone" dataKey="completed" stroke="#10b981" name="Completed" strokeWidth={2} />
        <Line type="monotone" dataKey="created" stroke="#3b82f6" name="Created" strokeWidth={2} />
        <Line type="monotone" dataKey="overdue" stroke="#ef4444" name="Overdue" strokeWidth={2} />
       </LineChart>
      </ResponsiveContainer>
     </div>
    </div>

    {/* Charts Section - Row 2: Status Distribution */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
     {/* Equipment Status Distribution */}
     <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
       <div>
        <h3 className="text-base font-semibold text-gray-900">Equipment Condition</h3>
        <p className="text-xs text-gray-600">Current distribution</p>
       </div>
       <Link href="/dashboard/equipment" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
        View All →
       </Link>
      </div>
      {stats?.charts?.equipmentStatus && stats.charts.equipmentStatus.length> 0 ? (
       <ResponsiveContainer width="100%" height={240}>
        <PieChart>
         <Pie
          data={stats.charts.equipmentStatus}
          cx="50%"
          cy="50%"
          labelLine={true}
          label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
          outerRadius={90}
          fill="#8884d8"
          dataKey="value"
>
          {stats.charts.equipmentStatus.map((entry, index) => (
           <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
         </Pie>
         <Tooltip 
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
         />
         <Legend 
          verticalAlign="bottom" 
          height={36}
          wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
         />
        </PieChart>
       </ResponsiveContainer>
      ) : (
       <div className="h-64 flex items-center justify-center text-gray-400">
        <div className="text-center">
         <div className="text-4xl mb-2">📊</div>
         <p className="text-sm">No equipment data yet</p>
        </div>
       </div>
      )}
     </div>

     {/* Injury Status */}
     <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
       <div>
        <h3 className="text-base font-semibold text-gray-900">Injury Status</h3>
        <p className="text-xs text-gray-600">This month</p>
       </div>
       <Link href="/dashboard/injury-reports/analytics" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
        View Analytics →
       </Link>
      </div>
      {stats?.charts?.injurySeverity && stats.charts.injurySeverity.length> 0 ? (
       <ResponsiveContainer width="100%" height={240}>
        <PieChart>
         <Pie
          data={stats.charts.injurySeverity}
          cx="50%"
          cy="50%"
          labelLine={true}
          label={({ name, value }) => `${name}: ${value}`}
          outerRadius={90}
          fill="#8884d8"
          dataKey="value"
>
          {stats.charts.injurySeverity.map((entry, index) => (
           <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
         </Pie>
         <Tooltip 
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
         />
         <Legend 
          verticalAlign="bottom" 
          height={36}
          wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
         />
        </PieChart>
       </ResponsiveContainer>
      ) : (
       <div className="h-64 flex items-center justify-center text-gray-400">
        <div className="text-center">
         <div className="text-4xl mb-2">🏥</div>
         <p className="text-sm">No injury data this month</p>
        </div>
       </div>
      )}
     </div>
    </div>

    {/* Charts Section - Row 3 */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
     {/* Maintenance Trends */}
     <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
       <div>
        <h3 className="text-sm font-semibold text-gray-900">Maintenance Activity</h3>
        <p className="text-xs text-gray-600">Last 6 months</p>
       </div>
      </div>
      <ResponsiveContainer width="100%" height={160}>
       <LineChart data={stats?.charts?.maintenanceTrends || []}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
        <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
        <Tooltip 
         contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
        />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} name="Completed" dot={{ r: 4 }} />
        <Line type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={2} name="Pending" dot={{ r: 4 }} />
       </LineChart>
      </ResponsiveContainer>
     </div>

     {/* Safety Issue Trends */}
     <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
       <div>
        <h3 className="text-sm font-semibold text-gray-900">Safety Issues</h3>
        <p className="text-xs text-gray-600">Last 6 months</p>
       </div>
      </div>
      <ResponsiveContainer width="100%" height={160}>
       <AreaChart data={stats?.charts?.safetyIssueTrends || []}>
        <defs>
         <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
         </linearGradient>
         <linearGradient id="colorSafetyCritical" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3}/>
          <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
         </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
        <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
        <Tooltip 
         contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
        />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Area type="monotone" dataKey="total" stroke="#3b82f6" fillOpacity={1} fill="url(#colorTotal)" name="Total Issues" strokeWidth={2} />
        <Area type="monotone" dataKey="critical" stroke="#dc2626" fillOpacity={1} fill="url(#colorSafetyCritical)" name="Critical" strokeWidth={2} />
       </AreaChart>
      </ResponsiveContainer>
     </div>
    </div>
   </div>

   {/* Configuration Wizard - Auto-launch for new admins */}
   {showWizard && (
    <ConfigWizard
     isOpen={showWizard}
     onClose={() => setShowWizard(false)}
    />
   )}
  </DashboardLayout>
 )
}

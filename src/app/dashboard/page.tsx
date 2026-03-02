'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DashboardLayout from '@/components/DashboardLayout'
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
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
    coachUtilization: number
  }
  injuries: {
    openIncidents: number
    totalThisMonth: number
    criticalIssues: number
    avgResponseTime: number
  }
  equipment: {
    totalItems: number
    maintenanceDue: number
    criticalIssues: number
    inUse: number
  }
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)

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

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/dashboard/analytics', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      } else {
        // Fallback to dummy data for demo
        setStats({
          rosters: {
            weeklyClasses: 45,
            activeConflicts: 2,
            upcomingClasses: 12,
            coachUtilization: 78
          },
          injuries: {
            openIncidents: 3,
            totalThisMonth: 8,
            criticalIssues: 1,
            avgResponseTime: 4.5
          },
          equipment: {
            totalItems: 42,
            maintenanceDue: 5,
            criticalIssues: 2,
            inUse: 18
          }
        })
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
      // Dummy data for demo
      setStats({
        rosters: {
          weeklyClasses: 45,
          activeConflicts: 2,
          upcomingClasses: 12,
          coachUtilization: 78
        },
        injuries: {
          openIncidents: 3,
          totalThisMonth: 8,
          criticalIssues: 1,
          avgResponseTime: 4.5
        },
        equipment: {
          totalItems: 42,
          maintenanceDue: 5,
          criticalIssues: 2,
          inUse: 18
        }
      })
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-900">Loading...</div>
      </div>
    )
  }

  // Sample data for charts
  const weeklyClassesData = [
    { day: 'Mon', classes: 8, conflicts: 0 },
    { day: 'Tue', classes: 7, conflicts: 1 },
    { day: 'Wed', classes: 9, conflicts: 0 },
    { day: 'Thu', classes: 6, conflicts: 1 },
    { day: 'Fri', classes: 8, conflicts: 0 },
    { day: 'Sat', classes: 4, conflicts: 0 },
    { day: 'Sun', classes: 3, conflicts: 0 },
  ]

  const injuryTrendsData = [
    { month: 'Jan', incidents: 5, critical: 1 },
    { month: 'Feb', incidents: 3, critical: 0 },
    { month: 'Mar', incidents: 7, critical: 2 },
    { month: 'Apr', incidents: 4, critical: 1 },
    { month: 'May', incidents: 6, critical: 1 },
    { month: 'Jun', incidents: 8, critical: 1 },
  ]

  const equipmentStatusData = [
    { name: 'Excellent', value: 18, color: '#10b981' },
    { name: 'Good', value: 15, color: '#3b82f6' },
    { name: 'Fair', value: 6, color: '#f59e0b' },
    { name: 'Poor', value: 3, color: '#ef4444' },
  ]

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Welcome Section */}
        <div className="mb-2">
          <h2 className="text-3xl font-bold text-gray-900">
            Welcome back, {user.fullName}!
          </h2>
          <p className="text-gray-600 mt-1">
            Here's what's happening at {user.clubName} today
          </p>
        </div>

        {/* Key Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/dashboard/class-rostering" className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white hover:shadow-lg transition-all hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <span className="text-4xl">📅</span>
              <span className="text-blue-100 text-sm">This Week</span>
            </div>
            <p className="text-3xl font-bold mb-1">{stats?.rosters.weeklyClasses || 0}</p>
            <p className="text-blue-100 text-sm">Scheduled Classes</p>
            {stats && stats.rosters.activeConflicts > 0 && (
              <div className="mt-3 bg-red-500 bg-opacity-20 border border-red-200 rounded px-2 py-1 text-xs">
                ⚠️ {stats.rosters.activeConflicts} conflict{stats.rosters.activeConflicts > 1 ? 's' : ''}
              </div>
            )}
          </Link>

          <Link href="/dashboard/injury-reports" className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white hover:shadow-lg transition-all hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <span className="text-4xl">🏥</span>
              <span className="text-red-100 text-sm">Active</span>
            </div>
            <p className="text-3xl font-bold mb-1">{stats?.injuries.openIncidents || 0}</p>
            <p className="text-red-100 text-sm">Open Incidents</p>
            {stats && stats.injuries.criticalIssues > 0 && (
              <div className="mt-3 bg-yellow-500 bg-opacity-20 border border-yellow-200 rounded px-2 py-1 text-xs">
                ⚠️ {stats.injuries.criticalIssues} critical
              </div>
            )}
          </Link>

          <Link href="/dashboard/equipment" className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white hover:shadow-lg transition-all hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <span className="text-4xl">🔧</span>
              <span className="text-orange-100 text-sm">Total Items</span>
            </div>
            <p className="text-3xl font-bold mb-1">{stats?.equipment.totalItems || 0}</p>
            <p className="text-orange-100 text-sm">Equipment Tracked</p>
            {stats && stats.equipment.maintenanceDue > 0 && (
              <div className="mt-3 bg-red-500 bg-opacity-20 border border-red-200 rounded px-2 py-1 text-xs">
                🛠️ {stats.equipment.maintenanceDue} maintenance due
              </div>
            )}
          </Link>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <span className="text-4xl">📊</span>
              <span className="text-green-100 text-sm">Overall</span>
            </div>
            <p className="text-3xl font-bold mb-1">Excellent</p>
            <p className="text-green-100 text-sm">Club Health Status</p>
            <div className="mt-3 bg-white bg-opacity-20 rounded px-2 py-1 text-xs">
              ✓ All systems operational
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Class Schedule */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Weekly Class Schedule</h3>
                <p className="text-sm text-gray-600">Classes vs Conflicts</p>
              </div>
              <Link href="/dashboard/rosters" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                View All →
              </Link>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={weeklyClassesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="classes" fill="#3b82f6" name="Classes" />
                <Bar dataKey="conflicts" fill="#ef4444" name="Conflicts" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Injury Trends */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Injury Report Trends</h3>
                <p className="text-sm text-gray-600">Last 6 Months</p>
              </div>
              <Link href="/dashboard/injury-reports/analytics" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                View Analytics →
              </Link>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={injuryTrendsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="incidents" stroke="#f59e0b" strokeWidth={2} name="Total Incidents" />
                <Line type="monotone" dataKey="critical" stroke="#ef4444" strokeWidth={2} name="Critical" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Equipment and Additional Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Equipment Status Distribution */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Equipment Condition</h3>
                <p className="text-sm text-gray-600">Current Status Distribution</p>
              </div>
              <Link href="/dashboard/equipment/analytics" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                View Details →
              </Link>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={equipmentStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {equipmentStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Actions & Stats */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link href="/dashboard/rosters" className="flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📋</span>
                  <div>
                    <p className="font-medium text-gray-900">View Rosters</p>
                    <p className="text-xs text-gray-600">Manage class schedules</p>
                  </div>
                </div>
                <span className="text-blue-600">→</span>
              </Link>

              <Link href="/injury-report" className="flex items-center justify-between p-3 bg-red-50 hover:bg-red-100 rounded-lg transition">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📝</span>
                  <div>
                    <p className="font-medium text-gray-900">Report Incident</p>
                    <p className="text-xs text-gray-600">Submit new injury report</p>
                  </div>
                </div>
                <span className="text-red-600">→</span>
              </Link>

              <Link href="/dashboard/equipment/all" className="flex items-center justify-between p-3 bg-orange-50 hover:bg-orange-100 rounded-lg transition">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🔧</span>
                  <div>
                    <p className="font-medium text-gray-900">Manage Equipment</p>
                    <p className="text-xs text-gray-600">View all equipment</p>
                  </div>
                </div>
                <span className="text-orange-600">→</span>
              </Link>

              <Link href="/dashboard/admin-config" className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⚙️</span>
                  <div>
                    <p className="font-medium text-gray-900">Club Settings</p>
                    <p className="text-xs text-gray-600">Configure your club</p>
                  </div>
                </div>
                <span className="text-gray-600">→</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Activity Feed (Placeholder) */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="text-xl">📅</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">New roster published for Week 12</p>
                <p className="text-xs text-gray-600">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="text-xl">🏥</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Injury report submitted by Coach Sarah</p>
                <p className="text-xs text-gray-600">5 hours ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="text-xl">🔧</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Equipment maintenance completed on Vault #3</p>
                <p className="text-xs text-gray-600">1 day ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

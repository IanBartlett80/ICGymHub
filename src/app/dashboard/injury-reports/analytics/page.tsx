'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import InjuryReportsSubNav from '@/components/InjuryReportsSubNav';
import VenueSelector from '@/components/VenueSelector';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface AnalyticsData {
  totalSubmissions: number;
  statusCounts: { status: string; count: number }[];
  priorityCounts: { priority: string; count: number }[];
  submissionsByDate: { [key: string]: number };
  avgResponseTimeHours: number;
  gymsportBreakdown: { gymsportName: string; count: number }[];
  classBreakdown: { className: string; count: number }[];
  trendData: { period?: string; month?: string; count?: number; total?: number; critical?: number; resolved?: number }[];
  venueBreakdown?: { venueName: string; count: number; critical: number }[];
  zoneBreakdown?: { zoneName: string; count: number }[];
  equipmentInjuryBreakdown?: { equipmentName: string; count: number; critical: number }[];
  dayOfWeekPattern?: { day: string; count: number }[];
}

const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
  cyan: '#06b6d4',
  gray: '#6b7280',
  indigo: '#6366f1',
  emerald: '#34d399',
};

const STATUS_COLORS: { [key: string]: string } = {
  NEW: '#3b82f6',
  UNDER_REVIEW: '#f59e0b',
  RESOLVED: '#10b981',
  CLOSED: '#6b7280',
};

const PRIORITY_COLORS: { [key: string]: string } = {
  LOW: '#10b981',
  MEDIUM: '#f59e0b',
  HIGH: '#ef4444',
  CRITICAL: '#991b1b',
  NONE: '#9ca3af',
};

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [venueId, setVenueId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<string>('30');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadAnalytics();
  }, [venueId, dateRange, statusFilter]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (venueId && venueId !== 'all') params.append('venueId', venueId);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      if (dateRange !== 'all') {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(dateRange));
        params.append('startDate', startDate.toISOString().split('T')[0]);
        params.append('endDate', endDate.toISOString().split('T')[0]);
      }

      const res = await fetch(`/api/injury-submissions/analytics?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace('_', ' ');
  };

  const getPriorityLabel = (priority: string) => {
    if (priority === 'NONE') return 'Not Set';
    return priority.charAt(0) + priority.slice(1).toLowerCase();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <InjuryReportsSubNav />
        <div className="flex items-center justify-center h-96">
          <div className="animate-pulse">
            <div className="text-xl text-gray-500">Loading advanced analytics...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!analytics) {
    return (
      <DashboardLayout>
        <InjuryReportsSubNav />
        <div className="flex flex-col items-center justify-center h-96">
          <div className="text-6xl mb-4">📊</div>
          <div className="text-xl text-gray-500">No analytics data available</div>
          <p className="text-gray-400 mt-2">Start receiving injury reports to see insights</p>
        </div>
      </DashboardLayout>
    );
  }

  // Calculate metrics
  const totalResolved = analytics.statusCounts.find(s => s.status === 'RESOLVED')?.count || 0;
  const totalClosed = analytics.statusCounts.find(s => s.status === 'CLOSED')?.count || 0;
  const totalNew = analytics.statusCounts.find(s => s.status === 'NEW')?.count || 0;
  const totalUnderReview = analytics.statusCounts.find(s => s.status === 'UNDER_REVIEW')?.count || 0;
  
  const resolutionRate = analytics.totalSubmissions > 0 
    ? Math.round(((totalResolved + totalClosed) / analytics.totalSubmissions) * 100)
    : 0;
  
  const criticalCount = analytics.priorityCounts.find(p => p.priority === 'CRITICAL')?.count || 0;
  const highCount = analytics.priorityCounts.find(p => p.priority === 'HIGH')?.count || 0;
  const urgentCases = criticalCount + highCount;

  // Prepare chart data
  const statusChartData = analytics.statusCounts.map(item => ({
    name: getStatusLabel(item.status),
    value: item.count,
    fill: STATUS_COLORS[item.status] || COLORS.gray,
  }));

  const priorityChartData = analytics.priorityCounts
    .filter(p => p.priority !== 'NONE')
    .map(item => ({
      name: getPriorityLabel(item.priority),
      count: item.count,
      fill: PRIORITY_COLORS[item.priority] || COLORS.gray,
    }))
    .sort((a, b) => b.count - a.count);

  // Sort and limit class breakdown for better visualization
  const topClasses = (analytics.classBreakdown || [])
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Sort day of week data
  const sortedDayData = (analytics.dayOfWeekPattern || []).sort((a, b) => {
    return DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day);
  });

  // Top zones
  const topZones = (analytics.zoneBreakdown || [])
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Top equipment
  const topEquipment = (analytics.equipmentInjuryBreakdown || [])
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: <span className="font-bold">{entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <DashboardLayout>
      <InjuryReportsSubNav />
      
      <div className="space-y-6">
        {/* Page Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">📊 Injury & Incidents Analytics</h1>
              <p className="text-blue-100 text-lg">Comprehensive insights and data-driven intelligence</p>
            </div>
            <div className="text-right">
              <div className="text-5xl font-bold">{analytics.totalSubmissions}</div>
              <div className="text-blue-100 mt-1">Total Incidents Tracked</div>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">📌 Analytics Filters</h2>
            <button
              onClick={() => {
                setVenueId(null);
                setDateRange('30');
                setStatusFilter('all');
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Reset Filters
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <VenueSelector
              value={venueId}
              onChange={setVenueId}
              showAllOption={true}
              showLabel={true}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time Period</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="180">Last 6 months</option>
                <option value="365">Last year</option>
                <option value="all">All time</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status Filter</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="NEW">New</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
          </div>
        </div>

        {/* KPI Cards - Premium Design */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white opacity-10"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <span className="text-6xl">📋</span>
                <span className="text-blue-100 text-sm font-medium uppercase tracking-wide">Total</span>
              </div>
              <div className="text-5xl font-bold mb-2">{analytics.totalSubmissions}</div>
              <div className="text-blue-100 text-sm font-medium">Total Incidents</div>
              <div className="mt-4 pt-4 border-t border-blue-400">
                <div className="flex justify-between text-xs">
                  <span className="text-blue-200">New: {totalNew}</span>
                  <span className="text-blue-200">Review: {totalUnderReview}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white opacity-10"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <span className="text-6xl">✅</span>
                <span className="text-green-100 text-sm font-medium uppercase tracking-wide">Success</span>
              </div>
              <div className="text-5xl font-bold mb-2">{resolutionRate}%</div>
              <div className="text-green-100 text-sm font-medium">Resolution Rate</div>
              <div className="mt-4 pt-4 border-t border-green-400">
                <div className="flex justify-between text-xs">
                  <span className="text-green-200">Resolved: {totalResolved}</span>
                  <span className="text-green-200">Closed: {totalClosed}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white opacity-10"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <span className="text-6xl">🚨</span>
                <span className="text-red-100 text-sm font-medium uppercase tracking-wide">Urgent</span>
              </div>
              <div className="text-5xl font-bold mb-2">{urgentCases}</div>
              <div className="text-red-100 text-sm font-medium">High/Critical Priority</div>
              <div className="mt-4 pt-4 border-t border-red-400">
                <div className="flex justify-between text-xs">
                  <span className="text-red-200">Critical: {criticalCount}</span>
                  <span className="text-red-200">High: {highCount}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white opacity-10"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <span className="text-6xl">⏱️</span>
                <span className="text-purple-100 text-sm font-medium uppercase tracking-wide">Speed</span>
              </div>
              <div className="text-5xl font-bold mb-2">
                {analytics.avgResponseTimeHours > 0 ? `${Math.round(analytics.avgResponseTimeHours)}h` : 'N/A'}
              </div>
              <div className="text-purple-100 text-sm font-medium">Avg Response Time</div>
              <div className="mt-4 pt-4 border-t border-purple-400">
                <div className="text-xs text-purple-200">
                  Time to initial review
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status & Priority Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Distribution - Donut Chart */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Status Distribution</h2>
                <p className="text-sm text-gray-600 mt-1">Current incident status breakdown</p>
              </div>
              <span className="text-4xl">📊</span>
            </div>
            {statusChartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      fill="#8884d8"
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                      labelLine={true}
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-3 mt-6">
                  {statusChartData.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: item.fill }}></div>
                      <span className="text-sm text-gray-700">{item.name}</span>
                      <span className="ml-auto font-semibold text-gray-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-80 text-gray-400">
                <div className="text-center">
                  <div className="text-4xl mb-2">📭</div>
                  <div>No status data</div>
                </div>
              </div>
            )}
          </div>

          {/* Priority Breakdown - Horizontal Bar */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Priority Breakdown</h2>
                <p className="text-sm text-gray-600 mt-1">Severity levels of incidents</p>
              </div>
              <span className="text-4xl">🎯</span>
            </div>
            {priorityChartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={priorityChartData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={90} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                      {priorityChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-3 mt-6">
                  {priorityChartData.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: item.fill }}></div>
                      <span className="text-sm text-gray-700">{item.name}</span>
                      <span className="ml-auto font-semibold text-gray-900">{item.count}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-80 text-gray-400">
                <div className="text-center">
                  <div className="text-4xl mb-2">📭</div>
                  <div>No priority data</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Trend Analysis */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">📈 Incident Trends Over Time</h2>
              <p className="text-sm text-gray-600 mt-1">Historical trend analysis showing total, critical, and resolved cases</p>
            </div>
          </div>
          {analytics.trendData && analytics.trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={analytics.trendData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.danger} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={COLORS.danger} stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={COLORS.success} stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  angle={-15}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stroke={COLORS.primary} 
                  fill="url(#colorTotal)" 
                  strokeWidth={2}
                  name="Total Incidents" 
                />
                <Area 
                  type="monotone" 
                  dataKey="critical" 
                  stroke={COLORS.danger} 
                  fill="url(#colorCritical)" 
                  strokeWidth={2}
                  name="Critical" 
                />
                <Area 
                  type="monotone" 
                  dataKey="resolved" 
                  stroke={COLORS.success} 
                  fill="url(#colorResolved)" 
                  strokeWidth={2}
                  name="Resolved" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-96 text-gray-400">
              <div className="text-center">
                <div className="text-6xl mb-4">📉</div>
                <div className="text-lg">No trend data available</div>
              </div>
            </div>
          )}
        </div>

        {/* Injuries by Class */}
        {topClasses.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">🏫 Injuries by Class</h2>
                <p className="text-sm text-gray-600 mt-1">Top classes with the highest incident rates</p>
              </div>
              <span className="text-4xl">📚</span>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={topClasses} layout="vertical" margin={{ left: 150 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" />
                <YAxis dataKey="className" type="category" width={140} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill={COLORS.indigo} radius={[0, 8, 8, 0]}>
                  {topClasses.map((_, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={index < 3 ? COLORS.danger : index < 6 ? COLORS.warning : COLORS.primary} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Location & Equipment Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Injuries by Zone */}
          {topZones.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">🗺️ Injuries by Zone</h2>
                  <p className="text-sm text-gray-600 mt-1">Incidents per training zone</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={topZones} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" />
                  <YAxis dataKey="zoneName" type="category" width={90} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill={COLORS.cyan} radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Equipment-Related Injuries */}
          {topEquipment.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">🛠️ Equipment-Related Injuries</h2>
                  <p className="text-sm text-gray-600 mt-1">Top equipment with incidents</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={topEquipment} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" />
                  <YAxis dataKey="equipmentName" type="category" width={90} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill={COLORS.warning} radius={[0, 8, 8, 0]} stackId="a" name="Total"/>
                  <Bar dataKey="critical" fill={COLORS.danger} radius={[0, 8, 8, 0]} stackId="a" name="Critical"/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Day of Week Pattern */}
        {sortedDayData.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">📅 Incident Pattern by Day of Week</h2>
                <p className="text-sm text-gray-600 mt-1">Identify high-risk days</p>
              </div>
              <span className="text-4xl">📆</span>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={sortedDayData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="day" 
                  angle={-45} 
                  textAnchor="end" 
                  height={90}
                  tick={{ fontSize: 12 }}
                />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill={COLORS.purple} radius={[8, 8, 0, 0]}>
                  {sortedDayData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.count === Math.max(...sortedDayData.map(d => d.count)) 
                        ? COLORS.danger 
                        : COLORS.purple
                      } 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Venue Breakdown */}
        {analytics.venueBreakdown && analytics.venueBreakdown.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">🏢 Injuries by Venue</h2>
                <p className="text-sm text-gray-600 mt-1">Compare incident rates across venues</p>
              </div>
              <span className="text-4xl">🏛️</span>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={analytics.venueBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="venueName" 
                  angle={-45} 
                  textAnchor="end" 
                  height={90}
                  tick={{ fontSize: 12 }}
                />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="count" fill={COLORS.cyan} radius={[8, 8, 0, 0]} name="Total Incidents" />
                <Bar dataKey="critical" fill={COLORS.danger} radius={[8, 8, 0, 0]} name="Critical" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Program Breakdown */}
        {analytics.gymsportBreakdown && analytics.gymsportBreakdown.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">🤸 Injuries by Program</h2>
                <p className="text-sm text-gray-600 mt-1">Incident distribution across gym sports</p>
              </div>
              <span className="text-4xl">⭐</span>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={analytics.gymsportBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="gymsportName" 
                  angle={-45} 
                  textAnchor="end" 
                  height={90}
                  tick={{ fontSize: 12 }}
                />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill={COLORS.pink} radius={[8, 8, 0, 0]}>
                  {analytics.gymsportBreakdown.map((_, index) => {
                    const colors = [COLORS.pink, COLORS.purple, COLORS.indigo, COLORS.cyan, COLORS.primary];
                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

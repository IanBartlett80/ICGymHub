'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import InjuryReportsSubNav from '@/components/InjuryReportsSubNav';
import VenueSelector from '@/components/VenueSelector';
import IntelligenceFilter from '@/components/IntelligenceFilter';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { CalendarIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

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
          <div className="text-6xl mb-2">📊</div>
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
      
      <div className="p-4 space-y-4">
        {/* Page Title */}
        <div>
          <h1 className="text-xl font-bold text-gray-900">Injury & Incidents Analytics</h1>
          <p className="text-xs text-gray-600 mt-1">Comprehensive insights and data-driven intelligence</p>
        </div>

        {/* Filters Section */}
        <IntelligenceFilter
          title="Injury Analytics Filters"
          subtitle="Customize your injury report analytics view"
          variant="gradient"
          filters={[
            {
              type: 'custom',
              label: 'Venue',
              value: venueId,
              onChange: setVenueId,
              customComponent: (
                <VenueSelector
                  value={venueId}
                  onChange={setVenueId}
                  showAllOption={true}
                />
              ),
            },
            {
              type: 'select',
              label: 'Time Period',
              value: dateRange,
              onChange: setDateRange,
              icon: <CalendarIcon className="h-4 w-4" />,
              options: [
                { value: '7', label: 'Last 7 days' },
                { value: '30', label: 'Last 30 days' },
                { value: '90', label: 'Last 90 days' },
                { value: '180', label: 'Last 6 months' },
                { value: '365', label: 'Last year' },
                { value: 'all', label: 'All time' },
              ],
            },
            {
              type: 'select',
              label: 'Status Filter',
              value: statusFilter,
              onChange: setStatusFilter,
              icon: <CheckCircleIcon className="h-4 w-4" />,
              options: [
                { value: 'all', label: 'All Statuses' },
                { value: 'NEW', label: 'New' },
                { value: 'UNDER_REVIEW', label: 'Under Review' },
                { value: 'RESOLVED', label: 'Resolved' },
                { value: 'CLOSED', label: 'Closed' },
              ],
            },
          ]}
          onReset={() => {
            setVenueId(null);
            setDateRange('30');
            setStatusFilter('all');
          }}
        />

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xl">📋</span>
              <span className="text-xs text-gray-500 uppercase">Total</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{analytics.totalSubmissions}</div>
            <div className="text-xs text-gray-600 mt-1">Total Incidents</div>
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="flex justify-between text-xs text-gray-600">
                <span>New: {totalNew}</span>
                <span>Review: {totalUnderReview}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xl">✅</span>
              <span className="text-xs text-gray-500 uppercase">Success</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{resolutionRate}%</div>
            <div className="text-xs text-gray-600 mt-1">Resolution Rate</div>
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Resolved: {totalResolved}</span>
                <span>Closed: {totalClosed}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xl">🚨</span>
              <span className="text-xs text-gray-500 uppercase">Urgent</span>
            </div>
            <div className="text-2xl font-bold text-red-600">{urgentCases}</div>
            <div className="text-xs text-gray-600 mt-1">High/Critical Priority</div>
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Critical: {criticalCount}</span>
                <span>High: {highCount}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xl">⏱️</span>
              <span className="text-xs text-gray-500 uppercase">Speed</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {analytics.avgResponseTimeHours > 0 ? `${Math.round(analytics.avgResponseTimeHours)}h` : 'N/A'}
            </div>
            <div className="text-xs text-gray-600 mt-1">Avg Response Time</div>
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="text-xs text-gray-600">
                Time to initial review
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row 1: Status & Priority */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Status Distribution */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Status Distribution</h3>
                <p className="text-xs text-gray-600">Current incident status breakdown</p>
              </div>
            </div>
            {statusChartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={150}>
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

          {/* Priority Breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Priority Breakdown</h3>
                <p className="text-xs text-gray-600">Severity levels of incidents</p>
              </div>
            </div>
            {priorityChartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={150}>
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

        {/* Incident Trends */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Incident Trends Over Time</h3>
              <p className="text-xs text-gray-600">Historical trend analysis showing total, critical, and resolved cases</p>
            </div>
          </div>
          {analytics.trendData && analytics.trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
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
                <div className="text-6xl mb-2">📉</div>
                <div className="text-lg">No trend data available</div>
              </div>
            </div>
          )}
        </div>

        {/* Charts Row 2: Classes, Zones, Equipment */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Injuries by Class */}
          {topClasses.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Injuries by Class</h3>
                  <p className="text-xs text-gray-600">Top classes by incident rate</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
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

          {/* Injuries by Zone */}
          {topZones.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Injuries by Zone</h3>
                  <p className="text-xs text-gray-600">Incidents per training zone</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
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
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Equipment Injuries</h3>
                  <p className="text-xs text-gray-600">Top equipment with incidents</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
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

        {/* Charts Row 3: Day Pattern, Venue, Program */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Day of Week Pattern */}
          {sortedDayData.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Day of Week Pattern</h3>
                  <p className="text-xs text-gray-600">Identify high-risk days</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
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
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Injuries by Venue</h3>
                <p className="text-xs text-gray-600">Compare incident rates across venues</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
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
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Injuries by Program</h3>
                <p className="text-xs text-gray-600">Incident distribution across programs</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
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
      </div>
    </DashboardLayout>
  );
}

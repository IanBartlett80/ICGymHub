'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import EquipmentManagementSubNav from '@/components/EquipmentManagementSubNav';
import VenueSelector from '@/components/VenueSelector';
import axiosInstance from '@/lib/axios';
import {
  LineChart,
  Line,
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
} from 'recharts';
import {
  ChartBarIcon,
  ChartPieIcon,
  ExclamationTriangleIcon,
  WrenchScrewdriverIcon,
  CubeIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline';

interface OverviewStats {
  totalCount: number;
  inUseCount: number;
  availableCount: number;
  maintenanceDueCount: number;
  needsAttentionCount: number;
  byCategory: { category: string; count: number }[];
  byCondition: { condition: string; count: number }[];
}

interface ZoneStatus {
  zoneId: string;
  zoneName: string;
  status: string;
  statusPriority: number;
  equipmentCount: number;
  criticalIssues: number;
  nonCriticalIssues: number;
  recommendations: number;
  overdueMaintenance: number;
  upcomingMaintenance: number;
  outOfServiceEquipment: number;
  poorConditionEquipment: number;
}

interface MonthlyData {
  month: string;
  total: number;
  [key: string]: number | string;
}

export default function EquipmentAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [venueId, setVenueId] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<number>(6); // months
  
  // Analytics data
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
  const [zoneStatuses, setZoneStatuses] = useState<ZoneStatus[]>([]);
  const [monthlyIssues, setMonthlyIssues] = useState<MonthlyData[]>([]);
  const [monthlyIssuesByVenue, setMonthlyIssuesByVenue] = useState<MonthlyData[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, [venueId, timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Build query params
      const venueParam = venueId && venueId !== 'all' ? `?venueId=${venueId}` : '';
      const monthsParam = `months=${timeRange}`;

      const [overviewRes, zoneStatusRes, monthlyIssuesRes, monthlyIssuesByVenueRes] = await Promise.all([
        axiosInstance.get(`/api/equipment/analytics/overview${venueParam}`),
        axiosInstance.get(`/api/equipment/analytics/zone-status${venueParam}`),
        axiosInstance.get(`/api/equipment/analytics/safety-issues-monthly?${monthsParam}`),
        axiosInstance.get(`/api/equipment/analytics/safety-issues-monthly-by-venue?${monthsParam}`),
      ]);

      setOverviewStats(overviewRes.data);
      setZoneStatuses(Array.isArray(zoneStatusRes.data) ? zoneStatusRes.data : []);
      setMonthlyIssues(monthlyIssuesRes.data.monthlyData || []);
      setMonthlyIssuesByVenue(monthlyIssuesByVenueRes.data.monthlyData || []);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Chart colors
  const CONDITION_COLORS: Record<string, string> = {
    'Excellent': '#10b981',
    'Good': '#3b82f6',
    'Fair': '#f59e0b',
    'Poor': '#ef4444',
    'Out of Service': '#991b1b',
  };

  const STATUS_COLORS = ['#ef4444', '#f59e0b', '#eab308', '#84cc16', '#10b981', '#6366f1'];

  // Calculate safety issue totals for pie chart
  const getSafetyIssueSummary = () => {
    const summary = {
      critical: 0,
      nonCritical: 0,
      recommendations: 0,
    };

    zoneStatuses.forEach(zone => {
      summary.critical += zone.criticalIssues;
      summary.nonCritical += zone.nonCriticalIssues;
      summary.recommendations += zone.recommendations;
    });

    return [
      { name: 'Critical Issues', value: summary.critical, color: '#dc2626' },
      { name: 'Non-Critical Issues', value: summary.nonCritical, color: '#f59e0b' },
      { name: 'Recommendations', value: summary.recommendations, color: '#3b82f6' },
    ].filter(item => item.value > 0);
  };

  // Calculate maintenance summary
  const getMaintenanceSummary = () => {
    const summary = {
      overdue: 0,
      upcoming: 0,
    };

    zoneStatuses.forEach(zone => {
      summary.overdue += zone.overdueMaintenance;
      summary.upcoming += zone.upcomingMaintenance;
    });

    return [
      { name: 'Overdue', value: summary.overdue, color: '#dc2626' },
      { name: 'Due Soon (7 days)', value: summary.upcoming, color: '#f59e0b' },
    ].filter(item => item.value > 0);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <EquipmentManagementSubNav />
        <div className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <EquipmentManagementSubNav />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Equipment & Safety Analytics</h1>
            <p className="text-gray-600 mt-1">Comprehensive insights into equipment status and safety metrics</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Venue</label>
              <VenueSelector value={venueId} onChange={setVenueId} showAllOption={true} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value={3}>Last 3 Months</option>
                <option value={6}>Last 6 Months</option>
                <option value={12}>Last 12 Months</option>
              </select>
            </div>
          </div>
        </div>

        {/* Overview Stats Cards */}
        {overviewStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Equipment</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{overviewStats.totalCount}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {overviewStats.inUseCount} in use
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <CubeIcon className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Maintenance Due</p>
                  <p className="text-3xl font-bold text-orange-600 mt-2">{overviewStats.maintenanceDueCount}</p>
                  <p className="text-sm text-gray-500 mt-1">Next 7 days</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg">
                  <WrenchScrewdriverIcon className="h-8 w-8 text-orange-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Needs Attention</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">{overviewStats.needsAttentionCount}</p>
                  <p className="text-sm text-gray-500 mt-1">Fair/Poor condition</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Available</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{overviewStats.availableCount}</p>
                  <p className="text-sm text-gray-500 mt-1">Ready for use</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <ShieldExclamationIcon className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Equipment Breakdowns */}
        {overviewStats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Equipment by Category */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-6">
                <ChartPieIcon className="h-6 w-6 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">Equipment by Category</h2>
              </div>
              {overviewStats.byCategory && overviewStats.byCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={overviewStats.byCategory}
                      dataKey="count"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {overviewStats.byCategory.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray-500 py-12">No category data available</p>
              )}
            </div>

            {/* Equipment by Condition */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-6">
                <ChartBarIcon className="h-6 w-6 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">Equipment by Condition</h2>
              </div>
              {overviewStats.byCondition && overviewStats.byCondition.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={overviewStats.byCondition}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="condition" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      {overviewStats.byCondition.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CONDITION_COLORS[entry.condition] || '#6b7280'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray-500 py-12">No condition data available</p>
              )}
            </div>
          </div>
        )}

        {/* Safety Issues Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Safety Issues Breakdown */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <ExclamationTriangleIcon className="h-6 w-6 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Active Safety Issues</h2>
            </div>
            {getSafetyIssueSummary().length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={getSafetyIssueSummary()}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {getSafetyIssueSummary().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <ShieldExclamationIcon className="h-16 w-16 text-green-400 mb-4" />
                <p className="text-center text-gray-500">No active safety issues</p>
                <p className="text-sm text-gray-400 mt-1">Great work! Keep up the safety standards</p>
              </div>
            )}
          </div>

          {/* Maintenance Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <WrenchScrewdriverIcon className="h-6 w-6 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Maintenance Summary</h2>
            </div>
            {getMaintenanceSummary().length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={getMaintenanceSummary()}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {getMaintenanceSummary().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <WrenchScrewdriverIcon className="h-16 w-16 text-green-400 mb-4" />
                <p className="text-center text-gray-500">All maintenance up to date</p>
                <p className="text-sm text-gray-400 mt-1">Excellent maintenance schedule!</p>
              </div>
            )}
          </div>
        </div>

        {/* Safety Issues Trends */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <ChartBarIcon className="h-6 w-6 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Safety Issues Trend by Zone</h2>
          </div>
          {monthlyIssues && monthlyIssues.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={monthlyIssues}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                {Object.keys(monthlyIssues[0] || {})
                  .filter(key => key !== 'month' && key !== 'total')
                  .map((zoneName, index) => (
                    <Line
                      key={zoneName}
                      type="monotone"
                      dataKey={zoneName}
                      stroke={STATUS_COLORS[index % STATUS_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-500 py-12">No trend data available</p>
          )}
        </div>

        {/* Safety Issues by Venue Trend */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <ChartBarIcon className="h-6 w-6 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Safety Issues Trend by Venue</h2>
          </div>
          {monthlyIssuesByVenue && monthlyIssuesByVenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={monthlyIssuesByVenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                {Object.keys(monthlyIssuesByVenue[0] || {})
                  .filter(key => key !== 'month' && key !== 'total')
                  .map((venueName, index) => (
                    <Line
                      key={venueName}
                      type="monotone"
                      dataKey={venueName}
                      stroke={STATUS_COLORS[index % STATUS_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-500 py-12">No venue trend data available</p>
          )}
        </div>

        {/* Zone-by-Zone Breakdown */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <ChartBarIcon className="h-6 w-6 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Zone-by-Zone Analysis</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Zone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Equipment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Critical Issues
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Non-Critical
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Overdue Maint.
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {zoneStatuses.map((zone) => (
                  <tr key={zone.zoneId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {zone.zoneName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {zone.equipmentCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${zone.criticalIssues > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {zone.criticalIssues}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${zone.nonCriticalIssues > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                        {zone.nonCriticalIssues}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${zone.overdueMaintenance > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {zone.overdueMaintenance}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          zone.status === 'CRITICAL'
                            ? 'bg-red-100 text-red-800'
                            : zone.status === 'ATTENTION_REQUIRED'
                            ? 'bg-orange-100 text-orange-800'
                            : zone.status === 'MAINTENANCE_DUE'
                            ? 'bg-yellow-100 text-yellow-800'
                            : zone.status === 'MINOR_ISSUES'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {zone.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

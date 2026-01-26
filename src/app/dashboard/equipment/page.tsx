'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Zone } from '@prisma/client';
import { QrCodeIcon } from '@heroicons/react/24/outline';
import DashboardLayout from '@/components/DashboardLayout';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

interface ZoneWithStatus extends Zone {
  statusInfo?: ZoneStatus;
}

interface MonthlyData {
  month: string;
  total: number;
  [key: string]: number | string;
}

export default function EquipmentPage() {
  const router = useRouter();
  const [zones, setZones] = useState<ZoneWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [zoneNames, setZoneNames] = useState<string[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    inUse: 0,
    maintenanceDue: 0,
    needsAttention: 0,
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [zonesRes, statsRes, statusRes, monthlyRes] = await Promise.all([
        fetch('/api/zones'),
        fetch('/api/equipment/analytics/overview'),
        fetch('/api/equipment/analytics/zone-status'),
        fetch('/api/equipment/analytics/safety-issues-monthly?months=6'),
      ]);

      let zonesData: Zone[] = [];
      let statusData: ZoneStatus[] = [];

      if (zonesRes.ok) {
        const data = await zonesRes.json();
        zonesData = data.zones || data;
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats({
          total: data.totalCount || 0,
          inUse: data.inUseCount || 0,
          maintenanceDue: data.maintenanceDueCount || 0,
          needsAttention: data.needsAttentionCount || 0,
        });
      }

      if (statusRes.ok) {
        const data = await statusRes.json();
        statusData = data.zones || [];
      }

      if (monthlyRes.ok) {
        const data = await monthlyRes.json();
        setMonthlyData(data.data || []);
        setZoneNames(data.zones || []);
      }

      // Merge zone data with status info
      const zonesWithStatus = zonesData.map(zone => ({
        ...zone,
        statusInfo: statusData.find(s => s.zoneId === zone.id),
      }));

      setZones(zonesWithStatus);
    } catch (error) {
      console.error('Failed to load data:', error);
      alert('Failed to load equipment data');
    } finally {
      setLoading(false);
    }
  };


  const getStatusBadgeConfig = (status: string) => {
    const configs = {
      NO_DEFECTS: {
        label: 'No Defects Detected',
        icon: '🟢',
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        borderColor: 'border-green-300',
      },
      NON_CRITICAL_ISSUES: {
        label: 'Non-Critical Issues',
        icon: '🟡',
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-800',
        borderColor: 'border-yellow-300',
      },
      REQUIRES_ATTENTION: {
        label: 'Requires Attention',
        icon: '🟠',
        bgColor: 'bg-orange-100',
        textColor: 'text-orange-800',
        borderColor: 'border-orange-300',
      },
      CRITICAL_DEFECTS: {
        label: 'Critical Defects',
        icon: '🔴',
        bgColor: 'bg-red-100',
        textColor: 'text-red-800',
        borderColor: 'border-red-300',
      },
    };
    return configs[status as keyof typeof configs] || configs.NO_DEFECTS;
  };

  const filteredZones = statusFilter === 'all' 
    ? zones 
    : zones.filter(z => z.statusInfo?.status === statusFilter);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Equipment Management</h1>
          <p className="mt-1 text-sm text-gray-600">
            Zone-based equipment tracking and safety management
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-600">Total Equipment</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-600">Currently In Use</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">{stats.inUse}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-600">Maintenance Due</p>
            <p className="mt-2 text-3xl font-bold text-orange-600">{stats.maintenanceDue}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-600">Needs Attention</p>
            <p className="mt-2 text-3xl font-bold text-red-600">{stats.needsAttention}</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-between">
          <div>
            <label htmlFor="status-filter" className="text-sm font-medium text-gray-700 mr-2">
              Filter by Status:
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="all">All Zones</option>
              <option value="NO_DEFECTS">No Defects</option>
              <option value="NON_CRITICAL_ISSUES">Non-Critical Issues</option>
              <option value="REQUIRES_ATTENTION">Requires Attention</option>
              <option value="CRITICAL_DEFECTS">Critical Defects</option>
            </select>
          </div>
        </div>

        {/* Monthly Safety Issues Chart */}
        {monthlyData.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Safety Issues Trend by Zone</h2>
              <p className="text-sm text-gray-600">Month-over-month safety issues reported per zone (Last 6 months)</p>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  angle={-15}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Number of Issues', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                {zoneNames.map((zoneName, index) => {
                  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
                  return (
                    <Line
                      key={zoneName}
                      type="monotone"
                      dataKey={zoneName}
                      stroke={colors[index % colors.length]}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  );
                })}
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#1f2937"
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={{ r: 5 }}
                  activeDot={{ r: 7 }}
                  name="Total (All Zones)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Zone Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredZones.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500">No zones found</p>
            </div>
          ) : (
            filteredZones.map(zone => {
              const statusInfo = zone.statusInfo;
              const statusConfig = statusInfo 
                ? getStatusBadgeConfig(statusInfo.status)
                : getStatusBadgeConfig('NO_DEFECTS');

              return (
                <div
                  key={zone.id}
                  className={`bg-white border-2 ${statusConfig.borderColor} rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden cursor-pointer`}
                  onClick={() => router.push(`/dashboard/equipment/zones/${zone.id}`)}
                >
                  {/* Zone Header */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{zone.name}</h3>
                        {zone.description && (
                          <p className="text-sm text-gray-500 mt-1">{zone.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bgColor} ${statusConfig.textColor} mb-4`}>
                      <span className="mr-2">{statusConfig.icon}</span>
                      {statusConfig.label}
                    </div>

                    {/* Stats */}
                    {statusInfo && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Equipment:</span>
                          <span className="font-medium text-gray-900">{statusInfo.equipmentCount}</span>
                        </div>
                        {statusInfo.criticalIssues > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-red-600">Critical Issues:</span>
                            <span className="font-bold text-red-700">{statusInfo.criticalIssues}</span>
                          </div>
                        )}
                        {statusInfo.nonCriticalIssues > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-orange-600">Non-Critical Issues:</span>
                            <span className="font-medium text-orange-700">{statusInfo.nonCriticalIssues}</span>
                          </div>
                        )}
                        {statusInfo.overdueMaintenance > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-yellow-600">Overdue Maintenance:</span>
                            <span className="font-medium text-yellow-700">{statusInfo.overdueMaintenance}</span>
                          </div>
                        )}
                        {statusInfo.outOfServiceEquipment > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Out of Service:</span>
                            <span className="font-medium text-gray-700">{statusInfo.outOfServiceEquipment}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/equipment/zones/${zone.id}`);
                      }}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      View Equipment →
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        alert('QR code generation coming soon!');
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <QrCodeIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

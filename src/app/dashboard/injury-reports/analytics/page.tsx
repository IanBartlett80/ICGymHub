'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import InjuryReportsSubNav from '@/components/InjuryReportsSubNav';
import Link from 'next/link';

interface AnalyticsData {
  totalSubmissions: number;
  statusCounts: { status: string; count: number }[];
  priorityCounts: { priority: string; count: number }[];
  submissionsByDate: { [key: string]: number };
  avgResponseTimeHours: number;
  gymsportBreakdown: { gymsportName: string; count: number }[];
  classBreakdown: { className: string; count: number }[];
  equipmentBreakdown: { equipmentName: string; count: number }[];
  coachInvolvementStats: { coachName: string; incidentCount: number }[];
  timePatterns: { hour: number; count: number }[];
  trendData: { period: string; count: number }[];
}

interface Gymsport {
  id: string;
  name: string;
}

interface Class {
  id: string;
  name: string;
}

interface Equipment {
  id: string;
  name: string;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [gymsportFilter, setGymsportFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [equipmentFilter, setEquipmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Dropdown options
  const [gymsports, setGymsports] = useState<Gymsport[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);

  useEffect(() => {
    loadFilters();
    loadAnalytics();
  }, [gymsportFilter, classFilter, equipmentFilter, statusFilter, priorityFilter, startDate, endDate]);

  const loadFilters = async () => {
    try {
      const [gymsportsRes, classesRes, equipmentRes] = await Promise.all([
        fetch('/api/gymsports'),
        fetch('/api/classes'),
        fetch('/api/equipment?active=true'),
      ]);

      if (gymsportsRes.ok) {
        const data = await gymsportsRes.json();
        setGymsports(Array.isArray(data) ? data : data.gymsports || []);
      }
      if (classesRes.ok) {
        const data = await classesRes.json();
        setClasses(Array.isArray(data) ? data : data.classes || []);
      }
      if (equipmentRes.ok) {
        const data = await equipmentRes.json();
        setEquipment(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error loading filters:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (gymsportFilter !== 'all') params.append('gymsport', gymsportFilter);
      if (classFilter !== 'all') params.append('class', classFilter);
      if (equipmentFilter !== 'all') params.append('equipment', equipmentFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

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

  const clearFilters = () => {
    setGymsportFilter('all');
    setClassFilter('all');
    setEquipmentFilter('all');
    setStatusFilter('all');
    setPriorityFilter('all');
    setStartDate('');
    setEndDate('');
  };

  const exportComplianceReport = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/injury-submissions/export-compliance?${params}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `injury-compliance-report-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace('_', ' ');
  };

  return (
    <DashboardLayout>
      <InjuryReportsSubNav />
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Analytics & Insights</h1>
          <p className="text-gray-600">
            View trends, patterns, and comprehensive statistics for injury reports
          </p>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Filters</h2>
            <div className="flex gap-2">
              <button
                onClick={clearFilters}
                className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Clear All
              </button>
              <button
                onClick={exportComplianceReport}
                className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                📄 Export Compliance Report
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Gymsport Filter */}
            <div>
              <label className="block text-sm font-medium mb-1">Gymsport</label>
              <select
                value={gymsportFilter}
                onChange={(e) => setGymsportFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Gymsports</option>
                {gymsports.map((gs) => (
                  <option key={gs.id} value={gs.id}>{gs.name}</option>
                ))}
              </select>
            </div>

            {/* Class Filter */}
            <div>
              <label className="block text-sm font-medium mb-1">Class</label>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Equipment Filter */}
            <div>
              <label className="block text-sm font-medium mb-1">Equipment</label>
              <select
                value={equipmentFilter}
                onChange={(e) => setEquipmentFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Equipment</option>
                {equipment.map((eq) => (
                  <option key={eq.id} value={eq.id}>{eq.name}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="NEW">New</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">Loading analytics...</div>
          </div>
        ) : analytics ? (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">Total Submissions</div>
                <div className="text-3xl font-bold text-blue-600">{analytics.totalSubmissions}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">Avg Response Time</div>
                <div className="text-3xl font-bold text-purple-600">
                  {analytics.avgResponseTimeHours.toFixed(1)}h
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">New Reports</div>
                <div className="text-3xl font-bold text-orange-600">
                  {analytics.statusCounts.find(s => s.status === 'NEW')?.count || 0}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">Resolved Reports</div>
                <div className="text-3xl font-bold text-green-600">
                  {analytics.statusCounts.find(s => s.status === 'RESOLVED')?.count || 0}
                </div>
              </div>
            </div>

            {/* Status Distribution */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Status Distribution</h3>
              <div className="space-y-3">
                {analytics.statusCounts.map((item) => (
                  <div key={item.status}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">{getStatusLabel(item.status)}</span>
                      <span className="text-sm text-gray-600">{item.count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${(item.count / analytics.totalSubmissions) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Priority Distribution */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Priority Breakdown</h3>
              <div className="space-y-3">
                {analytics.priorityCounts.map((item) => (
                  <div key={item.priority}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">{item.priority}</span>
                      <span className="text-sm text-gray-600">{item.count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          item.priority === 'CRITICAL' ? 'bg-red-600' :
                          item.priority === 'HIGH' ? 'bg-orange-600' :
                          item.priority === 'MEDIUM' ? 'bg-yellow-600' :
                          'bg-green-600'
                        }`}
                        style={{
                          width: `${(item.count / analytics.totalSubmissions) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gymsport Breakdown */}
            {analytics.gymsportBreakdown && analytics.gymsportBreakdown.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Injuries by Gymsport</h3>
                <div className="space-y-3">
                  {analytics.gymsportBreakdown.map((item) => (
                    <div key={item.gymsportName}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">{item.gymsportName}</span>
                        <span className="text-sm text-gray-600">{item.count}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{
                            width: `${(item.count / analytics.totalSubmissions) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Class Breakdown */}
            {analytics.classBreakdown && analytics.classBreakdown.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Injuries by Class</h3>
                <div className="space-y-3">
                  {analytics.classBreakdown.map((item) => (
                    <div key={item.className}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">{item.className}</span>
                        <span className="text-sm text-gray-600">{item.count}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-teal-600 h-2 rounded-full"
                          style={{
                            width: `${(item.count / analytics.totalSubmissions) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Equipment Breakdown */}
            {analytics.equipmentBreakdown && analytics.equipmentBreakdown.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Injuries by Equipment</h3>
                <div className="space-y-3">
                  {analytics.equipmentBreakdown.map((item) => (
                    <div key={item.equipmentName}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">{item.equipmentName}</span>
                        <span className="text-sm text-gray-600">{item.count}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-pink-600 h-2 rounded-full"
                          style={{
                            width: `${(item.count / analytics.totalSubmissions) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submissions Over Time */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Submissions Over Time</h3>
              <div className="space-y-2">
                {Object.entries(analytics.submissionsByDate)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .slice(-30)
                  .map(([date, count]) => (
                    <div key={date} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-24">{date}</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${(count / Math.max(...Object.values(analytics.submissionsByDate))) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-8 text-right">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg">No data available</div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

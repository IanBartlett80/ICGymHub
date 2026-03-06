'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import InjuryReportsSubNav from '@/components/InjuryReportsSubNav';
import VenueSelector from '@/components/VenueSelector';
import {
 BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
 XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface Stats {
 totalSubmissions: number;
 statusCounts: { status: string; count: number }[];
 priorityCounts: { priority: string; count: number }[];
 templateCounts: { templateId: string; templateName: string; count: number }[];
 submissionsByDate: { [key: string]: number };
 avgResponseTimeHours: number;
}

interface AnalyticsData {
 totalSubmissions: number;
 statusCounts: { status: string; count: number }[];
 priorityCounts: { priority: string; count: number }[];
 gymsportBreakdown: { gymsportName: string; count: number }[];
 venueBreakdown: { venueName: string; count: number; critical: number }[];
 zoneBreakdown: { zoneName: string; count: number }[];
 equipmentInjuryBreakdown: { equipmentName: string; count: number; critical: number }[];
 equipmentRelatedCount: number;
 trendData: { month: string; total: number; critical: number; resolved: number }[];
 dayOfWeekPattern: { day: string; count: number }[];
 severityDistribution: { name: string; value: number; color: string }[];
 avgResponseTimeHours: number;
}

interface Submission {
 id: string;
 status: string;
 priority: string | null;
 submittedAt: string;
 template: {
  id: string;
  name: string;
 };
 assignedTo: {
  id: string;
  fullName: string;
  email: string;
 } | null;
 athleteName: string | null;
 coachName: string | null;
 className: string | null;
 programName: string | null;
 _count: {
  comments: number;
 };
}

interface MonthlyData {
 month: string;
 total: number;
 [key: string]: number | string;
}

export default function InjuryReportsDashboard() {
 const [stats, setStats] = useState<Stats | null>(null);
 const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
 const [submissions, setSubmissions] = useState<Submission[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [filter, setFilter] = useState<string>('all');
 const [programFilter, setProgramFilter] = useState<string>('all');
 const [coachFilter, setCoachFilter] = useState<string>('all');
 const [classFilter, setClassFilter] = useState<string>('all');
 const [venueId, setVenueId] = useState<string | null>(null);
 const [showAnalytics, setShowAnalytics] = useState(true);
 const [monthlyDataByZone, setMonthlyDataByZone] = useState<MonthlyData[]>([]);
 const [monthlyDataByVenue, setMonthlyDataByVenue] = useState<MonthlyData[]>([]);
 const [monthlyDataByProgram, setMonthlyDataByProgram] = useState<MonthlyData[]>([]);
 const [zoneNames, setZoneNames] = useState<string[]>([]);
 const [venueNames, setVenueNames] = useState<string[]>([]);
 const [programNames, setProgramNames] = useState<string[]>([]);

 useEffect(() => {
  loadData();
 }, [filter]);

 useEffect(() => {
  loadAnalytics();
  loadMonthlyTrends();
 }, [venueId]);

 const loadData = async () => {
  try {
   setLoading(true);
   setError(null);
   
   // Load statistics
   const statsRes = await fetch('/api/injury-submissions/stats');
   if (statsRes.ok) {
    const data = await statsRes.json();
    setStats(data);
   }

   // Load submissions
   const submissionsUrl = filter === 'all' 
    ? '/api/injury-submissions'
    : `/api/injury-submissions?status=${filter}`;
   
   const submissionsRes = await fetch(submissionsUrl);
   if (submissionsRes.ok) {
    const data = await submissionsRes.json();
    setSubmissions(data.submissions);
   } else {
    setSubmissions([]);
    setError('Could not load injury submissions. Please refresh and try again.');
   }
  } catch (error) {
   console.error('Error loading data:', error);
   setSubmissions([]);
   setError('Could not load injury submissions. Please refresh and try again.');
  } finally {
   setLoading(false);
  }
 };

 const loadAnalytics = async () => {
  try {
   const params = new URLSearchParams();
   if (venueId && venueId !== 'all') params.append('venueId', venueId);

   const res = await fetch(`/api/injury-submissions/analytics?${params}`);
   if (res.ok) {
    const data = await res.json();
    setAnalytics(data);
   }
  } catch (error) {
   console.error('Error loading analytics:', error);
  }
 };

 const loadMonthlyTrends = async () => {
  try {
   const [zoneRes, venueRes, programRes] = await Promise.all([
    fetch('/api/injury-submissions/analytics/monthly-by-zone?months=6'),
    fetch('/api/injury-submissions/analytics/monthly-by-venue?months=6'),
    fetch('/api/injury-submissions/analytics/monthly-by-program?months=6'),
   ]);

   if (zoneRes.ok) {
    const data = await zoneRes.json();
    setMonthlyDataByZone(data.data || []);
    setZoneNames(data.zones || []);
   }

   if (venueRes.ok) {
    const data = await venueRes.json();
    setMonthlyDataByVenue(data.data || []);
    setVenueNames(data.venues || []);
   }

   if (programRes.ok) {
    const data = await programRes.json();
    setMonthlyDataByProgram(data.data || []);
    setProgramNames(data.programs || []);
   }
  } catch (error) {
   console.error('Error loading monthly trends:', error);
  }
 };

 // Get unique values for filters
 const uniquePrograms = Array.from(new Set(submissions.map(s => s.programName).filter(Boolean))) as string[];
 const uniqueCoaches = Array.from(new Set(submissions.map(s => s.coachName).filter(Boolean))) as string[];
 const uniqueClasses = Array.from(new Set(submissions.map(s => s.className).filter(Boolean))) as string[];

 // Filter submissions based on selected filters
 const filteredSubmissions = submissions.filter(submission => {
  if (programFilter !== 'all' && submission.programName !== programFilter) return false;
  if (coachFilter !== 'all' && submission.coachName !== coachFilter) return false;
  if (classFilter !== 'all' && submission.className !== classFilter) return false;
  return true;
 });

 const getStatusColor = (status: string) => {
  switch (status) {
   case 'NEW': return 'bg-orange-100 text-orange-800 border-orange-300';
   case 'UNDER_REVIEW': return 'bg-blue-100 text-blue-800 border-blue-300';
   case 'RESOLVED': return 'bg-green-100 text-green-800 border-green-300';
   case 'CLOSED': return 'bg-gray-100 text-gray-800 border-gray-300';
   default: return 'bg-gray-100 text-gray-800 border-gray-300';
  }
 };

 const getPriorityColor = (priority: string | null) => {
  switch (priority) {
   case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-300';
   case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-300';
   case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
   case 'LOW': return 'bg-green-100 text-green-800 border-green-300';
   default: return 'bg-gray-100 text-gray-800 border-gray-300';
  }
 };

 if (loading && !stats) {
  return (
   <DashboardLayout>
    <InjuryReportsSubNav />
    <div className="flex items-center justify-center h-64">
     <div className="text-gray-500">Loading...</div>
    </div>
   </DashboardLayout>
  );
 }

 return (
  <DashboardLayout>
   <InjuryReportsSubNav />
   <div className="p-6 space-y-6">
    {/* Header */}
    <div className="flex justify-between items-center">
     <div>
      <h1 className="text-2xl font-bold text-gray-900">Injury and Incident Management</h1>
      <p className="text-gray-600 mt-1">Manage and review injury reports from your team</p>
     </div>
     <div className="flex gap-3">
      <button
       onClick={() => setShowAnalytics(!showAnalytics)}
       className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
>
       {showAnalytics ? '📊 Hide Analytics' : '📊 Show Analytics'}
      </button>
      <Link
       href="/dashboard/injury-reports/forms"
       className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
>
       Manage Forms
      </Link>
      <Link
       href="/dashboard/injury-reports/forms/new"
       className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
>
       + Create Form
      </Link>
     </div>
    </div>

    {/* Statistics Cards */}
    {stats && (
     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
       <div className="flex items-center justify-between mb-4">
        <span className="text-4xl">📋</span>
        <span className="text-blue-100 text-sm">Total</span>
       </div>
       <div className="text-3xl font-bold">{stats.totalSubmissions}</div>
       <div className="text-blue-100 text-sm mt-1">Total Submissions</div>
      </div>

      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
       <div className="flex items-center justify-between mb-4">
        <span className="text-4xl">🆕</span>
        <span className="text-orange-100 text-sm">New</span>
       </div>
       <div className="text-3xl font-bold">
        {stats.statusCounts.find(s => s.status === 'NEW')?.count || 0}
       </div>
       <div className="text-orange-100 text-sm mt-1">New Reports</div>
      </div>

      <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
       <div className="flex items-center justify-between mb-4">
        <span className="text-4xl">🔍</span>
        <span className="text-purple-100 text-sm">Active</span>
       </div>
       <div className="text-3xl font-bold">
        {stats.statusCounts.find(s => s.status === 'UNDER_REVIEW')?.count || 0}
       </div>
       <div className="text-purple-100 text-sm mt-1">Under Review</div>
      </div>

      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
       <div className="flex items-center justify-between mb-4">
        <span className="text-4xl">⏱️</span>
        <span className="text-green-100 text-sm">Average</span>
       </div>
       <div className="text-3xl font-bold">
        {stats.avgResponseTimeHours> 0 ? `${Math.round(stats.avgResponseTimeHours)}h` : 'N/A'}
       </div>
       <div className="text-green-100 text-sm mt-1">Response Time</div>
      </div>
     </div>
    )}

    {/* Analytics Dashboard Section */}
    {showAnalytics && analytics && (
     <>
      {/* Venue Filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
       <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Analytics Dashboard</h2>
        <div className="w-48">
         <VenueSelector
          value={venueId}
          onChange={setVenueId}
          showAllOption={true}
         />
        </div>
       </div>
      </div>

      {/* Charts Section - Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
       {/* Injury Trends Over Time */}
       <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Injury Trends (Last 6 Months)</h3>
        {analytics.trendData.length> 0 ? (
         <ResponsiveContainer width="100%" height={300}>
          <LineChart data={analytics.trendData}>
           <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
           <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
           <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
           <Tooltip
            contentStyle={{
             backgroundColor: '#fff',
             border: '1px solid #e5e7eb',
             borderRadius: '8px',
            }}
           />
           <Legend />
           <Line
            type="monotone"
            dataKey="total"
            stroke="#3b82f6"
            strokeWidth={2}
            name="Total Injuries"
            dot={{ fill: '#3b82f6', r: 4 }}
           />
           <Line
            type="monotone"
            dataKey="critical"
            stroke="#ef4444"
            strokeWidth={2}
            name="Critical"
            dot={{ fill: '#ef4444', r: 4 }}
           />
           <Line
            type="monotone"
            dataKey="resolved"
            stroke="#22c55e"
            strokeWidth={2}
            name="Resolved"
            dot={{ fill: '#22c55e', r: 4 }}
           />
          </LineChart>
         </ResponsiveContainer>
        ) : (
         <div className="h-[300px] flex items-center justify-center text-gray-400">
          No trend data available
         </div>
        )}
       </div>

       {/* Severity Distribution */}
       <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Severity Distribution</h3>
        {analytics.severityDistribution.length> 0 ? (
         <ResponsiveContainer width="100%" height={300}>
          <PieChart>
           <Pie
            data={analytics.severityDistribution}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} (${percent ? (percent * 100).toFixed(0) : 0}%)`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
>
            {analytics.severityDistribution.map((entry, index) => (
             <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
           </Pie>
           <Tooltip />
          </PieChart>
         </ResponsiveContainer>
        ) : (
         <div className="h-[300px] flex items-center justify-center text-gray-400">
          No severity data available
         </div>
        )}
       </div>
      </div>

      {/* Charts Section - Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
       {/* Venue Breakdown */}
       {analytics.venueBreakdown.length> 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
         <h3 className="text-lg font-semibold text-gray-900 mb-4">Injuries by Venue</h3>
         <ResponsiveContainer width="100%" height={300}>
          <BarChart data={analytics.venueBreakdown}>
           <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
           <XAxis dataKey="venueName" stroke="#6b7280" style={{ fontSize: '12px' }} />
           <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
           <Tooltip
            contentStyle={{
             backgroundColor: '#fff',
             border: '1px solid #e5e7eb',
             borderRadius: '8px',
            }}
           />
           <Legend />
           <Bar dataKey="count" fill="#3b82f6" name="Total" radius={[8, 8, 0, 0]} />
           <Bar dataKey="critical" fill="#ef4444" name="Critical" radius={[8, 8, 0, 0]} />
          </BarChart>
         </ResponsiveContainer>
        </div>
       )}

       {/* Gymsport Breakdown */}
       {analytics.gymsportBreakdown.length> 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
         <h3 className="text-lg font-semibold text-gray-900 mb-4">Injuries by Gymsport</h3>
         <ResponsiveContainer width="100%" height={300}>
          <BarChart data={analytics.gymsportBreakdown.slice(0, 10)}>
           <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
           <XAxis dataKey="gymsportName" stroke="#6b7280" style={{ fontSize: '12px' }} />
           <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
           <Tooltip
            contentStyle={{
             backgroundColor: '#fff',
             border: '1px solid #e5e7eb',
             borderRadius: '8px',
            }}
           />
           <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
          </BarChart>
         </ResponsiveContainer>
        </div>
       )}
      </div>

      {/* Charts Section - Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
       {/* Day of Week Pattern */}
       {analytics.dayOfWeekPattern.length> 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
         <h3 className="text-lg font-semibold text-gray-900 mb-4">Injuries by Day of Week</h3>
         <ResponsiveContainer width="100%" height={300}>
          <BarChart data={analytics.dayOfWeekPattern}>
           <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
           <XAxis dataKey="day" stroke="#6b7280" style={{ fontSize: '12px' }} />
           <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
           <Tooltip
            contentStyle={{
             backgroundColor: '#fff',
             border: '1px solid #e5e7eb',
             borderRadius: '8px',
            }}
           />
           <Bar dataKey="count" fill="#14b8a6" radius={[8, 8, 0, 0]} />
          </BarChart>
         </ResponsiveContainer>
        </div>
       )}

       {/* Equipment-Related Injuries */}
       {analytics.equipmentInjuryBreakdown.length> 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
         <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Equipment-Related Injuries
          <span className="text-sm font-normal text-gray-500 ml-2">
           ({analytics.equipmentRelatedCount} total)
          </span>
         </h3>
         <ResponsiveContainer width="100%" height={300}>
          <BarChart data={analytics.equipmentInjuryBreakdown.slice(0, 10)}>
           <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
           <XAxis dataKey="equipmentName" stroke="#6b7280" style={{ fontSize: '12px' }} />
           <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
           <Tooltip
            contentStyle={{
             backgroundColor: '#fff',
             border: '1px solid #e5e7eb',
             borderRadius: '8px',
            }}
           />
           <Legend />
           <Bar dataKey="count" fill="#f59e0b" name="Total" radius={[8, 8, 0, 0]} />
           <Bar dataKey="critical" fill="#ef4444" name="Critical" radius={[8, 8, 0, 0]} />
          </BarChart>
         </ResponsiveContainer>
        </div>
       )}
      </div>

      {/* Zone Breakdown */}
      {analytics.zoneBreakdown.length> 0 && (
       <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Injuries by Zone</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
         {analytics.zoneBreakdown.map((zone) => (
          <div key={zone.zoneName} className="bg-gray-50 rounded-lg p-4 text-center">
           <div className="text-2xl font-bold text-gray-900">{zone.count}</div>
           <div className="text-sm text-gray-600 mt-1">{zone.zoneName}</div>
          </div>
         ))}
        </div>
       </div>
      )}
     </>
    )}

    {/* Monthly Incident Trends - Row 1 */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
     {/* Incident Trends by Zone */}
     {monthlyDataByZone.length > 0 && (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
       <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Incident Trends by Zone</h2>
        <p className="text-sm text-gray-600">Month-over-month incidents reported per zone (Last 6 months)</p>
       </div>
       <ResponsiveContainer width="100%" height={350}>
        <LineChart data={monthlyDataByZone}>
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
          label={{ value: 'Number of Incidents', angle: -90, position: 'insideLeft' }}
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

     {/* Incident Trends by Venue */}
     {monthlyDataByVenue.length > 0 && (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
       <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Incident Trends by Venue</h2>
        <p className="text-sm text-gray-600">Month-over-month incidents reported per venue (Last 6 months)</p>
       </div>
       <ResponsiveContainer width="100%" height={350}>
        <LineChart data={monthlyDataByVenue}>
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
          label={{ value: 'Number of Incidents', angle: -90, position: 'insideLeft' }}
         />
         <Tooltip 
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
          labelStyle={{ fontWeight: 'bold' }}
         />
         <Legend wrapperStyle={{ paddingTop: '20px' }} />
         {venueNames.map((venueName, index) => {
          const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
          return (
           <Line
            key={venueName}
            type="monotone"
            dataKey={venueName}
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
          name="Total (All Venues)"
         />
        </LineChart>
       </ResponsiveContainer>
      </div>
     )}
    </div>

    {/* Monthly Incident Trends - Row 2 */}
    {monthlyDataByProgram.length > 0 && (
     <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="mb-4">
       <h2 className="text-lg font-semibold text-gray-900">Incident Trends by Program</h2>
       <p className="text-sm text-gray-600">Month-over-month incidents reported per gymsport/program (Last 6 months)</p>
      </div>
      <ResponsiveContainer width="100%" height={350}>
       <LineChart data={monthlyDataByProgram}>
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
         label={{ value: 'Number of Incidents', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip 
         contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
         labelStyle={{ fontWeight: 'bold' }}
        />
        <Legend wrapperStyle={{ paddingTop: '20px' }} />
        {programNames.map((programName, index) => {
         const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
         return (
          <Line
           key={programName}
           type="monotone"
           dataKey={programName}
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
         name="Total (All Programs)"
        />
       </LineChart>
      </ResponsiveContainer>
     </div>
    )}

   {/* Submissions List */}
   <div className="bg-white rounded-lg shadow border border-gray-200">
    <div className="p-6 border-b border-gray-200">
     <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold text-gray-900">Recent Submissions</h2>
      <div className="flex gap-2">
       <button
        onClick={() => setFilter('all')}
        className={`px-3 py-1 text-sm rounded ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
>
        All
       </button>
       <button
        onClick={() => setFilter('NEW')}
        className={`px-3 py-1 text-sm rounded ${filter === 'NEW' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
>
        New
       </button>
       <button
        onClick={() => setFilter('UNDER_REVIEW')}
        className={`px-3 py-1 text-sm rounded ${filter === 'UNDER_REVIEW' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
>
        Under Review
       </button>
      </div>
     </div>

     {/* Filters */}
     <div className="flex gap-3">
      <div className="flex-1">
       <label className="block text-xs font-medium text-gray-700 mb-1">Program</label>
       <select
        value={programFilter}
        onChange={(e) => setProgramFilter(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
>
        <option value="all">All Programs</option>
        {uniquePrograms.map(program => (
         <option key={program} value={program}>{program}</option>
        ))}
       </select>
      </div>
      <div className="flex-1">
       <label className="block text-xs font-medium text-gray-700 mb-1">Coach</label>
       <select
        value={coachFilter}
        onChange={(e) => setCoachFilter(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
>
        <option value="all">All Coaches</option>
        {uniqueCoaches.map(coach => (
         <option key={coach} value={coach}>{coach}</option>
        ))}
       </select>
      </div>
      <div className="flex-1">
       <label className="block text-xs font-medium text-gray-700 mb-1">Class</label>
       <select
        value={classFilter}
        onChange={(e) => setClassFilter(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
>
        <option value="all">All Classes</option>
        {uniqueClasses.map(className => (
         <option key={className} value={className}>{className}</option>
        ))}
       </select>
      </div>
     </div>
    </div>

    <div className="overflow-x-auto">
     {error && (
      <div className="mx-6 mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
       {error}
      </div>
     )}
     {filteredSubmissions.length === 0 ? (
      <div className="text-center py-12">
       <div className="text-gray-400 text-lg mb-2">No submissions found</div>
       <p className="text-gray-500 text-sm">Create a form and share it with your team to start receiving reports</p>
      </div>
     ) : (
      <table className="min-w-full divide-y divide-gray-200">
       <thead className="bg-gray-50">
        <tr>
         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Athlete
         </th>
         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Coach
         </th>
         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Class
         </th>
         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Status
         </th>
         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Priority
         </th>
         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Submitted
         </th>
         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Comments
         </th>
         <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
          Actions
         </th>
        </tr>
       </thead>
       <tbody className="bg-white divide-y divide-gray-200">
        {filteredSubmissions.map((submission) => (
         <tr key={submission.id} className="hover:bg-gray-50">
          <td className="px-6 py-4 whitespace-nowrap">
           <div className="text-sm font-medium text-gray-900">{submission.athleteName || 'N/A'}</div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
           <div className="text-sm text-gray-900">{submission.coachName || 'N/A'}</div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
           <div className="text-sm text-gray-900">{submission.className || 'N/A'}</div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
           <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded border ${getStatusColor(submission.status)}`}>
            {submission.status.replace('_', ' ')}
           </span>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
           {submission.priority ? (
            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded border ${getPriorityColor(submission.priority)}`}>
             {submission.priority}
            </span>
           ) : (
            <span className="text-gray-400 text-sm">Not set</span>
           )}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
           {new Date(submission.submittedAt).toLocaleDateString()}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
           {submission._count.comments> 0 ? (
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
             {submission._count.comments}
            </span>
           ) : (
            <span className="text-gray-400">0</span>
           )}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
           <Link
            href={`/dashboard/injury-reports/${submission.id}`}
            className="text-blue-600 hover:text-blue-900"
>
            View
           </Link>
          </td>
         </tr>
        ))}
       </tbody>
      </table>
     )}
    </div>
   </div>
   </div>
  </DashboardLayout>
 );
}

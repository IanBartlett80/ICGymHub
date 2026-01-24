'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';

interface Stats {
  totalSubmissions: number;
  statusCounts: { status: string; count: number }[];
  priorityCounts: { priority: string; count: number }[];
  templateCounts: { templateId: string; templateName: string; count: number }[];
  submissionsByDate: { [key: string]: number };
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
  _count: {
    comments: number;
  };
}

export default function InjuryReportsDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    try {
      setLoading(true);
      
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
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

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
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <DashboardLayout title="Injury & Incident Reports">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Injury & Incident Reports</h1>
          <p className="text-gray-600 mt-1">Manage and review injury reports from your team</p>
        </div>
        <div className="flex gap-3">
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
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <div className="text-sm font-medium text-gray-600">Total Submissions</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{stats.totalSubmissions}</div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <div className="text-sm font-medium text-gray-600">New Reports</div>
            <div className="text-3xl font-bold text-orange-600 mt-2">
              {stats.statusCounts.find(s => s.status === 'NEW')?._count || 0}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <div className="text-sm font-medium text-gray-600">Under Review</div>
            <div className="text-3xl font-bold text-blue-600 mt-2">
              {stats.statusCounts.find(s => s.status === 'UNDER_REVIEW')?._count || 0}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <div className="text-sm font-medium text-gray-600">Avg Response Time</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">
              {stats.avgResponseTimeHours > 0 ? `${Math.round(stats.avgResponseTimeHours)}h` : 'N/A'}
            </div>
          </div>
        </div>
      )}

      {/* Status Breakdown */}
      {stats && (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Status Breakdown</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.statusCounts.map((status) => (
              <div key={status.status} className="text-center">
                <div className={`inline-block px-3 py-1 rounded text-sm font-medium ${getStatusColor(status.status)}`}>
                  {status.status.replace('_', ' ')}
                </div>
                <div className="text-2xl font-bold text-gray-900 mt-2">{status.count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submissions List */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
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
        </div>

        <div className="overflow-x-auto">
          {submissions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-2">No submissions found</div>
              <p className="text-gray-500 text-sm">Create a form and share it with your team to start receiving reports</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Form
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned To
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
                {submissions.map((submission) => (
                  <tr key={submission.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{submission.template.name}</div>
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      {submission.assignedTo ? (
                        <div className="text-sm text-gray-900">{submission.assignedTo.fullName}</div>
                      ) : (
                        <span className="text-gray-400 text-sm">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(submission.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {submission._count.comments > 0 ? (
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

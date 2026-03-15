'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import InjuryReportsSubNav from '@/components/InjuryReportsSubNav';
import VenueSelector from '@/components/VenueSelector';
import IntelligenceFilter from '@/components/IntelligenceFilter';
import { CheckCircleIcon, AcademicCapIcon, UserIcon, AcademicCapIcon as ClassIcon } from '@heroicons/react/24/outline';

interface Submission {
 id: string;
 status: string;
 priority: string | null;
 submittedAt: string;
 template: {
  id: string;
  name: string;
 };
 venue: {
  id: string;
  name: string;
 } | null;
 zone: {
  id: string;
  name: string;
 } | null;
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

export default function SubmissionsReportsPage() {
 const [submissions, setSubmissions] = useState<Submission[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [venueId, setVenueId] = useState<string | null>(null);
 const [statusFilter, setStatusFilter] = useState<string>('all');
 const [programFilter, setProgramFilter] = useState<string>('all');
 const [coachFilter, setCoachFilter] = useState<string>('all');
 const [classFilter, setClassFilter] = useState<string>('all');
 const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

 useEffect(() => {
  loadSubmissions();
 }, [statusFilter, venueId]);

 const loadSubmissions = async () => {
  try {
   setLoading(true);
   setError(null);
   
   const params = new URLSearchParams();
   if (statusFilter !== 'all') params.set('status', statusFilter);
   if (venueId && venueId !== 'all') params.set('venueId', venueId);
   
   const submissionsUrl = `/api/injury-submissions${params.toString() ? '?' + params.toString() : ''}`;
   
   const submissionsRes = await fetch(submissionsUrl);
   if (submissionsRes.ok) {
    const data = await submissionsRes.json();
    setSubmissions(data.submissions);
   } else {
    setSubmissions([]);
    setError('Could not load injury submissions. Please refresh and try again.');
   }
  } catch (error) {
   console.error('Error loading submissions:', error);
   setSubmissions([]);
   setError('Could not load injury submissions. Please refresh and try again.');
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

 // Get unique values for filters
 const uniquePrograms = Array.from(new Set(submissions.map(s => s.programName).filter(Boolean))) as string[];
 const uniqueCoaches = Array.from(new Set(submissions.map(s => s.coachName).filter(Boolean))) as string[];
 const uniqueClasses = Array.from(new Set(submissions.map(s => s.className).filter(Boolean))) as string[];

 // Separate active and history submissions
 const activeSubmissions = submissions.filter(s => s.status === 'NEW' || s.status === 'UNDER_REVIEW');
 const historySubmissions = submissions.filter(s => s.status === 'RESOLVED' || s.status === 'CLOSED');

 // Get current tab submissions
 const currentTabSubmissions = activeTab === 'active' ? activeSubmissions : historySubmissions;

 // Filter submissions based on selected filters
 const filteredSubmissions = currentTabSubmissions.filter(submission => {
  if (programFilter !== 'all' && submission.programName !== programFilter) return false;
  if (coachFilter !== 'all' && submission.coachName !== coachFilter) return false;
  if (classFilter !== 'all' && submission.className !== classFilter) return false;
  return true;
 });

 if (loading) {
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
   <div className="p-4 space-y-4">
    {/* Header */}
    <div>
     <h1 className="text-xl font-bold text-gray-900">Submitted Injury Reports</h1>
     <p className="text-xs text-gray-600 mt-1">View and manage all submitted injury reports</p>
    </div>

    {/* Submissions List */}
    <div className="bg-white rounded-lg shadow border border-gray-200">
     {/* Tabs */}
     <div className="border-b border-gray-200">
      <div className="flex">
       <button
        onClick={() => setActiveTab('active')}
        className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
         activeTab === 'active'
          ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }`}
       >
        Active Injury Reports ({activeSubmissions.length})
       </button>
       <button
        onClick={() => setActiveTab('history')}
        className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
         activeTab === 'history'
          ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }`}
       >
        Injury Reports History ({historySubmissions.length})
       </button>
      </div>
     </div>

     <div className="p-6 border-b border-gray-200">
      {/* Filters */}
      <IntelligenceFilter
        title={activeTab === 'active' ? 'Active Report Filters' : 'History Filters'}
        subtitle="Filter injury reports by venue, program, coach, and class"
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
            label: 'Program',
            value: programFilter,
            onChange: setProgramFilter,
            icon: <AcademicCapIcon className="h-4 w-4" />,
            options: [
              { value: 'all', label: 'All Programs' },
              ...uniquePrograms.map(program => ({
                value: program,
                label: program,
              })),
            ],
          },
          {
            type: 'select',
            label: 'Coach',
            value: coachFilter,
            onChange: setCoachFilter,
            icon: <UserIcon className="h-4 w-4" />,
            options: [
              { value: 'all', label: 'All Coaches' },
              ...uniqueCoaches.map(coach => ({
                value: coach,
                label: coach,
              })),
            ],
          },
          {
            type: 'select',
            label: 'Class',
            value: classFilter,
            onChange: setClassFilter,
            icon: <ClassIcon className="h-4 w-4" />,
            options: [
              { value: 'all', label: 'All Classes' },
              ...uniqueClasses.map(className => ({
                value: className,
                label: className,
              })),
            ],
          },
        ]}
        onReset={() => {
          setVenueId(null);
          setProgramFilter('all');
          setCoachFilter('all');
          setClassFilter('all');
        }}
        filterCount={filteredSubmissions.length}
        filterCountLabel="submissions"
      />
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
        <p className="text-gray-500 text-sm">
         {submissions.length === 0 
          ? 'Create a form and share it with your team to start receiving reports'
          : 'Try adjusting your filters'}
        </p>
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
           Venue
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
           Zone
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
           Program
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
            <div className="text-sm text-gray-900">{submission.venue?.name || 'N/A'}</div>
           </td>
           <td className="px-6 py-4 whitespace-nowrap">
            <div className="text-sm text-gray-900">{submission.zone?.name || 'N/A'}</div>
           </td>
           <td className="px-6 py-4 whitespace-nowrap">
            <div className="text-sm text-gray-900">{submission.programName || 'N/A'}</div>
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

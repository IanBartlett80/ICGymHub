'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import EquipmentManagementSubNav from '@/components/EquipmentManagementSubNav';
import VenueSelector from '@/components/VenueSelector';
import SafetyIssueReviewModal from '@/components/SafetyIssueReviewModal';
import IntelligenceFilter, { FilterConfig } from '@/components/IntelligenceFilter';
import axiosInstance from '@/lib/axios';
import { 
 PlusIcon,
 XMarkIcon,
 EyeIcon,
 ExclamationTriangleIcon,
 FlagIcon,
 CheckCircleIcon,
 BuildingOfficeIcon,
} from '@heroicons/react/24/outline';

interface SafetyIssue {
 id: string;
 issueType: string;
 title: string;
 description: string;
 reportedBy: string;
 reportedByEmail: string | null;
 status: string;
 priority: string;
 createdAt: string;
 updatedAt: string;
 equipment: {
  id: string;
  name: string;
  zone: {
   id: string;
   name: string;
  } | null;
 };
}

interface Equipment {
 id: string;
 name: string;
 zone: {
  id: string;
  name: string;
 } | null;
}

export default function SafetyIssuesPage() {
 const router = useRouter();
 const [issues, setIssues] = useState<SafetyIssue[]>([]);
 const [equipment, setEquipment] = useState<Equipment[]>([]);
 const [loading, setLoading] = useState(true);
 const [showForm, setShowForm] = useState(false);
 const [editingIssue, setEditingIssue] = useState<SafetyIssue | null>(null);
 const [reviewingIssueId, setReviewingIssueId] = useState<string | null>(null);
 const [activeTab, setActiveTab] = useState<'active' | 'resolved'>('active');
 const [filterStatus, setFilterStatus] = useState<string>('all');
 const [filterPriority, setFilterPriority] = useState<string>('all');
 const [filterIssueType, setFilterIssueType] = useState<string>('all');
 const [venueId, setVenueId] = useState<string | null>(null);

 const [formData, setFormData] = useState({
  equipmentId: '',
  issueType: 'NON_CRITICAL',
  title: '',
  description: '',
  reportedBy: '',
  reportedByEmail: '',
  priority: 'MEDIUM',
  status: 'OPEN',
 });

 useEffect(() => {
  loadData();
 }, [filterStatus, filterPriority, filterIssueType, venueId]);

 const loadData = async () => {
  try {
   setLoading(true);
   
   // Build query params
   const params = new URLSearchParams();
   if (venueId && venueId !== 'all') params.append('venueId', venueId);
   if (filterStatus !== 'all') params.append('status', filterStatus);
   if (filterPriority !== 'all') params.append('priority', filterPriority);
   if (filterIssueType !== 'all') params.append('issueType', filterIssueType);

   const [issuesRes, equipmentRes] = await Promise.all([
    axiosInstance.get(`/api/safety-issues?${params.toString()}`),
    axiosInstance.get(`/api/equipment?${venueId && venueId !== 'all' ? `venueId=${venueId}` : ''}`),
   ]);

   setIssues(issuesRes.data.issues || []);
   setEquipment(equipmentRes.data.equipment || []);
  } catch (error) {
   console.error('Failed to load data:', error);
   alert('Failed to load safety issues');
  } finally {
   setLoading(false);
  }
 };

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  try {
   if (editingIssue) {
    await axiosInstance.put(`/api/safety-issues/${editingIssue.id}`, formData);
   } else {
    await axiosInstance.post('/api/safety-issues', formData);
   }

   alert(`Safety issue ${editingIssue ? 'updated' : 'created'} successfully!`);
   setShowForm(false);
   setEditingIssue(null);
   resetForm();
   loadData();
  } catch (error) {
   console.error('Failed to save safety issue:', error);
   alert('Failed to save safety issue');
  }
 };

 const handleEdit = (issue: SafetyIssue) => {
  setEditingIssue(issue);
  setFormData({
   equipmentId: issue.equipment.id,
   issueType: issue.issueType,
   title: issue.title,
   description: issue.description,
   reportedBy: issue.reportedBy,
   reportedByEmail: issue.reportedByEmail || '',
   priority: issue.priority,
   status: issue.status,
  });
  setShowForm(true);
 };

 const handleDelete = async (id: string) => {
  if (!confirm('Are you sure you want to delete this safety issue?')) {
   return;
  }

  try {
   await axiosInstance.delete(`/api/safety-issues/${id}`);
   alert('Safety issue deleted successfully!');
   loadData();
  } catch (error) {
   console.error('Failed to delete safety issue:', error);
   alert('Failed to delete safety issue');
  }
 };

 const resetForm = () => {
  setFormData({
   equipmentId: '',
   issueType: 'NON_CRITICAL',
   title: '',
   description: '',
   reportedBy: '',
   reportedByEmail: '',
   priority: 'MEDIUM',
   status: 'OPEN',
  });
 };

 const getStatusColor = (status: string) => {
  switch (status) {
   case 'OPEN': return 'bg-red-100 text-red-800';
   case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
   case 'RESOLVED': return 'bg-green-100 text-green-800';
   case 'CLOSED': return 'bg-gray-100 text-gray-800';
   default: return 'bg-gray-100 text-gray-800';
  }
 };

 const getPriorityColor = (priority: string) => {
  switch (priority) {
   case 'CRITICAL': return 'bg-red-100 text-red-800';
   case 'HIGH': return 'bg-orange-100 text-orange-800';
   case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
   case 'LOW': return 'bg-blue-100 text-blue-800';
   default: return 'bg-gray-100 text-gray-800';
  }
 };

 const getIssueTypeColor = (issueType: string) => {
  switch (issueType) {
   case 'CRITICAL': return 'bg-red-100 text-red-800';
   case 'NON_CRITICAL': return 'bg-orange-100 text-orange-800';
   case 'NON_CONFORMANCE': return 'bg-yellow-100 text-yellow-800';
   case 'RECOMMENDATION': return 'bg-blue-100 text-blue-800';
   case 'INFORMATIONAL': return 'bg-gray-100 text-gray-800';
   default: return 'bg-gray-100 text-gray-800';
  }
 };

 return (
  <DashboardLayout>
   <EquipmentManagementSubNav />
   <div className="space-y-6">&
    {/* Header */}
    <div className="flex items-center justify-between">
     <div>
      <h1 className="text-2xl font-bold text-gray-900">Safety Issues Management</h1>
      <p className="text-gray-600 mt-1">Manage equipment safety issues and defects</p>
     </div>
     <button
      onClick={() => {
       setEditingIssue(null);
       resetForm();
       setShowForm(true);
      }}
      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
>
      <PlusIcon className="h-5 w-5" />
      Add Safety Issue
     </button>
    </div>

    {/* Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
     <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="text-sm font-medium text-gray-600">Active Issues</div>
      <div className="text-2xl font-bold text-orange-600 mt-2">
       {issues.filter(i => i.status === 'OPEN' || i.status === 'IN_PROGRESS').length}
      </div>
     </div>
     <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="text-sm font-medium text-gray-600">Open Issues</div>
      <div className="text-2xl font-bold text-red-600 mt-2">
       {issues.filter(i => i.status === 'OPEN').length}
      </div>
     </div>
     <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="text-sm font-medium text-gray-600">In Progress</div>
      <div className="text-2xl font-bold text-yellow-600 mt-2">
       {issues.filter(i => i.status === 'IN_PROGRESS').length}
      </div>
     </div>
     <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="text-sm font-medium text-gray-600">Resolved</div>
      <div className="text-2xl font-bold text-green-600 mt-2">
       {issues.filter(i => i.status === 'RESOLVED' || i.status === 'CLOSED').length}
      </div>
     </div>
    </div>

    {/* Filters */}
    <IntelligenceFilter
      title="Safety Issue Filters"
      subtitle="Filter and refine safety issues view"
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
          label: 'Status',
          value: filterStatus,
          onChange: setFilterStatus,
          icon: <CheckCircleIcon className="h-4 w-4" />,
          options: [
            { value: 'all', label: 'All Statuses' },
            { value: 'OPEN', label: 'Open' },
            { value: 'IN_PROGRESS', label: 'In Progress' },
            { value: 'RESOLVED', label: 'Resolved' },
            { value: 'CLOSED', label: 'Closed' },
          ],
        },
        {
          type: 'select',
          label: 'Priority',
          value: filterPriority,
          onChange: setFilterPriority,
          icon: <FlagIcon className="h-4 w-4" />,
          options: [
            { value: 'all', label: 'All Priorities' },
            { value: 'CRITICAL', label: 'Critical' },
            { value: 'HIGH', label: 'High' },
            { value: 'MEDIUM', label: 'Medium' },
            { value: 'LOW', label: 'Low' },
          ],
        },
        {
          type: 'select',
          label: 'Issue Type',
          value: filterIssueType,
          onChange: setFilterIssueType,
          icon: <ExclamationTriangleIcon className="h-4 w-4" />,
          options: [
            { value: 'all', label: 'All Types' },
            { value: 'CRITICAL', label: 'Critical' },
            { value: 'NON_CRITICAL', label: 'Non-Critical' },
            { value: 'NON_CONFORMANCE', label: 'Non-Conformance' },
            { value: 'RECOMMENDATION', label: 'Recommendation' },
            { value: 'INFORMATIONAL', label: 'Informational' },
          ],
        },
      ]}
      onReset={() => {
        setVenueId(null);
        setFilterStatus('all');
        setFilterPriority('all');
        setFilterIssueType('all');
      }}
    />

    {/* Add/Edit Form */}
    {showForm && (
     <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
       {editingIssue ? 'Edit Safety Issue' : 'Add New Safety Issue'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
         <label className="block text-sm font-medium text-gray-700 mb-2">
          Equipment <span className="text-red-600">*</span>
         </label>
         <select
          required
          value={formData.equipmentId}
          onChange={(e) => setFormData({ ...formData, equipmentId: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
>
          <option value="">Select equipment...</option>
          {equipment.map(eq => (
           <option key={eq.id} value={eq.id}>
            {eq.name} {eq.zone ? `(${eq.zone.name})` : ''}
           </option>
          ))}
         </select>
         <p className="mt-1 text-xs text-gray-500">
          Venue will be auto-assigned from the selected equipment
         </p>
        </div>

        <div>
         <label className="block text-sm font-medium text-gray-700 mb-2">
          Issue Type <span className="text-red-600">*</span>
         </label>
         <select
          required
          value={formData.issueType}
          onChange={(e) => setFormData({ ...formData, issueType: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
>
          <option value="CRITICAL">Critical</option>
          <option value="NON_CRITICAL">Non-Critical</option>
          <option value="NON_CONFORMANCE">Non-Conformance</option>
          <option value="RECOMMENDATION">Recommendation</option>
          <option value="INFORMATIONAL">Informational</option>
         </select>
        </div>

        <div>
         <label className="block text-sm font-medium text-gray-700 mb-2">
          Priority <span className="text-red-600">*</span>
         </label>
         <select
          required
          value={formData.priority}
          onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
         </select>
        </div>

        <div>
         <label className="block text-sm font-medium text-gray-700 mb-2">
          Status <span className="text-red-600">*</span>
         </label>
         <select
          required
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
         </select>
        </div>

        <div>
         <label className="block text-sm font-medium text-gray-700 mb-2">
          Reported By <span className="text-red-600">*</span>
         </label>
         <input
          type="text"
          required
          value={formData.reportedBy}
          onChange={(e) => setFormData({ ...formData, reportedBy: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          placeholder="Name of reporter"
         />
        </div>

        <div>
         <label className="block text-sm font-medium text-gray-700 mb-2">
          Reporter Email
         </label>
         <input
          type="email"
          value={formData.reportedByEmail}
          onChange={(e) => setFormData({ ...formData, reportedByEmail: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          placeholder="email@example.com"
         />
        </div>
       </div>

       <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
         Title <span className="text-red-600">*</span>
        </label>
        <input
         type="text"
         required
         value={formData.title}
         onChange={(e) => setFormData({ ...formData, title: e.target.value })}
         className="w-full border border-gray-300 rounded-lg px-3 py-2"
         placeholder="Brief description of the issue"
        />
       </div>

       <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
         Description <span className="text-red-600">*</span>
        </label>
        <textarea
         required
         value={formData.description}
         onChange={(e) => setFormData({ ...formData, description: e.target.value })}
         className="w-full border border-gray-300 rounded-lg px-3 py-2"
         rows={4}
         placeholder="Detailed description of the safety issue..."
        />
       </div>

       <div className="flex gap-3 pt-4">
        <button
         type="submit"
         className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
>
         {editingIssue ? 'Update Issue' : 'Create Issue'}
        </button>
        <button
         type="button"
         onClick={() => {
          setShowForm(false);
          setEditingIssue(null);
          resetForm();
         }}
         className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
>
         Cancel
        </button>
       </div>
      </form>
     </div>
    )}

    {/* Issues List with Tabs */}
    <div className="bg-white rounded-lg border border-gray-200">
     <div className="border-b border-gray-200">
      <div className="flex items-center justify-between p-6 pb-0">
       <h2 className="text-lg font-semibold text-gray-900">Safety Issues</h2>
      </div>
      <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
       <button
        onClick={() => setActiveTab('active')}
        className={`${
         activeTab === 'active'
          ? 'border-indigo-500 text-indigo-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
       >
        Active Safety Issues ({issues.filter(i => i.status === 'OPEN' || i.status === 'IN_PROGRESS').length})
       </button>
       <button
        onClick={() => setActiveTab('resolved')}
        className={`${
         activeTab === 'resolved'
          ? 'border-indigo-500 text-indigo-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
       >
        Resolved Safety Issues History ({issues.filter(i => i.status === 'RESOLVED' || i.status === 'CLOSED').length})
       </button>
      </nav>
     </div>
     {loading ? (
      <div className="p-12 text-center">
       <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
      </div>
     ) : (() => {
      const filteredIssues = activeTab === 'active'
       ? issues.filter(i => i.status === 'OPEN' || i.status === 'IN_PROGRESS')
       : issues.filter(i => i.status === 'RESOLVED' || i.status === 'CLOSED');
      
      return filteredIssues.length === 0 ? (
       <div className="p-12 text-center text-gray-500">
        No {activeTab} safety issues found
       </div>
      ) : (
       <div>
        {/* Header Row */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
         <div className="flex items-center justify-between">
          <div className="flex-1">
           <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Issue Details</span>
          </div>
          <div className="ml-4">
           <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</span>
          </div>
         </div>
        </div>
        <div className="divide-y divide-gray-200">
         {filteredIssues.map(issue => (
         <div key={issue.id} className="p-6 hover:bg-gray-50">
          <div className="flex items-start justify-between">
           <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
             <h3 className="text-lg font-semibold text-gray-900">{issue.title}</h3>
             <span className={`px-2 py-1 rounded-full text-xs font-medium ${getIssueTypeColor(issue.issueType)}`}>
              {issue.issueType.replace('_', ' ')}
             </span>
             <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(issue.priority)}`}>
              {issue.priority}
             </span>
             <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(issue.status)}`}>
              {issue.status.replace('_', ' ')}
             </span>
            </div>
            <p className="text-gray-600 mb-3">{issue.description}</p>
            <div className="flex items-center gap-6 text-sm text-gray-500">
             <span>
              <strong>Equipment:</strong>{' '}
              <button
               onClick={() => router.push(`/dashboard/equipment/items/${issue.equipment.id}`)}
               className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium"
              >
               {issue.equipment.name}
              </button>
              {issue.equipment.zone && ` (${issue.equipment.zone.name})`}
             </span>
             <span>
              <strong>Reported by:</strong> {issue.reportedBy}
              {issue.reportedByEmail && ` (${issue.reportedByEmail})`}
             </span>
             <span>
              <strong>Created:</strong> {new Date(issue.createdAt).toLocaleDateString()}
             </span>
            </div>
           </div>
           <div className="flex items-center gap-2 ml-4">
            <button
             onClick={() => setReviewingIssueId(issue.id)}
             className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
             title="View Details"
>
             <EyeIcon className="h-5 w-5" />
            </button>
            <button
             onClick={() => handleDelete(issue.id)}
             className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
             title="Delete"
>
             <XMarkIcon className="h-5 w-5" />
            </button>
           </div>
          </div>
         </div>
         ))}
        </div>
       </div>
      );
     })()}
    </div>
   </div>

   {/* Safety Issue Review Modal */}
   {reviewingIssueId && (
    <SafetyIssueReviewModal
     issueId={reviewingIssueId}
     onClose={() => setReviewingIssueId(null)}
     onUpdate={loadData}
    />
   )}
  </DashboardLayout>
 );
}

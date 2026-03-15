'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import InjuryReportsSubNav from '@/components/InjuryReportsSubNav';

interface User {
 id: string;
 fullName: string;
 email: string;
}

interface SubmissionData {
 id: string;
 fieldId: string;
 value: string;
 field: {
  id: string;
  label: string;
  fieldType: string;
  order: number;
 };
}

interface Venue {
 id: string;
 name: string;
}

interface Zone {
 id: string;
 name: string;
 venueId: string | null;
 venue: Venue | null;
}

interface Equipment {
 id: string;
 name: string;
 serialNumber: string | null;
 category: string | null;
 condition: string | null;
 lastCheckedDate: string | null;
 lastCheckStatus: string | null;
 lastCheckedBy: string | null;
}

interface Comment {
 id: string;
 comment: string;
 isInternal: boolean;
 createdAt: string;
 user: User;
}

interface AuditLog {
 id: string;
 action: string;
 oldValue: string | null;
 newValue: string | null;
 createdAt: string;
 user: User | null;
}

interface Submission {
 id: string;
 status: string;
 priority: string | null;
 submittedAt: string;
 submitterInfo: string | null;
 template: {
  id: string;
  name: string;
  sections: {
   id: string;
   title: string;
   description: string | null;
   order: number;
   fields: {
    id: string;
    label: string;
    fieldType: string;
    order: number;
   }[];
  }[];
 };
 venue: Venue | null;
 zone: Zone | null;
 equipment: Equipment | null;
 assignedTo: User | null;
 data: SubmissionData[];
 comments: Comment[];
 auditLog: AuditLog[];
}

function parseJsonSafe(value: string | null | undefined) {
 if (!value) return null;
 try {
  return JSON.parse(value);
 } catch {
  return null;
 }
}

export default function SubmissionDetailPage() {
 const params = useParams();
 const submissionId = params.id as string;

 const [submission, setSubmission] = useState<Submission | null>(null);
 const [loading, setLoading] = useState(true);
 const [newComment, setNewComment] = useState('');
 const [addingComment, setAddingComment] = useState(false);
 const [showAssignModal, setShowAssignModal] = useState(false);
 const [users, setUsers] = useState<User[]>([]);
 const [selectedUserId, setSelectedUserId] = useState<string>('');

 useEffect(() => {
  loadSubmission();
  loadUsers();
 }, [submissionId]);

 const loadUsers = async () => {
  try {
   const res = await fetch('/api/users');
   if (res.ok) {
    const data = await res.json();
    setUsers(data.users || data);
   }
  } catch (error) {
   console.error('Error loading users:', error);
  }
 };

 const loadSubmission = async () => {
  try {
   const res = await fetch(`/api/injury-submissions/${submissionId}`);
   if (res.ok) {
    const data = await res.json();
    setSubmission(data.submission);
   }
  } catch (error) {
   console.error('Error loading submission:', error);
  } finally {
   setLoading(false);
  }
 };

 const updateStatus = async (newStatus: string) => {
  try {
   const res = await fetch(`/api/injury-submissions/${submissionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus }),
   });

   if (res.ok) {
    loadSubmission();
   }
  } catch (error) {
   console.error('Error updating status:', error);
  }
 };

 const updatePriority = async (newPriority: string) => {
  try {
   const res = await fetch(`/api/injury-submissions/${submissionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priority: newPriority }),
   });

   if (res.ok) {
    loadSubmission();
   }
  } catch (error) {
   console.error('Error updating priority:', error);
  }
 };

 const updateAssignment = async (userId: string | null) => {
  try {
   const res = await fetch(`/api/injury-submissions/${submissionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assignedToUserId: userId }),
   });

   if (res.ok) {
    loadSubmission();
   }
  } catch (error) {
   console.error('Error updating assignment:', error);
  }
 };

 const addComment = async () => {
  if (!newComment.trim()) return;

  setAddingComment(true);
  try {
   const res = await fetch(`/api/injury-submissions/${submissionId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment: newComment, isInternal: true }),
   });

   if (res.ok) {
    setNewComment('');
    loadSubmission();
   }
  } catch (error) {
   console.error('Error adding comment:', error);
  } finally {
   setAddingComment(false);
  }
 };

 const exportPDF = () => {
  window.open(`/api/injury-submissions/${submissionId}/export-pdf`, '_blank');
 };

 if (loading) {
  return (
   <DashboardLayout title="Submission Details">
    <InjuryReportsSubNav />
    <div className="flex items-center justify-center h-64">
     <div className="text-gray-500">Loading...</div>
    </div>
   </DashboardLayout>
  );
 }

 if (!submission) {
  return (
   <DashboardLayout title="Submission Details">
    <InjuryReportsSubNav />
    <div className="text-center py-12">
     <div className="text-gray-400 text-lg">Submission not found</div>
    </div>
   </DashboardLayout>
  );
 }

 const submitterInfo = parseJsonSafe(submission.submitterInfo) || {};
 
 // Helper function to get field value for display
 const getFieldDisplayValue = (data: SubmissionData): string => {
  const value = parseJsonSafe(data.value) || { value: data.value, displayValue: data.value };
  
  // Handle date/time fields
  if (data.field.fieldType === 'datetime' || data.field.label.toLowerCase().includes('date') || data.field.label.toLowerCase().includes('time')) {
   try {
    const dateValue = value.value || data.value;
    if (dateValue && dateValue !== 'N/A') {
     const date = new Date(dateValue);
     if (!isNaN(date.getTime())) {
      const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
      const day = date.getDate();
      const suffix = day === 1 || day === 21 || day === 31 ? 'st' : 
                    day === 2 || day === 22 ? 'nd' : 
                    day === 3 || day === 23 ? 'rd' : 'th';
      const month = date.toLocaleDateString('en-US', { month: 'long' });
      const year = date.getFullYear();
      return `${time} ${weekday} ${day}${suffix} ${month}, ${year}`;
     }
    }
   } catch {}
  }
  // Handle Venue field
  else if (data.field.label.toLowerCase().includes('venue') && submission.venue) {
   return submission.venue.name;
  }
  // Handle Zone/Area field
  else if ((data.field.label.toLowerCase().includes('zone') || data.field.label.toLowerCase().includes('area')) && submission.zone) {
   return submission.zone.name;
  }
  // Handle Equipment field
  else if ((data.field.label.toLowerCase().includes('equipment') || data.field.label.toLowerCase().includes('apparatus')) && submission.equipment) {
   return submission.equipment.name;
  }
  // Handle array values
  else if (Array.isArray(value.value)) {
   return value.value.join(', ');
  }
  
  return value.displayValue || value.value || 'N/A';
 };
 
 // Group data by section for organized display
 const groupDataBySection = () => {
  if (!submission.template.sections) return [];
  
  return submission.template.sections.map(section => {
   const sectionFields = section.fields.map(field => {
    const data = submission.data.find(d => d.fieldId === field.id);
    if (!data) return null;
    
    return {
     ...data,
     displayValue: getFieldDisplayValue(data)
    };
   }).filter(Boolean);
   
   return {
    ...section,
    data: sectionFields.sort((a, b) => (a?.field.order || 0) - (b?.field.order || 0))
   };
  }).filter(section => section.data.length > 0);
 };
 
 const sectionsWithData = groupDataBySection();
 
 // Extract key information for professional summary
 const getKeyInfo = (label: string) => {
  const data = submission.data.find(d => 
   d.field.label.toLowerCase().includes(label.toLowerCase())
  );
  return data ? getFieldDisplayValue(data) : null;
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

 return (
  <DashboardLayout title="Submission Details">
   <InjuryReportsSubNav />
   <div className="space-y-6">
   {/* Header */}
   <div className="flex items-start justify-between">
    <div>
     <Link
      href="/dashboard/injury-reports"
      className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-block"
>
      ← Back to Reports
     </Link>
     <h1 className="text-3xl font-bold text-gray-900">Injury Report Details</h1>
     <p className="text-gray-600 mt-1">{submission.template.name}</p>
    </div>
    <button
     onClick={exportPDF}
     className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
>
     📄 Export PDF
    </button>
   </div>

   <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    {/* Main Content */}
    <div className="lg:col-span-2 space-y-6">
     {/* Submission Info */}
     <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Submission Information</h2>
      <div className="grid grid-cols-2 gap-4 text-sm">
       <div>
        <div className="text-gray-600 font-medium">Submitted At</div>
        <div className="text-gray-900">{new Date(submission.submittedAt).toLocaleString()}</div>
       </div>
       {submitterInfo.name && (
        <div>
         <div className="text-gray-600 font-medium">Submitted By</div>
         <div className="text-gray-900">{submitterInfo.name}</div>
        </div>
       )}
       {submitterInfo.email && (
        <div>
         <div className="text-gray-600 font-medium">Email</div>
         <div className="text-gray-900">{submitterInfo.email}</div>
        </div>
       )}
       {submitterInfo.phone && (
        <div>
         <div className="text-gray-600 font-medium">Phone</div>
         <div className="text-gray-900">{submitterInfo.phone}</div>
        </div>
       )}
      </div>
     </div>

     {/* Location & Equipment Information */}
     {(submission.venue || submission.zone || submission.equipment) && (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
       <h2 className="text-lg font-semibold text-gray-900 mb-4">Location & Equipment Information</h2>
       <div className="grid grid-cols-2 gap-4 text-sm">
        {submission.venue && (
         <div>
          <div className="text-gray-600 font-medium">Venue</div>
          <div className="text-gray-900">{submission.venue.name}</div>
         </div>
        )}
        {submission.zone && (
         <div>
          <div className="text-gray-600 font-medium">Gym Zone / Area</div>
          <div className="text-gray-900">
           {submission.zone.name}
           {submission.zone.venue && submission.zone.venue.id !== submission.venue?.id && (
            <span className="text-gray-500 text-xs ml-1">({submission.zone.venue.name})</span>
           )}
          </div>
         </div>
        )}
        {submission.equipment && (
         <>
          <div className="col-span-2">
           <div className="text-gray-600 font-medium mb-2">Equipment / Apparatus</div>
           <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-start">
             <div>
              <div className="font-semibold text-gray-900">{submission.equipment.name}</div>
              {submission.equipment.serialNumber && (
               <div className="text-xs text-gray-600">Serial: {submission.equipment.serialNumber}</div>
              )}
             </div>
             {submission.equipment.category && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
               {submission.equipment.category}
              </span>
             )}
            </div>
            
            {/* Equipment Safety Check Information */}
            <div className="border-t border-gray-200 pt-3 mt-3">
             <div className="text-sm font-medium text-gray-700 mb-2">Equipment Safety Check Status</div>
             {submission.equipment.lastCheckedDate ? (
              <div className="space-y-1.5">
               <div className="flex items-center gap-2">
                <span className="text-gray-600 text-xs">Last Checked:</span>
                <span className="text-gray-900 text-sm font-medium">
                 {new Date(submission.equipment.lastCheckedDate).toLocaleDateString()}
                </span>
               </div>
               {submission.equipment.lastCheckStatus && (
                <div className="flex items-center gap-2">
                 <span className="text-gray-600 text-xs">Status:</span>
                 <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                  submission.equipment.lastCheckStatus === 'No Issues Detected' 
                   ? 'bg-green-100 text-green-800' 
                   : 'bg-orange-100 text-orange-800'
                 }`}>
                  {submission.equipment.lastCheckStatus}
                 </span>
                </div>
               )}
               {submission.equipment.lastCheckedBy && (
                <div className="flex items-center gap-2">
                 <span className="text-gray-600 text-xs">Checked By:</span>
                 <span className="text-gray-900 text-sm">{submission.equipment.lastCheckedBy}</span>
                </div>
               )}
              </div>
             ) : (
              <div className="flex items-center gap-2">
               <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded font-medium">
                ⚠️ Never Checked
               </span>
               <span className="text-gray-500 text-xs">No safety check recorded for this equipment</span>
              </div>
             )}
            </div>

            {submission.equipment.condition && (
             <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">Condition:</span>
              <span className={`px-2 py-0.5 text-xs rounded ${
               submission.equipment.condition === 'Good' ? 'bg-green-100 text-green-800' :
               submission.equipment.condition === 'Fair' ? 'bg-yellow-100 text-yellow-800' :
               'bg-red-100 text-red-800'
              }`}>
               {submission.equipment.condition}
              </span>
             </div>
            )}
           </div>
          </div>
         </>
        )}
       </div>
      </div>
     )}

     {/* Professional Summary */}
     <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow border border-blue-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
       <span className="text-2xl">📋</span>
       Report Summary
      </h2>
      <div className="grid grid-cols-2 gap-4 text-sm">
       <div className="col-span-2">
        <div className="text-blue-800 font-semibold text-lg mb-2">{submission.template.name}</div>
       </div>
       <div>
        <div className="text-gray-600 font-medium">Submitted</div>
        <div className="text-gray-900 font-semibold">
         {new Date(submission.submittedAt).toLocaleDateString('en-US', { 
          weekday: 'short', 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
         })}
        </div>
       </div>
       {submission.venue && (
        <div>
         <div className="text-gray-600 font-medium">Location</div>
         <div className="text-gray-900 font-semibold">{submission.venue.name}</div>
        </div>
       )}
       {getKeyInfo('athlete') && (
        <div>
         <div className="text-gray-600 font-medium">Athlete</div>
         <div className="text-gray-900 font-semibold">{getKeyInfo('athlete')}</div>
        </div>
       )}
       {getKeyInfo('injury') || getKeyInfo('body part') && (
        <div>
         <div className="text-gray-600 font-medium">Injury Type</div>
         <div className="text-gray-900 font-semibold">
          {getKeyInfo('injury') || getKeyInfo('body part') || 'Not specified'}
         </div>
        </div>
       )}
       <div className="col-span-2 border-t border-blue-200 mt-2 pt-3">
        <div className="flex items-center justify-between">
         <div className="flex items-center gap-4">
          <div>
           <div className="text-xs text-gray-600">Status</div>
           <div className={`mt-1 px-3 py-1 rounded text-xs font-semibold ${getStatusColor(submission.status)}`}>
            {submission.status.replace('_', ' ')}
           </div>
          </div>
          {submission.priority && (
           <div>
            <div className="text-xs text-gray-600">Priority</div>
            <div className={`mt-1 px-3 py-1 rounded text-xs font-semibold ${getPriorityColor(submission.priority)}`}>
             {submission.priority}
            </div>
           </div>
          )}
         </div>
         {submission.assignedTo && (
          <div className="text-right">
           <div className="text-xs text-gray-600">Assigned to</div>
           <div className="text-sm font-medium text-gray-900">{submission.assignedTo.fullName}</div>
          </div>
         )}
        </div>
       </div>
      </div>
     </div>

     {/* Report Data - Grouped by Sections */}
     <div className="space-y-6">
      {sectionsWithData.map((section, sectionIndex) => (
       <div key={section.id} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        {/* Section Header */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-6 py-4">
         <h3 className="text-lg font-semibold text-gray-900">
          {sectionIndex + 1}. {section.title}
         </h3>
         {section.description && (
          <p className="text-sm text-gray-600 mt-1">{section.description}</p>
         )}
        </div>
        
        {/* Section Fields */}
        <div className="p-6">
         <div className="space-y-4">
          {section.data.map((data: any) => (
           <div key={data.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
            <div className="text-sm font-medium text-gray-700 mb-1.5">
             {data.field.label}
            </div>
            <div className="text-base text-gray-900">
             {data.displayValue}
            </div>
           </div>
          ))}
         </div>
        </div>
       </div>
      ))}
      
      {sectionsWithData.length === 0 && (
       <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="text-center text-gray-400">No report data available</div>
       </div>
      )}
     </div>

     {/* Comments */}
     <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Comments & Notes</h2>
      
      {/* Add Comment */}
      <div className="mb-6">
       <textarea
        value={newComment}
        onChange={(e) => setNewComment(e.target.value)}
        placeholder="Add a comment or note..."
        rows={3}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
       />
       <button
        onClick={addComment}
        disabled={addingComment || !newComment.trim()}
        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
>
        {addingComment ? 'Adding...' : 'Add Comment'}
       </button>
      </div>

      {/* Comments List */}
      <div className="space-y-4">
       {submission.comments.length === 0 ? (
        <div className="text-center py-6 text-gray-400">No comments yet</div>
       ) : (
        submission.comments.map((comment) => (
         <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-start justify-between mb-2">
           <div>
            <div className="font-medium text-gray-900">{comment.user.fullName}</div>
            <div className="text-xs text-gray-500">
             {new Date(comment.createdAt).toLocaleString()}
            </div>
           </div>
           {comment.isInternal && (
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
             Internal
            </span>
           )}
          </div>
          <div className="text-gray-700">{comment.comment}</div>
         </div>
        ))
       )}
      </div>
     </div>

     {/* Audit Log */}
     <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity History</h2>
      <div className="space-y-3">
       {submission.auditLog.length === 0 ? (
        <div className="text-center py-6 text-gray-400">No activity yet</div>
       ) : (
        submission.auditLog.map((log) => (
         <div key={log.id} className="flex items-start gap-3 text-sm">
          <div className="text-gray-400 mt-1">•</div>
          <div className="flex-1">
           <div className="text-gray-900">
            <strong>{log.user?.fullName || 'System'}</strong> {log.action.toLowerCase().replace(/_/g, ' ')}
            {log.oldValue && log.newValue && (
             <span> from <strong>{log.oldValue}</strong> to <strong>{log.newValue}</strong></span>
            )}
           </div>
           <div className="text-xs text-gray-500">
            {new Date(log.createdAt).toLocaleString()}
           </div>
          </div>
         </div>
        ))
       )}
      </div>
     </div>
    </div>

    {/* Sidebar */}
    <div className="space-y-6">
     {/* Status */}
     <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Status</h3>
      <select
       value={submission.status}
       onChange={(e) => updateStatus(e.target.value)}
       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
>
       <option value="NEW">New</option>
       <option value="UNDER_REVIEW">Under Review</option>
       <option value="RESOLVED">Resolved</option>
       <option value="CLOSED">Closed</option>
      </select>
      <div className={`mt-3 px-3 py-2 rounded-lg border text-center font-medium ${getStatusColor(submission.status)}`}>
       {submission.status.replace('_', ' ')}
      </div>
     </div>

     {/* Priority */}
     <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Priority</h3>
      <select
       value={submission.priority || ''}
       onChange={(e) => updatePriority(e.target.value)}
       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
>
       <option value="">Not Set</option>
       <option value="LOW">Low</option>
       <option value="MEDIUM">Medium</option>
       <option value="HIGH">High</option>
       <option value="CRITICAL">Critical</option>
      </select>
      {submission.priority && (
       <div className={`mt-3 px-3 py-2 rounded-lg border text-center font-medium ${getPriorityColor(submission.priority)}`}>
        {submission.priority}
       </div>
      )}
     </div>

     {/* Assignment */}
     <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Assigned To</h3>
      {submission.assignedTo ? (
       <div>
        <div className="bg-gray-50 rounded-lg p-3 mb-3">
         <div className="font-medium text-gray-900">{submission.assignedTo.fullName}</div>
         <div className="text-sm text-gray-600">{submission.assignedTo.email}</div>
        </div>
        <button
         onClick={() => updateAssignment(null)}
         className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
>
         Unassign
        </button>
       </div>
      ) : (
       <div>
        <div className="text-gray-500 text-sm mb-3">Not assigned</div>
        <button
         onClick={() => setShowAssignModal(true)}
         className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
>
         Assign User
        </button>
       </div>
      )}
     </div>

     {/* Quick Actions */}
     <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
      <div className="space-y-2">
       <button
        onClick={exportPDF}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-left"
>
        📄 Export as PDF
       </button>
       <button
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-left"
>
        ✉️ Send via Email
       </button>
      </div>
     </div>
    </div>
   </div>

   {/* Assignment Modal */}
   {showAssignModal && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
     <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Assign User</h3>
      <div className="mb-4">
       <label className="block text-sm font-medium text-gray-700 mb-2">
        Select user to assign this submission to:
       </label>
       <select
        value={selectedUserId}
        onChange={(e) => setSelectedUserId(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
>
        <option value="">Select a user...</option>
        {users.map((user) => (
         <option key={user.id} value={user.id}>
          {user.fullName} ({user.email})
         </option>
        ))}
       </select>
      </div>
      <div className="flex gap-3">
       <button
        onClick={() => {
         setShowAssignModal(false);
         setSelectedUserId('');
        }}
        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
>
        Cancel
       </button>
       <button
        onClick={() => {
         if (selectedUserId) {
          updateAssignment(selectedUserId);
          setShowAssignModal(false);
          setSelectedUserId('');
         }
        }}
        disabled={!selectedUserId}
        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
>
        Assign
       </button>
      </div>
     </div>
    </div>
   )}
  </div>
  </DashboardLayout>
 );
}

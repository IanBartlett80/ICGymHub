'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { formatDateTime, getClubTimezone } from '@/lib/timezone';
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
 photoUrl: string | null;
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
 assignedToName: string | null;
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
 const [assignedName, setAssignedName] = useState('');

 useEffect(() => {
  loadSubmission();
 }, [submissionId]);

 const loadSubmission = async () => {
  try {
   const res = await fetch(`/api/injury-submissions/${submissionId}`);
   if (res.ok) {
    const data = await res.json();
    setSubmission(data.submission);
    setAssignedName(data.submission.assignedToName || '');
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

 const updateAssignedName = async () => {
  try {
   const res = await fetch(`/api/injury-submissions/${submissionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assignedToName: assignedName || null }),
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
      const tz = getClubTimezone();
      const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz });
      const weekday = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: tz });
      const day = parseInt(date.toLocaleDateString('en-US', { day: 'numeric', timeZone: tz }));
      const suffix = day === 1 || day === 21 || day === 31 ? 'st' : 
                    day === 2 || day === 22 ? 'nd' : 
                    day === 3 || day === 23 ? 'rd' : 'th';
      const month = date.toLocaleDateString('en-US', { month: 'long', timeZone: tz });
      const year = parseInt(date.toLocaleDateString('en-US', { year: 'numeric', timeZone: tz }));
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

 // Extract key information for header
 const athleteName = getKeyInfo('athlete') || 'Unknown Athlete';
 const gymSport = getKeyInfo('gymsport') || getKeyInfo('gym sport');
 const classLevel = getKeyInfo('class');

 return (
  <DashboardLayout title="Injury and Incident Management">
   <InjuryReportsSubNav />
   <div className="space-y-6">
   {/* Header with Gradient */}
   <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-xl shadow-lg">
    <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,black)]"></div>
    <div className="relative p-6">
     <Link
      href="/dashboard/injury-reports"
      className="text-white/90 hover:text-white text-sm mb-2 inline-flex items-center gap-2 transition-colors"
     >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      Back to Reports
     </Link>
     <div className="flex items-start justify-between">
      <div>
       <h1 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Injury and Incident Management
       </h1>
       <p className="text-blue-100 text-sm">{submission.template.name} - {athleteName}</p>
       {(gymSport || classLevel) && (
        <p className="text-blue-100 text-sm">
         {[gymSport, classLevel].filter(Boolean).join(' ')}
        </p>
       )}
       <div className="mt-3 flex items-center gap-4">
        <div className="flex items-center gap-2 text-white/90">
         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
         </svg>
         <span className="text-sm">Submitted on {formatDateTime(submission.submittedAt)}</span>
        </div>
       </div>
      </div>
      <button
       onClick={exportPDF}
       className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-lg transition-all flex items-center gap-2"
      >
       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
       </svg>
       Export PDF
      </button>
     </div>
    </div>
   </div>

   <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    {/* Main Content */}
    <div className="lg:col-span-2 space-y-6">
     {/* Submission Info */}
     <div className="bg-white rounded-xl shadow-lg border border-blue-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
       <h2 className="text-lg font-bold text-white flex items-center gap-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Submission Information
       </h2>
      </div>
      <div className="p-6">
       <div className="grid grid-cols-2 gap-4 text-sm">
       <div>
        <div className="text-gray-600 font-medium">Submitted At</div>
        <div className="text-gray-900">{formatDateTime(submission.submittedAt)}</div>
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
    </div>

     {/* Location & Equipment Information */}
     {(submission.venue || submission.zone || submission.equipment) && (
      <div className="bg-white rounded-xl shadow-lg border border-green-200 overflow-hidden">
       <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
         </svg>
         Location & Equipment Information
        </h2>
       </div>
       <div className="p-6">
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
            <div className="border-t border-gray-200 pt-4 mt-4">
             <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-bold text-gray-900 flex items-center gap-2">
               <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
               Equipment Safety Check Status
              </div>
             </div>
             
             <div className="grid grid-cols-1 gap-3">
              {/* Equipment Photo */}
              {submission.equipment.photoUrl && (
               <div className="flex items-center gap-3">
                <img 
                 src={submission.equipment.photoUrl} 
                 alt={submission.equipment.name}
                 className="w-20 h-20 object-cover rounded-lg border-2 border-gray-300 shadow-sm"
                />
                <div>
                 <p className="text-sm font-medium text-gray-900">{submission.equipment.name}</p>
                 <p className="text-xs text-gray-500">Equipment Image</p>
                </div>
               </div>
              )}
              
              {/* Safety Check Info */}
              <div className={`rounded-lg p-4 ${submission.equipment.lastCheckedDate ? 'bg-blue-50 border border-blue-200' : 'bg-yellow-50 border border-yellow-200'}`}>
               {submission.equipment.lastCheckedDate ? (
                <div className="space-y-2">
                 <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-600">Last Checked:</span>
                  <span className="text-sm font-bold text-gray-900">
                   {new Date(submission.equipment.lastCheckedDate).toLocaleDateString()}
                  </span>
                 </div>
                 {submission.equipment.lastCheckStatus && (
                  <div className="flex items-center justify-between">
                   <span className="text-xs font-semibold text-gray-600">Status:</span>
                   <span className={`px-2.5 py-1 text-xs rounded-full font-bold ${
                    submission.equipment.lastCheckStatus === 'No Issues Detected' 
                     ? 'bg-green-100 text-green-800 border border-green-300' 
                     : 'bg-orange-100 text-orange-800 border border-orange-300'
                   }`}>
                    {submission.equipment.lastCheckStatus}
                   </span>
                  </div>
                 )}
                 {submission.equipment.lastCheckedBy && (
                  <div className="flex items-center justify-between">
                   <span className="text-xs font-semibold text-gray-600">Checked By:</span>
                   <span className="text-sm font-medium text-gray-900">{submission.equipment.lastCheckedBy}</span>
                  </div>
                 )}
                </div>
               ) : (
                <div className="flex items-center gap-2">
                 <svg className="w-5 h-5 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                 </svg>
                 <div>
                  <span className="px-2.5 py-1 bg-yellow-200 text-yellow-900 text-xs rounded-full font-bold border border-yellow-400">
                   Never Checked
                  </span>
                  <p className="text-xs text-yellow-800 mt-1">No safety check recorded for this equipment</p>
                 </div>
                </div>
               )}
              </div>
             </div>
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
        )}
       </div>
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
       <div key={section.id} className="bg-white rounded-xl shadow-lg border border-purple-200 overflow-hidden">
        {/* Section Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
         <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {sectionIndex + 1}. {section.title}
         </h3>
         {section.description && (
          <p className="text-sm text-purple-100 mt-1">{section.description}</p>
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
     <div className="bg-white rounded-xl shadow-lg border border-amber-200 overflow-hidden">
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-4">
       <h2 className="text-lg font-bold text-white flex items-center gap-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
        Comments & Notes
       </h2>
      </div>
      <div className="p-6">
      {/* Add Comment */}
      <div className="mb-6">
       <textarea
        value={newComment}
        onChange={(e) => setNewComment(e.target.value)}
        placeholder="Add a comment or note..."
        rows={3}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
       />
       <button
        onClick={addComment}
        disabled={addingComment || !newComment.trim()}
        className="mt-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg hover:from-amber-700 hover:to-orange-700 disabled:opacity-50 font-semibold shadow-sm transition-all"
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
             {formatDateTime(comment.createdAt)}
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
     </div>

     {/* Audit Log */}
     <div className="bg-white rounded-xl shadow-lg border border-gray-300 overflow-hidden">
      <div className="bg-gradient-to-r from-gray-600 to-slate-600 px-6 py-4">
       <h2 className="text-lg font-bold text-white flex items-center gap-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        Activity History
       </h2>
      </div>
      <div className="p-6">
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
            {formatDateTime(log.createdAt)}
           </div>
          </div>
         </div>
        ))
       )}
       </div>
      </div>
     </div>
    </div>

    {/* Sidebar */}
    <div className="space-y-6">
     {/* Status */}
     <div className="bg-white rounded-xl shadow-lg border border-blue-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
       <h3 className="text-sm font-bold text-white flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Status
       </h3>
      </div>
      <div className="p-6">
       <select
        value={submission.status}
        onChange={(e) => updateStatus(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
       >
       <option value="NEW">New</option>
       <option value="UNDER_REVIEW">Under Review</option>
       <option value="RESOLVED">Resolved</option>
       <option value="CLOSED">Closed</option>
      </select>
      <div className={`mt-3 px-3 py-2 rounded-lg border text-center font-bold ${getStatusColor(submission.status)}`}>
       {submission.status.replace('_', ' ')}
      </div>
      </div>
     </div>

     {/* Priority */}
     <div className="bg-white rounded-xl shadow-lg border border-orange-200 overflow-hidden">
      <div className="bg-gradient-to-r from-orange-600 to-amber-600 px-6 py-4">
       <h3 className="text-sm font-bold text-white flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        Priority
       </h3>
      </div>
      <div className="p-6">
       <select
        value={submission.priority || ''}
        onChange={(e) => updatePriority(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 font-medium"
       >
       <option value="">Not Set</option>
       <option value="LOW">Low</option>
       <option value="MEDIUM">Medium</option>
       <option value="HIGH">High</option>
       <option value="CRITICAL">Critical</option>
      </select>
      {submission.priority && (
       <div className={`mt-3 px-3 py-2 rounded-lg border text-center font-bold ${getPriorityColor(submission.priority)}`}>
        {submission.priority}
       </div>
      )}
      </div>
     </div>

     {/* Assignment */}
     <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-3">
       <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        Assigned To
       </h3>
      </div>
      
      <div className="space-y-3">
       <input
        type="text"
        value={assignedName}
        onChange={(e) => setAssignedName(e.target.value)}
        placeholder="Enter person's name..."
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
       />
       
       {assignedName !== (submission.assignedToName || '') && (
        <button
         onClick={updateAssignedName}
         className="w-full px-3 py-2 text-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 shadow-sm font-medium transition-all"
        >
         Save Assignment
        </button>
       )}
       
       {submission.assignedToName && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
         <div className="flex items-center gap-2 text-sm">
          <svg className="w-4 h-4 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-purple-900 font-medium">Assigned to {submission.assignedToName}</span>
         </div>
        </div>
       )}
      </div>
     </div>

     {/* Quick Actions */}
     <div className="bg-white rounded-xl shadow-lg border border-green-200 overflow-hidden">
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
       <h3 className="text-sm font-bold text-white flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Quick Actions
       </h3>
      </div>
      <div className="p-6">
       <div className="space-y-2">
       <button
        onClick={exportPDF}
         className="w-full px-3 py-2.5 text-sm border-2 border-gray-300 rounded-lg hover:bg-gray-50 text-left font-medium flex items-center gap-3 transition-all hover:border-gray-400"
        >
         <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
         </svg>
         Export as PDF
        </button>
        <button
         className="w-full px-3 py-2.5 text-sm border-2 border-gray-300 rounded-lg hover:bg-gray-50 text-left font-medium flex items-center gap-3 transition-all hover:border-gray-400"
        >
         <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
         </svg>
         Send via Email
        </button>
       </div>
      </div>
     </div>
    </div>
   </div>
  </div>
  </DashboardLayout>
 );
}

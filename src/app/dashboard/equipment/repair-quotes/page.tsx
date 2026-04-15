'use client';

import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import EquipmentManagementSubNav from '@/components/EquipmentManagementSubNav';
import VenueSelector from '@/components/VenueSelector';
import IntelligenceFilter from '@/components/IntelligenceFilter';
import RepairQuoteRequestForm from '@/components/RepairQuoteRequestForm';
import { showToast } from '@/lib/toast';
import axiosInstance from '@/lib/axios';
import {
 MagnifyingGlassIcon,
 TableCellsIcon,
 Squares2X2Icon,
 CheckCircleIcon,
 XCircleIcon,
 ClockIcon,
 DocumentTextIcon,
 FlagIcon,
 HandThumbUpIcon,
 ArrowPathIcon,
 PlusIcon,
} from '@heroicons/react/24/outline';

interface StatusHistoryEntry {
 status: string;
 timestamp: string;
 actor: string;
 notes: string;
}

interface RepairQuoteRequest {
 id: string;
 requestReference: string | null;
 issueDescription: string;
 urgency: string;
 preferredRepairDate: string | null;
 estimatedBudget: string | null;
 contactPerson: string;
 contactPhone: string | null;
 contactEmail: string | null;
 additionalNotes: string | null;
 specialRequirements: string | null;
 status: string;
 quoteAmount: string | null;
 quoteReceivedAt: string | null;
 quoteReceivedFrom: string | null;
 quoteNotes: string | null;
 approvedBy: string | null;
 approvedByName: string | null;
 approvedAt: string | null;
 approvalNotes: string | null;
 rejectedBy: string | null;
 rejectedByName: string | null;
 rejectedAt: string | null;
 rejectionReason: string | null;
 scheduledRepairDate: string | null;
 repairCompanyName: string | null;
 repairCompletedAt: string | null;
 repairCompletedBy: string | null;
 finalCost: string | null;
 completionNotes: string | null;
 warrantyInfo: string | null;
 icbAcknowledgedAt: string | null;
 icbAcknowledgedBy: string | null;
 statusHistory: string | null;
 emailSent: boolean;
 createdAt: string;
 equipment: {
  id: string;
  name: string;
  category: string | null;
  serialNumber: string | null;
  zone?: {
   name: string;
  } | null;
 };
 requestedBy: {
  fullName: string;
  email: string;
 };
 safetyIssue?: {
  title: string;
  issueType: string;
  priority: string;
 } | null;
}

type ViewMode = 'table' | 'kanban';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; step: number }> = {
 PENDING: {
  label: 'Pending',
  color: 'bg-amber-100 text-amber-800',
  icon: ClockIcon,
  step: 1,
 },
 ACKNOWLEDGED: {
  label: 'Acknowledged',
  color: 'bg-blue-100 text-blue-800',
  icon: HandThumbUpIcon,
  step: 2,
 },
 QUOTE_RECEIVED: {
  label: 'Quote Received',
  color: 'bg-cyan-100 text-cyan-800',
  icon: DocumentTextIcon,
  step: 3,
 },
 APPROVED: {
  label: 'Approved',
  color: 'bg-green-100 text-green-800',
  icon: CheckCircleIcon,
  step: 4,
 },
 REJECTED: {
  label: 'Rejected',
  color: 'bg-red-100 text-red-800',
  icon: XCircleIcon,
  step: 0,
 },
 COMPLETED: {
  label: 'Completed',
  color: 'bg-purple-100 text-purple-800',
  icon: CheckCircleIcon,
  step: 5,
 },
 CANCELLED: {
  label: 'Cancelled',
  color: 'bg-gray-100 text-gray-600',
  icon: XCircleIcon,
  step: 0,
 },
};

const URGENCY_CONFIG: Record<string, { label: string; color: string }> = {
 LOW: { label: 'Low', color: 'bg-green-100 text-green-800' },
 MEDIUM: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
 HIGH: { label: 'High', color: 'bg-orange-100 text-orange-800' },
 CRITICAL: { label: 'Critical', color: 'bg-red-100 text-red-800' },
};

// Workflow step indicator component
function WorkflowSteps({ currentStatus }: { currentStatus: string }) {
 const steps = [
  { key: 'PENDING', label: 'Submitted' },
  { key: 'ACKNOWLEDGED', label: 'ICB Acknowledged' },
  { key: 'QUOTE_RECEIVED', label: 'Quote Received' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'COMPLETED', label: 'Completed' },
 ];

 const currentStep = STATUS_CONFIG[currentStatus]?.step || 0;
 const isRejected = currentStatus === 'REJECTED';

 return (
  <div className="flex items-center w-full">
   {steps.map((step, index) => {
    const stepNum = index + 1;
    const isCompleted = currentStep > stepNum;
    const isCurrent = currentStep === stepNum;
    const isActive = isCompleted || isCurrent;

    return (
     <div key={step.key} className="flex items-center flex-1">
      <div className="flex flex-col items-center flex-1">
       <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
         isCompleted
          ? 'bg-green-500 text-white'
          : isCurrent
          ? isRejected
            ? 'bg-red-500 text-white'
            : 'bg-blue-600 text-white ring-4 ring-blue-100'
          : 'bg-gray-200 text-gray-500'
        }`}
       >
        {isCompleted ? '✓' : stepNum}
       </div>
       <span
        className={`mt-1 text-xs text-center ${
         isActive ? 'text-gray-900 font-medium' : 'text-gray-400'
        }`}
       >
        {step.label}
       </span>
      </div>
      {index < steps.length - 1 && (
       <div
        className={`h-0.5 w-full mx-1 ${
         isCompleted ? 'bg-green-400' : 'bg-gray-200'
        }`}
       />
      )}
     </div>
    );
   })}
  </div>
 );
}

export default function RepairQuotesPage() {
 const [loading, setLoading] = useState(true);
 const [requests, setRequests] = useState<RepairQuoteRequest[]>([]);
 const [viewMode, setViewMode] = useState<ViewMode>('table');
 const [searchTerm, setSearchTerm] = useState('');
 const [statusFilter, setStatusFilter] = useState('');
 const [urgencyFilter, setUrgencyFilter] = useState('');
 const [venueId, setVenueId] = useState<string | null>(null);
 const [selectedRequest, setSelectedRequest] = useState<RepairQuoteRequest | null>(null);
 const [showDetailModal, setShowDetailModal] = useState(false);
 const [approvalNotes, setApprovalNotes] = useState('');
 const [rejectionReason, setRejectionReason] = useState('');
 const [modalAction, setModalAction] = useState<'view' | 'approve' | 'reject' | 'complete' | null>(null);
 const [actionLoading, setActionLoading] = useState(false);
 const [completionFinalCost, setCompletionFinalCost] = useState('');
 const [completionNotes, setCompletionNotes] = useState('');
 const [completionWarranty, setCompletionWarranty] = useState('');
 const [showNewRequestForm, setShowNewRequestForm] = useState(false);
 const [showEquipmentPicker, setShowEquipmentPicker] = useState(false);
 const [equipmentList, setEquipmentList] = useState<any[]>([]);
 const [equipmentSearch, setEquipmentSearch] = useState('');
 const [selectedEquipment, setSelectedEquipment] = useState<any>(null);
 const [loadingEquipment, setLoadingEquipment] = useState(false);

 useEffect(() => {
  loadRequests();
 }, [statusFilter, urgencyFilter, venueId]);

 const openNewRequest = async () => {
  setShowEquipmentPicker(true);
  setEquipmentSearch('');
  if (equipmentList.length === 0) {
   setLoadingEquipment(true);
   try {
    const res = await axiosInstance.get('/api/equipment');
    setEquipmentList(res.data.equipment || res.data || []);
   } catch {
    showToast.error('Failed to load equipment');
   } finally {
    setLoadingEquipment(false);
   }
  }
 };

 const filteredEquipment = useMemo(() => {
  if (!equipmentSearch.trim()) return equipmentList;
  const term = equipmentSearch.toLowerCase();
  return equipmentList.filter((e: any) =>
   e.name?.toLowerCase().includes(term) ||
   e.serialNumber?.toLowerCase().includes(term) ||
   e.zone?.name?.toLowerCase().includes(term)
  );
 }, [equipmentList, equipmentSearch]);

 const loadRequests = async () => {
  try {
   setLoading(true);
   const params = new URLSearchParams();
   if (venueId && venueId !== 'all') params.set('venueId', venueId);
   if (statusFilter) params.set('status', statusFilter);
   if (urgencyFilter) params.set('urgency', urgencyFilter);
   params.set('limit', '200');

   const data = await axiosInstance.get(`/api/repair-quotes?${params.toString()}`);
   setRequests(data.data.requests || []);
  } catch (error: any) {
   showToast.error(error.response?.data?.error || error.message || 'Failed to load repair quote requests');
  } finally {
   setLoading(false);
  }
 };

 const filteredRequests = useMemo(() => {
  if (!searchTerm.trim()) return requests;

  const searchLower = searchTerm.toLowerCase();
  return requests.filter((req) => {
   return (
    req.equipment.name.toLowerCase().includes(searchLower) ||
    req.issueDescription.toLowerCase().includes(searchLower) ||
    req.contactPerson.toLowerCase().includes(searchLower) ||
    req.quoteReceivedFrom?.toLowerCase().includes(searchLower) ||
    req.equipment.zone?.name?.toLowerCase().includes(searchLower) ||
    req.requestReference?.toLowerCase().includes(searchLower)
   );
  });
 }, [requests, searchTerm]);

 const groupedByStatus = useMemo(() => {
  const groups: Record<string, RepairQuoteRequest[]> = {
   PENDING: [],
   ACKNOWLEDGED: [],
   QUOTE_RECEIVED: [],
   APPROVED: [],
   REJECTED: [],
   COMPLETED: [],
   CANCELLED: [],
  };

  filteredRequests.forEach((req) => {
   if (groups[req.status]) {
    groups[req.status].push(req);
   }
  });

  return groups;
 }, [filteredRequests]);

 const handleApprove = async (requestId: string, notes: string) => {
  setActionLoading(true);
  try {
   const res = await fetch(`/api/repair-quotes/${requestId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ approvalNotes: notes }),
   });

   if (!res.ok) throw new Error('Failed to approve quote');

   showToast.success('Repair quote approved — ICB Solutions has been notified');
   setShowDetailModal(false);
   setModalAction(null);
   setApprovalNotes('');
   loadRequests();
  } catch (error: any) {
   showToast.error(error.message || 'Failed to approve quote');
  } finally {
   setActionLoading(false);
  }
 };

 const handleReject = async (requestId: string, reason: string) => {
  if (!reason.trim()) {
   showToast.error('Please provide a rejection reason');
   return;
  }
  setActionLoading(true);
  try {
   const res = await fetch(`/api/repair-quotes/${requestId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ rejectionReason: reason }),
   });

   if (!res.ok) throw new Error('Failed to reject quote');

   showToast.success('Quote rejected — ICB Solutions has been notified to re-quote');
   setShowDetailModal(false);
   setModalAction(null);
   setRejectionReason('');
   loadRequests();
  } catch (error: any) {
   showToast.error(error.message || 'Failed to reject quote');
  } finally {
   setActionLoading(false);
  }
 };

 const handleComplete = async (requestId: string) => {
  setActionLoading(true);
  try {
   const res = await fetch(`/api/repair-quotes/${requestId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
     finalCost: completionFinalCost || null,
     completionNotes: completionNotes || null,
     warrantyInfo: completionWarranty || null,
    }),
   });

   if (!res.ok) throw new Error('Failed to mark as completed');

   showToast.success('Repair marked as completed successfully');
   setShowDetailModal(false);
   setModalAction(null);
   setCompletionFinalCost('');
   setCompletionNotes('');
   setCompletionWarranty('');
   loadRequests();
  } catch (error: any) {
   showToast.error(error.message || 'Failed to mark as completed');
  } finally {
   setActionLoading(false);
  }
 };

 const formatDate = (dateString: string | null) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString();
 };

 const formatDateTime = (dateString: string | null) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString();
 };

 const formatCurrency = (amount: string | null) => {
  if (!amount) return 'N/A';
  return `$${parseFloat(amount).toLocaleString()}`;
 };

 const parseStatusHistory = (historyStr: string | null): StatusHistoryEntry[] => {
  if (!historyStr) return [];
  try {
   return JSON.parse(historyStr);
  } catch {
   return [];
  }
 };

 const openDetail = (request: RepairQuoteRequest) => {
  setSelectedRequest(request);
  setShowDetailModal(true);
  setModalAction('view');
  setApprovalNotes('');
  setRejectionReason('');
 };

 if (loading) {
  return (
   <DashboardLayout>
    <EquipmentManagementSubNav />
    <div className="flex items-center justify-center h-64">
     <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
   </DashboardLayout>
  );
 }

 return (
  <DashboardLayout>
   <EquipmentManagementSubNav />
   <div className="p-6 space-y-6">
    {/* Header */}
    <div className="mb-6 flex items-start justify-between">
     <div>
      <h1 className="text-2xl font-bold text-gray-900">Repair Quote Requests</h1>
      <p className="mt-1 text-sm text-gray-600">
       Track repair quotes managed by ICB Solutions. Submit requests, review quotes, and approve repairs.
      </p>
     </div>
     <button
      onClick={openNewRequest}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium shrink-0"
     >
      <PlusIcon className="h-5 w-5" />
      Request Repair Quote
     </button>
    </div>

    {/* Stats */}
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
     {Object.entries(STATUS_CONFIG).map(([key, config]) => {
      const count = groupedByStatus[key]?.length || 0;
      const StatusIcon = config.icon;
      return (
       <button
        key={key}
        onClick={() => setStatusFilter(statusFilter === key ? '' : key)}
        className={`${config.color} rounded-lg p-3 text-left transition-all hover:shadow-md ${
         statusFilter === key ? 'ring-2 ring-offset-1 ring-blue-500' : ''
        }`}
       >
        <div className="flex items-center gap-2">
         <StatusIcon className="h-4 w-4" />
         <p className="text-xs font-medium">{config.label}</p>
        </div>
        <p className="mt-1 text-2xl font-bold">{count}</p>
       </button>
      );
     })}
    </div>

    {/* Filters */}
    <div className="bg-white border border-gray-200 rounded-lg p-4">
     <IntelligenceFilter
      title="Repair Quote Filters"
      subtitle="Filter and search repair quote requests"
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
          type: 'search',
          label: 'Search',
          value: searchTerm,
          onChange: setSearchTerm,
          placeholder: 'Search reference, equipment, description...',
        },
        {
          type: 'select',
          label: 'Status',
          value: statusFilter,
          onChange: setStatusFilter,
          icon: <CheckCircleIcon className="h-4 w-4" />,
          options: [
            { value: '', label: 'All Statuses' },
            ...Object.entries(STATUS_CONFIG).map(([key, config]) => ({
              value: key,
              label: config.label,
            })),
          ],
        },
        {
          type: 'select',
          label: 'Urgency',
          value: urgencyFilter,
          onChange: setUrgencyFilter,
          icon: <FlagIcon className="h-4 w-4" />,
          options: [
            { value: '', label: 'All Urgencies' },
            ...Object.entries(URGENCY_CONFIG).map(([key, config]) => ({
              value: key,
              label: config.label,
            })),
          ],
        },
        {
          type: 'custom',
          label: 'View Mode',
          value: viewMode,
          onChange: setViewMode,
          customComponent: (
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <TableCellsIcon className="h-5 w-5" />
                Table
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'kanban'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Squares2X2Icon className="h-5 w-5" />
                Kanban
              </button>
            </div>
          ),
        },
      ]}
      onReset={() => {
        setVenueId(null);
        setSearchTerm('');
        setStatusFilter('');
        setUrgencyFilter('');
      }}
    />
    </div>

    {/* Table View */}
    {viewMode === 'table' && (
     <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
       <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
         <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
           Reference
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
           Equipment
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
           Issue
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
           Status
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
           Urgency
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
           Quote
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
           Date
          </th>
          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
           Actions
          </th>
         </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
         {filteredRequests.length === 0 ? (
          <tr>
           <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500">
            No repair quote requests found
           </td>
          </tr>
         ) : (
          filteredRequests.map((request) => (
           <tr
            key={request.id}
            className="hover:bg-gray-50 cursor-pointer"
            onClick={() => openDetail(request)}
           >
            <td className="px-6 py-4 whitespace-nowrap">
             <span className="text-sm font-mono font-medium text-indigo-600">
              {request.requestReference || request.id.slice(0, 8)}
             </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
             <div className="text-sm font-medium text-gray-900">
              {request.equipment.name}
             </div>
             {request.equipment.zone && (
              <div className="text-xs text-gray-500">
               {request.equipment.zone.name}
              </div>
             )}
            </td>
            <td className="px-6 py-4">
             <div className="text-sm text-gray-900 max-w-xs truncate">
              {request.issueDescription}
             </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
             <span
              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
               STATUS_CONFIG[request.status]?.color || 'bg-gray-100 text-gray-800'
              }`}
             >
              {STATUS_CONFIG[request.status]?.label || request.status}
             </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
             <span
              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
               URGENCY_CONFIG[request.urgency]?.color || 'bg-gray-100 text-gray-800'
              }`}
             >
              {URGENCY_CONFIG[request.urgency]?.label || request.urgency}
             </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
             {request.quoteAmount ? (
              <span className="font-semibold">{formatCurrency(request.quoteAmount)}</span>
             ) : (
              <span className="text-gray-400">—</span>
             )}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
             {formatDate(request.createdAt)}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
             <button
              onClick={(e) => {
               e.stopPropagation();
               openDetail(request);
              }}
              className="text-indigo-600 hover:text-indigo-900"
             >
              View
             </button>
             {request.status === 'QUOTE_RECEIVED' && (
              <>
               <button
                onClick={(e) => {
                 e.stopPropagation();
                 setSelectedRequest(request);
                 setShowDetailModal(true);
                 setModalAction('approve');
                }}
                className="text-green-600 hover:text-green-900"
               >
                Approve
               </button>
               <button
                onClick={(e) => {
                 e.stopPropagation();
                 setSelectedRequest(request);
                 setShowDetailModal(true);
                 setModalAction('reject');
                }}
                className="text-red-600 hover:text-red-900"
               >
                Reject
               </button>
              </>
             )}
             {request.status === 'APPROVED' && (
              <button
               onClick={(e) => {
                e.stopPropagation();
                handleComplete(request.id);
               }}
               className="text-purple-600 hover:text-purple-900"
              >
               Complete
              </button>
             )}
            </td>
           </tr>
          ))
         )}
        </tbody>
       </table>
      </div>
     </div>
    )}

    {/* Kanban View */}
    {viewMode === 'kanban' && (
     <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
      {Object.entries(STATUS_CONFIG).map(([status, config]) => {
       const statusRequests = groupedByStatus[status] || [];
       return (
        <div key={status} className="bg-gray-50 rounded-lg p-3 min-h-[200px]">
         <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-gray-900">{config.label}</h3>
          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-200 text-gray-700">
           {statusRequests.length}
          </span>
         </div>
         <div className="space-y-2">
          {statusRequests.map((request) => (
           <div
            key={request.id}
            className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => openDetail(request)}
           >
            <div className="flex items-center justify-between mb-1">
             <span className="text-xs font-mono text-indigo-600">
              {request.requestReference || request.id.slice(0, 8)}
             </span>
             <span
              className={`inline-flex px-1.5 py-0.5 text-xs font-semibold rounded ${
               URGENCY_CONFIG[request.urgency]?.color || 'bg-gray-100 text-gray-800'
              }`}
             >
              {URGENCY_CONFIG[request.urgency]?.label || request.urgency}
             </span>
            </div>
            <div className="font-medium text-sm text-gray-900 mb-1">
             {request.equipment.name}
            </div>
            <div className="text-xs text-gray-600 line-clamp-2 mb-2">
             {request.issueDescription}
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
             <span>{formatDate(request.createdAt)}</span>
             {request.quoteAmount && (
              <span className="font-semibold text-gray-900">
               {formatCurrency(request.quoteAmount)}
              </span>
             )}
            </div>
           </div>
          ))}
         </div>
        </div>
       );
      })}
     </div>
    )}
   </div>

   {/* Enhanced Detail Modal */}
   {showDetailModal && selectedRequest && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
     <div className="bg-white rounded-xl max-w-5xl w-full max-h-[92vh] overflow-y-auto shadow-2xl">
      {/* Modal Header */}
      <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10 rounded-t-xl">
       <div>
        <div className="flex items-center gap-3">
         <h2 className="text-xl font-bold text-gray-900">Repair Quote Details</h2>
         <span className="text-sm font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
          {selectedRequest.requestReference || selectedRequest.id.slice(0, 8)}
         </span>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">
         Managed by ICB Solutions
        </p>
       </div>
       <button
        onClick={() => { setShowDetailModal(false); setModalAction(null); }}
        className="text-gray-400 hover:text-gray-600 p-1"
       >
        <XCircleIcon className="h-6 w-6" />
       </button>
      </div>

      <div className="p-6 space-y-6">
       {/* Workflow Progress */}
       <div className="bg-gray-50 rounded-lg p-4">
        <WorkflowSteps currentStatus={selectedRequest.status} />

        {selectedRequest.status === 'REJECTED' && (
         <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <p className="text-sm text-red-800">
           <strong>Quote Rejected</strong> — ICB Solutions has been notified to submit a revised quote.
          </p>
          {selectedRequest.rejectionReason && (
           <p className="text-sm text-red-700 mt-1">Reason: {selectedRequest.rejectionReason}</p>
          )}
         </div>
        )}
       </div>

       {/* Status & Urgency badges */}
       <div className="flex items-center gap-3 flex-wrap">
        <span
         className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full ${
          STATUS_CONFIG[selectedRequest.status]?.color || 'bg-gray-100 text-gray-800'
         }`}
        >
         {STATUS_CONFIG[selectedRequest.status]?.label || selectedRequest.status}
        </span>
        <span
         className={`inline-flex px-3 py-1.5 text-sm font-semibold rounded-full ${
          URGENCY_CONFIG[selectedRequest.urgency]?.color || 'bg-gray-100 text-gray-800'
         }`}
        >
         {URGENCY_CONFIG[selectedRequest.urgency]?.label || selectedRequest.urgency} Urgency
        </span>
        {selectedRequest.emailSent && (
         <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-50 text-green-700 rounded-full">
          ✓ Email sent to ICB Solutions
         </span>
        )}
       </div>

       {/* Main Details Grid */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-4">
         <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Equipment</h3>
          <p className="text-lg font-semibold text-gray-900">{selectedRequest.equipment.name}</p>
          {selectedRequest.equipment.category && (
           <p className="text-sm text-gray-600">Category: {selectedRequest.equipment.category}</p>
          )}
          {selectedRequest.equipment.serialNumber && (
           <p className="text-sm text-gray-600">Serial: {selectedRequest.equipment.serialNumber}</p>
          )}
          {selectedRequest.equipment.zone && (
           <p className="text-sm text-gray-600">Zone: {selectedRequest.equipment.zone.name}</p>
          )}
         </div>

         <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Issue Description</h3>
          <p className="text-gray-900 whitespace-pre-wrap">{selectedRequest.issueDescription}</p>
         </div>

         {selectedRequest.safetyIssue && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
           <h4 className="text-sm font-semibold text-red-700">Linked Safety Issue</h4>
           <p className="text-sm text-red-900 mt-1">{selectedRequest.safetyIssue.title}</p>
           <p className="text-xs text-red-700">
            {selectedRequest.safetyIssue.issueType} — {selectedRequest.safetyIssue.priority}
           </p>
          </div>
         )}

         <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
           <span className="text-gray-500">Requested by:</span>
           <p className="font-medium">{selectedRequest.requestedBy.fullName}</p>
          </div>
          <div>
           <span className="text-gray-500">Submitted:</span>
           <p className="font-medium">{formatDate(selectedRequest.createdAt)}</p>
          </div>
          <div>
           <span className="text-gray-500">Contact Person:</span>
           <p className="font-medium">{selectedRequest.contactPerson}</p>
          </div>
          {selectedRequest.contactEmail && (
           <div>
            <span className="text-gray-500">Contact Email:</span>
            <p className="font-medium">{selectedRequest.contactEmail}</p>
           </div>
          )}
          {selectedRequest.preferredRepairDate && (
           <div>
            <span className="text-gray-500">Preferred Date:</span>
            <p className="font-medium">{formatDate(selectedRequest.preferredRepairDate)}</p>
           </div>
          )}
          {selectedRequest.estimatedBudget && (
           <div>
            <span className="text-gray-500">Budget:</span>
            <p className="font-medium">{selectedRequest.estimatedBudget}</p>
           </div>
          )}
         </div>
        </div>

        {/* Right column - Quote & Timeline */}
        <div className="space-y-4">
         {/* Quote Details */}
         {selectedRequest.quoteAmount && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
           <h3 className="text-sm font-semibold text-green-700 uppercase tracking-wider mb-3">Quote from ICB Solutions</h3>
           <p className="text-3xl font-bold text-green-900">{formatCurrency(selectedRequest.quoteAmount)}</p>
           {selectedRequest.repairCompanyName && (
            <p className="text-sm text-green-700 mt-1">Repair Company: {selectedRequest.repairCompanyName}</p>
           )}
           {selectedRequest.quoteReceivedAt && (
            <p className="text-sm text-green-600 mt-1">Received: {formatDate(selectedRequest.quoteReceivedAt)}</p>
           )}
           {selectedRequest.quoteNotes && (
            <p className="text-sm text-green-800 mt-2 border-t border-green-200 pt-2">{selectedRequest.quoteNotes}</p>
           )}
          </div>
         )}

         {/* Approval/Rejection Info */}
         {selectedRequest.approvedByName && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
           <p className="text-sm text-green-800">
            <strong>Approved</strong> by {selectedRequest.approvedByName} on {formatDate(selectedRequest.approvedAt)}
           </p>
           {selectedRequest.approvalNotes && (
            <p className="text-sm text-green-700 mt-1">{selectedRequest.approvalNotes}</p>
           )}
          </div>
         )}

         {selectedRequest.rejectedByName && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
           <p className="text-sm text-red-800">
            <strong>Rejected</strong> by {selectedRequest.rejectedByName} on {formatDate(selectedRequest.rejectedAt)}
           </p>
           {selectedRequest.rejectionReason && (
            <p className="text-sm text-red-700 mt-1">Reason: {selectedRequest.rejectionReason}</p>
           )}
          </div>
         )}

         {/* Completion Info */}
         {selectedRequest.status === 'COMPLETED' && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
           <h4 className="text-sm font-semibold text-purple-700">Repair Completed</h4>
           {selectedRequest.finalCost && (
            <p className="text-lg font-bold text-purple-900 mt-1">Final Cost: {formatCurrency(selectedRequest.finalCost)}</p>
           )}
           {selectedRequest.repairCompletedAt && (
            <p className="text-sm text-purple-600">Completed: {formatDate(selectedRequest.repairCompletedAt)}</p>
           )}
           {selectedRequest.completionNotes && (
            <p className="text-sm text-purple-800 mt-1">{selectedRequest.completionNotes}</p>
           )}
           {selectedRequest.warrantyInfo && (
            <p className="text-sm text-purple-700 mt-1">Warranty: {selectedRequest.warrantyInfo}</p>
           )}
          </div>
         )}

         {/* ICB Acknowledgement */}
         {selectedRequest.icbAcknowledgedAt && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
           <p className="text-sm text-blue-800">
            <strong>ICB Solutions acknowledged</strong> on {formatDate(selectedRequest.icbAcknowledgedAt)}
            {selectedRequest.icbAcknowledgedBy && ` by ${selectedRequest.icbAcknowledgedBy}`}
           </p>
          </div>
         )}

         {/* Status Timeline */}
         {selectedRequest.statusHistory && (
          <div>
           <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Activity Timeline</h3>
           <div className="space-y-3">
            {parseStatusHistory(selectedRequest.statusHistory).map((entry, index) => (
             <div key={index} className="flex gap-3">
              <div className="flex flex-col items-center">
               <div
                className="w-2.5 h-2.5 rounded-full mt-1.5"
                style={{
                 backgroundColor: STATUS_CONFIG[entry.status]?.step
                  ? '#2563eb'
                  : entry.status === 'REJECTED' ? '#dc2626' : '#6b7280',
                }}
               />
               {index < parseStatusHistory(selectedRequest.statusHistory).length - 1 && (
                <div className="w-0.5 flex-1 bg-gray-200 mt-1" />
               )}
              </div>
              <div className="pb-3 flex-1">
               <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-900">
                 {STATUS_CONFIG[entry.status]?.label || entry.status}
                </span>
                <span className="text-xs text-gray-400">
                 {new Date(entry.timestamp).toLocaleString()}
                </span>
               </div>
               <p className="text-xs text-gray-600">{entry.actor}</p>
               {entry.notes && <p className="text-xs text-gray-500 mt-0.5">{entry.notes}</p>}
              </div>
             </div>
            ))}
           </div>
          </div>
         )}
        </div>
       </div>

       {/* Action Section */}
       {(modalAction === 'approve' || (modalAction === 'view' && selectedRequest.status === 'QUOTE_RECEIVED')) && selectedRequest.status === 'QUOTE_RECEIVED' && (
        <div className="border-t pt-6 space-y-4">
         <h3 className="text-lg font-semibold text-gray-900">Quote Decision</h3>
         <p className="text-sm text-gray-600">
          Review the quote of <strong>{formatCurrency(selectedRequest.quoteAmount)}</strong> from ICB Solutions and decide whether to approve or reject.
         </p>

         {modalAction === 'approve' ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
           <h4 className="font-semibold text-green-900">Approve Quote</h4>
           <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Approval Notes (optional)</label>
            <textarea
             value={approvalNotes}
             onChange={(e) => setApprovalNotes(e.target.value)}
             rows={3}
             className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
             placeholder="Add any notes for the approval..."
            />
           </div>
           <div className="flex gap-3">
            <button
             onClick={() => handleApprove(selectedRequest.id, approvalNotes)}
             disabled={actionLoading}
             className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
            >
             {actionLoading ? 'Approving...' : 'Confirm Approval'}
            </button>
            <button
             onClick={() => setModalAction('view')}
             className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
             Cancel
            </button>
           </div>
          </div>
         ) : modalAction === 'reject' ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
           <h4 className="font-semibold text-red-900">Reject Quote</h4>
           <p className="text-sm text-red-700">
            ICB Solutions will be notified and can submit a revised quote based on your feedback.
           </p>
           <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
             Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
             value={rejectionReason}
             onChange={(e) => setRejectionReason(e.target.value)}
             rows={3}
             className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
             placeholder="Explain why you're rejecting this quote (e.g., too expensive, wrong scope)..."
            />
           </div>
           <div className="flex gap-3">
            <button
             onClick={() => handleReject(selectedRequest.id, rejectionReason)}
             disabled={actionLoading || !rejectionReason.trim()}
             className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
            >
             {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
            <button
             onClick={() => setModalAction('view')}
             className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
             Cancel
            </button>
           </div>
          </div>
         ) : (
          <div className="flex gap-3">
           <button
            onClick={() => setModalAction('approve')}
            className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
           >
            ✓ Approve Quote
           </button>
           <button
            onClick={() => setModalAction('reject')}
            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
           >
            ✕ Reject Quote
           </button>
          </div>
         )}
        </div>
       )}

       {/* Pending states info */}
       {selectedRequest.status === 'PENDING' && (
        <div className="border-t pt-4">
         <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
          <ClockIcon className="h-8 w-8 text-amber-500 mx-auto mb-2" />
          <p className="text-sm text-amber-800 font-medium">
           Waiting for ICB Solutions to acknowledge this request
          </p>
          <p className="text-xs text-amber-600 mt-1">
           An email has been sent to ICB Solutions. They will acknowledge and begin sourcing quotes.
          </p>
         </div>
        </div>
       )}

       {selectedRequest.status === 'ACKNOWLEDGED' && (
        <div className="border-t pt-4">
         <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <ArrowPathIcon className="h-8 w-8 text-blue-500 mx-auto mb-2 animate-spin-slow" />
          <p className="text-sm text-blue-800 font-medium">
           ICB Solutions is sourcing repair quotes
          </p>
          <p className="text-xs text-blue-600 mt-1">
           You will be notified when a quote is ready for your review.
          </p>
         </div>
        </div>
       )}

       {/* Mark as Complete section for APPROVED status */}
       {selectedRequest.status === 'APPROVED' && (
        <div className="border-t pt-6 space-y-4">
         {modalAction === 'complete' ? (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-5 space-y-4">
           <div className="flex items-center gap-2">
            <CheckCircleIcon className="h-5 w-5 text-purple-600" />
            <h4 className="font-semibold text-purple-900 text-lg">Mark Repair as Completed</h4>
           </div>
           <p className="text-sm text-purple-700">
            Confirm the repair has been completed and provide final details.
           </p>
           <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Final Cost</label>
            <div className="relative">
             <span className="absolute left-3 top-2 text-gray-500">$</span>
             <input
              type="text"
              value={completionFinalCost}
              onChange={(e) => setCompletionFinalCost(e.target.value)}
              className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="0.00"
             />
            </div>
           </div>
           <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Completion Notes</label>
            <textarea
             value={completionNotes}
             onChange={(e) => setCompletionNotes(e.target.value)}
             rows={3}
             className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
             placeholder="Describe the work completed, any follow-up required..."
            />
           </div>
           <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Warranty Information</label>
            <input
             type="text"
             value={completionWarranty}
             onChange={(e) => setCompletionWarranty(e.target.value)}
             className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
             placeholder="e.g., 12-month parts warranty"
            />
           </div>
           <div className="flex gap-3 pt-2">
            <button
             onClick={() => handleComplete(selectedRequest.id)}
             disabled={actionLoading}
             className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
             {actionLoading ? (
              <span className="flex items-center justify-center gap-2">
               <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
               Completing...
              </span>
             ) : '✓ Confirm Completion'}
            </button>
            <button
             onClick={() => {
              setModalAction('view');
              setCompletionFinalCost('');
              setCompletionNotes('');
              setCompletionWarranty('');
             }}
             className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
             Cancel
            </button>
           </div>
          </div>
         ) : (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
           <CheckCircleIcon className="h-8 w-8 text-purple-500 mx-auto mb-2" />
           <p className="text-sm text-purple-800 font-medium">
            This repair has been approved
           </p>
           <p className="text-xs text-purple-600 mt-1 mb-3">
            Once the repair is completed, mark it as done to close this request.
           </p>
           <button
            onClick={() => setModalAction('complete')}
            className="px-6 py-2.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
           >
            Mark Repair as Completed
           </button>
          </div>
         )}
        </div>
       )}

       {/* Close button */}
       <div className="border-t pt-4 flex justify-end">
        <button
         onClick={() => { setShowDetailModal(false); setModalAction(null); }}
         className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
        >
         Close
        </button>
       </div>
      </div>
     </div>
    </div>
   )}

   {/* Equipment Picker Modal */}
   {showEquipmentPicker && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
     <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
      <div className="px-6 py-4 border-b border-gray-200">
       <h2 className="text-lg font-bold text-gray-900">Select Equipment</h2>
       <p className="text-sm text-gray-600 mt-1">Choose the equipment that needs repair</p>
       <div className="mt-3 relative">
        <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-2.5 text-gray-400" />
        <input
         type="text"
         placeholder="Search equipment..."
         value={equipmentSearch}
         onChange={(e) => setEquipmentSearch(e.target.value)}
         className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
         autoFocus
        />
       </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
       {loadingEquipment ? (
        <div className="flex items-center justify-center py-8">
         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
       ) : filteredEquipment.length === 0 ? (
        <p className="text-center text-gray-500 py-8 text-sm">No equipment found</p>
       ) : (
        filteredEquipment.map((eq: any) => (
         <button
          key={eq.id}
          onClick={() => {
           setSelectedEquipment(eq);
           setShowEquipmentPicker(false);
           setShowNewRequestForm(true);
          }}
          className="w-full text-left px-4 py-3 rounded-lg hover:bg-blue-50 transition flex items-center justify-between group"
         >
          <div>
           <p className="font-medium text-gray-900 group-hover:text-blue-700">{eq.name}</p>
           <p className="text-xs text-gray-500">
            {eq.zone?.name || 'No zone'}{eq.serialNumber ? ` · SN: ${eq.serialNumber}` : ''}
           </p>
          </div>
          <span className="text-xs text-gray-400 group-hover:text-blue-600">Select →</span>
         </button>
        ))
       )}
      </div>
      <div className="px-6 py-3 border-t border-gray-200">
       <button
        onClick={() => setShowEquipmentPicker(false)}
        className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
       >
        Cancel
       </button>
      </div>
     </div>
    </div>
   )}

   {/* New Request Form */}
   {showNewRequestForm && selectedEquipment && (
    <RepairQuoteRequestForm
     equipment={selectedEquipment}
     onClose={() => { setShowNewRequestForm(false); setSelectedEquipment(null); }}
     onSuccess={() => {
      setShowNewRequestForm(false);
      setSelectedEquipment(null);
      showToast.success('Repair quote request submitted successfully');
      loadRequests();
     }}
    />
   )}
  </DashboardLayout>
 );
}

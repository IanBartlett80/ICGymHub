'use client';

import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import EquipmentManagementSubNav from '@/components/EquipmentManagementSubNav';
import { showToast } from '@/lib/toast';
import {
  MagnifyingGlassIcon,
  TableCellsIcon,
  Squares2X2Icon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

interface RepairQuoteRequest {
  id: string;
  issueDescription: string;
  urgency: string;
  preferredRepairDate: string | null;
  estimatedBudget: string | null;
  contactPerson: string;
  contactPhone: string | null;
  contactEmail: string | null;
  status: string;
  quoteAmount: string | null;
  quoteReceivedAt: string | null;
  quoteReceivedFrom: string | null;
  approvedBy: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedByName: string | null;
  rejectedAt: string | null;
  scheduledRepairDate: string | null;
  repairCompanyName: string | null;
  repairCompletedAt: string | null;
  finalCost: string | null;
  createdAt: string;
  equipment: {
    id: string;
    name: string;
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

const STATUS_CONFIG = {
  PENDING: {
    label: 'Pending',
    color: 'bg-gray-100 text-gray-800',
    icon: ClockIcon,
  },
  QUOTE_RECEIVED: {
    label: 'Quote Received',
    color: 'bg-blue-100 text-blue-800',
    icon: DocumentTextIcon,
  },
  APPROVED: {
    label: 'Approved',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircleIcon,
  },
  REJECTED: {
    label: 'Rejected',
    color: 'bg-red-100 text-red-800',
    icon: XCircleIcon,
  },
  COMPLETED: {
    label: 'Completed',
    color: 'bg-purple-100 text-purple-800',
    icon: CheckCircleIcon,
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'bg-gray-100 text-gray-600',
    icon: XCircleIcon,
  },
};

const URGENCY_CONFIG = {
  LOW: { label: 'Low', color: 'bg-green-100 text-green-800' },
  MEDIUM: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  HIGH: { label: 'High', color: 'bg-orange-100 text-orange-800' },
  CRITICAL: { label: 'Critical', color: 'bg-red-100 text-red-800' },
};

export default function RepairQuotesPage() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<RepairQuoteRequest[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<RepairQuoteRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadRequests();
  }, [statusFilter, urgencyFilter]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (urgencyFilter) params.set('urgency', urgencyFilter);
      params.set('limit', '200');

      const res = await fetch(`/api/repair-quotes?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load repair quote requests');

      const data = await res.json();
      setRequests(data.requests || []);
    } catch (error: any) {
      showToast.error(error.message || 'Failed to load repair quote requests');
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
        req.equipment.zone?.name?.toLowerCase().includes(searchLower)
      );
    });
  }, [requests, searchTerm]);

  const groupedByStatus = useMemo(() => {
    const groups: Record<string, RepairQuoteRequest[]> = {
      PENDING: [],
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

  const handleApprove = async (requestId: string) => {
    if (!confirm('Are you sure you want to approve this repair quote?')) return;

    try {
      const approvalNotes = prompt('Add approval notes (optional):');
      const res = await fetch(`/api/repair-quotes/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalNotes }),
      });

      if (!res.ok) throw new Error('Failed to approve quote');

      showToast.success('Repair quote approved successfully');
      loadRequests();
    } catch (error: any) {
      showToast.error(error.message || 'Failed to approve quote');
    }
  };

  const handleReject = async (requestId: string) => {
    const rejectionReason = prompt('Please provide a reason for rejection:');
    if (!rejectionReason) return;

    try {
      const res = await fetch(`/api/repair-quotes/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectionReason }),
      });

      if (!res.ok) throw new Error('Failed to reject quote');

      showToast.success('Repair quote rejected');
      loadRequests();
    } catch (error: any) {
      showToast.error(error.message || 'Failed to reject quote');
    }
  };

  const handleComplete = async (requestId: string) => {
    if (!confirm('Mark this repair as completed?')) return;

    try {
      const finalCost = prompt('Enter final cost (optional):');
      const completionNotes = prompt('Add completion notes (optional):');

      const res = await fetch(`/api/repair-quotes/${requestId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finalCost, completionNotes }),
      });

      if (!res.ok) throw new Error('Failed to mark as completed');

      showToast.success('Repair marked as completed');
      loadRequests();
    } catch (error: any) {
      showToast.error(error.message || 'Failed to mark as completed');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: string | null) => {
    if (!amount) return 'N/A';
    return `$${parseFloat(amount).toLocaleString()}`;
  };

  if (loading) {
    return (
      <DashboardLayout hideSidebar={true}>
        <EquipmentManagementSubNav />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout hideSidebar={true}>
      <EquipmentManagementSubNav />
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Repair Quote Requests</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage repair quotes and track equipment repairs
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {Object.entries(STATUS_CONFIG).map(([key, config]) => {
            const count = groupedByStatus[key]?.length || 0;
            return (
              <div key={key} className={`${config.color} rounded-lg p-4`}>
                <p className="text-sm font-medium">{config.label}</p>
                <p className="mt-2 text-3xl font-bold">{count}</p>
              </div>
            );
          })}
        </div>

        {/* Filters and View Toggle */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search equipment, description, contact..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>

            {/* Urgency Filter */}
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">All Urgencies</option>
              {Object.entries(URGENCY_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>

            {/* View Toggle */}
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
          </div>
        </div>

        {/* Table View */}
        {viewMode === 'table' && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
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
                      Quote Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Requested By
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
                      <tr key={request.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {request.equipment.name}
                          </div>
                          {request.equipment.zone && (
                            <div className="text-sm text-gray-500">
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
                              STATUS_CONFIG[request.status as keyof typeof STATUS_CONFIG]?.color ||
                              'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {STATUS_CONFIG[request.status as keyof typeof STATUS_CONFIG]?.label ||
                              request.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              URGENCY_CONFIG[request.urgency as keyof typeof URGENCY_CONFIG]?.color ||
                              'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {URGENCY_CONFIG[request.urgency as keyof typeof URGENCY_CONFIG]?.label ||
                              request.urgency}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(request.quoteAmount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {request.requestedBy.fullName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(request.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowDetailModal(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            View
                          </button>
                          {request.status === 'QUOTE_RECEIVED' && (
                            <>
                              <button
                                onClick={() => handleApprove(request.id)}
                                className="text-green-600 hover:text-green-900"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(request.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {request.status === 'APPROVED' && (
                            <button
                              onClick={() => handleComplete(request.id)}
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
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(STATUS_CONFIG).map(([status, config]) => {
              const statusRequests = groupedByStatus[status] || [];
              return (
                <div key={status} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">{config.label}</h3>
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-700">
                      {statusRequests.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {statusRequests.map((request) => (
                      <div
                        key={request.id}
                        className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowDetailModal(true);
                        }}
                      >
                        <div className="font-medium text-sm text-gray-900 mb-1">
                          {request.equipment.name}
                        </div>
                        {request.equipment.zone && (
                          <div className="text-xs text-gray-500 mb-2">
                            📍 {request.equipment.zone.name}
                          </div>
                        )}
                        <div className="text-xs text-gray-600 line-clamp-2 mb-2">
                          {request.issueDescription}
                        </div>
                        <div className="flex items-center justify-between">
                          <span
                            className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded ${
                              URGENCY_CONFIG[request.urgency as keyof typeof URGENCY_CONFIG]?.color ||
                              'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {URGENCY_CONFIG[request.urgency as keyof typeof URGENCY_CONFIG]?.label ||
                              request.urgency}
                          </span>
                          {request.quoteAmount && (
                            <span className="text-xs font-semibold text-gray-900">
                              {formatCurrency(request.quoteAmount)}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          {formatDate(request.createdAt)}
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

      {/* Detail Modal - Placeholder for now */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Repair Quote Details</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Equipment</h3>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {selectedRequest.equipment.name}
                  </p>
                  {selectedRequest.equipment.zone && (
                    <p className="text-sm text-gray-600">
                      Zone: {selectedRequest.equipment.zone.name}
                    </p>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500">Issue Description</h3>
                  <p className="mt-1 text-gray-900">{selectedRequest.issueDescription}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Status</h3>
                    <span
                      className={`mt-1 inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                        STATUS_CONFIG[selectedRequest.status as keyof typeof STATUS_CONFIG]?.color ||
                        'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {STATUS_CONFIG[selectedRequest.status as keyof typeof STATUS_CONFIG]?.label ||
                        selectedRequest.status}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Urgency</h3>
                    <span
                      className={`mt-1 inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                        URGENCY_CONFIG[selectedRequest.urgency as keyof typeof URGENCY_CONFIG]
                          ?.color || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {URGENCY_CONFIG[selectedRequest.urgency as keyof typeof URGENCY_CONFIG]
                        ?.label || selectedRequest.urgency}
                    </span>
                  </div>
                </div>

                {selectedRequest.quoteAmount && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Quote Amount</h3>
                    <p className="mt-1 text-xl font-bold text-gray-900">
                      {formatCurrency(selectedRequest.quoteAmount)}
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      handleApprove(selectedRequest.id);
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      handleReject(selectedRequest.id);
                    }}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axiosInstance from '@/lib/axios';
import { formatDateTime } from '@/lib/timezone';
import { showToast } from '@/lib/toast';
import {
  XMarkIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  PhotoIcon,
  WrenchScrewdriverIcon,
  CalendarIcon,
  UserIcon,
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
  photos: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
  equipment: {
    id: string;
    name: string;
    category: string | null;
    serialNumber: string | null;
    condition: string;
    zone?: {
      id: string;
      name: string;
    } | null;
    photoUrl: string | null;
  };
}

interface SafetyIssueReviewModalProps {
  issueId: string;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function SafetyIssueReviewModal({ issueId, onClose, onUpdate }: SafetyIssueReviewModalProps) {
  const router = useRouter();
  const [issue, setIssue] = useState<SafetyIssue | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedIssueType, setSelectedIssueType] = useState('');

  useEffect(() => {
    loadIssue();
  }, [issueId]);

  const loadIssue = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/api/safety-issues/${issueId}`);
      setIssue(response.data.issue);
      setSelectedStatus(response.data.issue.status);
      setSelectedPriority(response.data.issue.priority);
      setSelectedIssueType(response.data.issue.issueType);
    } catch (error) {
      console.error('Failed to load safety issue:', error);
      showToast.error('Failed to load safety issue details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!issue) return;

    try {
      setActionInProgress(true);
      await axiosInstance.put(`/api/safety-issues/${issue.id}`, {
        status: selectedStatus,
        priority: selectedPriority,
        issueType: selectedIssueType,
      });
      showToast.success('Safety issue updated successfully');
      await loadIssue();
      onUpdate?.();
    } catch (error) {
      showToast.error('Failed to update safety issue');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleResolve = async () => {
    if (!issue) return;

    try {
      setActionInProgress(true);
      await axiosInstance.put(`/api/safety-issues/${issue.id}`, {
        status: 'RESOLVED',
        resolutionNotes,
      });
      showToast.success('Safety issue marked as resolved');
      setShowResolveForm(false);
      await loadIssue();
      onUpdate?.();
    } catch (error) {
      showToast.error('Failed to resolve safety issue');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleNavigateToEquipment = () => {
    if (issue?.equipment) {
      router.push(`/dashboard/equipment/items/${issue.equipment.id}`);
      onClose();
    }
  };

  const handleRequestQuote = () => {
    if (issue?.equipment) {
      router.push(`/dashboard/equipment/items/${issue.equipment.id}`);
      onClose();
    }
  };

  const handleScheduleMaintenance = () => {
    if (issue?.equipment) {
      router.push(`/dashboard/equipment/items/${issue.equipment.id}?tab=tasks`);
      onClose();
    }
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

  const formatDate = (dateString: string) => {
    return formatDateTime(dateString);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!issue) {
    return null;
  }

  const photoArray = issue.photos ? JSON.parse(issue.photos) : [];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={onClose}>
      <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white mb-10" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
              <h2 className="text-2xl font-bold text-gray-900">Safety Issue Review</h2>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(issue.status)}`}>
                {issue.status.replace('_', ' ')}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(issue.priority)}`}>
                {issue.priority} PRIORITY
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getIssueTypeColor(issue.issueType)}`}>
                {issue.issueType.replace('_', ' ')}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Issue Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">{issue.title}</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{issue.description}</p>
          </div>

          {/* Equipment Information */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <WrenchScrewdriverIcon className="h-5 w-5" />
                  Equipment Information
                </h4>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="font-medium text-blue-800 inline">Name: </dt>
                    <dd className="inline text-blue-900">{issue.equipment.name}</dd>
                  </div>
                  {issue.equipment.category && (
                    <div>
                      <dt className="font-medium text-blue-800 inline">Category: </dt>
                      <dd className="inline text-blue-900">{issue.equipment.category}</dd>
                    </div>
                  )}
                  {issue.equipment.serialNumber && (
                    <div>
                      <dt className="font-medium text-blue-800 inline">Serial #: </dt>
                      <dd className="inline text-blue-900">{issue.equipment.serialNumber}</dd>
                    </div>
                  )}
                  {issue.equipment.zone && (
                    <div>
                      <dt className="font-medium text-blue-800 inline">Zone: </dt>
                      <dd className="inline text-blue-900">{issue.equipment.zone.name}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="font-medium text-blue-800 inline">Condition: </dt>
                    <dd className="inline text-blue-900">{issue.equipment.condition}</dd>
                  </div>
                </dl>
              </div>
              {issue.equipment.photoUrl && (
                <img
                  src={issue.equipment.photoUrl}
                  alt={issue.equipment.name}
                  className="w-24 h-24 object-cover rounded-lg border-2 border-blue-200 ml-4"
                />
              )}
            </div>
            <button
              onClick={handleNavigateToEquipment}
              className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View Full Equipment Details →
            </button>
          </div>

          {/* Reporter Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                Reported By
              </h4>
              <p className="text-sm text-gray-700">{issue.reportedBy}</p>
              {issue.reportedByEmail && (
                <p className="text-xs text-gray-600 mt-1">{issue.reportedByEmail}</p>
              )}
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Reported Date
              </h4>
              <p className="text-sm text-gray-700">{formatDate(issue.createdAt)}</p>
              <p className="text-xs text-gray-600 mt-1">Last updated: {formatDate(issue.updatedAt)}</p>
            </div>
          </div>

          {/* Photos */}
          {photoArray.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <PhotoIcon className="h-5 w-5" />
                Attached Photos ({photoArray.length})
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {photoArray.map((photo: string, idx: number) => (
                  <img
                    key={idx}
                    src={photo}
                    alt={`Issue photo ${idx + 1}`}
                    className="w-full h-40 object-cover rounded-lg border-2 border-gray-200 cursor-pointer hover:border-indigo-500 transition-colors"
                    onClick={() => window.open(photo, '_blank')}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Resolution Information */}
          {issue.resolvedAt && (
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-green-900 mb-2 flex items-center gap-2">
                <CheckCircleIcon className="h-5 w-5" />
                Resolution
              </h4>
              <p className="text-sm text-green-800">
                Resolved by {issue.resolvedBy} on {formatDate(issue.resolvedAt)}
              </p>
              {issue.resolutionNotes && (
                <p className="text-sm text-green-700 mt-2 whitespace-pre-wrap">
                  {issue.resolutionNotes}
                </p>
              )}
            </div>
          )}

          {/* Update Status/Priority */}
          {!issue.resolvedAt && (
            <div className="bg-indigo-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-indigo-900 mb-3">Update Issue</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-indigo-800 mb-2">Status</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full border border-indigo-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-indigo-800 mb-2">Priority</label>
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="w-full border border-indigo-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-indigo-800 mb-2">Issue Type</label>
                  <select
                    value={selectedIssueType}
                    onChange={(e) => setSelectedIssueType(e.target.value)}
                    className="w-full border border-indigo-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="CRITICAL">Critical - Immediate Safety Concern</option>
                    <option value="NON_CRITICAL">Non-Critical - Needs Attention</option>
                    <option value="NON_CONFORMANCE">Non-Conformance</option>
                    <option value="RECOMMENDATION">Recommendation</option>
                    <option value="INFORMATIONAL">Informational</option>
                  </select>
                </div>
              </div>
              {(selectedStatus !== issue.status || selectedPriority !== issue.priority || selectedIssueType !== issue.issueType) && (
                <button
                  onClick={handleUpdateStatus}
                  disabled={actionInProgress}
                  className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  Update Issue
                </button>
              )}
            </div>
          )}

          {/* Resolve Form */}
          {!issue.resolvedAt && !showResolveForm && (
            <button
              onClick={() => setShowResolveForm(true)}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center justify-center gap-2"
            >
              <CheckCircleIcon className="h-5 w-5" />
              Mark as Resolved
            </button>
          )}

          {showResolveForm && (
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-green-900 mb-3">Resolution Details</h4>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Enter resolution notes (required)"
                className="w-full border border-green-300 rounded-lg px-3 py-2 min-h-[100px] focus:ring-2 focus:ring-green-500"
                required
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleResolve}
                  disabled={!resolutionNotes.trim() || actionInProgress}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Confirm Resolution
                </button>
                <button
                  onClick={() => setShowResolveForm(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 p-6 bg-gray-50 flex flex-wrap gap-3">
          <button
            onClick={handleRequestQuote}
            className="flex-1 min-w-[200px] px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <DocumentTextIcon className="h-5 w-5" />
            Request Repair Quote
          </button>
          <button
            onClick={handleScheduleMaintenance}
            className="flex-1 min-w-[200px] px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
          >
            <ClockIcon className="h-5 w-5" />
            Schedule Maintenance
          </button>
          <button
            onClick={handleNavigateToEquipment}
            className="flex-1 min-w-[200px] px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2"
          >
            <WrenchScrewdriverIcon className="h-5 w-5" />
            View Equipment Page
          </button>
        </div>
      </div>
    </div>
  );
}

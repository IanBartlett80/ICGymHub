'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface StatusHistoryEntry {
  status: string;
  timestamp: string;
  actor: string;
  notes: string;
}

interface QuoteRequest {
  id: string;
  requestReference: string | null;
  status: string;
  urgency: string;
  issueDescription: string;
  contactPerson: string;
  contactPhone: string | null;
  contactEmail: string | null;
  additionalNotes: string | null;
  specialRequirements: string | null;
  estimatedBudget: string | null;
  preferredRepairDate: string | null;
  quoteAmount: string | null;
  quoteNotes: string | null;
  quoteReceivedFrom: string | null;
  repairCompanyName: string | null;
  icbNotes: string | null;
  icbAcknowledgedAt: string | null;
  icbAcknowledgedBy: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  approvalNotes: string | null;
  rejectedByName: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  repairCompletedAt: string | null;
  finalCost: string | null;
  completionNotes: string | null;
  warrantyInfo: string | null;
  emailSent: boolean;
  createdAt: string;
  statusHistory: StatusHistoryEntry[];
  photos: string[];
  equipment: {
    id: string;
    name: string;
    category: string | null;
    serialNumber: string | null;
    location: string | null;
    zone: { name: string } | null;
  };
  club: { name: string };
  requestedBy: { fullName: string; email: string };
  safetyIssue: {
    title: string;
    issueType: string;
    priority: string;
    description: string;
    photos: string | null;
  } | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Pending', color: '#92400e', bg: '#fef3c7' },
  ACKNOWLEDGED: { label: 'Acknowledged', color: '#1e40af', bg: '#dbeafe' },
  QUOTING: { label: 'Sourcing Quotes', color: '#6d28d9', bg: '#ede9fe' },
  QUOTE_RECEIVED: { label: 'Quote Submitted', color: '#059669', bg: '#d1fae5' },
  APPROVED: { label: 'Approved by Club', color: '#047857', bg: '#a7f3d0' },
  REJECTED: { label: 'Rejected by Club', color: '#dc2626', bg: '#fee2e2' },
  COMPLETED: { label: 'Completed', color: '#7c3aed', bg: '#ede9fe' },
  CANCELLED: { label: 'Cancelled', color: '#6b7280', bg: '#f3f4f6' },
};

const URGENCY_COLORS: Record<string, string> = {
  LOW: '#22c55e',
  MEDIUM: '#eab308',
  HIGH: '#f97316',
  CRITICAL: '#ef4444',
};

export default function QuoteManagePage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<QuoteRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  // Form states
  const [ackName, setAckName] = useState('');
  const [ackNotes, setAckNotes] = useState('');
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [repairCompanyName, setRepairCompanyName] = useState('');
  const [icbNotes, setIcbNotes] = useState('');
  const [finalCost, setFinalCost] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [warrantyInfo, setWarrantyInfo] = useState('');

  useEffect(() => {
    loadData();
  }, [token]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/quote-manage/${token}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to load');
      }
      const result = await res.json();
      setData(result);
      setIcbNotes(result.icbNotes || '');
    } catch (err: any) {
      setError(err.message || 'Request not found or invalid link');
    } finally {
      setLoading(false);
    }
  };

  const performAction = async (action: string, body: Record<string, any>) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/quote-manage/${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...body }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Action failed');
      }
      const updated = await res.json();
      setData(updated);
      setActiveAction(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading quote request...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">{error || 'This link is invalid or has expired.'}</p>
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[data.status] || STATUS_LABELS.PENDING;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">ICB Solutions</h1>
                <span className="text-sm text-gray-400">|</span>
                <span className="text-sm text-gray-500">Quote Management Portal</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Reference: <strong>{data.requestReference || data.id.slice(0, 8)}</strong>
              </p>
            </div>
            <div
              className="px-4 py-2 rounded-full font-semibold text-sm"
              style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}
            >
              {statusInfo.label}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Status Timeline */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Workflow Timeline</h2>
          <div className="space-y-4">
            {data.statusHistory.map((entry, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor:
                        STATUS_LABELS[entry.status]?.color || '#6b7280',
                    }}
                  ></div>
                  {index < data.statusHistory.length - 1 && (
                    <div className="w-0.5 flex-1 bg-gray-200 mt-1"></div>
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {STATUS_LABELS[entry.status]?.label || entry.status}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{entry.actor}</p>
                  {entry.notes && (
                    <p className="text-sm text-gray-500 mt-1">{entry.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Request Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Club & Equipment Info */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Club Details
              </h3>
              <p className="text-lg font-semibold text-gray-900">{data.club.name}</p>
              <p className="text-sm text-gray-600">
                Requested by: {data.requestedBy.fullName} ({data.requestedBy.email})
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Submitted: {new Date(data.createdAt).toLocaleDateString()}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Equipment
              </h3>
              <p className="text-lg font-semibold text-gray-900">{data.equipment.name}</p>
              <div className="mt-2 space-y-1 text-sm text-gray-600">
                {data.equipment.category && <p>Category: {data.equipment.category}</p>}
                {data.equipment.serialNumber && <p>Serial: {data.equipment.serialNumber}</p>}
                {data.equipment.zone && <p>Zone: {data.equipment.zone.name}</p>}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Contact for Repair
              </h3>
              <p className="font-medium text-gray-900">{data.contactPerson}</p>
              {data.contactPhone && (
                <p className="text-sm text-gray-600">📞 {data.contactPhone}</p>
              )}
              {data.contactEmail && (
                <p className="text-sm text-gray-600">✉️ {data.contactEmail}</p>
              )}
            </div>
          </div>

          {/* Right: Issue & Requirements */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  Issue Details
                </h3>
                <span
                  className="px-3 py-1 text-xs font-semibold rounded-full text-white"
                  style={{ backgroundColor: URGENCY_COLORS[data.urgency] || '#6b7280' }}
                >
                  {data.urgency}
                </span>
              </div>
              <p className="text-gray-900 whitespace-pre-wrap">{data.issueDescription}</p>
              {data.preferredRepairDate && (
                <p className="text-sm text-gray-600 mt-3">
                  Preferred Date: {new Date(data.preferredRepairDate).toLocaleDateString()}
                </p>
              )}
              {data.estimatedBudget && (
                <p className="text-sm text-gray-600">Budget: {data.estimatedBudget}</p>
              )}
            </div>

            {data.safetyIssue && (
              <div className="bg-red-50 rounded-lg border border-red-200 p-6">
                <h3 className="text-sm font-semibold text-red-700 uppercase tracking-wider mb-2">
                  Linked Safety Issue
                </h3>
                <p className="font-medium text-red-900">{data.safetyIssue.title}</p>
                <p className="text-sm text-red-700 mt-1">
                  Type: {data.safetyIssue.issueType} | Priority: {data.safetyIssue.priority}
                </p>
                <p className="text-sm text-red-800 mt-2">{data.safetyIssue.description}</p>
              </div>
            )}

            {(data.additionalNotes || data.specialRequirements) && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                {data.additionalNotes && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Additional Notes</h4>
                    <p className="text-sm text-gray-900">{data.additionalNotes}</p>
                  </div>
                )}
                {data.specialRequirements && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Special Requirements</h4>
                    <p className="text-sm text-gray-900">{data.specialRequirements}</p>
                  </div>
                )}
              </div>
            )}

            {/* Photos */}
            {Array.isArray(data.photos) && data.photos.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Photos ({data.photos.length})
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {data.photos.map((photo, i) => (
                    <img
                      key={i}
                      src={photo}
                      alt={`Issue photo ${i + 1}`}
                      className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-80"
                      onClick={() => window.open(photo, '_blank')}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quote Info (if submitted) */}
        {data.quoteAmount && (
          <div className="bg-green-50 rounded-lg shadow-sm border border-green-200 p-6">
            <h3 className="text-sm font-semibold text-green-700 uppercase tracking-wider mb-3">
              Current Quote
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-green-600">Amount</p>
                <p className="text-2xl font-bold text-green-900">${data.quoteAmount}</p>
              </div>
              {data.repairCompanyName && (
                <div>
                  <p className="text-sm text-green-600">Repair Company</p>
                  <p className="font-medium text-green-900">{data.repairCompanyName}</p>
                </div>
              )}
              {data.quoteReceivedAt && (
                <div>
                  <p className="text-sm text-green-600">Quote Date</p>
                  <p className="font-medium text-green-900">
                    {new Date(data.quoteReceivedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-green-600">Club Decision</p>
                <p className="font-medium text-green-900">
                  {data.status === 'APPROVED'
                    ? `✅ Approved${data.approvedByName ? ` by ${data.approvedByName}` : ''}`
                    : data.status === 'REJECTED'
                    ? `❌ Rejected${data.rejectedByName ? ` by ${data.rejectedByName}` : ''}`
                    : '⏳ Awaiting decision'}
                </p>
              </div>
            </div>
            {data.quoteNotes && (
              <p className="text-sm text-green-800 mt-3">
                <strong>Quote Notes:</strong> {data.quoteNotes}
              </p>
            )}
            {data.rejectionReason && (
              <div className="mt-3 bg-red-50 border border-red-200 rounded p-3">
                <p className="text-sm text-red-800">
                  <strong>Rejection Reason:</strong> {data.rejectionReason}
                </p>
              </div>
            )}
            {data.approvalNotes && (
              <p className="text-sm text-green-800 mt-2">
                <strong>Approval Notes:</strong> {data.approvalNotes}
              </p>
            )}
          </div>
        )}

        {/* Completion Info */}
        {data.status === 'COMPLETED' && (
          <div className="bg-purple-50 rounded-lg shadow-sm border border-purple-200 p-6">
            <h3 className="text-sm font-semibold text-purple-700 uppercase tracking-wider mb-3">
              Repair Completed
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {data.finalCost && (
                <div>
                  <p className="text-sm text-purple-600">Final Cost</p>
                  <p className="text-xl font-bold text-purple-900">${data.finalCost}</p>
                </div>
              )}
              {data.repairCompletedAt && (
                <div>
                  <p className="text-sm text-purple-600">Completed</p>
                  <p className="font-medium text-purple-900">
                    {new Date(data.repairCompletedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
            {data.completionNotes && (
              <p className="text-sm text-purple-800 mt-3">{data.completionNotes}</p>
            )}
            {data.warrantyInfo && (
              <p className="text-sm text-purple-800 mt-1">
                <strong>Warranty:</strong> {data.warrantyInfo}
              </p>
            )}
          </div>
        )}

        {/* ICB Notes */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            ICB Internal Notes
          </h3>
          <textarea
            value={icbNotes}
            onChange={(e) => setIcbNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="Add internal notes for this request..."
          />
          <button
            onClick={() => performAction('add_notes', { icbNotes })}
            disabled={submitting}
            className="mt-2 px-4 py-2 bg-gray-600 text-white rounded-md text-sm hover:bg-gray-700 disabled:opacity-50"
          >
            Save Notes
          </button>
        </div>

        {/* Action Buttons based on current status */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Actions
          </h3>

          {/* Acknowledge Action */}
          {data.status === 'PENDING' && (
            <div className="space-y-4">
              {activeAction !== 'acknowledge' ? (
                <button
                  onClick={() => setActiveAction('acknowledge')}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  ✓ Acknowledge This Request
                </button>
              ) : (
                <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                  <h4 className="font-semibold text-blue-900 mb-3">Acknowledge Request</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Your Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={ackName}
                        onChange={(e) => setAckName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="e.g. Ian Bartlett"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes to Club (optional)
                      </label>
                      <textarea
                        value={ackNotes}
                        onChange={(e) => setAckNotes(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="e.g. We will source quotes this week..."
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() =>
                          performAction('acknowledge', {
                            acknowledgedBy: ackName,
                            notes: ackNotes,
                          })
                        }
                        disabled={submitting || !ackName.trim()}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
                      >
                        {submitting ? 'Processing...' : 'Confirm Acknowledgement'}
                      </button>
                      <button
                        onClick={() => setActiveAction(null)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submit Quote Action */}
          {(data.status === 'ACKNOWLEDGED' || data.status === 'QUOTING') && (
            <div className="space-y-4">
              {activeAction !== 'submit_quote' ? (
                <button
                  onClick={() => setActiveAction('submit_quote')}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                >
                  💰 Submit Quote to Club
                </button>
              ) : (
                <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                  <h4 className="font-semibold text-green-900 mb-3">Submit Repair Quote</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quote Amount ($) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={quoteAmount}
                        onChange={(e) => setQuoteAmount(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="e.g. 1500.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Repair Company Name
                      </label>
                      <input
                        type="text"
                        value={repairCompanyName}
                        onChange={(e) => setRepairCompanyName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="Name of the repair company"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quote Notes
                      </label>
                      <textarea
                        value={quoteNotes}
                        onChange={(e) => setQuoteNotes(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="Scope of work, timeline, included parts, etc."
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() =>
                          performAction('submit_quote', {
                            quoteAmount,
                            quoteNotes,
                            repairCompanyName,
                            icbNotes,
                          })
                        }
                        disabled={submitting || !quoteAmount}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 disabled:opacity-50"
                      >
                        {submitting ? 'Submitting...' : 'Submit Quote'}
                      </button>
                      <button
                        onClick={() => setActiveAction(null)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Re-quote (after rejection) */}
          {data.status === 'REJECTED' && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-red-800">
                  <strong>Club rejected the previous quote.</strong>
                  {data.rejectionReason && (
                    <span> Reason: {data.rejectionReason}</span>
                  )}
                </p>
              </div>
              {activeAction !== 'update_quote' ? (
                <button
                  onClick={() => setActiveAction('update_quote')}
                  className="w-full px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors"
                >
                  🔄 Submit Revised Quote
                </button>
              ) : (
                <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                  <h4 className="font-semibold text-orange-900 mb-3">Submit Revised Quote</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        New Quote Amount ($) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={quoteAmount}
                        onChange={(e) => setQuoteAmount(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="e.g. 1200.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Repair Company
                      </label>
                      <input
                        type="text"
                        value={repairCompanyName}
                        onChange={(e) => setRepairCompanyName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        defaultValue={data.repairCompanyName || ''}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Updated Notes
                      </label>
                      <textarea
                        value={quoteNotes}
                        onChange={(e) => setQuoteNotes(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="What changed, updated scope, etc."
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() =>
                          performAction('update_quote', {
                            quoteAmount,
                            quoteNotes,
                            repairCompanyName,
                          })
                        }
                        disabled={submitting || !quoteAmount}
                        className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md font-medium hover:bg-orange-700 disabled:opacity-50"
                      >
                        {submitting ? 'Submitting...' : 'Submit Revised Quote'}
                      </button>
                      <button
                        onClick={() => setActiveAction(null)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mark Completed (after approval) */}
          {data.status === 'APPROVED' && (
            <div className="space-y-4">
              {activeAction !== 'mark_completed' ? (
                <button
                  onClick={() => setActiveAction('mark_completed')}
                  className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                >
                  ✅ Mark Repair as Completed
                </button>
              ) : (
                <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                  <h4 className="font-semibold text-purple-900 mb-3">Complete Repair</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Final Cost ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={finalCost}
                        onChange={(e) => setFinalCost(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder={data.quoteAmount || 'Final repair cost'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Completion Notes
                      </label>
                      <textarea
                        value={completionNotes}
                        onChange={(e) => setCompletionNotes(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="Work performed, parts replaced, etc."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Warranty Information
                      </label>
                      <input
                        type="text"
                        value={warrantyInfo}
                        onChange={(e) => setWarrantyInfo(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="e.g. 12-month parts warranty"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() =>
                          performAction('mark_completed', {
                            finalCost: finalCost || data.quoteAmount,
                            completionNotes,
                            warrantyInfo,
                          })
                        }
                        disabled={submitting}
                        className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md font-medium hover:bg-purple-700 disabled:opacity-50"
                      >
                        {submitting ? 'Completing...' : 'Confirm Completion'}
                      </button>
                      <button
                        onClick={() => setActiveAction(null)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quote is waiting for club decision */}
          {data.status === 'QUOTE_RECEIVED' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <p className="text-blue-800 font-medium">
                ⏳ Quote has been submitted. Waiting for club to approve or reject.
              </p>
            </div>
          )}

          {/* Completed state */}
          {data.status === 'COMPLETED' && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
              <p className="text-purple-800 font-medium">
                ✅ This repair has been completed. No further actions required.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t mt-12">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center">
          <p className="text-sm text-gray-400">
            ICB Solutions Quote Management Portal &bull; Powered by ICGymHub &bull; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}

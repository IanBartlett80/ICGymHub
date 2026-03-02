'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ExclamationTriangleIcon, CubeIcon } from '@heroicons/react/24/outline';

interface Zone {
  id: string;
  name: string;
  description: string | null;
  club: {
    name: string;
  };
}

interface Equipment {
  id: string;
  name: string;
  category: string | null;
  condition: string;
  photoUrl: string | null;
  serialNumber: string | null;
}

export default function PublicZoneReportPage() {
  const params = useParams();
  const publicId = params.publicId as string;

  const [zone, setZone] = useState<Zone | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    issueType: 'CRITICAL',
    title: '',
    description: '',
    reportedBy: '',
    reportedByEmail: '',
  });

  useEffect(() => {
    loadData();
  }, [publicId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/public/zone/${publicId}`);
      
      if (!response.ok) {
        throw new Error('Zone not found');
      }

      const data = await response.json();
      setZone(data.zone);
      setEquipment(data.equipment);
    } catch (error) {
      console.error('Failed to load zone data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEquipmentSelect = (item: Equipment) => {
    setSelectedEquipment(item);
    setFormData({
      ...formData,
      title: `Issue with ${item.name}`,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEquipment) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/public/zone/${publicId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipmentId: selectedEquipment.id,
          ...formData,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit report');
      }

      setSubmitted(true);
      setFormData({
        issueType: 'CRITICAL',
        title: '',
        description: '',
        reportedBy: '',
        reportedByEmail: '',
      });
    } catch (error) {
      console.error('Failed to submit report:', error);
      alert('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'Excellent': return 'bg-green-100 text-green-800';
      case 'Good': return 'bg-blue-100 text-blue-800';
      case 'Fair': return 'bg-yellow-100 text-yellow-800';
      case 'Poor': return 'bg-orange-100 text-orange-800';
      case 'Out of Service': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!zone) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Zone Not Found</h1>
          <p className="text-gray-600">This QR code may be invalid or expired.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Report Submitted</h2>
          <p className="text-gray-600 mb-6">
            Thank you for reporting this issue. The maintenance team will review it shortly.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setShowForm(false);
              setSelectedEquipment(null);
            }}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Report Another Issue
          </button>
        </div>
      </div>
    );
  }

  if (showForm && selectedEquipment) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">{zone.club.name}</h1>
              <p className="text-gray-600">{zone.name}</p>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start space-x-4">
                {selectedEquipment.photoUrl && (
                  <img
                    src={selectedEquipment.photoUrl}
                    alt={selectedEquipment.name}
                    className="w-24 h-24 object-cover rounded"
                  />
                )}
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedEquipment.name}</h3>
                  <p className="text-sm text-gray-600">{selectedEquipment.category || 'Uncategorized'}</p>
                  {selectedEquipment.serialNumber && (
                    <p className="text-xs text-gray-500 mt-1">S/N: {selectedEquipment.serialNumber}</p>
                  )}
                  <span className={`inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full ${getConditionColor(selectedEquipment.condition)}`}>
                    {selectedEquipment.condition}
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Issue Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.issueType}
                  onChange={(e) => setFormData({ ...formData, issueType: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="CRITICAL">Critical - Immediate Safety Concern</option>
                  <option value="NON_CRITICAL">Non-Critical - Needs Attention</option>
                  <option value="NON_CONFORMANCE">Non-Conformance</option>
                  <option value="RECOMMENDATION">Recommendation</option>
                  <option value="INFORMATIONAL">Informational</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Issue Summary <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Brief description of the issue"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Detailed Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Please provide detailed information about the defect or issue..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.reportedBy}
                  onChange={(e) => setFormData({ ...formData, reportedBy: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.reportedByEmail}
                  onChange={(e) => setFormData({ ...formData, reportedByEmail: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="your.email@example.com"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setSelectedEquipment(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center space-x-3 mb-2">
            <CubeIcon className="h-8 w-8 text-indigo-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{zone.club.name}</h1>
              <p className="text-lg text-gray-600">{zone.name}</p>
            </div>
          </div>
          {zone.description && (
            <p className="text-gray-600 mt-2">{zone.description}</p>
          )}
          
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <ExclamationTriangleIcon className="h-6 w-6 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900">Report Equipment Issues</h3>
                <p className="text-sm text-blue-700 mt-1">
                  If you notice any equipment defects or safety concerns, please select the equipment below and submit a report.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {equipment.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500">No equipment found in this zone</p>
            </div>
          ) : (
            equipment.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-4 cursor-pointer"
                onClick={() => handleEquipmentSelect(item)}
              >
                {item.photoUrl && (
                  <img
                    src={item.photoUrl}
                    alt={item.name}
                    className="w-full h-48 object-cover rounded-lg mb-4"
                  />
                )}
                <h3 className="font-semibold text-gray-900">{item.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{item.category || 'Uncategorized'}</p>
                {item.serialNumber && (
                  <p className="text-xs text-gray-500 mt-1">S/N: {item.serialNumber}</p>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getConditionColor(item.condition)}`}>
                    {item.condition}
                  </span>
                  <button className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                    Report Issue →
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

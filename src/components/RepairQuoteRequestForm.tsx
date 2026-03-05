'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface SafetyIssue {
  id: string;
  title: string;
  description: string;
  issueType: string;
  photos?: string | null;
}

interface Equipment {
  id: string;
  name: string;
  category: string | null;
  serialNumber: string | null;
  zone?: {
    name: string;
  } | null;
}

interface RepairQuoteRequestFormProps {
  equipment: Equipment;
  safetyIssue?: SafetyIssue;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RepairQuoteRequestForm({
  equipment,
  safetyIssue,
  onClose,
  onSuccess,
}: RepairQuoteRequestFormProps) {
  const [formData, setFormData] = useState({
    issueDescription: safetyIssue?.description || '',
    urgency: 'MEDIUM',
    preferredRepairDate: '',
    estimatedBudget: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
    additionalNotes: '',
    specialRequirements: '',
  });

  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Load user data for contact fields
    const userData = localStorage.getItem('userData');
    if (userData) {
      const user = JSON.parse(userData);
      setFormData((prev) => ({
        ...prev,
        contactPerson: user.fullName || '',
        contactEmail: user.email || '',
      }));
    }

    // Load photos from safety issue if available
    if (safetyIssue?.photos) {
      try {
        const parsedPhotos = JSON.parse(safetyIssue.photos);
        if (Array.isArray(parsedPhotos)) {
          setPhotos(parsedPhotos);
        }
      } catch (error) {
        console.error('Failed to parse safety issue photos:', error);
      }
    }
  }, [safetyIssue]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const maxPhotos = 10;
    const availableSlots = maxPhotos - photos.length;
    
    if (files.length > availableSlots) {
      alert(`You can upload up to ${maxPhotos} photos total. You have ${availableSlots} slot(s) remaining.`);
      return;
    }

    const newPhotos: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (!file.type.startsWith('image/')) {
        alert('Please select only image files');
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert(`Image ${file.name} is too large. Maximum size is 5MB.`);
        continue;
      }

      const reader = new FileReader();
      await new Promise((resolve) => {
        reader.onloadend = () => {
          if (reader.result) {
            newPhotos.push(reader.result as string);
          }
          resolve(null);
        };
        reader.readAsDataURL(file);
      });
    }

    setPhotos([...photos, ...newPhotos]);
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/repair-quote-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          equipmentId: equipment.id,
          safetyIssueId: safetyIssue?.id || null,
          ...formData,
          photos: photos.length > 0 ? photos : null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit request');
      }

      onSuccess();
    } catch (error) {
      console.error('Failed to submit repair quote request:', error);
      alert(error instanceof Error ? error.message : 'Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flexjustify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Request Repair Quote</h2>
            <p className="text-sm text-gray-600 mt-1">
              Equipment: {equipment.name} {equipment.zone ? `(${equipment.zone.name})` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Equipment Details (Read-only) */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Equipment Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Name:</span>
                <span className="ml-2 font-medium">{equipment.name}</span>
              </div>
              <div>
                <span className="text-gray-600">Category:</span>
                <span className="ml-2 font-medium">{equipment.category || 'N/A'}</span>
              </div>
              {equipment.serialNumber && (
                <div>
                  <span className="text-gray-600">Serial Number:</span>
                  <span className="ml-2 font-medium">{equipment.serialNumber}</span>
                </div>
              )}
              {equipment.zone && (
                <div>
                  <span className="text-gray-600">Location:</span>
                  <span className="ml-2 font-medium">{equipment.zone.name}</span>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Venue will be auto-assigned from the selected equipment
            </p>
          </div>

          {/* Issue Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Issue Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.issueDescription}
              onChange={(e) => setFormData({ ...formData, issueDescription: e.target.value })}
              required
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe the issue that needs repair..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Urgency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Urgency <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.urgency}
                onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="LOW">Low - Can wait</option>
                <option value="MEDIUM">Medium - Within next few weeks</option>
                <option value="HIGH">High - Needs attention soon</option>
                <option value="CRITICAL">Critical - Urgent/Safety issue</option>
              </select>
            </div>

            {/* Preferred Repair Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preferred Repair Date
              </label>
              <input
                type="date"
                value={formData.preferredRepairDate}
                onChange={(e) => setFormData({ ...formData, preferredRepairDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Estimated Budget */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Budget Constraints
            </label>
            <input
              type="text"
              value={formData.estimatedBudget}
              onChange={(e) => setFormData({ ...formData, estimatedBudget: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., $500, Not to exceed $1000, etc."
            />
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Contact Information</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Person <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Full name"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="(123) 456-7890"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="email@example.com"
                />
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Notes
            </label>
            <textarea
              value={formData.additionalNotes}
              onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Any additional information..."
            />
          </div>

          {/* Special Requirements */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Special Requirements or Constraints
            </label>
            <textarea
              value={formData.specialRequirements}
              onChange={(e) => setFormData({ ...formData, specialRequirements: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Access restrictions, specific timing, warranty requirements..."
            />
          </div>

          {/* Photos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Photos {safetyIssue && '(Includes photos from safety issue report)'}
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              disabled={photos.length >= 10}
            />
            <p className="text-xs text-gray-500 mt-1">
              Upload photos of the issue (max 10 photos, 5MB each)
            </p>
            
            {photos.length > 0 && (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {photos.map((photo, index) => (
                  <div key={index} className="relative">
                    <img
                      src={photo}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-24 object-cover rounded border"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Request Quote'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

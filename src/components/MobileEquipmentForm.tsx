'use client';

import { useState, useEffect, useRef } from 'react';
import { XMarkIcon, CameraIcon, PhotoIcon } from '@heroicons/react/24/outline';

interface MobileEquipmentFormProps {
  clubId: string;
  venueId?: string;
  venueName?: string;
  zoneId?: string;
  zoneName?: string;
  onSubmit: () => void;
  onCancel: () => void;
}

interface EquipmentFormData {
  name: string;
  category: string;
  serialNumber: string;
  condition: string;
  photoUrl: string;
}

interface Zone {
  id: string;
  name: string;
}

const conditions = ['Excellent', 'Good', 'Fair', 'Poor', 'Out of Service'];

export default function MobileEquipmentForm({
  clubId,
  venueId,
  venueName,
  zoneId,
  zoneName,
  onSubmit,
  onCancel,
}: MobileEquipmentFormProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loadingZones, setLoadingZones] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState<string>(zoneId || '');
  const [formData, setFormData] = useState<EquipmentFormData>({
    name: '',
    category: '',
    serialNumber: '',
    condition: 'Good',
    photoUrl: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCategories();
    // If we have venueId but no zoneId, load zones for selection
    if (venueId && !zoneId) {
      loadZones();
    }
  }, [clubId, venueId, zoneId]);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await fetch(`/api/public/equipment/categories?clubId=${clubId}`);
      if (response.ok) {
        const data = await response.json();
        const categoryNames = data.categories.map((c: any) => c.name);
        setCategories(categoryNames);
      } else {
        throw new Error('Failed to load categories');
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
      // Use default categories as fallback
      setCategories([
        'Mats',
        'Bars (Uneven, Parallel, Horizontal)',
        'Beams',
        'Vault Equipment',
        'Rings',
        'Trampoline',
        'Floor Equipment',
        'Safety Equipment',
        'Training Aids',
        'Other',
      ]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadZones = async () => {
    if (!venueId) return;
    
    try {
      setLoadingZones(true);
      const response = await fetch(`/api/public/zones?venueId=${venueId}`);
      if (response.ok) {
        const data = await response.json();
        setZones(data.zones);
      }
    } catch (error) {
      console.error('Failed to load zones:', error);
    } finally {
      setLoadingZones(false);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Equipment name is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    // If adding from venue level (no zoneId), require zone selection
    if (venueId && !zoneId && !selectedZoneId) {
      newErrors.zone = 'Please select a zone';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof EquipmentFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, photo: 'Please select an image file' }));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, photo: 'Image must be less than 5MB' }));
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setFormData(prev => ({ ...prev, photoUrl: base64String }));
      setPhotoPreview(base64String);
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.photo;
        return newErrors;
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setFormData(prev => ({ ...prev, photoUrl: '' }));
    setPhotoPreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/public/equipment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clubId,
          venueId: venueId || null,
          zoneId: zoneId || selectedZoneId || null,
          ...formData,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add equipment');
      }

      onSubmit();
    } catch (error) {
      console.error('Failed to add equipment:', error);
      alert(error instanceof Error ? error.message : 'Failed to add equipment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg my-8">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center rounded-t-lg">
          <h2 className="text-lg font-semibold text-gray-900">Add Equipment</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
            disabled={isSubmitting}
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Location Info */}
          {(venueName || zoneName) && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
              <p className="text-sm font-medium text-indigo-900">Location</p>
              {venueName && (
                <p className="text-sm text-indigo-700">Venue: {venueName}</p>
              )}
              {zoneName && (
                <p className="text-sm text-indigo-700">Zone: {zoneName}</p>
              )}
            </div>
          )}

          {/* Zone Selector - Only show if venueId exists but zoneId doesn't */}
          {venueId && !zoneId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zone <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedZoneId}
                onChange={(e) => {
                  setSelectedZoneId(e.target.value);
                  if (errors.zone) {
                    setErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.zone;
                      return newErrors;
                    });
                  }
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors.zone ? 'border-red-300' : 'border-gray-300'}`}
                disabled={loadingZones || isSubmitting}
              >
                <option value="">{loadingZones ? 'Loading zones...' : 'Select a zone...'}</option>
                {zones.map(zone => (
                  <option key={zone.id} value={zone.id}>{zone.name}</option>
                ))}
              </select>
              {errors.zone && <p className="mt-1 text-sm text-red-600">{errors.zone}</p>}
            </div>
          )}

          {/* Equipment Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Equipment Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors.name ? 'border-red-300' : 'border-gray-300'}`}
              placeholder="e.g., Balance Beam #3"
              disabled={isSubmitting}
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors.category ? 'border-red-300' : 'border-gray-300'}`}
              disabled={loadingCategories || isSubmitting}
            >
              <option value="">{loadingCategories ? 'Loading...' : 'Select category...'}</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
          </div>

          {/* Serial Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Serial Number (Optional)
            </label>
            <input
              type="text"
              value={formData.serialNumber}
              onChange={(e) => handleChange('serialNumber', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="e.g., BB-2024-001"
              disabled={isSubmitting}
            />
          </div>

          {/* Condition */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Condition <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.condition}
              onChange={(e) => handleChange('condition', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={isSubmitting}
            >
              {conditions.map(cond => (
                <option key={cond} value={cond}>{cond}</option>
              ))}
            </select>
          </div>

          {/* Photo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photo (Optional)
            </label>
            {photoPreview ? (
              <div className="relative inline-block">
                <img
                  src={photoPreview}
                  alt="Equipment preview"
                  className="w-full max-h-48 object-contain rounded-lg border-2 border-gray-300"
                />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                  disabled={isSubmitting}
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                  disabled={isSubmitting}
                >
                  <CameraIcon className="w-5 h-5" />
                  <span className="text-sm font-medium">Take Photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                  disabled={isSubmitting}
                >
                  <PhotoIcon className="w-5 h-5" />
                  <span className="text-sm font-medium">Upload Photo</span>
                </button>
              </div>
            )}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
              className="hidden"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
            {errors.photo && <p className="mt-1 text-sm text-red-600">{errors.photo}</p>}
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add Equipment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

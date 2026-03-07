'use client';

import { Equipment, Zone } from '@prisma/client';
import { useState, useEffect } from 'react';
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
import VenueSelector from './VenueSelector';

interface EquipmentFormData {
  name: string;
  category: string;
  serialNumber?: string;
  purchaseDate?: string;
  purchaseCost?: string;
  condition: string;
  location?: string;
  venueId?: string;
  zoneId?: string;
  lastMaintenance?: string;
  nextMaintenance?: string;
  maintenanceNotes?: string;
  photoUrl?: string;
}

interface EquipmentFormProps {
  equipment?: Equipment | null;
  zones: Zone[];
  onSubmit: (data: EquipmentFormData) => Promise<void>;
  onCancel: () => void;
}

const conditions = ['Excellent', 'Good', 'Fair', 'Poor', 'Out of Service'];

export default function EquipmentForm({ equipment, zones, onSubmit, onCancel }: EquipmentFormProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [formData, setFormData] = useState<EquipmentFormData>({
    name: equipment?.name || '',
    category: equipment?.category || '',
    serialNumber: equipment?.serialNumber || '',
    purchaseDate: equipment?.purchaseDate ? new Date(equipment.purchaseDate).toISOString().split('T')[0] : '',
    purchaseCost: equipment?.purchaseCost || '',
    condition: equipment?.condition || 'Good',
    location: equipment?.location || '',
    venueId: (equipment as any)?.venueId || '',
    zoneId: equipment?.zoneId || '',
    lastMaintenance: equipment?.lastMaintenance ? new Date(equipment.lastMaintenance).toISOString().split('T')[0] : '',
    nextMaintenance: equipment?.nextMaintenance ? new Date(equipment.nextMaintenance).toISOString().split('T')[0] : '',
    maintenanceNotes: equipment?.maintenanceNotes || '',
    photoUrl: equipment?.photoUrl || '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photoPreview, setPhotoPreview] = useState<string>(equipment?.photoUrl || '');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await fetch('/api/equipment/categories');
      if (response.ok) {
        const data = await response.json();
        const categoryNames = data.categories.map((c: any) => c.name);
        setCategories(categoryNames);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      setErrors(prev => ({ ...prev, newCategory: 'Category name is required' }));
      return;
    }

    try {
      setCreatingCategory(true);
      const response = await fetch('/api/equipment/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        setErrors(prev => ({ ...prev, newCategory: data.error || 'Failed to create category' }));
        return;
      }

      const category = await response.json();
      setCategories(prev => [...prev, category.name]);
      setFormData(prev => ({ ...prev, category: category.name }));
      setNewCategoryName('');
      setShowNewCategoryInput(false);
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.newCategory;
        delete newErrors.category;
        return newErrors;
      });
    } catch (error) {
      console.error('Failed to create category:', error);
      setErrors(prev => ({ ...prev, newCategory: 'Failed to create category' }));
    } finally {
      setCreatingCategory(false);
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

    if (formData.purchaseCost && isNaN(parseFloat(formData.purchaseCost))) {
      newErrors.purchaseCost = 'Purchase cost must be a valid number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      // Clear photo error
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
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            {equipment ? 'Edit Equipment' : 'Add New Equipment'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Equipment Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.name ? 'border-red-300' : 'border-gray-300'}`}
                  placeholder="e.g., Competition Balance Beam"
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                {showNewCategoryInput ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => {
                          setNewCategoryName(e.target.value);
                          if (errors.newCategory) {
                            setErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.newCategory;
                              return newErrors;
                            });
                          }
                        }}
                        placeholder="Enter new category name"
                        className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.newCategory ? 'border-red-300' : 'border-gray-300'}`}
                        disabled={creatingCategory}
                      />
                      <button
                        type="button"
                        onClick={handleCreateCategory}
                        disabled={creatingCategory}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {creatingCategory ? 'Adding...' : 'Add'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewCategoryInput(false);
                          setNewCategoryName('');
                          setErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.newCategory;
                            return newErrors;
                          });
                        }}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                    {errors.newCategory && <p className="text-sm text-red-600">{errors.newCategory}</p>}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <select
                      value={formData.category}
                      onChange={(e) => handleChange('category', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.category ? 'border-red-300' : 'border-gray-300'}`}
                      disabled={loadingCategories}
                    >
                      <option value="">{loadingCategories ? 'Loading...' : 'Select category...'}</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNewCategoryInput(true)}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      <PlusIcon className="w-4 h-4" />
                      Add New Category
                    </button>
                    {errors.category && <p className="text-sm text-red-600">{errors.category}</p>}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Serial Number
                </label>
                <input
                  type="text"
                  value={formData.serialNumber}
                  onChange={(e) => handleChange('serialNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., BB-2024-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Condition <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.condition}
                  onChange={(e) => handleChange('condition', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {conditions.map(cond => (
                    <option key={cond} value={cond}>{cond}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Venue
                </label>
                <VenueSelector
                  value={formData.venueId || null}
                  onChange={(venue) => {
                    handleChange('venueId', venue || '');
                    // Clear zone when venue changes
                    if (formData.zoneId) {
                      handleChange('zoneId', '');
                    }
                  }}
                  required={false}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zone
                </label>
                <select
                  value={formData.zoneId}
                  onChange={(e) => handleChange('zoneId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">No zone assigned</option>
                  {zones
                    .filter(zone => !formData.venueId || (zone as any).venueId === formData.venueId)
                    .map(zone => (
                      <option key={zone.id} value={zone.id}>{zone.name}</option>
                    ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Storage Room B, Row 3"
                />
              </div>
            </div>
          </div>

          {/* Photo Upload */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Photo</h3>
            <div className="space-y-4">
              {photoPreview ? (
                <div className="relative inline-block">
                  <img
                    src={photoPreview}
                    alt="Equipment preview"
                    className="w-64 h-64 object-cover rounded-lg border-2 border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <input
                    type="file"
                    id="photo-upload"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="photo-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <svg
                      className="w-12 h-12 text-gray-400 mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="text-sm text-gray-600">Click to upload equipment photo</span>
                    <span className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 5MB</span>
                  </label>
                </div>
              )}
              {errors.photo && <p className="text-sm text-red-600">{errors.photo}</p>}
            </div>
          </div>

          {/* Purchase Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Purchase Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Date
                </label>
                <input
                  type="date"
                  value={formData.purchaseDate}
                  onChange={(e) => handleChange('purchaseDate', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Cost ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.purchaseCost}
                  onChange={(e) => handleChange('purchaseCost', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.purchaseCost ? 'border-red-300' : 'border-gray-300'}`}
                  placeholder="0.00"
                />
                {errors.purchaseCost && <p className="mt-1 text-sm text-red-600">{errors.purchaseCost}</p>}
              </div>
            </div>
          </div>

          {/* Maintenance Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Maintenance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Maintenance
                </label>
                <input
                  type="date"
                  value={formData.lastMaintenance}
                  onChange={(e) => handleChange('lastMaintenance', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Next Maintenance Due
                </label>
                <input
                  type="date"
                  value={formData.nextMaintenance}
                  onChange={(e) => handleChange('nextMaintenance', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maintenance Notes
                </label>
                <textarea
                  value={formData.maintenanceNotes}
                  onChange={(e) => handleChange('maintenanceNotes', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Any special maintenance requirements or notes..."
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : equipment ? 'Update Equipment' : 'Add Equipment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

'use client';

import { useState, useRef } from 'react';
import { XMarkIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import axiosInstance from '@/lib/axios';

interface EquipmentBulkUploadProps {
  onClose: () => void;
  onImportComplete: () => void;
}

export default function EquipmentBulkUpload({ onClose, onImportComplete }: EquipmentBulkUploadProps) {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    message: string;
    imported: number;
    total: number;
    errors?: string[];
  } | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = async () => {
    try {
      const response = await axiosInstance.get('/api/equipment/import/template', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'equipment_import_template.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to download template');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axiosInstance.post('/api/equipment/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setResult(response.data);

      if (response.data.imported > 0) {
        onImportComplete();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to import equipment');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Bulk Upload Equipment</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 overflow-y-auto flex-1 min-h-0 space-y-5">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <InformationCircleIcon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-2">How to bulk upload equipment:</p>
                <ol className="list-decimal ml-4 space-y-1">
                  <li>Download the CSV template below</li>
                  <li>Fill in your equipment data (see field guide below)</li>
                  <li>Save the file and upload it using the Upload button</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Field Guide */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 text-sm">CSV Field Guide</h3>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs font-semibold text-red-600 mb-2 uppercase tracking-wide">Required Fields</p>
              <div className="space-y-1.5 mb-4">
                <FieldDesc name="Equipment Name" desc="Name of the equipment item" required />
                <FieldDesc name="Venue" desc="Must match an existing venue name in your club" required />
              </div>

              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Optional Fields</p>
              <div className="space-y-1.5">
                <FieldDesc name="Category" desc="Equipment category (e.g., Vault, Beam, Bars, Floor, Trampoline)" />
                <FieldDesc name="Supplier" desc="Equipment supplier or manufacturer" />
                <FieldDesc name="Serial Number" desc="Unique serial number (duplicates will be rejected)" />
                <FieldDesc name="Condition" desc="Excellent, Good, Fair, Poor, or Out of Service (defaults to Good)" />
                <FieldDesc name="Purchase Date" desc="Date purchased (YYYY-MM-DD format)" />
                <FieldDesc name="Purchase Cost" desc="Cost of the item (number, e.g., 8500.00)" />
                <FieldDesc name="Installation Date" desc="Date installed (YYYY-MM-DD format)" />
                <FieldDesc name="Warranty Expiry Date" desc="Warranty end date (YYYY-MM-DD format)" />
                <FieldDesc name="End of Life Date" desc="Expected end of life (YYYY-MM-DD format)" />
                <FieldDesc name="Location Notes" desc="Where the equipment is located within the venue" />
                <FieldDesc name="Maintenance Notes" desc="Any maintenance notes or schedules" />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg border border-gray-300 transition-colors"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              Download Template
            </button>

            <label className={`flex items-center justify-center gap-2 px-4 py-3 font-medium rounded-lg transition-colors cursor-pointer ${
              importing
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}>
              <ArrowUpTrayIcon className="w-5 h-5" />
              {importing ? 'Importing...' : 'Upload CSV File'}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                disabled={importing}
              />
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className={`border rounded-lg p-4 ${
              result.imported === result.total
                ? 'bg-green-50 border-green-200'
                : result.imported > 0
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start gap-3">
                {result.imported === result.total ? (
                  <CheckCircleIcon className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <ExclamationTriangleIcon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                    result.imported > 0 ? 'text-yellow-600' : 'text-red-600'
                  }`} />
                )}
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${
                    result.imported === result.total ? 'text-green-800' : result.imported > 0 ? 'text-yellow-800' : 'text-red-800'
                  }`}>
                    {result.message}
                  </p>

                  {result.errors && result.errors.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-red-700 mb-1">Errors:</p>
                      <ul className="text-xs text-red-600 space-y-0.5 max-h-40 overflow-y-auto">
                        {result.errors.map((err, i) => (
                          <li key={i}>• {err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldDesc({ name, desc, required }: { name: string; desc: string; required?: boolean }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className={`font-medium whitespace-nowrap ${required ? 'text-red-700' : 'text-gray-700'}`}>
        {name}{required && ' *'}:
      </span>
      <span className="text-gray-500">{desc}</span>
    </div>
  );
}

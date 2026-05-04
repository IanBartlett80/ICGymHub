'use client';

import { Equipment, Zone, Venue } from '@prisma/client';
import { useState, useEffect, useRef } from 'react';
import EquipmentCard from './EquipmentCard';
import {
  PhotoIcon,
} from '@heroicons/react/24/outline';

interface EquipmentWithRelations extends Equipment {
  zone?: (Zone & { venue?: Venue | null }) | null;
  venue?: Venue | null;
  hasPhoto?: boolean;
  _count?: {
    maintenanceLogs: number;
    usageHistory: number;
    safetyIssues?: number;
  };
}

interface EquipmentListProps {
  equipment: EquipmentWithRelations[];
  viewMode: 'grid' | 'list';
  onEdit: (equipment: EquipmentWithRelations) => void;
  onDelete: (id: string) => void;
  onCheckout?: (id: string) => void;
  onCheckin?: (id: string) => void;
  onViewDetails: (id: string) => void;
}

// Small helper component for lazy-loading a photo thumbnail in the list/table view.
function LazyRowPhoto({
  id,
  hasPhoto,
  inlineUrl,
}: {
  id: string;
  hasPhoto?: boolean;
  inlineUrl?: string | null;
}) {
  const [url, setUrl] = useState<string | null>(inlineUrl || null);
  const [loading, setLoading] = useState(false);
  // ref must be on a wrapper that is ALWAYS rendered so the IntersectionObserver
  // can observe it from the very first render (before loading state changes).
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (url || !hasPhoto) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          observer.disconnect();
          setLoading(true);
          fetch(`/api/equipment/${id}/photo`)
            .then((r) => r.json())
            .then((d) => { if (d.photoUrl) setUrl(d.photoUrl); })
            .catch(() => {})
            .finally(() => setLoading(false));
        }
      },
      { rootMargin: '200px' }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [id, hasPhoto, url]);

  return (
    <div ref={ref} className="w-10 h-10">
      {loading && (
        <div className="w-10 h-10 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
          <PhotoIcon className="w-4 h-4 text-gray-300 animate-pulse" />
        </div>
      )}
      {url && !loading && (
        <img src={url} alt="" className="w-10 h-10 object-cover rounded border border-gray-200" />
      )}
      {!url && !loading && (
        <div className="w-10 h-10 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
          <span className="text-xs text-gray-400">{hasPhoto ? '' : 'No photo'}</span>
        </div>
      )}
    </div>
  );
}

export default function EquipmentList({
  equipment,
  viewMode,
  onEdit,
  onDelete,
  onCheckout,
  onCheckin,
  onViewDetails,
}: EquipmentListProps) {
  return (
    <div>
      {equipment.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">No equipment found matching your filters.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {equipment.map(item => (
            <EquipmentCard
              key={item.id}
              equipment={item}
              onEdit={onEdit}
              onDelete={onDelete}
              onCheckout={onCheckout}
              onCheckin={onCheckin}
              onViewDetails={onViewDetails}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Photo</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serial #</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Venue</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zone</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Condition</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purchase Date</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purchase Cost</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Checked</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">In Use</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Maint.</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issues</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {equipment.map(item => {
                  const isOverdue = item.nextMaintenance && new Date(item.nextMaintenance) < new Date();
                  const conditionColors = {
                    'Excellent': 'bg-green-100 text-green-800',
                    'Good': 'bg-blue-100 text-blue-800',
                    'Fair': 'bg-yellow-100 text-yellow-800',
                    'Poor': 'bg-orange-100 text-orange-800',
                    'Out of Service': 'bg-red-100 text-red-800',
                  };
                  
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap">
                        <LazyRowPhoto id={item.id} hasPhoto={item.hasPhoto} inlineUrl={item.photoUrl} />
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => onViewDetails(item.id)}
                          className="text-sm font-medium text-gray-900 hover:text-blue-600"
                        >
                          {item.name}
                        </button>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                        {item.serialNumber || '-'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                        {item.category || '-'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                        {item.zone?.venue?.name || '-'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                        {item.zone?.name || '-'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${conditionColors[item.condition as keyof typeof conditionColors] || 'bg-gray-100 text-gray-800'}`}>
                          {item.condition}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                        {item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                        {item.purchaseCost ? `$${item.purchaseCost}` : '-'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                        {item.lastCheckedDate ? new Date(item.lastCheckedDate).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {item.lastCheckStatus ? (
                          <span className={`px-2 py-1 text-xs rounded ${
                            item.lastCheckStatus === 'No Issues Detected' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {item.lastCheckStatus}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm">
                        {item.inUse ? (
                          <span className="text-amber-600 font-medium">Yes</span>
                        ) : (
                          <span className="text-gray-400">No</span>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm">
                        {item.nextMaintenance ? (
                          <span className={isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}>
                            {new Date(item.nextMaintenance).toLocaleDateString()}
                            {isOverdue && ' ⚠️'}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm">
                        {item._count?.safetyIssues ? (
                          <span className="text-red-600 font-medium">
                            {item._count.safetyIssues}
                          </span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => onEdit(item)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit"
                          >
                            Edit
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={() => onViewDetails(item.id)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="View Details"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

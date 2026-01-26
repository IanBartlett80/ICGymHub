'use client';

import { Equipment, Zone } from '@prisma/client';
import { useState } from 'react';
import {
  PencilIcon,
  TrashIcon,
  WrenchScrewdriverIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

interface EquipmentWithRelations extends Equipment {
  zone?: Zone | null;
  _count?: {
    MaintenanceLog: number;
    EquipmentUsage: number;
  };
}

interface EquipmentCardProps {
  equipment: EquipmentWithRelations;
  onEdit: (equipment: EquipmentWithRelations) => void;
  onDelete: (id: string) => void;
  onCheckout?: (id: string) => void;
  onCheckin?: (id: string) => void;
  onViewDetails: (id: string) => void;
}

const conditionColors = {
  'Excellent': 'bg-green-100 text-green-800',
  'Good': 'bg-blue-100 text-blue-800',
  'Fair': 'bg-yellow-100 text-yellow-800',
  'Poor': 'bg-orange-100 text-orange-800',
  'Out of Service': 'bg-red-100 text-red-800',
};

export default function EquipmentCard({
  equipment,
  onEdit,
  onDelete,
  onCheckout,
  onCheckin,
  onViewDetails,
}: EquipmentCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${equipment.name}"? This will also delete all maintenance logs and usage history.`)) {
      setIsDeleting(true);
      try {
        await onDelete(equipment.id);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const isOverdue = equipment.nextMaintenance && new Date(equipment.nextMaintenance) < new Date();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <button
            onClick={() => onViewDetails(equipment.id)}
            className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors text-left"
          >
            {equipment.name}
          </button>
          {equipment.category && (
            <p className="text-sm text-gray-600">{equipment.category}</p>
          )}
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${conditionColors[equipment.condition as keyof typeof conditionColors] || 'bg-gray-100 text-gray-800'}`}>
          {equipment.condition}
        </span>
      </div>

      <div className="space-y-2 mb-3">
        {equipment.serialNumber && (
          <p className="text-sm text-gray-600">
            <span className="font-medium">S/N:</span> {equipment.serialNumber}
          </p>
        )}
        {equipment.zone && (
          <p className="text-sm text-gray-600">
            <span className="font-medium">Zone:</span> {equipment.zone.name}
          </p>
        )}
        {equipment.location && (
          <p className="text-sm text-gray-600">
            <span className="font-medium">Location:</span> {equipment.location}
          </p>
        )}
        {equipment.inUse && (
          <div className="flex items-center text-sm text-amber-600">
            <CheckCircleIcon className="w-4 h-4 mr-1" />
            <span className="font-medium">In Use</span>
          </div>
        )}
        {isOverdue && (
          <div className="flex items-center text-sm text-red-600">
            <WrenchScrewdriverIcon className="w-4 h-4 mr-1" />
            <span className="font-medium">Maintenance Overdue</span>
          </div>
        )}
      </div>

      {equipment._count && (
        <div className="flex gap-4 text-xs text-gray-500 mb-3 pb-3 border-b border-gray-200">
          <span>{equipment._count.MaintenanceLog} maintenance logs</span>
          <span>{equipment._count.EquipmentUsage} usage records</span>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => onEdit(equipment)}
          className="flex-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center justify-center"
        >
          <PencilIcon className="w-4 h-4 mr-1" />
          Edit
        </button>

        {equipment.condition !== 'Out of Service' && (
          equipment.inUse ? (
            onCheckin && (
              <button
                onClick={() => onCheckin(equipment.id)}
                className="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors flex items-center justify-center"
              >
                <XCircleIcon className="w-4 h-4 mr-1" />
                Check In
              </button>
            )
          ) : (
            onCheckout && (
              <button
                onClick={() => onCheckout(equipment.id)}
                className="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                <CheckCircleIcon className="w-4 h-4 mr-1" />
                Check Out
              </button>
            )
          )
        )}

        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="px-3 py-1.5 text-sm font-medium text-red-600 bg-white border border-red-300 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

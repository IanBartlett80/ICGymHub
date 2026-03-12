'use client';

import Link from 'next/link';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface EquipmentStatusCardProps {
  equipment: {
    id: string;
    name: string;
    category: string | null;
    serialNumber: string | null;
    condition: string;
    photoUrl: string | null;
    lastCheckedDate: string | null;
    lastCheckStatus: string | null;
    zone?: {
      id: string;
      name: string;
    } | null;
    _count?: {
      safetyIssues: number;
    };
  };
  showZone?: boolean;
  openIssuesCount?: number;
}

export default function EquipmentStatusCard({ equipment, showZone = true, openIssuesCount }: EquipmentStatusCardProps) {
  // Calculate safety status based on: open issues count, equipment condition, and last check status
  const getSafetyStatus = () => {
    const issueCount = openIssuesCount ?? equipment._count?.safetyIssues ?? 0;
    
    if (equipment.condition === 'OUT_OF_SERVICE' || equipment.condition === 'Out of Service') {
      return {
        label: 'Out of Service',
        color: 'bg-red-100 text-red-800 border-red-300',
        icon: XCircleIcon,
      };
    }
    
    if (issueCount > 0) {
      // Check if any are critical based on last check status
      if (equipment.lastCheckStatus === 'CRITICAL' || equipment.lastCheckStatus === 'FAIL') {
        return {
          label: 'Critical Issues',
          color: 'bg-red-100 text-red-800 border-red-300',
          icon: ExclamationTriangleIcon,
        };
      }
      return {
        label: 'Minor Issues',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        icon: ExclamationTriangleIcon,
      };
    }
    
    if (equipment.lastCheckStatus === 'PASS' || equipment.lastCheckStatus === 'No Issues Detected') {
      return {
        label: 'Safe',
        color: 'bg-green-100 text-green-800 border-green-300',
        icon: CheckCircleIcon,
      };
    }
    
    // Default if no data available
    return {
      label: 'Not Checked',
      color: 'bg-gray-100 text-gray-800 border-gray-300',
      icon: ClockIcon,
    };
  };

  const formatLastChecked = (date: string | null) => {
    if (!date) return 'Never';
    
    const checkDate = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - checkDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return checkDate.toLocaleDateString();
  };

  const safetyStatus = getSafetyStatus();
  const StatusIcon = safetyStatus.icon;
  const issueCount = openIssuesCount ?? equipment._count?.safetyIssues ?? 0;

  return (
    <Link href={`/dashboard/equipment/items/${equipment.id}`}>
      <div className="bg-white rounded-lg shadow-md border-2 border-gray-200 hover:border-indigo-500 hover:shadow-lg transition-all cursor-pointer overflow-hidden">
        {/* Image Section */}
        <div className="relative h-48 bg-gray-100">
          {equipment.photoUrl ? (
            <img
              src={equipment.photoUrl}
              alt={equipment.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          
          {/* Safety Status Badge - Top Right */}
          <div className={`absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 ${safetyStatus.color} border-2 shadow-lg`}>
            <StatusIcon className="h-4 w-4" />
            {safetyStatus.label}
          </div>
          
          {/* Issue Count Badge - Top Left */}
          {issueCount > 0 && (
            <div className="absolute top-3 left-3 bg-red-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg border-2 border-white">
              {issueCount} {issueCount === 1 ? 'Issue' : 'Issues'}
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{equipment.name}</h3>
          
          <div className="space-y-2 text-sm text-gray-600">
            {equipment.category && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Category:</span>
                <span>{equipment.category}</span>
              </div>
            )}
            
            {equipment.serialNumber && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Serial #:</span>
                <span className="font-mono text-xs">{equipment.serialNumber}</span>
              </div>
            )}
            
            {showZone && equipment.zone && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Zone:</span>
                <span>{equipment.zone.name}</span>
              </div>
            )}
            
            <div className="flex items-center justify-between pt-2 mt-2 border-t border-gray-200">
              <div className="flex items-center gap-1.5 text-gray-500">
                <ClockIcon className="h-4 w-4" />
                <span className="text-xs">Last checked:</span>
              </div>
              <span className="text-xs font-medium text-gray-900">
                {formatLastChecked(equipment.lastCheckedDate)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer with condition */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600">Condition:</span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
              equipment.condition === 'EXCELLENT' || equipment.condition === 'Excellent' ? 'bg-green-100 text-green-800' :
              equipment.condition === 'GOOD' || equipment.condition === 'Good' ? 'bg-blue-100 text-blue-800' :
              equipment.condition === 'FAIR' || equipment.condition === 'Fair' ? 'bg-yellow-100 text-yellow-800' :
              equipment.condition === 'POOR' || equipment.condition === 'Poor' ? 'bg-orange-100 text-orange-800' :
              equipment.condition === 'OUT_OF_SERVICE' || equipment.condition === 'Out of Service' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {equipment.condition.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

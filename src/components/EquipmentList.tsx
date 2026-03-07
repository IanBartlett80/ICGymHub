'use client';

import { Equipment, Zone, Venue } from '@prisma/client';
import { useState, useEffect } from 'react';
import EquipmentCard from './EquipmentCard';
import {
  MagnifyingGlassIcon,
  Squares2X2Icon,
  ListBulletIcon,
} from '@heroicons/react/24/outline';

interface EquipmentWithRelations extends Equipment {
  zone?: (Zone & { venue?: Venue | null }) | null;
  venue?: Venue | null;
  lastCheckedDate?: Date | null;
  lastCheckStatus?: string | null;
  lastCheckedBy?: string | null;
  _count?: {
    maintenanceLogs: number;
    usageHistory: number;
    safetyIssues?: number;
  };
}

interface EquipmentListProps {
  equipment: EquipmentWithRelations[];
  onEdit: (equipment: EquipmentWithRelations) => void;
  onDelete: (id: string) => void;
  onCheckout?: (id: string) => void;
  onCheckin?: (id: string) => void;
  onViewDetails: (id: string) => void;
}

export default function EquipmentList({
  equipment,
  onEdit,
  onDelete,
  onCheckout,
  onCheckin,
  onViewDetails,
}: EquipmentListProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filteredEquipment, setFilteredEquipment] = useState(equipment);

  // Get unique categories
  const categories = Array.from(new Set(equipment.map(e => e.category).filter(Boolean))).sort();

  const conditions = ['Excellent', 'Good', 'Fair', 'Poor', 'Out of Service'];

  useEffect(() => {
    let filtered = equipment;

    // Apply search filter
    if (search) {
      filtered = filtered.filter(e =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.serialNumber?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply category filter
    if (categoryFilter) {
      filtered = filtered.filter(e => e.category === categoryFilter);
    }

    // Apply condition filter
    if (conditionFilter) {
      filtered = filtered.filter(e => e.condition === conditionFilter);
    }

    setFilteredEquipment(filtered);
  }, [search, categoryFilter, conditionFilter, equipment]);

  return (
    <div>
      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or serial number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="sm:w-48">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat!}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Condition Filter */}
          <div className="sm:w-48">
            <select
              value={conditionFilter}
              onChange={(e) => setConditionFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Conditions</option>
              {conditions.map(cond => (
                <option key={cond} value={cond}>{cond}</option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg border ${viewMode === 'grid' ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}
              title="Grid view"
            >
              <Squares2X2Icon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg border ${viewMode === 'list' ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}
              title="List view"
            >
              <ListBulletIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Active Filters */}
        {(search || categoryFilter || conditionFilter) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {search && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                Search: {search}
                <button onClick={() => setSearch('')} className="ml-2">×</button>
              </span>
            )}
            {categoryFilter && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                Category: {categoryFilter}
                <button onClick={() => setCategoryFilter('')} className="ml-2">×</button>
              </span>
            )}
            {conditionFilter && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                Condition: {conditionFilter}
                <button onClick={() => setConditionFilter('')} className="ml-2">×</button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {filteredEquipment.length} of {equipment.length} equipment items
      </div>

      {/* Equipment Grid/List */}
      {filteredEquipment.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">No equipment found matching your filters.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredEquipment.map(item => (
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
                {filteredEquipment.map(item => {
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
                        {item.photoUrl ? (
                          <img
                            src={item.photoUrl}
                            alt={item.name}
                            className="w-10 h-10 object-cover rounded border border-gray-200"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                            <span className="text-xs text-gray-400">No photo</span>
                          </div>
                        )}
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

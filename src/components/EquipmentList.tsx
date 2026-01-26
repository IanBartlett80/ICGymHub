'use client';

import { Equipment, Zone } from '@prisma/client';
import { useState, useEffect } from 'react';
import EquipmentCard from './EquipmentCard';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  Squares2X2Icon,
  ListBulletIcon,
} from '@heroicons/react/24/outline';

interface EquipmentWithRelations extends Equipment {
  zone?: Zone | null;
  _count?: {
    MaintenanceLog: number;
    EquipmentUsage: number;
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
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
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
      )}
    </div>
  );
}

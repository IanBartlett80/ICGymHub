'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Equipment, Zone } from '@prisma/client';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import DashboardLayout from '@/components/DashboardLayout';
import EquipmentManagementSubNav from '@/components/EquipmentManagementSubNav';
import EquipmentList from '@/components/EquipmentList';
import EquipmentForm from '@/components/EquipmentForm';
import VenueSelector from '@/components/VenueSelector';
import { showToast, confirmAndDelete } from '@/lib/toast';

interface EquipmentWithRelations extends Equipment {
  zone?: Zone | null;
  _count?: {
    maintenanceLogs: number;
    usageHistory: number;
    safetyIssues?: number;
  };
}

export default function AllEquipmentPage() {
  const router = useRouter();
  const [equipment, setEquipment] = useState<EquipmentWithRelations[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [conditionFilter, setConditionFilter] = useState<string>('all');
  const [venueId, setVenueId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [venueId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (venueId && venueId !== 'all') {
        params.set('venueId', venueId);
      }
      
      const [equipmentRes, zonesRes] = await Promise.all([
        fetch(`/api/equipment?${params.toString()}`),
        fetch(`/api/zones?${params.toString()}`),
      ]);

      if (equipmentRes.ok) {
        const data = await equipmentRes.json();
        setEquipment(data.equipment || data);
      }

      if (zonesRes.ok) {
        const data = await zonesRes.json();
        setZones(data.zones || data);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      alert('Failed to load equipment data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData: any) => {
    try {
      const url = editingEquipment ? `/api/equipment/${editingEquipment.id}` : '/api/equipment';
      const method = editingEquipment ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save equipment');
      }

      await loadData();
      setShowForm(false);
      setEditingEquipment(null);
      showToast.saveSuccess('Equipment');
    } catch (error: any) {
      showToast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    const item = equipment.find(e => e.id === id);
    const equipmentName = item?.name || 'equipment';
    
    confirmAndDelete(equipmentName, async () => {
      try {
        const response = await fetch(`/api/equipment/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete equipment');
        }

        await loadData();
      } catch (error) {
        showToast.error('Failed to delete equipment');
      }
    });
  };

  const handleEdit = (equipment: EquipmentWithRelations) => {
    setEditingEquipment(equipment);
    setShowForm(true);
  };

  const handleCheckout = async (id: string) => {
    try {
      const response = await fetch(`/api/equipment/${id}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to checkout equipment');
      }

      await loadData();
      showToast.success('Equipment checked out successfully');
    } catch (error: any) {
      showToast.error(error.message);
    }
  };

  const handleCheckin = async (id: string) => {
    try {
      const response = await fetch(`/api/equipment/${id}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to checkin equipment');
      }

      await loadData();
      showToast.success('Equipment checked in successfully');
    } catch (error: any) {
      showToast.error(error.message);
    }
  };

  const handleViewDetails = (id: string) => {
    router.push(`/dashboard/equipment/items/${id}`);
  };

  // Get unique categories
  const categories = Array.from(new Set(equipment.map(e => e.category).filter(Boolean)));

  // Filter equipment
  const filteredEquipment = equipment.filter(item => {
    const matchesSearch = !searchTerm || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesCondition = conditionFilter === 'all' || item.condition === conditionFilter;

    return matchesSearch && matchesCategory && matchesCondition;
  });

  if (loading) {
    return (
      <DashboardLayout hideSidebar={true}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout hideSidebar={true}>
      <EquipmentManagementSubNav />
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">All Equipment</h1>
              <p className="mt-1 text-sm text-gray-600">
                Complete inventory of all gym equipment
              </p>
            </div>
            <button
              onClick={() => {
                setEditingEquipment(null);
                setShowForm(true);
              }}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Add Equipment
            </button>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Venue Selector */}
            <div>
              <VenueSelector
                value={venueId}
                onChange={setVenueId}
                showAllOption={true}
              />
            </div>

            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search equipment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            {/* Category Filter */}
            <div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category!}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Condition Filter */}
            <div>
              <select
                value={conditionFilter}
                onChange={(e) => setConditionFilter(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="all">All Conditions</option>
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Poor">Poor</option>
                <option value="Out of Service">Out of Service</option>
              </select>
            </div>

            {/* Stats */}
            <div className="text-sm text-gray-600 flex items-center justify-end">
              Showing {filteredEquipment.length} of {equipment.length} items
            </div>
          </div>
        </div>

        {/* Equipment List */}
        {filteredEquipment.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500">No equipment found</p>
          </div>
        ) : (
          <EquipmentList
            equipment={filteredEquipment}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onCheckout={handleCheckout}
            onCheckin={handleCheckin}
            onViewDetails={handleViewDetails}
          />
        )}

        {/* Equipment Form Modal */}
        {showForm && (
          <EquipmentForm
            equipment={editingEquipment}
            zones={zones}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingEquipment(null);
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

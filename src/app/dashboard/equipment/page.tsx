'use client';

import { useState, useEffect } from 'react';
import { Equipment, Zone } from '@prisma/client';
import { PlusIcon } from '@heroicons/react/24/outline';
import EquipmentList from '@/components/EquipmentList';
import EquipmentForm from '@/components/EquipmentForm';
import DashboardLayout from '@/components/DashboardLayout';

interface EquipmentWithRelations extends Equipment {
  zone?: Zone | null;
  _count?: {
    MaintenanceLog: number;
    EquipmentUsage: number;
  };
}

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<EquipmentWithRelations[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    inUse: 0,
    maintenanceDue: 0,
    needsAttention: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [equipmentRes, zonesRes, statsRes] = await Promise.all([
        fetch('/api/equipment'),
        fetch('/api/zones'),
        fetch('/api/equipment/analytics/overview'),
      ]);

      if (equipmentRes.ok) {
        const data = await equipmentRes.json();
        setEquipment(data.equipment || data);
      }

      if (zonesRes.ok) {
        const data = await zonesRes.json();
        setZones(data.zones || data);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats({
          total: data.totalCount || 0,
          inUse: data.inUseCount || 0,
          maintenanceDue: data.maintenanceDueCount || 0,
          needsAttention: data.needsAttentionCount || 0,
        });
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
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/equipment/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete equipment');
      }

      await loadData();
    } catch (error) {
      alert('Failed to delete equipment');
    }
  };

  const handleEdit = (equipment: EquipmentWithRelations) => {
    setEditingEquipment(equipment);
    setShowForm(true);
  };

  const handleCheckout = async (id: string) => {
    // For now, just mark as checked out without session/coach
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
    } catch (error: any) {
      alert(error.message);
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
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleViewDetails = (id: string) => {
    window.location.href = `/dashboard/equipment/${id}`;
  };

  if (loading) {
    return (
      <DashboardLayout title="Equipment Management">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading equipment...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Equipment Management">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Equipment Management</h1>
              <p className="mt-1 text-sm text-gray-600">
                Track and manage your gym equipment inventory
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

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-600">Total Equipment</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-600">Currently In Use</p>
              <p className="mt-2 text-3xl font-bold text-blue-600">{stats.inUse}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-600">Maintenance Due</p>
              <p className="mt-2 text-3xl font-bold text-orange-600">{stats.maintenanceDue}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-600">Needs Attention</p>
              <p className="mt-2 text-3xl font-bold text-red-600">{stats.needsAttention}</p>
            </div>
          </div>
        </div>

        {/* Equipment List */}
        <EquipmentList
          equipment={equipment}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCheckout={handleCheckout}
          onCheckin={handleCheckin}
          onViewDetails={handleViewDetails}
        />

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

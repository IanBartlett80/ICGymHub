'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import InjuryReportsSubNav from '@/components/InjuryReportsSubNav';

interface Equipment {
  id: string;
  name: string;
  category: string | null;
  active: boolean;
  createdAt: string;
}

export default function ConfigurationPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingEquipment, setIsAddingEquipment] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', category: '' });

  useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    try {
      const res = await fetch('/api/equipment');
      if (res.ok) {
        const data = await res.json();
        setEquipment(data);
      }
    } catch (error) {
      console.error('Failed to fetch equipment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        // Update existing
        const res = await fetch(`/api/equipment/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          await fetchEquipment();
          setEditingId(null);
          setFormData({ name: '', category: '' });
        }
      } else {
        // Create new
        const res = await fetch('/api/equipment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          await fetchEquipment();
          setIsAddingEquipment(false);
          setFormData({ name: '', category: '' });
        }
      }
    } catch (error) {
      console.error('Failed to save equipment:', error);
    }
  };

  const handleEdit = (item: Equipment) => {
    setEditingId(item.id);
    setFormData({ name: item.name, category: item.category || '' });
    setIsAddingEquipment(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this equipment?')) return;
    
    try {
      const res = await fetch(`/api/equipment/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchEquipment();
      }
    } catch (error) {
      console.error('Failed to delete equipment:', error);
    }
  };

  const handleToggleActive = async (item: Equipment) => {
    try {
      const res = await fetch(`/api/equipment/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, active: !item.active }),
      });
      if (res.ok) {
        await fetchEquipment();
      }
    } catch (error) {
      console.error('Failed to toggle equipment:', error);
    }
  };

  const cancelEdit = () => {
    setIsAddingEquipment(false);
    setEditingId(null);
    setFormData({ name: '', category: '' });
  };

  // Group by category
  const grouped = equipment.reduce((acc, item) => {
    const cat = item.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, Equipment[]>);

  return (
    <DashboardLayout>
      <InjuryReportsSubNav />
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Configuration</h1>
          <p className="text-gray-600">
            Manage equipment and standard fields for injury reports
          </p>
        </div>

        {/* Equipment Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-semibold mb-1">Equipment</h2>
              <p className="text-sm text-gray-600">
                Manage equipment items available for injury reports
              </p>
            </div>
            {!isAddingEquipment && (
              <button
                onClick={() => setIsAddingEquipment(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                + Add Equipment
              </button>
            )}
          </div>

          {isAddingEquipment && (
            <form onSubmit={handleSubmit} className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold mb-3">
                {editingId ? 'Edit Equipment' : 'New Equipment'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Balance Beam, Vault"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Apparatus, Mats"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {editingId ? 'Update' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <p className="text-gray-500">Loading equipment...</p>
          ) : equipment.length === 0 ? (
            <p className="text-gray-500">No equipment items yet. Add your first one above.</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([category, items]) => (
                <div key={category}>
                  <h3 className="font-semibold text-lg mb-3 text-gray-700">{category}</h3>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 border rounded hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{item.name}</span>
                          {!item.active && (
                            <span className="text-xs px-2 py-1 bg-gray-200 rounded">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleToggleActive(item)}
                            className={`px-3 py-1 rounded text-sm ${
                              item.active
                                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {item.active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleEdit(item)}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Standard Fields Info Section */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-3">Standard Fields</h2>
          <p className="text-gray-700 mb-3">
            The following fields are automatically added to every injury report form:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>
              <strong>Gymsport:</strong> Pulled from your club's configured gymsports
            </li>
            <li>
              <strong>Class:</strong> Pulled from your club's configured classes
            </li>
            <li>
              <strong>Equipment:</strong> Pulled from the equipment list above
            </li>
          </ul>
          <p className="text-sm text-gray-600 mt-3">
            These fields ensure consistency across all injury reports and enable powerful filtering
            and analytics.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}

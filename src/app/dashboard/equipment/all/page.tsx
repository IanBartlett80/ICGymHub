'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Equipment, Zone, Venue } from '@prisma/client';
import { PlusIcon, MagnifyingGlassIcon, ArrowDownTrayIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import DashboardLayout from '@/components/DashboardLayout';
import EquipmentManagementSubNav from '@/components/EquipmentManagementSubNav';
import EquipmentList from '@/components/EquipmentList';
import EquipmentForm from '@/components/EquipmentForm';
import VenueSelector from '@/components/VenueSelector';
import { showToast, confirmAndDelete } from '@/lib/toast';

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

 const exportToCSV = () => {
  const headers = [
    'Name', 'Serial Number', 'Category', 'Venue', 'Zone', 'Condition',
    'Purchase Date', 'Purchase Cost', 'Last Checked', 'Last Check Status',
    'Last Checked By', 'In Use', 'Last Maintenance', 'Next Maintenance',
    'Safety Issues Count', 'Maintenance Logs Count'
  ];

  const rows = filteredEquipment.map(item => [
    item.name,
    item.serialNumber || '',
    item.category || '',
    item.zone?.venue?.name ||'',
    item.zone?.name || '',
    item.condition || '',
    item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : '',
    item.purchaseCost || '',
    item.lastCheckedDate ? new Date(item.lastCheckedDate).toLocaleDateString() : '',
    item.lastCheckStatus || '',
    item.lastCheckedBy || '',
    item.inUse ? 'Yes' : 'No',
    item.lastMaintenance ? new Date(item.lastMaintenance).toLocaleDateString() : '',
    item.nextMaintenance ? new Date(item.nextMaintenance).toLocaleDateString() : '',
    item._count?.safetyIssues?.toString() || '0',
    item._count?.maintenanceLogs?.toString() || '0'
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `equipment-register-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
  showToast.success('Equipment register exported to CSV');
 };

 const exportToExcel = async () => {
  try {
    const params = new URLSearchParams();
    if (venueId && venueId !== 'all') params.set('venueId', venueId);
    if (categoryFilter !== 'all') params.set('category', categoryFilter);
    if (conditionFilter !== 'all') params.set('condition', conditionFilter);
    
    const response = await fetch(`/api/equipment/export/excel?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error('Export failed');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `equipment-register-${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    showToast.success('Equipment register exported to Excel');
  } catch (error) {
    showToast.error('Failed to export to Excel');
  }
 };

 const exportToPDF = async () => {
  try {
    const params = new URLSearchParams();
    if (venueId && venueId !== 'all') params.set('venueId', venueId);
    if (categoryFilter !== 'all') params.set('category', categoryFilter);
    if (conditionFilter !== 'all') params.set('condition', conditionFilter);
    
    window.open(`/api/equipment/export/pdf?${params.toString()}`, '_blank');
    showToast.success('Opening PDF export...');
  } catch (error) {
    showToast.error('Failed to export to PDF');
  }
 };

 const generateComplianceReport = async () => {
  try {
    const params = new URLSearchParams();
    if (venueId && venueId !== 'all') params.set('venueId', venueId);
    
    window.open(`/api/equipment/compliance-report?${params.toString()}`, '_blank');
    showToast.success('Opening compliance report...');
  } catch (error) {
    showToast.error('Failed to generate compliance report');
  }
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
   <DashboardLayout>
    <div className="flex items-center justify-center h-64">
     <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
   </DashboardLayout>
  );
 }

 return (
  <DashboardLayout>
   <EquipmentManagementSubNav />
   <div className="p-6">
    {/* Header */}
    <div className="mb-6">
     <div className="flex justify-between items-start mb-4">
      <div>
       <h1 className="text-2xl font-bold text-gray-900">All Equipment</h1>
       <p className="mt-1 text-sm text-gray-600">
        Complete inventory of all gym equipment
       </p>
      </div>
      <div className="flex gap-2">
       {/* Export Dropdown */}
       <div className="relative inline-block text-left">
        <button
         onClick={() => {
          const menu = document.getElementById('export-menu');
          if (menu) menu.classList.toggle('hidden');
         }}
         className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
         <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
         Export
        </button>
        <div id="export-menu" className="hidden absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
         <div className="py-1">
          <button
           onClick={() => {
            exportToCSV();
            document.getElementById('export-menu')?.classList.add('hidden');
           }}
           className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
           Export as CSV
          </button>
          <button
           onClick={() => {
            exportToExcel();
            document.getElementById('export-menu')?.classList.add('hidden');
           }}
           className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
           Export as Excel (.xlsx)
          </button>
          <button
           onClick={() => {
            exportToPDF();
            document.getElementById('export-menu')?.classList.add('hidden');
           }}
           className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
           Export as PDF
          </button>
         </div>
        </div>
       </div>

       {/* Compliance Report Button */}
       <button
        onClick={generateComplianceReport}
        className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
       >
        <DocumentTextIcon className="w-5 h-5 mr-2" />
        Compliance Report
       </button>

       {/* Add Equipment Button */}
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

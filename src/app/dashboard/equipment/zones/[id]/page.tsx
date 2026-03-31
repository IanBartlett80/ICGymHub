'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import EquipmentManagementSubNav from '@/components/EquipmentManagementSubNav';
import EquipmentStatusCard from '@/components/EquipmentStatusCard';
import SafetyIssueReviewModal from '@/components/SafetyIssueReviewModal';
import QRCodeProtectionStatus from '@/components/QRCodeProtectionStatus';
import Link from 'next/link';
import axiosInstance from '@/lib/axios';
import { 
 ArrowLeftIcon,
 ExclamationTriangleIcon,
 CubeIcon,
 QrCodeIcon,
 PrinterIcon,
 EyeIcon,
 PlusIcon,
 XMarkIcon,
 CheckIcon,
} from '@heroicons/react/24/outline';
import { showToast } from '@/lib/toast';

interface Zone {
 id: string;
 name: string;
 description: string | null;
 allowOverlap: boolean;
 active: boolean;
 publicId: string | null;
}

interface Equipment {
 id: string;
 name: string;
 category: string | null;
 serialNumber: string | null;
 condition: string;
 photoUrl?: string | null;
 lastCheckedDate?: string | null;
 lastCheckStatus?: string | null;
 safetyIssues?: SafetyIssue[];
 maintenanceTasks?: MaintenanceTask[];
 _count?: {
  safetyIssues: number;
 };
}

interface SafetyIssue {
 id: string;
 issueType: string;
 title: string;
 description: string;
 status: string;
 priority: string;
 reportedBy: string;
 createdAt: string;
 equipment: {
  id: string;
  name: string;
 };
}

interface MaintenanceTask {
 id: string;
 taskType: string;
 title: string;
 description: string;
 status: string;
 priority: string;
 dueDate: string | null;
 assignedTo: string | null;
 equipment: {
  id: string;
  name: string;
 };
}

export default function ZoneDetailPage() {
 const params = useParams();
 const router = useRouter();
 const zoneId = params.id as string;

 const [zone, setZone] = useState<Zone | null>(null);
 const [equipment, setEquipment] = useState<Equipment[]>([]);
 const [safetyIssues, setSafetyIssues] = useState<SafetyIssue[]>([]);
 const [loading, setLoading] = useState(true);
 const [activeTab, setActiveTab] = useState<'equipment' | 'safety'>('equipment');
 const [zoneStatus, setZoneStatus] = useState<any>(null);
 const [generatingQR, setGeneratingQR] = useState(false);
 const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
 const [reviewingIssueId, setReviewingIssueId] = useState<string | null>(null);
 const [showLinkModal, setShowLinkModal] = useState(false);
 const [unlinkedEquipment, setUnlinkedEquipment] = useState<Equipment[]>([]);
 const [loadingUnlinked, setLoadingUnlinked] = useState(false);
 const [linkingIds, setLinkingIds] = useState<Set<string>>(new Set());

 useEffect(() => {
  loadData();
 }, [zoneId]);

 const loadData = async () => {
  try {
   setLoading(true);
   const [zoneRes, equipmentRes, issuesRes, statusRes, qrRes] = await Promise.all([
    axiosInstance.get(`/api/zones/${zoneId}`),
    axiosInstance.get(`/api/equipment?zoneId=${zoneId}`),
    axiosInstance.get(`/api/safety-issues?zoneId=${zoneId}`),
    axiosInstance.get(`/api/equipment/analytics/zone-status`),
    axiosInstance.get(`/api/zones/${zoneId}/generate-qr`), // Load QR code together with other data
   ]);

   setZone(zoneRes.data.zone);
   setEquipment(equipmentRes.data.equipment || equipmentRes.data);
   setSafetyIssues(issuesRes.data.issues || issuesRes.data);
   
   // data is an array of zone statuses, not wrapped in .zones
   const thisZoneStatus = Array.isArray(statusRes.data) ? statusRes.data.find((z: any) => z.zoneId === zoneId) : null;
   setZoneStatus(thisZoneStatus);

   // Load existing QR code if available
   if (qrRes.data.hasQRCode) {
    setQrCodeDataUrl(qrRes.data.qrCodeDataUrl);
   }
  } catch (error) {
   console.error('Failed to load zone details:', error);
   alert('Failed to load zone details');
  } finally {
   setLoading(false);
  }
 };

 const getZoneStatusBadge = () => {
  if (!zoneStatus) return null;

  const statusConfig = {
   NO_DEFECTS: { label: 'No Defects Detected', color: 'bg-green-100 text-green-800' },
   NON_CRITICAL_ISSUES: { label: 'Non-Critical Issues', color: 'bg-yellow-100 text-yellow-800' },
   REQUIRES_ATTENTION: { label: 'Requires Attention', color: 'bg-orange-100 text-orange-800' },
   CRITICAL_DEFECTS: { label: 'Critical Defects', color: 'bg-red-100 text-red-800' },
  };

  const config = statusConfig[zoneStatus.status as keyof typeof statusConfig] || statusConfig.NO_DEFECTS;

  return (
   <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
    {config.label}
   </span>
  );
 };

 const getStatusColor = (status: string) => {
  switch (status) {
   case 'OPEN': return 'text-red-700 bg-red-50';
   case 'IN_PROGRESS': return 'text-yellow-700 bg-yellow-50';
   case 'RESOLVED': return 'text-green-700 bg-green-50';
   case 'CLOSED': return 'text-gray-700 bg-gray-50';
   case 'PENDING': return 'text-blue-700 bg-blue-50';
   case 'COMPLETED': return 'text-green-700 bg-green-50';
   case 'CANCELLED': return 'text-gray-700 bg-gray-50';
   default: return 'text-gray-700 bg-gray-50';
  }
 };

 const getPriorityColor = (priority: string) => {
  switch (priority) {
   case 'CRITICAL': return 'text-red-700 bg-red-100';
   case 'HIGH': return 'text-orange-700 bg-orange-100';
   case 'MEDIUM': return 'text-yellow-700 bg-yellow-100';
   case 'LOW': return 'text-blue-700 bg-blue-100';
   default: return 'text-gray-700 bg-gray-100';
  }
 };

 const handleGenerateQR = async () => {
  try {
   setGeneratingQR(true);
   const data = await axiosInstance.post(`/api/zones/${zoneId}/generate-qr`);
   
   // Store QR code data for display
   setQrCodeDataUrl(data.data.qrCodeDataUrl);
   
   // Reload zone data to get the publicId
   await loadData();
  } catch (error) {
   console.error('Failed to generate QR code:', error);
   alert('Failed to generate QR code');
  } finally {
   setGeneratingQR(false);
  }
 };

 const handlePrintQR = () => {
  if (!qrCodeDataUrl || !zone) {
   console.error('Cannot print: missing QR code or zone data');
   return;
  }
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
   console.error('Failed to open print window');
   return;
  }
  
  // Use textContent to safely encode the zone name
  const safeZoneName = zone.name || 'Equipment Zone';
  
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <title>QR Code - ${safeZoneName.replace(/"/g, '&quot;')}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
    }
    h1 {
      font-size: 24px;
      margin-bottom: 10px;
      text-align: center;
    }
    .zone-name {
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 30px;
      text-align: center;
      color: #1f2937;
    }
    img {
      max-width: 400px;
      height: auto;
      border: 2px solid #000;
      padding: 10px;
      background: white;
    }
    .instructions {
      margin-top: 20px;
      text-align: center;
      font-size: 14px;
      color: #6b7280;
    }
    @media print {
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <h1>Equipment Zone QR Code</h1>
  <div class="zone-name">${safeZoneName.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
  <img src="${qrCodeDataUrl}" alt="QR Code" />
  <div class="instructions">
    <p>Scan this QR code to access zone information</p>
  </div>
</body>
</html>`;
  
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.focus();
  
  // Delay print to ensure content is loaded
  setTimeout(() => {
   printWindow.print();
  }, 250);
 };

 const handleOpenLinkModal = async () => {
  setShowLinkModal(true);
  setLoadingUnlinked(true);
  try {
   const res = await axiosInstance.get('/api/equipment');
   const allEquipment = res.data.equipment || res.data;
   const unlinked = allEquipment.filter((e: any) => !e.zoneId);
   setUnlinkedEquipment(unlinked);
  } catch (error) {
   console.error('Failed to load unlinked equipment:', error);
  } finally {
   setLoadingUnlinked(false);
  }
 };

 const handleLinkEquipment = async (equipmentId: string) => {
  setLinkingIds(prev => new Set(prev).add(equipmentId));
  try {
   await axiosInstance.put(`/api/equipment/${equipmentId}`, {
    zoneId: zoneId,
    venueId: zone?.id ? undefined : undefined,
   });
   setUnlinkedEquipment(prev => prev.filter(e => e.id !== equipmentId));
   await loadData();
   showToast.success('Equipment linked to zone');
  } catch (error: any) {
   showToast.error(error.response?.data?.error || 'Failed to link equipment');
  } finally {
   setLinkingIds(prev => {
    const next = new Set(prev);
    next.delete(equipmentId);
    return next;
   });
  }
 };

 const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
 };

 if (loading) {
  return (
   <DashboardLayout>
    <EquipmentManagementSubNav />
    <div className="flex justify-center items-center h-64">
     <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
   </DashboardLayout>
  );
 }

 if (loading) {
  return (
   <DashboardLayout>
    <EquipmentManagementSubNav />
    <div className="text-center py-12">
     <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
     <p className="text-gray-500 mt-4">Loading zone details...</p>
    </div>
   </DashboardLayout>
  );
 }

 if (!zone) {
  return (
   <DashboardLayout>
    <EquipmentManagementSubNav />
    <div className="text-center py-12">
     <p className="text-gray-500">Zone not found</p>
    </div>
   </DashboardLayout>
  );
 }

 const openIssues = safetyIssues.filter(i => i.status === 'OPEN' || i.status === 'IN_PROGRESS');
 const resolvedIssues = safetyIssues.filter(i => i.status === 'RESOLVED' || i.status === 'CLOSED');

 return (
  <DashboardLayout>
   <EquipmentManagementSubNav />
   <div className="space-y-6">
    {/* Header */}
    <div className="space-y-4">
     <div className="flex items-center justify-between">
      <button
       onClick={() => router.push('/dashboard/equipment')}
       className="text-gray-400 hover:text-gray-600"
      >
       <ArrowLeftIcon className="h-6 w-6" />
      </button>
      
      <div className="flex items-center gap-3">
       {getZoneStatusBadge()}
       <button
        onClick={handleGenerateQR}
        disabled={generatingQR}
        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
       >
        <QrCodeIcon className="h-5 w-5 mr-2" />
        {generatingQR ? 'Generating...' : zone.publicId ? 'Regenerate QR Code' : 'Generate QR Code'}
       </button>
      </div>
     </div>
     
     <div className="text-center">
      <h1 className="text-3xl font-bold text-gray-900">{zone.name}</h1>
      {zone.description && (
       <p className="text-sm text-gray-500 mt-2">{zone.description}</p>
      )}
     </div>
    </div>

    {/* Stats Cards */}
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
     <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
       <div className="flex items-center">
        <div className="flex-shrink-0">
         <CubeIcon className="h-6 w-6 text-blue-400" />
        </div>
        <div className="ml-5 w-0 flex-1">
         <dl>
          <dt className="text-sm font-medium text-gray-500 truncate">Equipment in Zone</dt>
          <dd className="text-lg font-medium text-gray-900">{equipment.length}</dd>
         </dl>
        </div>
       </div>
      </div>
     </div>

     <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
       <div className="flex items-center">
        <div className="flex-shrink-0">
         <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
        </div>
        <div className="ml-5 w-0 flex-1">
         <dl>
          <dt className="text-sm font-medium text-gray-500 truncate">Open Safety Issues</dt>
          <dd className="text-lg font-medium text-gray-900">{openIssues.length}</dd>
         </dl>
        </div>
       </div>
      </div>
     </div>

     <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
       <div className="flex items-center">
        <div className="flex-shrink-0">
         <ExclamationTriangleIcon className="h-6 w-6 text-green-400" />
        </div>
        <div className="ml-5 w-0 flex-1">
         <dl>
          <dt className="text-sm font-medium text-gray-500 truncate">Resolved Issues</dt>
          <dd className="text-lg font-medium text-gray-900">{resolvedIssues.length}</dd>
         </dl>
        </div>
       </div>
      </div>
     </div>

     {/* QR Code Card */}
     <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
       <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
         <div className="flex-shrink-0">
          <QrCodeIcon className="h-6 w-6 text-indigo-400" />
         </div>
         <div className="ml-3">
          <dt className="text-sm font-medium text-gray-500 truncate">Zone QR Code</dt>
         </div>
        </div>
        {qrCodeDataUrl && (
         <button
          onClick={handlePrintQR}
          className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
          title="Print QR Code"
         >
          <PrinterIcon className="h-5 w-5" />
         </button>
        )}
       </div>
       {qrCodeDataUrl ? (
        <div className="flex flex-col items-center">
         <img 
          src={qrCodeDataUrl} 
          alt="Zone QR Code" 
          className="w-32 h-32 border-2 border-gray-200 rounded"
         />
         <QRCodeProtectionStatus />
        </div>
       ) : (
        <div className="text-center py-4">
         <p className="text-xs text-gray-400">Generate QR code above</p>
        </div>
       )}
      </div>
     </div>
    </div>

    {/* Zone Statistics */}
    {zoneStatus && (
     <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Zone Statistics</h2>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
       <div>
        <dt className="text-sm font-medium text-gray-500">Critical Issues</dt>
        <dd className="mt-1 text-2xl font-semibold text-red-600">{zoneStatus.criticalIssues}</dd>
       </div>
       <div>
        <dt className="text-sm font-medium text-gray-500">Non-Critical Issues</dt>
        <dd className="mt-1 text-2xl font-semibold text-orange-600">{zoneStatus.nonCriticalIssues}</dd>
       </div>
       <div>
        <dt className="text-sm font-medium text-gray-500">Overdue Maintenance</dt>
        <dd className="mt-1 text-2xl font-semibold text-yellow-600">{zoneStatus.overdueMaintenance}</dd>
       </div>
       <div>
        <dt className="text-sm font-medium text-gray-500">Out of Service</dt>
        <dd className="mt-1 text-2xl font-semibold text-gray-600">{zoneStatus.outOfServiceEquipment}</dd>
       </div>
      </dl>
     </div>
    )}

    {/* Tabs */}
    <div className="bg-white shadow rounded-lg">
     <div className="border-b border-gray-200">
      <div className="flex items-center justify-between px-6">
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
       <button
        onClick={() => setActiveTab('equipment')}
        className={`${
         activeTab === 'equipment'
          ? 'border-indigo-500 text-indigo-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
>
        Linked Equipment ({equipment.length})
       </button>
       <button
        onClick={() => setActiveTab('safety')}
        className={`${
         activeTab === 'safety'
          ? 'border-indigo-500 text-indigo-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
>
        Zone Safety Issues ({openIssues.length})
       </button>
      </nav>
      {activeTab === 'equipment' && (
       <button
        onClick={handleOpenLinkModal}
        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
        title="Link unlinked equipment to this zone"
       >
        <PlusIcon className="w-5 h-5" />
       </button>
      )}
      </div>
     </div>

     <div className="p-6">
      {/* Safety Issues Tab - Only Active Issues */}
      {activeTab === 'safety' && (
       <div className="space-y-4">
        {openIssues.length === 0 ? (
         <p className="text-gray-500 text-center py-8">No active safety issues</p>
        ) : (
         openIssues.map(issue => (
          <div key={issue.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
           <div className="flex items-start justify-between">
            <div className="flex-1">
             <div className="flex items-center space-x-2 mb-2">
              <Link 
               href={`/dashboard/equipment/items/${issue.equipment.id}`}
               className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
>
               {issue.equipment.name}
              </Link>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(issue.status)}`}>
               {issue.status.replace('_', ' ')}
              </span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(issue.priority)}`}>
               {issue.priority}
              </span>
             </div>
             <h4 className="text-sm font-semibold text-gray-900">{issue.title}</h4>
             <p className="text-sm text-gray-600 mt-1">{issue.description}</p>
             <div className="mt-2 text-xs text-gray-500">
              {issue.issueType.replace('_', ' ')} • Reported by {issue.reportedBy} • {formatDate(issue.createdAt)}
             </div>
            </div>
            <button
             onClick={() => setReviewingIssueId(issue.id)}
             className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg flex-shrink-0"
             title="View Details"
>
             <EyeIcon className="h-5 w-5" />
            </button>
           </div>
          </div>
         ))
        )}
       </div>
      )}

      {/* Equipment Tab */}
      {activeTab === 'equipment' && (
       <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {equipment.length === 0 ? (
         <p className="text-gray-500 text-center py-8 col-span-full">No equipment in this zone</p>
        ) : (
         equipment.map(item => {
          const openIssuesCount = item.safetyIssues?.filter(i => i.status === 'OPEN' || i.status === 'IN_PROGRESS').length || 0;

          return (
           <EquipmentStatusCard
            key={item.id}
            equipment={{
             id: item.id,
             name: item.name,
             category: item.category,
             serialNumber: item.serialNumber || null,
             condition: item.condition,
             photoUrl: item.photoUrl || null,
             lastCheckedDate: item.lastCheckedDate || null,
             lastCheckStatus: item.lastCheckStatus || null,
             zone: null, // Don't show zone since we're already in a zone page
             _count: item._count || { safetyIssues: openIssuesCount },
            }}
            showZone={false}
            openIssuesCount={openIssuesCount}
           />
          );
         })
        )}
       </div>
      )}
     </div>
    </div>
   </div>

   {/* Link Equipment Modal */}
   {showLinkModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
     <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
       <h2 className="text-lg font-bold text-gray-900">Link Equipment to {zone?.name}</h2>
       <button
        onClick={() => setShowLinkModal(false)}
        className="text-gray-400 hover:text-gray-600"
       >
        <XMarkIcon className="w-6 h-6" />
       </button>
      </div>
      <div className="px-6 py-4 overflow-y-auto flex-1 min-h-0">
       {loadingUnlinked ? (
        <div className="flex justify-center py-8">
         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
       ) : unlinkedEquipment.length === 0 ? (
        <p className="text-gray-500 text-center py-8">All equipment is already linked to a zone.</p>
       ) : (
        <div className="space-y-2">
         <p className="text-sm text-gray-500 mb-3">{unlinkedEquipment.length} item{unlinkedEquipment.length !== 1 ? 's' : ''} not linked to any zone</p>
         {unlinkedEquipment.map(item => (
          <div key={item.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
           <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
            <p className="text-xs text-gray-500">
             {item.category && <span>{item.category}</span>}
             {item.serialNumber && <span> • S/N: {item.serialNumber}</span>}
            </p>
           </div>
           <button
            onClick={() => handleLinkEquipment(item.id)}
            disabled={linkingIds.has(item.id)}
            className="ml-3 inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 rounded-lg transition-colors flex-shrink-0"
           >
            {linkingIds.has(item.id) ? (
             <span>Linking...</span>
            ) : (
             <><CheckIcon className="w-4 h-4" /> Link</>
            )}
           </button>
          </div>
         ))}
        </div>
       )}
      </div>
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
       <button
        onClick={() => setShowLinkModal(false)}
        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors"
       >
        Close
       </button>
      </div>
     </div>
    </div>
   )}

   {/* Safety Issue Review Modal */}
   {reviewingIssueId && (
    <SafetyIssueReviewModal
     issueId={reviewingIssueId}
     onClose={() => setReviewingIssueId(null)}
     onUpdate={loadData}
    />
   )}
  </DashboardLayout>
 );
}

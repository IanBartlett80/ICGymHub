'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import EquipmentManagementSubNav from '@/components/EquipmentManagementSubNav';
import Link from 'next/link';
import { 
 ArrowLeftIcon,
 ExclamationTriangleIcon,
 WrenchScrewdriverIcon,
 CubeIcon,
 QrCodeIcon,
 PrinterIcon,
} from '@heroicons/react/24/outline';

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
 condition: string;
 photoUrl?: string | null;
 safetyIssues?: SafetyIssue[];
 maintenanceTasks?: MaintenanceTask[];
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
 const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>([]);
 const [loading, setLoading] = useState(true);
 const [activeTab, setActiveTab] = useState<'equipment' | 'safety' | 'tasks'>('equipment');
 const [statusFilter, setStatusFilter] = useState<string>('all');
 const [zoneStatus, setZoneStatus] = useState<any>(null);
 const [generatingQR, setGeneratingQR] = useState(false);
 const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

 useEffect(() => {
  loadData();
 }, [zoneId]);

 const loadData = async () => {
  try {
   setLoading(true);
   const [zoneRes, equipmentRes, issuesRes, tasksRes, statusRes, qrRes] = await Promise.all([
    fetch(`/api/zones/${zoneId}`),
    fetch(`/api/equipment?zoneId=${zoneId}`),
    fetch(`/api/safety-issues?zoneId=${zoneId}`),
    fetch(`/api/maintenance-tasks?zoneId=${zoneId}`),
    fetch(`/api/equipment/analytics/zone-status`),
    fetch(`/api/zones/${zoneId}/generate-qr`), // Load QR code together with other data
   ]);

   if (zoneRes.ok) {
    const zoneData = await zoneRes.json();
    setZone(zoneData);
   }

   if (equipmentRes.ok) {
    const data = await equipmentRes.json();
    setEquipment(data.equipment || data);
   }

   if (issuesRes.ok) {
    const data = await issuesRes.json();
    setSafetyIssues(data.issues || data);
   }

   if (tasksRes.ok) {
    const data = await tasksRes.json();
    setMaintenanceTasks(data.tasks || data);
   }

   if (statusRes.ok) {
    const data = await statusRes.json();
    // data is an array of zone statuses, not wrapped in .zones
    const thisZoneStatus = Array.isArray(data) ? data.find((z: any) => z.zoneId === zoneId) : null;
    setZoneStatus(thisZoneStatus);
   }

   // Load existing QR code if available
   if (qrRes.ok) {
    const qrData = await qrRes.json();
    if (qrData.hasQRCode) {
     setQrCodeDataUrl(qrData.qrCodeDataUrl);
    }
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

 const getConditionColor = (condition: string) => {
  switch (condition) {
   case 'Excellent': return 'text-green-700 bg-green-50';
   case 'Good': return 'text-blue-700 bg-blue-50';
   case 'Fair': return 'text-yellow-700 bg-yellow-50';
   case 'Poor': return 'text-orange-700 bg-orange-50';
   case 'Out of Service': return 'text-red-700 bg-red-50';
   default: return 'text-gray-700 bg-gray-50';
  }
 };

 const handleGenerateQR = async () => {
  try {
   setGeneratingQR(true);
   const response = await fetch(`/api/zones/${zoneId}/generate-qr`, {
    method: 'POST',
   });

   if (!response.ok) {
    throw new Error('Failed to generate QR code');
   }

   const data = await response.json();
   
   // Store QR code data for display
   setQrCodeDataUrl(data.qrCodeDataUrl);
   
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

 const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
 };

 const filteredIssues = statusFilter === 'all' 
  ? safetyIssues 
  : safetyIssues.filter(i => i.status === statusFilter);

 const filteredTasks = statusFilter === 'all'
  ? maintenanceTasks
  : maintenanceTasks.filter(t => t.status === statusFilter);

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
 const pendingTasks = maintenanceTasks.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS');

 return (
  <DashboardLayout>
   <EquipmentManagementSubNav />
   <div className="space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
     <div className="flex items-center space-x-4">
      <button
       onClick={() => router.push('/dashboard/equipment')}
       className="text-gray-400 hover:text-gray-600"
>
       <ArrowLeftIcon className="h-6 w-6" />
      </button>
      <div>
       <h1 className="text-2xl font-bold text-gray-900">{zone.name}</h1>
       {zone.description && (
        <p className="text-sm text-gray-500">{zone.description}</p>
       )}
      </div>
     </div>
     <div className="flex items-center space-x-3">
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
         <WrenchScrewdriverIcon className="h-6 w-6 text-yellow-400" />
        </div>
        <div className="ml-5 w-0 flex-1">
         <dl>
          <dt className="text-sm font-medium text-gray-500 truncate">Pending Maintenance</dt>
          <dd className="text-lg font-medium text-gray-900">{pendingTasks.length}</dd>
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
        <div className="flex justify-center">
         <img 
          src={qrCodeDataUrl} 
          alt="Zone QR Code" 
          className="w-32 h-32 border-2 border-gray-200 rounded"
         />
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
      <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
       <button
        onClick={() => setActiveTab('equipment')}
        className={`${
         activeTab === 'equipment'
          ? 'border-indigo-500 text-indigo-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
>
        Equipment ({equipment.length})
       </button>
       <button
        onClick={() => setActiveTab('safety')}
        className={`${
         activeTab === 'safety'
          ? 'border-indigo-500 text-indigo-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
>
        Safety Issues ({safetyIssues.length})
       </button>
       <button
        onClick={() => setActiveTab('tasks')}
        className={`${
         activeTab === 'tasks'
          ? 'border-indigo-500 text-indigo-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
>
        Maintenance Tasks ({maintenanceTasks.length})
       </button>
      </nav>
     </div>

     <div className="p-6">
      {/* Filter */}
      {(activeTab === 'safety' || activeTab === 'tasks') && (
       <div className="mb-4">
        <select
         value={statusFilter}
         onChange={(e) => setStatusFilter(e.target.value)}
         className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
>
         <option value="all">All Status</option>
         <option value="OPEN">Open</option>
         <option value="IN_PROGRESS">In Progress</option>
         <option value="PENDING">Pending</option>
         <option value="COMPLETED">Completed</option>
         <option value="RESOLVED">Resolved</option>
        </select>
       </div>
      )}

      {/* Safety Issues Tab */}
      {activeTab === 'safety' && (
       <div className="space-y-4">
        {filteredIssues.length === 0 ? (
         <p className="text-gray-500 text-center py-8">No safety issues found</p>
        ) : (
         filteredIssues.map(issue => (
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
           </div>
          </div>
         ))
        )}
       </div>
      )}

      {/* Equipment Tab */}
      {activeTab === 'equipment' && (
       <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {equipment.length === 0 ? (
         <p className="text-gray-500 text-center py-8 col-span-full">No equipment in this zone</p>
        ) : (
         equipment.map(item => {
          const openIssuesCount = item.safetyIssues?.filter(i => i.status === 'OPEN' || i.status === 'IN_PROGRESS').length || 0;
          const pendingTasksCount = item.maintenanceTasks?.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS').length || 0;

          return (
           <Link
            key={item.id}
            href={`/dashboard/equipment/items/${item.id}`}
            className="block border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-white"
>
            <div className="flex">
             {/* Photo Thumbnail */}
             <div className="w-24 h-24 flex-shrink-0 bg-gray-100 border-r border-gray-200">
              {item.photoUrl ? (
               <img
                src={item.photoUrl}
                alt={item.name}
                className="w-full h-full object-cover"
               />
              ) : (
               <div className="w-full h-full flex items-center justify-center text-gray-400">
                <CubeIcon className="w-10 h-10" />
               </div>
              )}
             </div>
             
             {/* Equipment Info */}
             <div className="flex-1 p-3 min-w-0">
              <h4 className="text-sm font-semibold text-gray-900 truncate">{item.name}</h4>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{item.category || 'Uncategorized'}</p>
              <div className="mt-2">
               <span className={`px-2 py-0.5 rounded text-xs font-medium ${getConditionColor(item.condition)}`}>
                {item.condition}
               </span>
              </div>
              {(openIssuesCount> 0 || pendingTasksCount> 0) && (
               <div className="mt-2 flex items-center gap-2 text-xs flex-wrap">
                {openIssuesCount> 0 && (
                 <span className="text-red-600 font-medium">
                  {openIssuesCount} issue{openIssuesCount !== 1 ? 's' : ''}
                 </span>
                )}
                {pendingTasksCount> 0 && (
                 <span className="text-yellow-600 font-medium">
                  {pendingTasksCount} task{pendingTasksCount !== 1 ? 's' : ''}
                 </span>
                )}
               </div>
              )}
             </div>
            </div>
           </Link>
          );
         })
        )}
       </div>
      )}

      {/* Maintenance Tasks Tab */}
      {activeTab === 'tasks' && (
       <div className="space-y-4">
        {filteredTasks.length === 0 ? (
         <p className="text-gray-500 text-center py-8">No maintenance tasks found</p>
        ) : (
         filteredTasks.map(task => (
          <div key={task.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
           <div className="flex items-start justify-between">
            <div className="flex-1">
             <div className="flex items-center space-x-2 mb-2">
              <Link
               href={`/dashboard/equipment/items/${task.equipment.id}`}
               className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
>
               {task.equipment.name}
              </Link>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
               {task.status.replace('_', ' ')}
              </span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
               {task.priority}
              </span>
             </div>
             <h4 className="text-sm font-semibold text-gray-900">{task.title}</h4>
             <p className="text-sm text-gray-600 mt-1">{task.description}</p>
             <div className="mt-2 text-xs text-gray-500">
              {task.taskType} 
              {task.dueDate && ` • Due: ${formatDate(task.dueDate)}`}
              {task.assignedTo && ` • Assigned to: ${task.assignedTo}`}
             </div>
            </div>
           </div>
          </div>
         ))
        )}
       </div>
      )}
     </div>
    </div>
   </div>
  </DashboardLayout>
 );
}

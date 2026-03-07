'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Zone, Venue } from '@prisma/client';
import { QrCodeIcon, PrinterIcon, MinusIcon, PlusIcon } from '@heroicons/react/24/outline';
import DashboardLayout from '@/components/DashboardLayout';
import EquipmentManagementSubNav from '@/components/EquipmentManagementSubNav';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ZoneStatus {
 zoneId: string;
 zoneName: string;
 status: string;
 statusPriority: number;
 equipmentCount: number;
 criticalIssues: number;
 nonCriticalIssues: number;
 recommendations: number;
 overdueMaintenance: number;
 upcomingMaintenance: number;
 outOfServiceEquipment: number;
 poorConditionEquipment: number;
}

interface ZoneWithStatus extends Zone {
 statusInfo?: ZoneStatus;
}

interface MonthlyData {
 month: string;
 total: number;
 [key: string]: number | string;
}

export default function EquipmentPage() {
 const router = useRouter();
 const [zones, setZones] = useState<ZoneWithStatus[]>([]);
 const [venues, setVenues] = useState<Venue[]>([]);
 const [loading, setLoading] = useState(true);
 const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
 const [monthlyDataByVenue, setMonthlyDataByVenue] = useState<MonthlyData[]>([]);
 const [zoneNames, setZoneNames] = useState<string[]>([]);
 const [venueNames, setVenueNames] = useState<string[]>([]);
 const [stats, setStats] = useState({
  total: 0,
  inUse: 0,
  maintenanceDue: 0,
  needsAttention: 0,
 });
 const [statusFilter, setStatusFilter] = useState<string>('all');
 const [venueFilter, setVenueFilter] = useState<string>('all');
 const [zoneQRCodes, setZoneQRCodes] = useState<Record<string, string>>({});
 const [generatingQRForZone, setGeneratingQRForZone] = useState<string | null>(null);
 const [venueQRCodes, setVenueQRCodes] = useState<Array<{
  venueId: string;
  venueName: string;
  publicId: string;
  publicUrl: string;
  qrCodeDataUrl: string;
 }>>([]);
 const [generatingVenueQRs, setGeneratingVenueQRs] = useState(false);
 const [showVenueQRs, setShowVenueQRs] = useState(false);
 const [venueQRsExpanded, setVenueQRsExpanded] = useState(false);

 useEffect(() => {
  loadData();
 }, []);

 const loadData = async () => {
  try {
   setLoading(true);
   const [zonesRes, venuesRes, statsRes, statusRes, monthlyRes, monthlyByVenueRes] = await Promise.all([
    fetch('/api/zones'),
    fetch('/api/venues'),
    fetch('/api/equipment/analytics/overview'),
    fetch('/api/equipment/analytics/zone-status'),
    fetch('/api/equipment/analytics/safety-issues-monthly?months=6'),
    fetch('/api/equipment/analytics/safety-issues-monthly-by-venue?months=6'),
   ]);

   let zonesData: Zone[] = [];
   let venuesData: Venue[] = [];
   let statusData: ZoneStatus[] = [];

   if (zonesRes.ok) {
    const data = await zonesRes.json();
    zonesData = data.zones || data;
   }

   if (venuesRes.ok) {
    const data = await venuesRes.json();
    venuesData = data.venues || data;
    setVenues(venuesData);
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

   if (statusRes.ok) {
    const data = await statusRes.json();
    // API returns array directly, not wrapped in .zones
    statusData = Array.isArray(data) ? data : [];
    console.log('[equipment-page] Zone status data:', statusData);
   } else {
    const errorData = await statusRes.json().catch(() => ({ error: 'Unknown error' }));
    console.error('[equipment-page] Zone status fetch failed:', statusRes.status, statusRes.statusText);
    console.error('[equipment-page] Error details:', errorData);
   }

   if (monthlyRes.ok) {
    const data = await monthlyRes.json();
    setMonthlyData(data.data || []);
    setZoneNames(data.zones || []);
   }

   if (monthlyByVenueRes.ok) {
    const data = await monthlyByVenueRes.json();
    setMonthlyDataByVenue(data.data || []);
    setVenueNames(data.venues || []);
   }

   // Merge zone data with status info
   const zonesWithStatus = zonesData.map(zone => ({
    ...zone,
    statusInfo: statusData.find(s => s.zoneId === zone.id),
   }));

   console.log('[equipment-page] Zones with status:', zonesWithStatus.map(z => ({ 
    name: z.name, 
    hasStatusInfo: !!z.statusInfo,
    equipmentCount: z.statusInfo?.equipmentCount 
   })));

   setZones(zonesWithStatus);
   
   // Load existing QR codes for zones with publicIds
   loadExistingQRCodes(zonesWithStatus);
   
   // Load existing venue QR codes
   loadExistingVenueQRCodes();
  } catch (error) {
   console.error('Failed to load data:', error);
   alert('Failed to load equipment data');
  } finally {
   setLoading(false);
  }
 };

 const loadExistingQRCodes = async (zones: ZoneWithStatus[]) => {
  const zonesWithPublicIds = zones.filter(z => z.publicId);
  
  for (const zone of zonesWithPublicIds) {
   try {
    const response = await fetch(`/api/zones/${zone.id}/generate-qr`);
    if (response.ok) {
     const data = await response.json();
     if (data.hasQRCode) {
      setZoneQRCodes(prev => ({
       ...prev,
       [zone.id]: data.qrCodeDataUrl,
      }));
     }
    }
   } catch (error) {
    console.error(`Failed to load QR code for zone ${zone.id}:`, error);
   }
  }
 };

 const loadExistingVenueQRCodes = async () => {
  try {
   const response = await fetch('/api/venues/generate-qr');
   if (response.ok) {
    const data = await response.json();
    if (data.venueQRCodes && data.venueQRCodes.length > 0) {
     setVenueQRCodes(data.venueQRCodes);
     setShowVenueQRs(true);
    }
   }
  } catch (error) {
   console.error('Failed to load venue QR codes:', error);
  }
 };


 const getStatusBadgeConfig = (status: string) => {
  const configs = {
   NO_DEFECTS: {
    label: 'No Defects Detected',
    icon: '🟢',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    borderColor: 'border-green-300',
   },
   NON_CRITICAL_ISSUES: {
    label: 'Non-Critical Issues',
    icon: '🟡',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    borderColor: 'border-yellow-300',
   },
   REQUIRES_ATTENTION: {
    label: 'Requires Attention',
    icon: '🟠',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
    borderColor: 'border-orange-300',
   },
   CRITICAL_DEFECTS: {
    label: 'Critical Defects',
    icon: '🔴',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    borderColor: 'border-red-300',
   },
  };
  return configs[status as keyof typeof configs] || configs.NO_DEFECTS;
 };

 const handleGenerateZoneQR = async (zoneId: string) => {
  try {
   setGeneratingQRForZone(zoneId);
   const response = await fetch(`/api/zones/${zoneId}/generate-qr`, {
    method: 'POST',
   });

   if (!response.ok) {
    throw new Error('Failed to generate QR code');
   }

   const data = await response.json();
   
   // Store the QR code data URL for this zone
   setZoneQRCodes(prev => ({
    ...prev,
    [zoneId]: data.qrCodeDataUrl,
   }));
  } catch (error) {
   console.error('Failed to generate QR code:', error);
   alert('Failed to generate QR code');
  } finally {
   setGeneratingQRForZone(null);
  }
 };

 const handleGenerateVenueQRs = async () => {
  try {
   setGeneratingVenueQRs(true);
   
   // First try to GET existing QR codes
   const getResponse = await fetch('/api/venues/generate-qr');
   if (getResponse.ok) {
    const getData = await getResponse.json();
    if (getData.venueQRCodes && getData.venueQRCodes.length > 0) {
     setVenueQRCodes(getData.venueQRCodes);
     setShowVenueQRs(true);
     return;
    }
   }

   // If no existing QR codes, generate new ones
   const response = await fetch('/api/venues/generate-qr', {
    method: 'POST',
   });

   if (!response.ok) {
    throw new Error('Failed to generate venue QR codes');
   }

   const data = await response.json();
   setVenueQRCodes(data.venueQRCodes);
   setShowVenueQRs(true);
  } catch (error) {
   console.error('Failed to generate venue QR codes:', error);
   alert('Failed to generate venue QR codes');
  } finally {
   setGeneratingVenueQRs(false);
  }
 };

 const handlePrintVenueQR = (venueQR: { venueName: string; qrCodeDataUrl: string }) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
   console.error('Failed to open print window');
   return;
  }
  
  const safeVenueName = venueQR.venueName || 'Equipment Venue';
  
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <title>Venue QR Code - ${safeVenueName.replace(/"/g, '&quot;')}</title>
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
    .venue-name {
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
  <h1>Equipment Venue QR Code</h1>
  <div class="venue-name">${safeVenueName.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
  <img src="${venueQR.qrCodeDataUrl}" alt="QR Code" />
  <div class="instructions">
    <p>Scan this QR code to access venue equipment zones</p>
  </div>
</body>
</html>`;
  
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.focus();
  
  setTimeout(() => {
   printWindow.print();
  }, 250);
 };

 const filteredZones = zones.filter(z => {
  const matchesStatus = statusFilter === 'all' || z.statusInfo?.status === statusFilter;
  const matchesVenue = venueFilter === 'all' || z.venueId === venueFilter;
  return matchesStatus && matchesVenue;
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
   <div className="p-6 space-y-6">
    {/* Header */}
    <div className="mb-6 flex items-center justify-between">
     <div>
      <h1 className="text-2xl font-bold text-gray-900">Equipment Management</h1>
      <p className="mt-1 text-sm text-gray-600">
       Zone-based equipment tracking and safety management
      </p>
     </div>
     <button
      onClick={handleGenerateVenueQRs}
      disabled={generatingVenueQRs}
      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
     >
      <QrCodeIcon className="h-5 w-5 mr-2" />
      {generatingVenueQRs ? 'Generating...' : 'Generate Venue QR Codes'}
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

    {/* Filter Bar */}
    <div className="flex items-center justify-between gap-4">
     <div className="flex items-center gap-4">
      <div>
       <label htmlFor="venue-filter" className="text-sm font-medium text-gray-700 mr-2">
        Filter by Venue:
       </label>
       <select
        id="venue-filter"
        value={venueFilter}
        onChange={(e) => setVenueFilter(e.target.value)}
        className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
>
        <option value="all">All Venues</option>
        {venues.map(venue => (
         <option key={venue.id} value={venue.id}>
          {venue.name}
         </option>
        ))}
       </select>
      </div>
      <div>
       <label htmlFor="status-filter" className="text-sm font-medium text-gray-700 mr-2">
        Filter by Status:
       </label>
       <select
        id="status-filter"
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
>
        <option value="all">All Zones</option>
        <option value="NO_DEFECTS">No Defects</option>
        <option value="NON_CRITICAL_ISSUES">Non-Critical Issues</option>
        <option value="REQUIRES_ATTENTION">Requires Attention</option>
        <option value="CRITICAL_DEFECTS">Critical Defects</option>
       </select>
      </div>
     </div>
    </div>

    {/* Monthly Safety Issues Charts */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
     {/* By Zone Chart */}
     {monthlyData.length > 0 && (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
       <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Safety Issues Trend by Zone</h2>
        <p className="text-sm text-gray-600">Month-over-month safety issues reported per zone (Last 6 months)</p>
       </div>
       <div className="relative group hover-legend-chart">
        <style jsx>{`
         .custom-legend {
          opacity: 0;
          transition: opacity 0.3s ease;
          position: absolute;
          bottom: 10px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(255, 255, 255, 0.95);
          padding: 8px 16px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          z-index: 10;
          pointer-events: none;
         }
         .hover-legend-chart:hover .custom-legend {
          opacity: 1;
         }
        `}</style>
        <ResponsiveContainer width="100%" height={400}>
        <LineChart data={monthlyData}>
         <CartesianGrid strokeDasharray="3 3" />
         <XAxis 
          dataKey="month" 
          tick={{ fontSize: 12 }}
          angle={-15}
          textAnchor="end"
          height={60}
         />
         <YAxis 
          tick={{ fontSize: 12 }}
          label={{ value: 'Number of Issues', angle: -90, position: 'insideLeft' }}
         />
         <Tooltip 
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
          labelStyle={{ fontWeight: 'bold' }}
         />
         {zoneNames.map((zoneName, index) => {
          const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
          return (
           <Line
            key={zoneName}
            type="monotone"
            dataKey={zoneName}
            stroke={colors[index % colors.length]}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
           />
          );
         })}
         <Line
          type="monotone"
          dataKey="total"
          stroke="#1f2937"
          strokeWidth={3}
          strokeDasharray="5 5"
          dot={{ r: 5 }}
          activeDot={{ r: 7 }}
          name="Total (All Zones)"
         />
        </LineChart>
       </ResponsiveContainer>
       <div className="custom-legend">
        <div className="flex flex-wrap gap-4 justify-center items-center text-xs">
         {zoneNames.map((zoneName, index) => {
          const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
          return (
           <div key={zoneName} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[index % colors.length] }}></div>
            <span>{zoneName}</span>
           </div>
          );
         })}
         <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-gray-800" style={{ borderTop: '2px dashed #1f2937', width: '12px' }}></div>
          <span>Total (All Zones)</span>
         </div>
        </div>
       </div>
       </div>
      </div>
     )}

     {/* By Venue Chart */}
     {monthlyDataByVenue.length > 0 && (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
       <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Safety Issues Trend by Venue</h2>
        <p className="text-sm text-gray-600">Month-over-month safety issues reported per venue (Last 6 months)</p>
       </div>
       <div className="relative group hover-legend-chart">
        <style jsx>{`
         .custom-legend {
          opacity: 0;
          transition: opacity 0.3s ease;
          position: absolute;
          bottom: 10px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(255, 255, 255, 0.95);
          padding: 8px 16px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          z-index: 10;
          pointer-events: none;
         }
         .hover-legend-chart:hover .custom-legend {
          opacity: 1;
         }
        `}</style>
        <ResponsiveContainer width="100%" height={400}>
        <LineChart data={monthlyDataByVenue}>
         <CartesianGrid strokeDasharray="3 3" />
         <XAxis 
          dataKey="month" 
          tick={{ fontSize: 12 }}
          angle={-15}
          textAnchor="end"
          height={60}
         />
         <YAxis 
          tick={{ fontSize: 12 }}
          label={{ value: 'Number of Issues', angle: -90, position: 'insideLeft' }}
         />
         <Tooltip 
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
          labelStyle={{ fontWeight: 'bold' }}
         />
         {venueNames.map((venueName, index) => {
          const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
          return (
           <Line
            key={venueName}
            type="monotone"
            dataKey={venueName}
            stroke={colors[index % colors.length]}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
           />
          );
         })}
         <Line
          type="monotone"
          dataKey="total"
          stroke="#1f2937"
          strokeWidth={3}
          strokeDasharray="5 5"
          dot={{ r: 5 }}
          activeDot={{ r: 7 }}
          name="Total (All Venues)"
         />
        </LineChart>
       </ResponsiveContainer>
       <div className="custom-legend">
        <div className="flex flex-wrap gap-4 justify-center items-center text-xs">
         {venueNames.map((venueName, index) => {
          const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
          return (
           <div key={venueName} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[index % colors.length] }}></div>
            <span>{venueName}</span>
           </div>
          );
         })}
         <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-gray-800" style={{ borderTop: '2px dashed #1f2937', width: '12px' }}></div>
          <span>Total (All Venues)</span>
         </div>
        </div>
       </div>
       </div>
      </div>
     )}
    </div>

    {/* Venue QR Codes Section */}
    {showVenueQRs && venueQRCodes.length > 0 && (
     <div className="mb-8">
      <div
       className="flex items-center justify-between mb-4 cursor-pointer group"
       onClick={() => setVenueQRsExpanded(!venueQRsExpanded)}
      >
       <div className="flex items-center gap-2">
        <button className="p-1 hover:bg-gray-100 rounded transition-colors">
         {venueQRsExpanded ? (
          <MinusIcon className="h-5 w-5 text-gray-500" />
         ) : (
          <PlusIcon className="h-5 w-5 text-gray-500" />
         )}
        </button>
        <h2 className="text-xl font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
         Venue QR Codes
        </h2>
       </div>
      </div>
      {venueQRsExpanded && (
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
       {venueQRCodes.map((venueQR) => (
        <div
         key={venueQR.venueId}
         className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
        >
         <div className="flex flex-col items-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 text-center">
           {venueQR.venueName}
          </h3>
          <div className="w-32 h-32 mb-4">
           <img
            src={venueQR.qrCodeDataUrl}
            alt={`QR Code for ${venueQR.venueName}`}
            className="w-full h-full"
           />
          </div>
          <button
           onClick={(e) => {
            e.stopPropagation();
            handlePrintVenueQR(venueQR);
           }}
           className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
           <PrinterIcon className="h-4 w-4 mr-2" />
           Print
          </button>
         </div>
        </div>
       ))}
       </div>
      )}
     </div>
    )}

    {/* Zone Cards Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
     {filteredZones.length === 0 ? (
      <div className="col-span-full text-center py-12">
       <p className="text-gray-500">No zones found</p>
      </div>
     ) : (
      filteredZones.map(zone => {
       const statusInfo = zone.statusInfo;
       const statusConfig = statusInfo 
        ? getStatusBadgeConfig(statusInfo.status)
        : getStatusBadgeConfig('NO_DEFECTS');

       return (
        <div
         key={zone.id}
         className={`bg-white border-2 ${statusConfig.borderColor} rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden cursor-pointer`}
         onClick={() => router.push(`/dashboard/equipment/zones/${zone.id}`)}
>
         {/* Zone Header */}
         <div className="p-6">
          <div className="flex items-start justify-between mb-4">
           <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{zone.name}</h3>
            {zone.description && (
             <p className="text-sm text-gray-500 mt-1">{zone.description}</p>
            )}
           </div>
           {/* QR Code Display in Top Right */}
           {zoneQRCodes[zone.id] && (
            <div className="ml-4">
             <img 
              src={zoneQRCodes[zone.id]} 
              alt="Zone QR Code" 
              className="w-16 h-16 border border-gray-300 rounded"
             />
            </div>
           )}
          </div>

          {/* Status Badge */}
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bgColor} ${statusConfig.textColor} mb-4`}>
           <span className="mr-2">{statusConfig.icon}</span>
           {statusConfig.label}
          </div>

          {/* Stats */}
          <div className="space-y-2">
           {/* Always show equipment count */}
           <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Equipment:</span>
            <span className="font-medium text-gray-900">{statusInfo?.equipmentCount || 0}</span>
           </div>
           {statusInfo && statusInfo.criticalIssues> 0 && (
            <div className="flex items-center justify-between text-sm">
             <span className="text-red-600">Critical Issues:</span>
             <span className="font-bold text-red-700">{statusInfo.criticalIssues}</span>
            </div>
           )}
           {statusInfo && statusInfo.nonCriticalIssues> 0 && (
            <div className="flex items-center justify-between text-sm">
             <span className="text-orange-600">Non-Critical Issues:</span>
             <span className="font-medium text-orange-700">{statusInfo.nonCriticalIssues}</span>
            </div>
           )}
           {statusInfo && statusInfo.overdueMaintenance> 0 && (
            <div className="flex items-center justify-between text-sm">
             <span className="text-yellow-600">Overdue Maintenance:</span>
             <span className="font-medium text-yellow-700">{statusInfo.overdueMaintenance}</span>
            </div>
           )}
           {statusInfo && statusInfo.outOfServiceEquipment> 0 && (
            <div className="flex items-center justify-between text-sm">
             <span className="text-gray-600">Out of Service:</span>
             <span className="font-medium text-gray-700">{statusInfo.outOfServiceEquipment}</span>
            </div>
           )}
          </div>
         </div>

         {/* Quick Actions */}
         <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
          <button
           onClick={(e) => {
            e.stopPropagation();
            router.push(`/dashboard/equipment/zones/${zone.id}`);
           }}
           className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
>
           View Equipment →
          </button>
          <button
           onClick={(e) => {
            e.stopPropagation();
            handleGenerateZoneQR(zone.id);
           }}
           disabled={generatingQRForZone === zone.id}
           className="text-gray-400 hover:text-indigo-600 disabled:opacity-50 transition-colors"
           title="Generate QR Code"
>
           {generatingQRForZone === zone.id ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400"></div>
           ) : (
            <QrCodeIcon className="h-5 w-5" />
           )}
          </button>
         </div>
        </div>
       );
      })
     )}
    </div>
   </div>
  </DashboardLayout>
 );
}

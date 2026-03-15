'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import InjuryReportsSubNav from '@/components/InjuryReportsSubNav';
import QRCodeProtectionStatus from '@/components/QRCodeProtectionStatus';
import { showToast } from '@/lib/toast';
import { useConfirm } from '@/components/ConfirmProvider';

interface FormTemplate {
 id: string;
 name: string;
 description: string | null;
 active: boolean;
 publicUrl: string;
 qrCode: string | null;
 createdAt: string;
 _count: {
  submissions: number;
 };
}

export default function FormTemplatesPage() {
 const [templates, setTemplates] = useState<FormTemplate[]>([]);
 const [loading, setLoading] = useState(true);
 const [showQRCode, setShowQRCode] = useState<string | null>(null);
 const { confirm } = useConfirm();

 useEffect(() => {
  loadTemplates();
 }, []);

 const loadTemplates = async () => {
  try {
   const res = await fetch('/api/injury-forms');
   if (res.ok) {
    const data = await res.json();
    setTemplates(data.templates);
   }
  } catch (error) {
   console.error('Error loading templates:', error);
  } finally {
   setLoading(false);
  }
 };

 const toggleActive = async (id: string, currentActive: boolean) => {
  try {
   const template = templates.find(t => t.id === id);
   if (!template) return;

   const res = await fetch(`/api/injury-forms/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
     name: template.name,
     description: template.description,
     active: !currentActive,
    }),
   });

   if (res.ok) {
    loadTemplates();
   }
  } catch (error) {
   console.error('Error updating template:', error);
  }
 };

 const generateQRCode = async (id: string) => {
  try {
   const res = await fetch(`/api/injury-forms/${id}/qr-code`);
   if (res.ok) {
    const data = await res.json();
    setTemplates(templates.map(t => 
     t.id === id ? { ...t, qrCode: data.qrCode } : t
    ));
    setShowQRCode(id);
   }
  } catch (error) {
   console.error('Error generating QR code:', error);
  }
 };

 const copyPublicUrl = (publicUrl: string) => {
  const fullUrl = `${window.location.origin}/injury-report/${publicUrl}`;
  navigator.clipboard.writeText(fullUrl);
  showToast.success('URL copied to clipboard!');
 };

 const downloadQRCode = (template: FormTemplate) => {
  if (!template.qrCode) return;
  
  const link = document.createElement('a');
  link.href = template.qrCode;
  link.download = `injury-form-qr-${template.name.replace(/\s+/g, '-').toLowerCase()}.png`;
  link.click();
 };

 const handlePrintQRCode = (template: FormTemplate) => {
  if (!template.qrCode) return;
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
   console.error('Failed to open print window');
   return;
  }
  
  const safeTemplateName = template.name || 'Injury Report Form';
  
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <title>Injury Report Form QR Code - ${safeTemplateName.replace(/"/g, '&quot;')}</title>
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
      color: #1f2937;
    }
    .form-name {
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
  <h1>Injury Report Form QR Code</h1>
  <div class="form-name">${safeTemplateName.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
  <img src="${template.qrCode}" alt="QR Code" />
  <div class="instructions">
    <p>Scan this QR code to submit an injury report</p>
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

 const deleteTemplate = async (id: string, name: string) => {
  const confirmed = await confirm({
   title: 'Delete Form',
   message: `Are you sure you want to delete the form "${name}"? This action cannot be undone.`,
   confirmText: 'Delete',
   variant: 'danger',
  });

  if (!confirmed) return;

  try {
   const res = await fetch(`/api/injury-forms/${id}`, {
    method: 'DELETE',
   });

   if (res.ok) {
    showToast.deleteSuccess('Form');
    loadTemplates();
   } else {
    const error = await res.json();
    showToast.error(error.error || 'Failed to delete form');
   }
  } catch (error) {
   console.error('Error deleting template:', error);
   showToast.error('Failed to delete form');
  }
 };

 if (loading) {
  return (
   <DashboardLayout title="Form Templates">
    <InjuryReportsSubNav />
    <div className="flex items-center justify-center h-64">
     <div className="text-gray-500">Loading...</div>
    </div>
   </DashboardLayout>
  );
 }

 return (
  <DashboardLayout title="Injury and Incident Management">
   <InjuryReportsSubNav />
   <div className="space-y-6">
   {/* Header with Gradient */}
   <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-xl shadow-lg">
    <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,black)]"></div>
    <div className="relative p-6">
     <div className="flex items-start justify-between">
      <div>
       <h1 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Injury and Incident Management
       </h1>
       <p className="text-blue-100 text-sm">Create and manage custom injury report forms</p>
      </div>
      <Link
       href="/dashboard/injury-reports/forms/new"
       className="px-5 py-2 bg-white text-indigo-700 rounded-lg hover:bg-blue-50 font-semibold shadow-lg transition-all flex items-center gap-2"
      >
       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
       </svg>
       Create New Form
      </Link>
     </div>
    </div>
   </div>

   {/* Templates List */}
   {templates.length === 0 ? (
    <div className="bg-white rounded-xl shadow-lg border border-blue-200 overflow-hidden">
     <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
      <h2 className="text-lg font-bold text-white flex items-center gap-2">
       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
       </svg>
       Getting Started
      </h2>
     </div>
     <div className="p-12 text-center">
      <div className="text-gray-400 text-lg mb-2">No forms created yet</div>
      <p className="text-gray-500 text-sm mb-6">Create your first injury report form to start collecting submissions</p>
      <Link
       href="/dashboard/injury-reports/forms/new"
       className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-lg transition-all"
      >
       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
       </svg>
       Create Your First Form
      </Link>
     </div>
    </div>
   ) : (
    <div className="grid grid-cols-1 gap-6">
     {templates.map((template) => (
      <div key={template.id} className="bg-white rounded-xl shadow-lg border border-blue-200 overflow-hidden">
       {/* Template Header */}
       <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
        <div className="flex items-center justify-between">
         <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-xl font-bold text-white">{template.name}</h3>
          {template.active ? (
           <span className="px-3 py-1 text-xs font-bold bg-green-100 text-green-800 rounded-full border-2 border-green-300">Active</span>
          ) : (
           <span className="px-3 py-1 text-xs font-bold bg-gray-100 text-gray-800 rounded-full border-2 border-gray-300">Inactive</span>
          )}
         </div>
        </div>
        {template.description && (
         <p className="text-blue-100 mt-2">{template.description}</p>
        )}
       </div>

       <div className="p-6">
        {/* Stats */}
        <div className="flex items-center gap-6 mb-6 text-sm">
         <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="font-semibold text-gray-900">{template._count.submissions}</span>
          <span className="text-gray-600">submissions</span>
         </div>
         <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-gray-600">Created {new Date(template.createdAt).toLocaleDateString()}</span>
         </div>
        </div>
         
        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap mb-6">
         <button
          onClick={() => toggleActive(template.id, template.active)}
          className="px-4 py-2 text-sm font-medium border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
         >
          {template.active ? 'Deactivate' : 'Activate'}
         </button>
         <Link
          href={`/dashboard/injury-reports/forms/${template.id}/edit`}
          className="px-4 py-2 text-sm font-medium border-2 border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-all"
         >
          Edit Form
         </Link>
         <Link
          href={`/dashboard/injury-reports/forms/${template.id}/automations`}
          className="px-4 py-2 text-sm font-semibold bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 shadow-sm transition-all"
         >
          Automations
         </Link>
         <button
          onClick={() => deleteTemplate(template.id, template.name)}
          className="px-4 py-2 text-sm font-semibold bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 shadow-sm transition-all"
          title="Delete this form template"
         >
          Delete
         </button>
        </div>

        {/* QR Code and URL Section */}
        <div className="pt-6 border-t border-gray-200">
         <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4 mb-4">
          <div className="flex items-start justify-between gap-4">
           <div className="flex-1">
            <div className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
             <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
             </svg>
             Public Form URL
            </div>
            <div className="flex items-center gap-2">
             <code className="text-sm bg-white px-3 py-2 rounded-lg border-2 border-blue-200 flex-1 font-mono">
              {window.location.origin}/injury-report/{template.publicUrl}
             </code>
             <button
              onClick={() => copyPublicUrl(template.publicUrl)}
              className="px-4 py-2 text-sm font-medium bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
             >
              Copy
             </button>
            </div>
           </div>
          </div>
         </div>
          
         <div className="flex gap-2 flex-wrap">
          {!template.qrCode ? (
           <button
            onClick={() => generateQRCode(template.id)}
            className="px-4 py-2.5 text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 shadow-sm transition-all flex items-center gap-2"
           >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            Generate QR Code
           </button>
          ) : (
           <>
            <button
             onClick={() => setShowQRCode(showQRCode === template.id ? null : template.id)}
             className="px-4 py-2 text-sm font-medium border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
            >
             {showQRCode === template.id ? 'Hide' : 'Show'} QR Code
            </button>
            <button
             onClick={() => handlePrintQRCode(template)}
             className="px-4 py-2 text-sm font-medium border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all flex items-center gap-2"
            >
             <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
             </svg>
             Print
            </button>
            <button
             onClick={() => downloadQRCode(template)}
             className="px-4 py-2 text-sm font-semibold bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 shadow-sm transition-all"
            >
             Download QR Code
            </button>
           </>
          )}
         </div>

         {/* QR Code Display */}
         {showQRCode === template.id && template.qrCode && (
          <div className="mt-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border-2 border-blue-200">
           <div className="text-center">
            <div className="inline-block bg-white p-4 rounded-xl shadow-lg border-2 border-blue-300">
             <img 
              src={template.qrCode} 
              alt="QR Code" 
              className="w-64 h-64"
             />
            </div>
            <div className="mt-4">
             <QRCodeProtectionStatus />
            </div>
            <p className="text-sm font-medium text-blue-900 mt-3 flex items-center justify-center gap-2">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
             </svg>
             Scan this QR code to access the form
            </p>
           </div>
          </div>
         )}
        </div>
       </div>
      </div>
     ))}
    </div>
   )}
  </div>
  </DashboardLayout>
 );
}

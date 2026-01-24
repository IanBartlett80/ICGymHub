'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';

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
  const router = useRouter();
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQRCode, setShowQRCode] = useState<string | null>(null);

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
    alert('URL copied to clipboard!');
  };

  const downloadQRCode = (template: FormTemplate) => {
    if (!template.qrCode) return;
    
    const link = document.createElement('a');
    link.href = template.qrCode;
    link.download = `injury-form-qr-${template.name.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.click();
  };

  if (loading) {
    return (
      <DashboardLayout title="Form Templates">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Form Templates">
      <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Injury Report Forms</h1>
          <p className="text-gray-600 mt-1">Create and manage custom injury report forms</p>
        </div>
        <Link
          href="/dashboard/injury-reports/forms/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Create New Form
        </Link>
      </div>

      {/* Templates List */}
      {templates.length === 0 ? (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
          <div className="text-gray-400 text-lg mb-2">No forms created yet</div>
          <p className="text-gray-500 text-sm mb-6">Create your first injury report form to start collecting submissions</p>
          <Link
            href="/dashboard/injury-reports/forms/new"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Your First Form
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {templates.map((template) => (
            <div key={template.id} className="bg-white rounded-lg shadow border border-gray-200">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-semibold text-gray-900">{template.name}</h3>
                      {template.active ? (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">Active</span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">Inactive</span>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-gray-600 mt-2">{template.description}</p>
                    )}
                    <div className="flex items-center gap-6 mt-4 text-sm text-gray-500">
                      <div>
                        <span className="font-medium">{template._count.submissions}</span> submissions
                      </div>
                      <div>
                        Created {new Date(template.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleActive(template.id, template.active)}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      {template.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <Link
                      href={`/dashboard/injury-reports/forms/${template.id}/edit`}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/dashboard/injury-reports/forms/${template.id}/automations`}
                      className="px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      Automations
                    </Link>
                  </div>
                </div>

                {/* QR Code and URL Section */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-2">Public Form URL</div>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-gray-100 px-3 py-2 rounded border border-gray-300">
                          {window.location.origin}/injury-report/{template.publicUrl}
                        </code>
                        <button
                          onClick={() => copyPublicUrl(template.publicUrl)}
                          className="px-3 py-2 text-sm bg-gray-100 border border-gray-300 rounded hover:bg-gray-200"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {!template.qrCode ? (
                        <button
                          onClick={() => generateQRCode(template.id)}
                          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Generate QR Code
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => setShowQRCode(showQRCode === template.id ? null : template.id)}
                            className="px-4 py-2 text-sm bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
                          >
                            {showQRCode === template.id ? 'Hide' : 'Show'} QR Code
                          </button>
                          <button
                            onClick={() => downloadQRCode(template)}
                            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            Download QR
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* QR Code Display */}
                  {showQRCode === template.id && template.qrCode && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg text-center">
                      <img 
                        src={template.qrCode} 
                        alt="QR Code" 
                        className="mx-auto w-64 h-64"
                      />
                      <p className="text-sm text-gray-600 mt-2">Scan this QR code to access the form</p>
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

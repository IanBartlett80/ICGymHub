'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import InjuryReportsSubNav from '@/components/InjuryReportsSubNav';
import VenueSelector from '@/components/VenueSelector';
import { showToast, confirmAndDelete } from '@/lib/toast';

interface FormField {
 id?: string;
 fieldType: string;
 label: string;
 description?: string;
 placeholder?: string;
 required: boolean;
 order: number;
 options?: string[];
 validation?: any;
 conditionalLogic?: any;
}

interface FormSection {
 id?: string;
 title: string;
 description?: string;
 order: number;
 fields: FormField[];
}

interface FormTemplate {
 id: string;
 name: string;
 description: string;
 venueId?: string | null;
 headerColor: string;
 logoUrl?: string;
 thankYouMessage: string;
 sections: FormSection[];
}

const FIELD_TYPES = [
 { value: 'TEXT_SHORT', label: 'Short Text' },
 { value: 'TEXT_LONG', label: 'Long Text' },
 { value: 'EMAIL', label: 'Email' },
 { value: 'PHONE', label: 'Phone' },
 { value: 'NUMBER', label: 'Number' },
 { value: 'DATE', label: 'Date' },
 { value: 'TIME', label: 'Time' },
 { value: 'DROPDOWN', label: 'Dropdown' },
 { value: 'RADIO', label: 'Radio Buttons' },
 { value: 'CHECKBOX', label: 'Checkboxes' },
 { value: 'FILE_UPLOAD', label: 'File Upload' },
 { value: 'SIGNATURE', label: 'Signature' },
];

export default function EditFormPage() {
 const router = useRouter();
 const params = useParams();
 const templateId = params.id as string;

 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [showPreview, setShowPreview] = useState(false);
 const [template, setTemplate] = useState<FormTemplate>({
  id: '',
  name: '',
  description: '',
  headerColor: '#0078d4',
  thankYouMessage: 'Thank you for your submission. We will review this report shortly.',
  sections: [],
 });

 useEffect(() => {
  loadTemplate();
 }, [templateId]);

 const loadTemplate = async () => {
  try {
   const res = await fetch(`/api/injury-forms/${templateId}`);
   if (res.ok) {
    const data = await res.json();
    
    // Parse JSON fields (options, validation, conditionalLogic)
    const parsedTemplate = {
     ...data.template,
     sections: data.template.sections.map((section: any) => ({
      ...section,
      fields: section.fields.map((field: any) => ({
       ...field,
       options: field.options ? JSON.parse(field.options) : undefined,
       validation: field.validation ? JSON.parse(field.validation) : undefined,
       conditionalLogic: field.conditionalLogic ? JSON.parse(field.conditionalLogic) : undefined,
      })),
     })),
    };
    
    setTemplate(parsedTemplate);
   } else {
    showToast.error('Form not found');
    router.push('/dashboard/injury-reports/forms');
   }
  } catch (error) {
   console.error('Error loading template:', error);
   showToast.error('Error loading form');
  } finally {
   setLoading(false);
  }
 };

 const addSection = () => {
  setTemplate({
   ...template,
   sections: [
    ...template.sections,
    {
     title: 'New Section',
     description: '',
     order: template.sections.length,
     fields: [],
    },
   ],
  });
 };

 const updateSection = (index: number, updates: Partial<FormSection>) => {
  const newSections = [...template.sections];
  newSections[index] = { ...newSections[index], ...updates };
  setTemplate({ ...template, sections: newSections });
 };

 const removeSection = (index: number) => {
  const sectionTitle = template.sections[index].title || 'section';
  confirmAndDelete(`${sectionTitle}`, () => {
   const newSections = template.sections.filter((_, i) => i !== index);
   setTemplate({ ...template, sections: newSections });
  });
 };

 const addField = (sectionIndex: number) => {
  const newSections = [...template.sections];
  newSections[sectionIndex].fields.push({
   fieldType: 'TEXT_SHORT',
   label: 'New Field',
   required: false,
   order: newSections[sectionIndex].fields.length,
  });
  setTemplate({ ...template, sections: newSections });
 };

 const updateField = (sectionIndex: number, fieldIndex: number, updates: Partial<FormField>) => {
  const newSections = [...template.sections];
  newSections[sectionIndex].fields[fieldIndex] = {
   ...newSections[sectionIndex].fields[fieldIndex],
   ...updates,
  };
  setTemplate({ ...template, sections: newSections });
 };

 const removeField = (sectionIndex: number, fieldIndex: number) => {
  const field = template.sections[sectionIndex].fields[fieldIndex];
  const fieldLabel = field.label || 'question';
  confirmAndDelete(`${fieldLabel}`, () => {
   const newSections = [...template.sections];
   newSections[sectionIndex].fields = newSections[sectionIndex].fields.filter((_, i) => i !== fieldIndex);
   setTemplate({ ...template, sections: newSections });
  });
 };

 const handleSave = async () => {
  if (!template.name.trim()) {
   showToast.error('Please enter a form name');
   return;
  }

  setSaving(true);
  try {
   const res = await fetch(`/api/injury-forms/${templateId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(template),
   });

   if (res.ok) {
    showToast.saveSuccess('Form');
    router.push('/dashboard/injury-reports/forms');
   } else {
    const data = await res.json();
    showToast.error(data.error || 'Failed to update form');
   }
  } catch (error) {
   console.error('Error saving form:', error);
   showToast.error('Error saving form');
  } finally {
   setSaving(false);
  }
 };

 if (loading) {
  return (
   <DashboardLayout title="Edit Form">
    <InjuryReportsSubNav />
    <div className="flex items-center justify-center h-64">
     <div className="text-gray-500">Loading...</div>
    </div>
   </DashboardLayout>
  );
 }

 return (
  <DashboardLayout title="Edit Form">
   <InjuryReportsSubNav />
   <div className="max-w-6xl mx-auto space-y-6">
    {/* Header */}
    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-6 mb-6">
     <div className="flex justify-between items-center">
      <div>
       <h1 className="text-3xl font-bold text-white flex items-center gap-3">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Edit Injury Report Form
       </h1>
       <p className="text-blue-100 mt-2">Customize sections and fields for your injury reporting</p>
      </div>
      <div className="flex gap-3">
       <button
        onClick={() => router.back()}
        className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/20 font-medium"
>
        Cancel
       </button>
       <button
        onClick={() => setShowPreview(true)}
        className="px-5 py-2.5 bg-white/90 hover:bg-white text-blue-700 rounded-lg transition-colors font-medium flex items-center gap-2"
       >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        Preview Form
       </button>
       <button
        onClick={handleSave}
        disabled={saving}
        className="px-6 py-2.5 bg-white text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg flex items-center gap-2"
>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        {saving ? 'Saving...' : 'Save Changes'}
       </button>
      </div>
     </div>
    </div>

    {/* Form Settings */}
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mb-6">
     <div className="bg-gradient-to-r from-gray-100 to-gray-50 border-b border-gray-200 px-6 py-4">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
       <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
       </svg>
       Form Settings
      </h2>
      <p className="text-sm text-gray-600 mt-1">Configure basic form properties and appearance</p>
     </div>
     <div className="p-6 space-y-5">
      <div>
       <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
        Form Name
        <span className="text-red-500">*</span>
       </label>
       <input
        type="text"
        value={template.name}
        onChange={(e) => setTemplate({ ...template, name: e.target.value })}
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        placeholder="e.g., Injury Report Form"
       />
       <p className="text-xs text-gray-500 mt-1.5">The main identifier for this form</p>
      </div>

      <div>
       <label className="block text-sm font-semibold text-gray-700 mb-2">
        Description
       </label>
       <textarea
        value={template.description}
        onChange={(e) => setTemplate({ ...template, description: e.target.value })}
        rows={3}
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
        placeholder="Brief description of this form's purpose..."
       />
       <p className="text-xs text-gray-500 mt-1.5">Helps users understand when to use this form</p>
      </div>

      <div>
       <label className="block text-sm font-semibold text-gray-700 mb-2">
        Venue Assignment
       </label>
       <VenueSelector
        value={template.venueId || null}
        onChange={(venue) => setTemplate({ ...template, venueId: venue || null })}
        showLabel={false}
       />
       <p className="text-xs text-gray-500 mt-1.5 flex items-start gap-1">
        <svg className="w-3 h-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Optional - Restrict this form to a specific venue location</span>
       </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
       <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
         Header Color
        </label>
        <div className="flex items-center gap-3">
         <input
          type="color"
          value={template.headerColor}
          onChange={(e) => setTemplate({ ...template, headerColor: e.target.value })}
          className="w-16 h-10 border-2 border-gray-300 rounded-lg cursor-pointer"
         />
         <div className="flex-1">
          <div className="text-xs font-mono text-gray-600 bg-gray-100 px-3 py-2 rounded-lg border border-gray-200">
           {template.headerColor.toUpperCase()}
          </div>
         </div>
        </div>
        <p className="text-xs text-gray-500 mt-1.5">Mobile form header color</p>
       </div>
       <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
         Logo URL (optional)
        </label>
        <input
         type="url"
         value={template.logoUrl || ''}
         onChange={(e) => setTemplate({ ...template, logoUrl: e.target.value })}
         className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
         placeholder="https://example.com/logo.png"
        />
        <p className="text-xs text-gray-500 mt-1.5">Form header logo</p>
       </div>
      </div>

      <div>
       <label className="block text-sm font-semibold text-gray-700 mb-2">
        Thank You Message
       </label>
       <textarea
        value={template.thankYouMessage}
        onChange={(e) => setTemplate({ ...template, thankYouMessage: e.target.value })}
        rows={2}
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
        placeholder="Message shown after successful submission..."
       />
       <p className="text-xs text-gray-500 mt-1.5">Displayed when users submit the form</p>
      </div>
     </div>
    </div>

    {/* Sections */}
    <div className="space-y-6">
     <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200 shadow-sm">
      <div className="flex justify-between items-center">
       <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
         <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
         </svg>
         Form Sections
        </h2>
        <p className="text-sm text-purple-800 mt-1">Organize your form into logical sections with custom fields</p>
       </div>
       <button
        onClick={addSection}
        className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 shadow-lg font-medium flex items-center gap-2 transition-all"
>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Section
       </button>
      </div>
     </div>

     {template.sections.map((section, sectionIndex) => (
      <div key={sectionIndex} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
       {/* Section Header */}
       <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 p-6">
        <div className="flex justify-between items-start mb-3">
         <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold shadow-md text-lg">
           {sectionIndex + 1}
          </div>
          <div className="flex-1">
           <input
            type="text"
            value={section.title}
            onChange={(e) => updateSection(sectionIndex, { title: e.target.value })}
            className="w-full text-xl font-bold text-gray-900 bg-white border-2 border-blue-200 px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            placeholder="Section Title"
           />
          </div>
         </div>
         <button
          onClick={() => removeSection(sectionIndex)}
          className="ml-4 px-4 py-2.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium text-sm flex items-center gap-2 shadow-sm"
>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Remove Section
         </button>
        </div>
        <input
         type="text"
         value={section.description || ''}
         onChange={(e) => updateSection(sectionIndex, { description: e.target.value })}
         className="w-full text-sm text-blue-800 bg-white border border-blue-200 px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
         placeholder="Section description (optional)"
        />
       </div>

       {/* Fields */}
       <div className="p-6">
        <div className="space-y-3">
         {section.fields.map((field, fieldIndex) => (
          <div key={fieldIndex} className="bg-gradient-to-r from-gray-50 to-blue-50/30 rounded-lg p-4 border-2 border-gray-200 hover:border-blue-300 hover:shadow-md transition-all">
           <div className="grid grid-cols-12 gap-3 items-start">
            <div className="col-span-3">
             <label className="text-xs font-semibold text-gray-600 mb-1 block">Field Type</label>
             <select
              value={field.fieldType}
              onChange={(e) => updateField(sectionIndex, fieldIndex, { fieldType: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all"
>
              {FIELD_TYPES.map((type) => (
               <option key={type.value} value={type.value}>
                {type.label}
               </option>
              ))}
             </select>
            </div>
            <div className="col-span-4">
             <label className="text-xs font-semibold text-gray-600 mb-1 block">Label</label>
             <input
              type="text"
              value={field.label}
              onChange={(e) => updateField(sectionIndex, fieldIndex, { label: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all font-medium"
              placeholder="Field Label"
             />
            </div>
            <div className="col-span-3">
             <label className="text-xs font-semibold text-gray-600 mb-1 block">Placeholder</label>
             <input
              type="text"
              value={field.placeholder || ''}
              onChange={(e) => updateField(sectionIndex, fieldIndex, { placeholder: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="Hint text"
             />
            </div>
            <div className="col-span-1 flex flex-col items-center justify-center pt-5">
             <label className="flex flex-col items-center cursor-pointer group">
              <input
               type="checkbox"
               checked={field.required}
               onChange={(e) => updateField(sectionIndex, fieldIndex, { required: e.target.checked })}
               className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-600 group-hover:text-blue-700 font-medium mt-1">Req</span>
             </label>
            </div>
            <div className="col-span-1 flex justify-center items-center pt-5">
             <button
              onClick={() => removeField(sectionIndex, fieldIndex)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete field"
>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
             </button>
            </div>
           </div>

           {(field.fieldType === 'DROPDOWN' || field.fieldType === 'RADIO' || field.fieldType === 'CHECKBOX') && (
            <div className="mt-3 bg-white rounded-lg p-3 border border-blue-200">
             <label className="block text-xs font-semibold text-gray-700 mb-2">Options (one per line)</label>
             <textarea
              value={field.options?.join('\n') || ''}
              onChange={(e) => updateField(sectionIndex, fieldIndex, { 
               options: e.target.value.split('\n')
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              placeholder="Enter options (one per line)"
              rows={4}
             />
            </div>
           )}
          </div>
         ))}
        </div>

        <button
         onClick={() => addField(sectionIndex)}
         className="w-full mt-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-700 hover:bg-blue-50 transition-all font-medium flex items-center justify-center gap-2"
>
         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
         </svg>
         Add Field
        </button>
       </div>
      </div>
     ))}

     {template.sections.length === 0 && (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
       <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
       </div>
       <h3 className="text-lg font-semibold text-gray-700 mb-2">No Sections Yet</h3>
       <p className="text-gray-500 mb-6">
        Start building your form by adding sections with custom fields
       </p>
       <button
        onClick={addSection}
        className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 shadow-lg font-medium inline-flex items-center gap-2"
>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Your First Section
       </button>
      </div>
     )}
    </div>

    {/* Preview Modal */}
    {showPreview && (
     <div className="fixed inset-0 bg-gray-900 bg-opacity-75 z-50 overflow-y-auto">
      <div className="py-8 px-6" style={{ backgroundColor: template.headerColor }}>
       <h2 className="text-2xl font-bold text-white">Form Preview</h2>
       <button
        onClick={() => setShowPreview(false)}
        className="absolute top-4 right-4 text-white text-2xl hover:bg-white/20 rounded px-3 py-1"
>
        ✕
       </button>
      </div>
      
      <div className="max-w-3xl mx-auto px-6 py-8">
       <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{template.name || 'Untitled Form'}</h1>
        {template.description && <p className="text-gray-600 mb-6">{template.description}</p>}

        {template.sections.map((section, sectionIndex) => (
         <div key={sectionIndex} className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
           {sectionIndex + 1}. {section.title}
          </h3>
          {section.description && (
           <p className="text-sm text-gray-600 mb-4">{section.description}</p>
          )}
          
          <div className="space-y-4">
           {section.fields.map((field, fieldIndex) => (
            <div key={fieldIndex} className="border-b border-gray-100 pb-4 last:border-0">
             <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
             </label>
             {field.description && (
              <p className="text-sm text-gray-500 mb-2">{field.description}</p>
             )}
             
             {/* Field preview based on type */}
             {field.fieldType === 'TEXT_SHORT' && (
              <input
               type="text"
               placeholder={field.placeholder || ''}
               className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
               disabled
              />
             )}
             {field.fieldType === 'TEXT_LONG' && (
              <textarea
               placeholder={field.placeholder || ''}
               rows={4}
               className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
               disabled
              />
             )}
             {field.fieldType === 'EMAIL' && (
              <input
               type="email"
               placeholder={field.placeholder || 'email@example.com'}
               className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
               disabled
              />
             )}
             {field.fieldType === 'PHONE' && (
              <input
               type="tel"
               placeholder={field.placeholder || ''}
               className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
               disabled
              />
             )}
             {field.fieldType === 'NUMBER' && (
              <input
               type="number"
               placeholder={field.placeholder || ''}
               className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
               disabled
              />
             )}
             {field.fieldType === 'DATE' && (
              <input
               type="date"
               className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
               disabled
              />
             )}
             {field.fieldType === 'TIME' && (
              <input
               type="time"
               className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
               disabled
              />
             )}
             {field.fieldType === 'DROPDOWN' && (
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50" disabled>
               <option>{field.placeholder || 'Select an option...'}</option>
               {field.options?.map((option: string, idx: number) => (
                <option key={idx}>{typeof option === 'object' ? (option as any).name : option}</option>
               ))}
              </select>
             )}
             {field.fieldType === 'RADIO' && (
              <div className="space-y-2">
               {field.options?.map((option: string, idx: number) => (
                <label key={idx} className="flex items-center">
                 <input type="radio" name={`${field.id}-preview`} className="mr-2" disabled />
                 <span>{option}</span>
                </label>
               ))}
              </div>
             )}
             {field.fieldType === 'CHECKBOX' && (
              <div className="space-y-2">
               {field.options?.map((option: string, idx: number) => (
                <label key={idx} className="flex items-center">
                 <input type="checkbox" className="mr-2" disabled />
                 <span>{option}</span>
                </label>
               ))}
              </div>
             )}
            </div>
           ))}
          </div>
         </div>
        ))}

        {/* Thank You Message Preview */}
        {template.thankYouMessage && (
         <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Thank You Message:</h4>
          <p className="text-gray-600">{template.thankYouMessage}</p>
         </div>
        )}

        <button
         onClick={() => setShowPreview(false)}
         className="mt-6 w-full px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
>
         Close Preview
        </button>
       </div>
      </div>
     </div>
    )}
   </div>
  </DashboardLayout>
 );
}

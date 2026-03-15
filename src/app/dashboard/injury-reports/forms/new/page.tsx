'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import InjuryReportsSubNav from '@/components/InjuryReportsSubNav';
import VenueSelector from '@/components/VenueSelector';

interface FormField {
 id: string;
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
 id: string;
 title: string;
 description?: string;
 order: number;
 fields: FormField[];
}

const FIELD_TYPES = [
 { value: 'TEXT_SHORT', label: 'Short Text', icon: '📝' },
 { value: 'TEXT_LONG', label: 'Long Text', icon: '📄' },
 { value: 'NUMBER', label: 'Number', icon: '🔢' },
 { value: 'DATE', label: 'Date', icon: '📅' },
 { value: 'TIME', label: 'Time', icon: '⏰' },
 { value: 'DATETIME', label: 'Date & Time', icon: '📆' },
 { value: 'EMAIL', label: 'Email', icon: '📧' },
 { value: 'PHONE', label: 'Phone', icon: '📞' },
 { value: 'DROPDOWN', label: 'Dropdown', icon: '▼' },
 { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice', icon: '⚪' },
 { value: 'CHECKBOXES', label: 'Checkboxes', icon: '☑️' },
];

export default function FormBuilderPage() {
 const router = useRouter();
 const [formName, setFormName] = useState('');
 const [formDescription, setFormDescription] = useState('');
 const [venueId, setVenueId] = useState<string | null>(null);
 const [headerColor, setHeaderColor] = useState('#0078d4');
 const [thankYouMessage, setThankYouMessage] = useState('Thank you for your submission. We will review this report shortly.');
 const [sections, setSections] = useState<FormSection[]>([]);
 const [editingField, setEditingField] = useState<{ sectionId: string; field: FormField } | null>(null);
 const [saving, setSaving] = useState(false);
 const [showPreview, setShowPreview] = useState(false);

 const addSection = () => {
  const newSection: FormSection = {
   id: `section-${Date.now()}`,
   title: `Section ${sections.length + 1}`,
   description: '',
   order: sections.length,
   fields: [],
  };
  setSections([...sections, newSection]);
 };

 const updateSection = (sectionId: string, updates: Partial<FormSection>) => {
  setSections(sections.map(s => s.id === sectionId ? { ...s, ...updates } : s));
 };

 const deleteSection = (sectionId: string) => {
  if (sections.length === 1) {
   alert('You must have at least one section');
   return;
  }
  setSections(sections.filter(s => s.id !== sectionId));
 };

 const addField = (sectionId: string, fieldType: string) => {
  const section = sections.find(s => s.id === sectionId);
  if (!section) {
   console.error('Section not found:', sectionId);
   return;
  }

  const newField: FormField = {
   id: `field-${Date.now()}`,
   fieldType,
   label: 'New Field',
   description: '',
   placeholder: '',
   required: false,
   order: section.fields.length,
   options: fieldType === 'DROPDOWN' || fieldType === 'MULTIPLE_CHOICE' || fieldType === 'CHECKBOXES' ? [] : undefined,
  };

  setSections(sections.map(s => 
   s.id === sectionId 
    ? { ...s, fields: [...s.fields, newField] }
    : s
  ));

  setEditingField({ sectionId, field: newField });
 };

 const updateField = (sectionId: string, fieldId: string, updates: Partial<FormField>) => {
  setSections(sections.map(s => 
   s.id === sectionId 
    ? {
      ...s,
      fields: s.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f)
     }
    : s
  ));
 };

 const deleteField = (sectionId: string, fieldId: string) => {
  setSections(sections.map(s => 
   s.id === sectionId 
    ? { ...s, fields: s.fields.filter(f => f.id !== fieldId) }
    : s
  ));
  if (editingField?.field.id === fieldId) {
   setEditingField(null);
  }
 };

 const moveField = (sectionId: string, fieldId: string, direction: 'up' | 'down') => {
  const section = sections.find(s => s.id === sectionId);
  if (!section) return;

  const fieldIndex = section.fields.findIndex(f => f.id === fieldId);
  if (
   (direction === 'up' && fieldIndex === 0) ||
   (direction === 'down' && fieldIndex === section.fields.length - 1)
  ) {
   return;
  }

  const newFields = [...section.fields];
  const targetIndex = direction === 'up' ? fieldIndex - 1 : fieldIndex + 1;
  [newFields[fieldIndex], newFields[targetIndex]] = [newFields[targetIndex], newFields[fieldIndex]];
  
  // Update order
  newFields.forEach((f, i) => f.order = i);

  setSections(sections.map(s => 
   s.id === sectionId ? { ...s, fields: newFields } : s
  ));
 };

 const saveForm = async () => {
  if (!formName.trim()) {
   alert('Please enter a form name');
   return;
  }

  // Validate that all fields have labels
  for (const section of sections) {
   for (const field of section.fields) {
    if (!field.label.trim()) {
     alert(`Please add a label to all fields in "${section.title}"`);
     return;
    }
   }
  }

  setSaving(true);
  try {
   const payload = {
    name: formName,
    description: formDescription,
    venueId: venueId || undefined,
    headerColor,
    thankYouMessage,
    sections: sections.map(s => ({
     title: s.title,
     description: s.description || '',
     fields: s.fields.map(f => ({
      fieldType: f.fieldType,
      label: f.label,
      description: f.description || '',
      placeholder: f.placeholder || '',
      required: f.required,
      order: f.order,
      options: f.options || [],
     })),
    })),
   };

   console.log('Saving form with payload:', payload);

   const res = await fetch('/api/injury-forms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
   });

   if (res.ok) {
    const data = await res.json();
    console.log('Form saved successfully:', data);
    router.push('/dashboard/injury-reports/forms');
   } else {
    const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
    console.error('Failed to save form:', errorData);
    alert(`Failed to save form: ${errorData.error || 'Unknown error'}`);
   }
  } catch (error) {
   console.error('Error saving form:', error);
   alert(`Failed to save form: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
   setSaving(false);
  }
 };

 return (
  <DashboardLayout title="Form Builder">
   <InjuryReportsSubNav />
   <div className="bg-gray-50 -m-6">
    {/* Header */}
    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 border-b border-blue-700 sticky top-0 z-10 shadow-md">
     <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
      <div>
       <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Form Builder
       </h1>
       <p className="text-sm text-blue-100 mt-1">Create a professional injury report form with custom sections</p>
      </div>
      <div className="flex gap-3">
       <button
        onClick={() => router.back()}
        className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/20"
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
        Preview
       </button>
       <button
        onClick={saveForm}
        disabled={saving}
        className="px-6 py-2.5 bg-white text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg flex items-center gap-2"
>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        {saving ? 'Saving...' : 'Create Form'}
       </button>
      </div>
     </div>
    </div>

   <div className="max-w-7xl mx-auto px-6 py-8">
    {/* Info Banner */}
    <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm">
     <div className="flex items-start gap-4">
      <span className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl flex-shrink-0 shadow-md">ℹ️</span>
      <div className="flex-1">
       <h3 className="font-bold text-blue-900 mb-2 text-lg flex items-center gap-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Default Sections Included Automatically
       </h3>
       <p className="text-sm text-blue-800 mb-3 leading-relaxed">
        Every form you create includes <strong>4 essential pre-built sections</strong> that cover all standard injury reporting requirements. These are fully editable after creation:
       </p>
       <div className="grid md:grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-lg p-3 border border-blue-200">
         <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">📋</span>
          <strong className="text-sm text-blue-900">1. Reported By Details</strong>
         </div>
         <p className="text-xs text-blue-700 ml-7">Reporter info, incident date/time, venue, zone, equipment, coach details, description</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-blue-200">
         <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">👤</span>
          <strong className="text-sm text-blue-900">2. Athlete Details</strong>
         </div>
         <p className="text-xs text-blue-700 ml-7">Athlete name, gym sport, class assignment</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-blue-200">
         <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🏥</span>
          <strong className="text-sm text-blue-900">3. Injury Details</strong>
         </div>
         <p className="text-xs text-blue-700 ml-7">Body part injured, nature and severity of injury</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-blue-200">
         <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">⚕️</span>
          <strong className="text-sm text-blue-900">4. Action Taken</strong>
         </div>
         <p className="text-xs text-blue-700 ml-7">First aid, medication, emergency services, medical advice, parent contact</p>
        </div>
       </div>
       <div className="bg-blue-100 rounded-lg p-3 border border-blue-300">
        <p className="text-sm text-blue-900 flex items-start gap-2">
         <span className="text-lg flex-shrink-0">💡</span>
         <span><strong>After creating your form:</strong> Use the "Preview Form" button to see all default questions and customize them as needed. Coach email and phone will auto-populate when a coach is selected during submission.</span>
        </p>
       </div>
      </div>
     </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
     {/* Form Settings Panel */}
     <div className="lg:col-span-1">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 sticky top-28">
       {/* Header */}
       <div className="bg-gradient-to-r from-gray-100 to-gray-50 border-b border-gray-200 px-6 py-4 rounded-t-xl">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
         <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
         </svg>
         Form Settings
        </h2>
        <p className="text-xs text-gray-600 mt-1">Configure basic form properties</p>
       </div>
       
       <div className="p-6 space-y-5">
        <div>
         <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
          Form Name
          <span className="text-red-500">*</span>
         </label>
         <input
          type="text"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          placeholder="e.g., General Injury Report"
         />
         <p className="text-xs text-gray-500 mt-1.5">This name appears in your forms list</p>
        </div>

        <div>
         <label className="block text-sm font-semibold text-gray-700 mb-2">
          Description
         </label>
         <textarea
          value={formDescription}
          onChange={(e) => setFormDescription(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
          rows={3}
          placeholder="Brief description of this form's purpose..."
         />
         <p className="text-xs text-gray-500 mt-1.5">Helps identify the form's usage</p>
        </div>

        <div>
         <label className="block text-sm font-semibold text-gray-700 mb-2">
          Venue Assignment
         </label>
         <VenueSelector
          value={venueId}
          onChange={setVenueId}
          showLabel={false}
         />
         <p className="text-xs text-gray-500 mt-1.5 flex items-start gap-1">
          <svg className="w-3 h-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Optional - Restrict this form to a specific venue</span>
         </p>
        </div>

        <div>
         <label className="block text-sm font-semibold text-gray-700 mb-2">
          Header Color
         </label>
         <div className="flex items-center gap-3">
          <input
           type="color"
           value={headerColor}
           onChange={(e) => setHeaderColor(e.target.value)}
           className="w-16 h-10 border-2 border-gray-300 rounded-lg cursor-pointer"
          />
          <div className="flex-1">
           <div className="text-xs font-mono text-gray-600 bg-gray-100 px-3 py-2 rounded-lg border border-gray-200">
            {headerColor.toUpperCase()}
           </div>
          </div>
         </div>
         <p className="text-xs text-gray-500 mt-1.5">Customize the mobile form header color</p>
        </div>

        <div>
         <label className="block text-sm font-semibold text-gray-700 mb-2">
          Thank You Message
         </label>
         <textarea
          value={thankYouMessage}
          onChange={(e) => setThankYouMessage(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
          rows={3}
          placeholder="Message shown after successful submission..."
         />
         <p className="text-xs text-gray-500 mt-1.5">Displayed when users submit the form</p>
        </div>
       </div>

       {/* Add Field Types */}
       <div className="border-t border-gray-200 px-6 py-5">
        <div className="flex items-center gap-2 mb-3">
         <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
         </svg>
         <h3 className="text-sm font-bold text-gray-900">Add Custom Sections</h3>
        </div>
        <p className="text-xs text-gray-600 mb-4 leading-relaxed">
         The form includes <strong>4 default sections</strong>. Add additional custom sections with unique fields below.
        </p>
        {sections.length > 0 && (
         <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <h4 className="text-sm font-semibold text-green-900 mb-3 flex items-center gap-2">
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
           </svg>
           Add Field to First Custom Section
          </h4>
          <div className="grid grid-cols-2 gap-2">
           {FIELD_TYPES.map((type) => (
            <button
             key={type.value}
             onClick={() => addField(sections[0].id, type.value)}
             className="px-3 py-2.5 text-xs bg-white border border-green-300 rounded-lg hover:bg-green-100 hover:border-green-400 text-left transition-all group"
             title={type.label}
>
             <span className="mr-1.5 text-base group-hover:scale-110 inline-block transition-transform">{type.icon}</span>
             <span className="font-medium text-gray-700">{type.label}</span>
            </button>
           ))}
          </div>
         </div>
        )}
       </div>
      </div>
     </div>

     {/* Form Builder */}
     <div className="lg:col-span-2 space-y-6">
      {sections.length === 0 ? (
       <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
         <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
         </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">No Custom Sections Yet</h3>
        <p className="text-gray-600 mb-2">
         Your form will include the 4 essential default sections automatically.
        </p>
        <p className="text-sm text-gray-500 mb-6">
         Click <strong>"Add Section"</strong> below to create additional custom sections for specialized questions.
        </p>
       </div>
      ) : (
       sections.map((section, sectionIndex) => (
        <div key={section.id} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
         {/* Section Header */}
         <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-200 p-6">
          <div className="flex items-center justify-between mb-3">
           <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 bg-purple-600 text-white rounded-lg flex items-center justify-center font-bold shadow-md">
             {sectionIndex + 5}
            </div>
            <input
             type="text"
             value={section.title}
             onChange={(e) => updateSection(section.id, { title: e.target.value })}
             className="flex-1 text-xl font-bold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-purple-500 rounded px-3 py-2"
             placeholder="Section Title"
            />
           </div>
           <button
            onClick={() => deleteSection(section.id)}
            className="ml-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium text-sm flex items-center gap-2"
>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Section
           </button>
          </div>
          <input
           type="text"
           value={section.description || ''}
           onChange={(e) => updateSection(section.id, { description: e.target.value })}
           placeholder="Section description (optional)"
           className="w-full text-sm text-purple-800 bg-white/50 border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-lg px-4 py-2"
          />
         </div>

         {/* Fields */}
         <div className="p-6 space-y-4">
          {section.fields.length === 0 ? (
           <div className="text-center py-12 bg-purple-50 rounded-lg border-2 border-dashed border-purple-200">
            <svg className="w-12 h-12 text-purple-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <p className="text-purple-700 font-medium">No fields yet</p>
            <p className="text-xs text-purple-600 mt-1">Add fields from the sidebar</p>
           </div>
          ) : (
           section.fields.map((field, index) => (
            <div
             key={field.id}
             className="border-2 border-gray-200 rounded-lg p-4 hover:border-purple-300 hover:shadow-md transition-all bg-gradient-to-r from-white to-purple-50/30"
>
             <div className="flex items-start justify-between">
              <div className="flex-1">
               <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{FIELD_TYPES.find(t => t.value === field.fieldType)?.icon}</span>
                <input
                 type="text"
                 value={field.label}
                 onChange={(e) => updateField(section.id, field.id, { label: e.target.value })}
                 className="flex-1 font-semibold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-purple-500 rounded px-2 py-1"
                 placeholder="Field label"
                />
                {field.required && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-bold">Required</span>}
               </div>
               <input
                type="text"
               value={field.placeholder || ''}
                onChange={(e) => updateField(section.id, field.id, { placeholder: e.target.value })}
                placeholder="Placeholder text (optional)"
                className="text-sm text-gray-600 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-purple-500 rounded px-2 py-1 w-full"
               />
               
               {['DROPDOWN', 'MULTIPLE_CHOICE', 'CHECKBOXES'].includes(field.fieldType) && (
                <div className="mt-3 bg-white rounded-lg p-3 border border-gray-200">
                 <label className="text-xs font-semibold text-gray-700 mb-2 block">Options (one per line)</label>
                 <textarea
                  value={(field.options || []).join('\n')}
                  onChange={(e) => updateField(section.id, field.id, { 
                   options: e.target.value.split('\n')
                  })}
                  onKeyDown={(e) => {
                   if (e.key === 'Enter') {
                    e.stopPropagation();
                   }
                  }}
                  placeholder="Enter options (one per line)"
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  rows={5}
                 />
                </div>
               )}
              </div>

              <div className="flex flex-col items-end gap-2 ml-4">
               <label className="flex items-center text-sm cursor-pointer group">
                <input
                 type="checkbox"
                 checked={field.required}
                 onChange={(e) => updateField(section.id, field.id, { required: e.target.checked })}
                 className="mr-2 w-4 h-4 text-purple-600 rounded"
                />
                <span className="text-gray-700 group-hover:text-purple-700">Required</span>
               </label>
               <div className="flex gap-1">
                <button
                 onClick={() => moveField(section.id, field.id, 'up')}
                 disabled={index === 0}
                 className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                 title="Move up"
>
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                 </svg>
                </button>
                <button
                 onClick={() => moveField(section.id, field.id, 'down')}
                 disabled={index === section.fields.length - 1}
                 className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                 title="Move down"
>
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                 </svg>
                </button>
                <button
                 onClick={() => deleteField(section.id, field.id)}
                 className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                 title="Delete field"
>
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                 </svg>
                </button>
               </div>
              </div>
             </div>
            </div>
           ))
          )}
         </div>
        </div>
       ))
      )}

      <button
       onClick={addSection}
       className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-purple-400 hover:text-purple-700 hover:bg-purple-50 transition-all font-medium flex items-center justify-center gap-2"
>
       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
       </svg>
       Add Custom Section
      </button>
     </div>
    </div>
   </div>

   {/* Preview Modal */}
   {showPreview && (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
     <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
      {/* Modal Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between" style={{ backgroundColor: headerColor }}>
       <h2 className="text-2xl font-bold text-white">Form Preview</h2>
       <button
        onClick={() => setShowPreview(false)}
        className="text-white hover:text-gray-200 text-2xl"
>
        ×
       </button>
      </div>

      {/* Modal Content */}
      <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
       {/* Form Header */}
       <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{formName || 'Untitled Form'}</h1>
        {formDescription && <p className="text-gray-600">{formDescription}</p>}
       </div>

       {/* Default Section 1: Reported By Details */}
       <div className="mb-8 p-6 border border-gray-200 rounded-lg bg-gray-50">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">1. Reported By Details</h3>
        <p className="text-sm text-gray-600 mb-4">Information about who is reporting the incident</p>
        <div className="space-y-4">
         <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Injury Reported By <span className="text-red-500">*</span></label>
          <input type="text" disabled className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white" placeholder="Name of the person reporting this incident" />
         </div>
         <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date and Time of Incident <span className="text-red-500">*</span></label>
          <input type="datetime-local" disabled className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white" />
         </div>
         <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Venue <span className="text-red-500">*</span></label>
          <select disabled className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white">
           <option>Choose a venue...</option>
          </select>
         </div>
         <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Gym Zone / Area <span className="text-red-500">*</span></label>
          <select disabled className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white">
           <option>Choose a zone...</option>
          </select>
         </div>
         <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Equipment / Apparatus <span className="text-red-500">*</span></label>
          <select disabled className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white">
           <option>Select equipment...</option>
          </select>
         </div>
         <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Supervising Coach <span className="text-red-500">*</span></label>
          <select disabled className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white">
           <option>Select coach...</option>
          </select>
         </div>
         <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Coach Email</label>
          <input type="email" disabled className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white" />
         </div>
         <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Coach Phone</label>
          <input type="tel" disabled className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white" />
         </div>
         <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Detailed Description of What Happened <span className="text-red-500">*</span></label>
          <textarea disabled className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white" rows={4} placeholder="Please provide a detailed account of the incident" />
         </div>
        </div>
       </div>

       {/* Default Section 2: Athlete Details */}
       <div className="mb-8 p-6 border border-gray-200 rounded-lg bg-gray-50">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">2. Athlete Details</h3>
        <p className="text-sm text-gray-600 mb-4">Information about the athlete involved</p>
        <div className="space-y-4">
         <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Athlete Name <span className="text-red-500">*</span></label>
          <input type="text" disabled className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white" />
         </div>
         <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Class <span className="text-red-500">*</span></label>
          <select disabled className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white">
           <option>Select class...</option>
          </select>
         </div>
        </div>
       </div>

       {/* Default Section 3: Injury Details */}
       <div className="mb-8 p-6 border border-gray-200 rounded-lg bg-gray-50">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">3. Injury Details</h3>
        <p className="text-sm text-gray-600 mb-4">Information about the injury sustained</p>
        <div className="space-y-4">
         <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Part of Body Injured <span className="text-red-500">*</span></label>
          <div className="text-sm text-gray-500">Multiple choice options</div>
         </div>
         <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nature of Injury Sustained <span className="text-red-500">*</span></label>
          <div className="text-sm text-gray-500">Multiple choice options</div>
         </div>
        </div>
       </div>

       {/* Default Section 4: Action Taken */}
       <div className="mb-8 p-6 border border-gray-200 rounded-lg bg-gray-50">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">4. Action Taken</h3>
        <p className="text-sm text-gray-600 mb-4">Actions taken following the incident</p>
        <div className="space-y-4">
         <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Was First Aid Administered <span className="text-red-500">*</span></label>
          <select disabled className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white">
           <option>Select...</option>
           <option>Yes</option>
           <option>No</option>
          </select>
         </div>
         <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Was Medication Administered <span className="text-red-500">*</span></label>
          <select disabled className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white">
           <option>Yes</option>
           <option>No</option>
          </select>
         </div>
         <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Was Emergency Services Contacted <span className="text-red-500">*</span></label>
          <select disabled className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white">
           <option>Yes</option>
           <option>No</option>
          </select>
         </div>
         <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Was Advice Given to Seek Further Medical Attention <span className="text-red-500">*</span></label>
          <select disabled className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white">
           <option>Yes</option>
           <option>No</option>
          </select>
         </div>
         <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Was Parent / Guardian Contacted to Discuss the Incident? <span className="text-red-500">*</span></label>
          <select disabled className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white">
           <option>Yes</option>
           <option>No</option>
          </select>
         </div>
         <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Additional Details Related to the Incident</label>
          <textarea disabled className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white" rows={3} />
         </div>
        </div>
       </div>

       {/* Custom Sections */}
       {sections.map((section, index) => (
        <div key={section.id} className="mb-8 p-6 border border-gray-200 rounded-lg bg-blue-50">
         <h3 className="text-xl font-semibold text-gray-900 mb-2">{index + 5}. {section.title}</h3>
         {section.description && <p className="text-sm text-gray-600 mb-4">{section.description}</p>}
         <div className="space-y-4">
          {section.fields.map((field) => (
           <div key={field.id}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
             {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            {field.description && <p className="text-xs text-gray-500 mb-1">{field.description}</p>}
            {['TEXT_SHORT', 'EMAIL', 'PHONE'].includes(field.fieldType) && (
             <input type="text" disabled className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white" placeholder={field.placeholder} />
            )}
            {field.fieldType === 'TEXT_LONG' && (
             <textarea disabled className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white" rows={3} placeholder={field.placeholder} />
            )}
            {field.fieldType === 'NUMBER' && (
             <input type="number" disabled className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white" placeholder={field.placeholder} />
            )}
            {field.fieldType === 'DATE' && (
             <input type="date" disabled className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white" />
            )}
            {field.fieldType === 'TIME' && (
             <input type="time" disabled className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white" />
            )}
            {field.fieldType === 'DATETIME' && (
             <input type="datetime-local" disabled className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white" />
            )}
            {['DROPDOWN', 'MULTIPLE_CHOICE'].includes(field.fieldType) && (
             <select disabled className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white">
              <option>{field.placeholder || 'Select...'}</option>
              {field.options?.map((option, i) => (
               <option key={i}>{option}</option>
              ))}
             </select>
            )}
            {field.fieldType === 'CHECKBOXES' && (
             <div className="space-y-2">
              {field.options?.map((option, i) => (
               <div key={i} className="flex items-center gap-2">
                <input type="checkbox" disabled className="rounded" />
                <span className="text-sm text-gray-700">{option}</span>
               </div>
              ))}
             </div>
            )}
           </div>
          ))}
         </div>
        </div>
       ))}

       {/* Thank You Message Preview */}
       <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
        <h4 className="font-semibold text-green-900 mb-2">Upon Submission:</h4>
        <p className="text-sm text-green-800">{thankYouMessage}</p>
       </div>
      </div>

      {/* Modal Footer */}
      <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
       <button
        onClick={() => setShowPreview(false)}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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

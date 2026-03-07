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
    <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
     <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
     <div>
      <h1 className="text-2xl font-bold text-gray-900">Form Builder</h1>
      <p className="text-sm text-gray-600">Create a custom injury report form</p>
     </div>
     <div className="flex gap-3">
      <button
       onClick={() => router.back()}
       className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
>
       Cancel
      </button>
      <button
       onClick={() => setShowPreview(true)}
       className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
>
       Preview Form
      </button>
      <button
       onClick={saveForm}
       disabled={saving}
       className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
>
       {saving ? 'Saving...' : 'Save Form'}
      </button>
     </div>
    </div>
   </div>

   <div className="max-w-7xl mx-auto px-6 py-8">
    {/* Info Banner */}
    <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
     <div className="flex items-start">
      <span className="text-blue-600 text-xl mr-3">ℹ️</span>
      <div>
       <h3 className="font-semibold text-blue-900 mb-1">Default Sections Included</h3>
       <p className="text-sm text-blue-800 mb-2">
        When you create this form, the following default sections will be automatically added and fully editable:
       </p>
       <ul className="text-sm text-blue-800 space-y-1 ml-4">
        <li><strong>1. Reported By Details</strong> - Reporter name, incident date/time, venue selection, gym zone/area, equipment/apparatus, supervising coach, coach email, coach phone, description</li>
        <li><strong>2. Athlete Details</strong> - Athlete name, program, class</li>
        <li><strong>3. Injury Details</strong> - Body part injured, nature of injury</li>
        <li><strong>4. Action Taken</strong> - First aid, medication, emergency services, medical advice, parent contact, additional details</li>
       </ul>
       <p className="text-sm text-blue-800 mt-2">
        You can add additional custom sections below if needed. Note: Coach email and phone will auto-populate when a coach is selected during form submission.
       </p>
      </div>
     </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
     {/* Form Settings Panel */}
     <div className="lg:col-span-1">
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6 sticky top-24">
       <h2 className="text-lg font-semibold text-gray-900 mb-4">Form Settings</h2>
       
       <div className="space-y-4">
        <div>
         <label className="block text-sm font-medium text-gray-700 mb-1">
          Form Name *
         </label>
         <input
          type="text"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="e.g., General Injury Report"
         />
        </div>

        <div>
         <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
         </label>
         <textarea
          value={formDescription}
          onChange={(e) => setFormDescription(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows={3}
          placeholder="Brief description of this form"
         />
        </div>

        <div>
         <label className="block text-sm font-medium text-gray-700 mb-1">
          Venue
         </label>
         <VenueSelector
          value={venueId}
          onChange={setVenueId}
         />
         <p className="mt-1 text-xs text-gray-500">
          Assign this form to a specific venue (optional)
         </p>
        </div>

        <div>
         <label className="block text-sm font-medium text-gray-700 mb-1">
          Header Color
         </label>
         <input
          type="color"
          value={headerColor}
          onChange={(e) => setHeaderColor(e.target.value)}
          className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
         />
        </div>

        <div>
         <label className="block text-sm font-medium text-gray-700 mb-1">
          Thank You Message
         </label>
         <textarea
          value={thankYouMessage}
          onChange={(e) => setThankYouMessage(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows={3}
         />
        </div>
       </div>

       {/* Add Field Types */}
       <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Add Custom Sections</h3>
        <p className="text-xs text-gray-600 mb-3">
         The form will include 4 default sections. You can add additional custom sections here.
        </p>
        {sections.length> 0 && (
         <>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Add Field to First Custom Section</h4>
          <div className="grid grid-cols-2 gap-2">
           {FIELD_TYPES.map((type) => (
            <button
             key={type.value}
             onClick={() => addField(sections[0].id, type.value)}
             className="px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded hover:bg-gray-100 text-left"
             title={type.label}
>
             <span className="mr-1">{type.icon}</span>
             {type.label}
            </button>
           ))}
          </div>
         </>
        )}
       </div>
      </div>
     </div>

     {/* Form Builder */}
     <div className="lg:col-span-2 space-y-6">
      {sections.length === 0 ? (
       <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
        <p className="text-gray-600 mb-4">
         No custom sections yet. The form will include 4 default sections automatically.
        </p>
        <p className="text-sm text-gray-500 mb-6">
         Click "Add Section" below to create additional custom sections.
        </p>
       </div>
      ) : (
       sections.map((section) => (
        <div key={section.id} className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6 border-b border-gray-200">
         <div className="flex items-center justify-between mb-4">
          <input
           type="text"
           value={section.title}
           onChange={(e) => updateSection(section.id, { title: e.target.value })}
           className="text-xl font-semibold text-gray-900 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
          />
          <button
           onClick={() => deleteSection(section.id)}
           className="text-red-600 hover:text-red-800 text-sm"
>
           Delete Section
          </button>
         </div>
         <input
          type="text"
          value={section.description || ''}
          onChange={(e) => updateSection(section.id, { description: e.target.value })}
          placeholder="Section description (optional)"
          className="w-full text-gray-600 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
         />
        </div>

        <div className="p-6 space-y-4">
         {section.fields.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
           No fields yet. Add fields from the sidebar.
          </div>
         ) : (
          section.fields.map((field, index) => (
           <div
            key={field.id}
            className="border border-gray-200 rounded-lg p-4 hover:border-blue-300"
>
            <div className="flex items-start justify-between">
             <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
               <span className="text-sm text-gray-500">
                {FIELD_TYPES.find(t => t.value === field.fieldType)?.icon}
               </span>
               <input
                type="text"
                value={field.label}
                onChange={(e) => updateField(section.id, field.id, { label: e.target.value })}
                className="font-medium text-gray-900 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                placeholder="Field label"
               />
               {field.required && <span className="text-red-500">*</span>}
              </div>
              <input
               type="text"
               value={field.placeholder || ''}
               onChange={(e) => updateField(section.id, field.id, { placeholder: e.target.value })}
               placeholder="Placeholder text (optional)"
               className="text-sm text-gray-600 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 w-full"
              />
              
              {['DROPDOWN', 'MULTIPLE_CHOICE', 'CHECKBOXES'].includes(field.fieldType) && (
               <div className="mt-2">
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
                 className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg"
                 rows={5}
                />
               </div>
              )}
             </div>

             <div className="flex items-center gap-2 ml-4">
              <label className="flex items-center text-sm">
               <input
                type="checkbox"
                checked={field.required}
                onChange={(e) => updateField(section.id, field.id, { required: e.target.checked })}
                className="mr-1"
               />
               Required
              </label>
              <button
               onClick={() => moveField(section.id, field.id, 'up')}
               disabled={index === 0}
               className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
>
               ↑
              </button>
              <button
               onClick={() => moveField(section.id, field.id, 'down')}
               disabled={index === section.fields.length - 1}
               className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
>
               ↓
              </button>
              <button
               onClick={() => deleteField(section.id, field.id)}
               className="p-1 text-red-600 hover:text-red-800"
>
               🗑️
              </button>
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
       className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700"
>
       + Add Section
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Program <span className="text-red-500">*</span></label>
          <select disabled className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white">
           <option>Select program...</option>
          </select>
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

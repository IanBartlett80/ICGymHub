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
    <div className="flex justify-between items-center">
     <div>
      <h1 className="text-3xl font-bold text-gray-900">Edit Form</h1>
      <p className="text-gray-600 mt-1">Modify your injury report form</p>
     </div>
     <div className="flex gap-3">
      <button
       onClick={() => router.back()}
       className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
>
       Cancel
      </button>
      <button
       onClick={() => setShowPreview(true)}
       className="px-4 py-2 border border-blue-300 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
      >
       👁️ Preview Form
      </button>
      <button
       onClick={handleSave}
       disabled={saving}
       className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
>
       {saving ? 'Saving...' : 'Save Changes'}
      </button>
     </div>
    </div>

    {/* Form Settings */}
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
     <h2 className="text-xl font-semibold mb-4">Form Settings</h2>
     <div className="space-y-4">
      <div>
       <label className="block text-sm font-medium text-gray-700 mb-1">
        Form Name *
       </label>
       <input
        type="text"
        value={template.name}
        onChange={(e) => setTemplate({ ...template, name: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="e.g., Injury Report Form"
       />
      </div>

      <div>
       <label className="block text-sm font-medium text-gray-700 mb-1">
        Description
       </label>
       <textarea
        value={template.description}
        onChange={(e) => setTemplate({ ...template, description: e.target.value })}
        rows={3}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Brief description of this form"
       />
      </div>

      <div>
       <label className="block text-sm font-medium text-gray-700 mb-1">
        Venue
       </label>
       <VenueSelector
        value={template.venueId || null}
        onChange={(venue) => setTemplate({ ...template, venueId: venue || null })}
        showLabel={false}
       />
       <p className="mt-1 text-xs text-gray-500">
        Assign this form to a specific venue (optional)
       </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
       <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
         Header Color
        </label>
        <input
         type="color"
         value={template.headerColor}
         onChange={(e) => setTemplate({ ...template, headerColor: e.target.value })}
         className="w-full h-10 rounded-lg cursor-pointer"
        />
       </div>
       <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
         Logo URL (optional)
        </label>
        <input
         type="url"
         value={template.logoUrl || ''}
         onChange={(e) => setTemplate({ ...template, logoUrl: e.target.value })}
         className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
         placeholder="https://example.com/logo.png"
        />
       </div>
      </div>

      <div>
       <label className="block text-sm font-medium text-gray-700 mb-1">
        Thank You Message
       </label>
       <textarea
        value={template.thankYouMessage}
        onChange={(e) => setTemplate({ ...template, thankYouMessage: e.target.value })}
        rows={2}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
       />
      </div>
     </div>
    </div>

    {/* Sections */}
    <div className="space-y-4">
     <div className="flex justify-between items-center">
      <h2 className="text-xl font-semibold">Form Sections</h2>
      <button
       onClick={addSection}
       className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
>
       + Add Section
      </button>
     </div>

     {template.sections.map((section, sectionIndex) => (
      <div key={sectionIndex} className="bg-white rounded-lg shadow border border-gray-200 p-6">
       <div className="flex justify-between items-start mb-4">
        <div className="flex-1 space-y-3">
         <input
          type="text"
          value={section.title}
          onChange={(e) => updateSection(sectionIndex, { title: e.target.value })}
          className="w-full text-lg font-semibold px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Section Title"
         />
         <input
          type="text"
          value={section.description || ''}
          onChange={(e) => updateSection(sectionIndex, { description: e.target.value })}
          className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Section Description (optional)"
         />
        </div>
        <button
         onClick={() => removeSection(sectionIndex)}
         className="ml-4 text-red-600 hover:text-red-800"
>
         Remove Section
        </button>
       </div>

       {/* Fields */}
       <div className="space-y-3 ml-4">
        {section.fields.map((field, fieldIndex) => (
         <div key={fieldIndex} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="grid grid-cols-12 gap-3 items-start">
           <div className="col-span-3">
            <select
             value={field.fieldType}
             onChange={(e) => updateField(sectionIndex, fieldIndex, { fieldType: e.target.value })}
             className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
>
             {FIELD_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
               {type.label}
              </option>
             ))}
            </select>
           </div>
           <div className="col-span-4">
            <input
             type="text"
             value={field.label}
             onChange={(e) => updateField(sectionIndex, fieldIndex, { label: e.target.value })}
             className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
             placeholder="Field Label"
            />
           </div>
           <div className="col-span-3">
            <input
             type="text"
             value={field.placeholder || ''}
             onChange={(e) => updateField(sectionIndex, fieldIndex, { placeholder: e.target.value })}
             className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
             placeholder="Placeholder"
            />
           </div>
           <div className="col-span-1 flex items-center justify-center">
            <label className="flex items-center cursor-pointer">
             <input
              type="checkbox"
              checked={field.required}
              onChange={(e) => updateField(sectionIndex, fieldIndex, { required: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
             />
             <span className="ml-1 text-xs text-gray-600">Req</span>
            </label>
           </div>
           <div className="col-span-1 flex justify-end">
            <button
             onClick={() => removeField(sectionIndex, fieldIndex)}
             className="text-red-600 hover:text-red-800 text-sm"
>
             ×
            </button>
           </div>
          </div>

          {(field.fieldType === 'DROPDOWN' || field.fieldType === 'RADIO' || field.fieldType === 'CHECKBOX') && (
           <div className="mt-3">
            <label className="block text-xs text-gray-600 mb-1">Options (one per line)</label>
            <textarea
             value={field.options?.join('\n') || ''}
             onChange={(e) => updateField(sectionIndex, fieldIndex, { 
              options: e.target.value.split('\n')
             })}
             className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
             placeholder="Enter options (one per line)"
             rows={4}
            />
           </div>
          )}
         </div>
        ))}

        <button
         onClick={() => addField(sectionIndex)}
         className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600"
>
         + Add Field
        </button>
       </div>
      </div>
     ))}

     {template.sections.length === 0 && (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
       <p className="text-gray-500 mb-4">No sections added yet</p>
       <button
        onClick={addSection}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
>
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

'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import InjuryReportsSubNav from '@/components/InjuryReportsSubNav';
import RichTextVariableEditor from '@/components/RichTextVariableEditor';
import TipTapEditor from '@/components/TipTapEditor';
import EmailRecipientsInput from '@/components/EmailRecipientsInput';
import { showToast, confirmAndDelete } from '@/lib/toast';

interface Field {
 id: string;
 label: string;
 fieldType: string;
}

interface Automation {
 id: string;
 name: string;
 description: string | null;
 active: boolean;
 order: number;
 triggerConditions: string;
 actions: string;
 emailRecipients: string | null;
 emailSubject: string | null;
 emailTemplate: string | null;
 escalationEnabled: boolean;
 escalationHours: number | null;
 executionCount: number;
 lastExecuted: string | null;
}

export default function AutomationBuilderPage() {
 const params = useParams();
 const templateId = params.id as string;

 const [template, setTemplate] = useState<any>(null);
 const [automations, setAutomations] = useState<Automation[]>([]);
 const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);
 const [showBuilder, setShowBuilder] = useState(false);
 const [loading, setLoading] = useState(true);
 const [showActionMenu, setShowActionMenu] = useState(false);
 const [showLogs, setShowLogs] = useState(false);
 const [selectedAutomationLogs, setSelectedAutomationLogs] = useState<string>('');
 const [selectedAutomationName, setSelectedAutomationName] = useState<string>('');

 // Builder state
 const [name, setName] = useState('');
 const [description, setDescription] = useState('');
 const [trigger, setTrigger] = useState('ON_SUBMIT');
 const [conditions, setConditions] = useState<any[]>([]);
 const [logic, setLogic] = useState('AND');
 const [actions, setActions] = useState<any[]>([]);
 const [escalationEnabled, setEscalationEnabled] = useState(false);
 const [escalationHours, setEscalationHours] = useState(24);
 const [showVariablePicker, setShowVariablePicker] = useState<{show: boolean; target: 'subject' | 'body' | null; actionIndex: number | null}>({show: false, target: null, actionIndex: null});
 
 // Refs for rich text editors to call insertVariable
 const subjectEditorRefs = useRef<{[key: number]: ((variable: {label: string; value: string}) => void) | null}>({});
 const bodyEditorRefs = useRef<{[key: number]: ((variable: {label: string; value: string}) => void) | null}>({});

 // Reference data for smart dropdowns
 const [gymSports, setGymSports] = useState<any[]>([]);
 const [classTemplates, setClassTemplates] = useState<any[]>([]);
 const [venues, setVenues] = useState<any[]>([]);
 const [zones, setZones] = useState<any[]>([]);

 useEffect(() => {
  loadTemplate();
  loadAutomations();
  loadReferenceData();
 }, [templateId]);

 const loadReferenceData = async () => {
  try {
   // Fetch gym sports
   const gymSportsRes = await fetch('/api/gymsports');
   if (gymSportsRes.ok) {
    const gymSportsData = await gymSportsRes.json();
    setGymSports(gymSportsData.gymsports || []);
   }

   // Fetch class templates
   const classesRes = await fetch('/api/classes');
   if (classesRes.ok) {
    const classesData = await classesRes.json();
    setClassTemplates(classesData.classTemplates || []);
   }

   // Fetch venues
   const venuesRes = await fetch('/api/venues');
   if (venuesRes.ok) {
    const venuesData = await venuesRes.json();
    setVenues(venuesData.venues || []);
   }

   // Fetch zones
   const zonesRes = await fetch('/api/zones');
   if (zonesRes.ok) {
    const zonesData = await zonesRes.json();
    setZones(zonesData.zones || []);
   }
  } catch (error) {
   console.error('Error loading reference data:', error);
  }
 };

 const loadTemplate = async () => {
  try {
   const res = await fetch(`/api/injury-forms/${templateId}`);
   if (res.ok) {
    const data = await res.json();
    setTemplate(data.template);
    
    // Store field label mapping for the rich text editor
    if (data.template.sections && typeof window !== 'undefined') {
      const fieldLabelMap: {[key: string]: string} = {};
      data.template.sections.forEach((section: any) => {
        section.fields.forEach((field: any) => {
          fieldLabelMap[field.id] = field.label;
        });
      });
      (window as any).__fieldLabelMap = fieldLabelMap;
    }
   }
  } catch (error) {
   console.error('Error loading template:', error);
  } finally {
   setLoading(false);
  }
 };

 const loadAutomations = async () => {
  try {
   const res = await fetch(`/api/injury-forms/${templateId}/automations`);
   if (res.ok) {
    const data = await res.json();
    setAutomations(data.automations);
   }
  } catch (error) {
   console.error('Error loading automations:', error);
  }
 };

 const startNewAutomation = () => {
  setEditingAutomation(null);
  setName('');
  setDescription('');
  setTrigger('ON_SUBMIT');
  setConditions([]);
  setLogic('AND');
  setActions([]);
  setEscalationEnabled(false);
  setEscalationHours(24);
  setShowBuilder(true);
 };

 const editAutomation = (automation: Automation) => {
  setEditingAutomation(automation);
  setName(automation.name);
  setDescription(automation.description || '');
  
  const triggerConditions = JSON.parse(automation.triggerConditions);
  setTrigger(triggerConditions.trigger);
  setConditions(triggerConditions.conditions || []);
  setLogic(triggerConditions.logic || 'AND');
  
  const parsedActions = JSON.parse(automation.actions);
  let loadedActions = parsedActions.actions || [];
  
  // If automation has email configuration, merge it into SEND_EMAIL action
  if (automation.emailRecipients || automation.emailSubject || automation.emailTemplate) {
   const sendEmailIndex = loadedActions.findIndex((a: any) => a.type === 'SEND_EMAIL');
   if (sendEmailIndex>= 0) {
    loadedActions[sendEmailIndex].config = {
     recipients: automation.emailRecipients ? JSON.parse(automation.emailRecipients) : [],
     subject: automation.emailSubject || '',
     body: automation.emailTemplate || '',
    };
   }
  }
  
  setActions(loadedActions);
  
  setEscalationEnabled(automation.escalationEnabled);
  setEscalationHours(automation.escalationHours || 24);
  setShowBuilder(true);
 };

 const addCondition = () => {
  setConditions([...conditions, { field: '', operator: 'equals', value: '' }]);
 };

 const updateCondition = (index: number, updates: any) => {
  const newConditions = [...conditions];
  newConditions[index] = { ...newConditions[index], ...updates };
  setConditions(newConditions);
 };

 const removeCondition = (index: number) => {
  setConditions(conditions.filter((_, i) => i !== index));
 };

 const addAction = (type: string) => {
  const newAction: any = { type, config: {} };
  
  if (type === 'SEND_EMAIL') {
   newAction.config = { recipients: [], subject: '', body: '' };
  } else if (type === 'SET_PRIORITY') {
   newAction.config = { priority: 'HIGH' };
  } else if (type === 'ASSIGN_USER') {
   newAction.config = { userId: '' };
  } else if (type === 'CREATE_NOTIFICATION') {
   newAction.config = { title: '', message: '', userIds: [] };
  } else if (type === 'SET_STATUS') {
   newAction.config = { status: 'UNDER_REVIEW' };
  }
  
  setActions([...actions, newAction]);
  setShowActionMenu(false); // Close menu after selection
 };

 const updateAction = (index: number, updates: any) => {
  const newActions = [...actions];
  newActions[index] = { ...newActions[index], ...updates };
  setActions(newActions);
 };

 const removeAction = (index: number) => {
  setActions(actions.filter((_, i) => i !== index));
 };

 const saveAutomation = async () => {
  if (!name.trim()) {
   alert('Please enter an automation name');
   return;
  }

  // Extract email configuration from SEND_EMAIL action if present
  const sendEmailAction = actions.find(a => a.type === 'SEND_EMAIL');
  const emailRecipients = sendEmailAction ? sendEmailAction.config.recipients || [] : null;
  const emailSubject = sendEmailAction ? sendEmailAction.config.subject || null : null;
  const emailTemplate = sendEmailAction ? sendEmailAction.config.body || null : null;

  const automationData = {
   name,
   description,
   active: true,
   order: automations.length,
   triggerConditions: { trigger, conditions, logic },
   actions: { actions },
   emailRecipients,
   emailSubject,
   emailTemplate,
   escalationEnabled,
   escalationHours: escalationEnabled ? escalationHours : null,
  };

  try {
   const url = editingAutomation
    ? `/api/injury-forms/${templateId}/automations/${editingAutomation.id}`
    : `/api/injury-forms/${templateId}/automations`;
   
   const res = await fetch(url, {
    method: editingAutomation ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(automationData),
   });

   if (res.ok) {
    setShowBuilder(false);
    loadAutomations();
    alert('Automation saved successfully!');
   } else {
    const error = await res.json();
    console.error('Failed to save automation:', error);
    alert(`Failed to save automation: ${error.error || 'Unknown error'}`);
   }
  } catch (error) {
   console.error('Error saving automation:', error);
   alert('Error saving automation. Please try again.');
  }
 };

 const toggleAutomation = async (id: string, currentActive: boolean) => {
  try {
   const automation = automations.find(a => a.id === id);
   if (!automation) return;

   const res = await fetch(`/api/injury-forms/${templateId}/automations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...automation, active: !currentActive }),
   });

   if (res.ok) {
    loadAutomations();
   }
  } catch (error) {
   console.error('Error toggling automation:', error);
  }
 };

 const deleteAutomation = async (id: string, name: string) => {
  confirmAndDelete(`automation "${name}"`, async () => {
   try {
    const res = await fetch(`/api/injury-forms/${templateId}/automations/${id}`, {
     method: 'DELETE',
    });

    if (res.ok) {
     loadAutomations();
    } else {
     showToast.error('Failed to delete automation');
    }
   } catch (error) {
    console.error('Error deleting automation:', error);
    showToast.error('Failed to delete automation');
   }
  });
 };

 const viewLogs = async (automationId: string, automationName: string) => {
  setSelectedAutomationName(automationName);
  setSelectedAutomationLogs('Loading logs...');
  setShowLogs(true);
  
  try {
   const res = await fetch(`/api/injury-forms/${templateId}/automations/${automationId}/logs`);
   if (res.ok) {
    const data = await res.json();
    setSelectedAutomationLogs(data.logs || 'No logs available yet. Logs will appear here after the automation runs.');
   } else {
    setSelectedAutomationLogs('Unable to load logs. Please check the browser console and server logs for automation execution details.');
   }
  } catch (error) {
   console.error('Error loading logs:', error);
   setSelectedAutomationLogs('Error loading logs. Check browser console for details:\n' + JSON.stringify(error, null, 2));
  }
 };

 const insertVariable = (variableInfo: {label: string; value: string}) => {
  const { target, actionIndex } = showVariablePicker;
  if (target === null || actionIndex === null) return;

  const action = actions[actionIndex];
  if (action.type !== 'SEND_EMAIL') return;

  // Use the rich text editor's insert function
  if (target === 'subject' && subjectEditorRefs.current[actionIndex]) {
    subjectEditorRefs.current[actionIndex]!(variableInfo);
  } else if (target === 'body' && bodyEditorRefs.current[actionIndex]) {
    bodyEditorRefs.current[actionIndex]!(variableInfo);
  }

  setShowVariablePicker({ show: false, target: null, actionIndex: null });
 };

 const getAvailableVariables = () => {
  const systemVariables = [
   { label: 'Submission ID', value: '{submission.id}' },
   { label: 'Status', value: '{submission.status}' },
   { label: 'Priority', value: '{submission.priority}' },
   { label: 'Submitted At', value: '{submission.submittedAt}' },
   { label: 'Gym Sport', value: '{submission.gymsport}' },
   { label: 'Class', value: '{submission.class}' },
  ];

  const formFieldVariables = allFields.map((field: Field) => ({
   label: field.label,
   value: `{field.${field.id}}`,
  }));

  return { systemVariables, formFieldVariables };
 };

 // Render smart value input based on selected field
 const renderValueInput = (condition: any, conditionIndex: number) => {
  const selectedField = condition.field;

  // System field: Status
  if (selectedField === '_status') {
   return (
    <select
     value={condition.value || ''}
     onChange={(e) => updateCondition(conditionIndex, { value: e.target.value })}
     className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
    >
     <option value="">Select status...</option>
     <option value="NEW">New</option>
     <option value="UNDER_REVIEW">Under Review</option>
     <option value="RESOLVED">Resolved</option>
     <option value="CLOSED">Closed</option>
    </select>
   );
  }

  // System field: Priority
  if (selectedField === '_priority') {
   return (
    <select
     value={condition.value || ''}
     onChange={(e) => updateCondition(conditionIndex, { value: e.target.value })}
     className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
    >
     <option value="">Select priority...</option>
     <option value="LOW">Low</option>
     <option value="MEDIUM">Medium</option>
     <option value="HIGH">High</option>
     <option value="CRITICAL">Critical</option>
    </select>
   );
  }

  // System field: Gym Sport
  if (selectedField === '_gymsport') {
   return (
    <select
     value={condition.value || ''}
     onChange={(e) => updateCondition(conditionIndex, { value: e.target.value })}
     className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
    >
     <option value="">Select gym sport...</option>
     {gymSports.map((gymSport) => (
      <option key={gymSport.id} value={gymSport.id}>
       {gymSport.name}
      </option>
     ))}
    </select>
   );
  }

  // System field: Class (grouped by gym sport)
  if (selectedField === '_class') {
   // Group classes by gym sport
   const groupedClasses = gymSports.map(gymSport => ({
    gymSport,
    classes: classTemplates.filter(c => c.gymsportId === gymSport.id),
   })).filter(group => group.classes.length > 0);

   return (
    <select
     value={condition.value || ''}
     onChange={(e) => updateCondition(conditionIndex, { value: e.target.value })}
     className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
    >
     <option value="">Select class...</option>
     {groupedClasses.map(group => (
      <optgroup key={group.gymSport.id} label={group.gymSport.name}>
       {group.classes.map(classTemplate => (
        <option key={classTemplate.id} value={classTemplate.id}>
         {classTemplate.name}
        </option>
       ))}
      </optgroup>
     ))}
    </select>
   );
  }

  // System field: Venue
  if (selectedField === '_venue') {
   return (
    <select
     value={condition.value || ''}
     onChange={(e) => updateCondition(conditionIndex, { value: e.target.value })}
     className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
    >
     <option value="">Select venue...</option>
     {venues.map((venue) => (
      <option key={venue.id} value={venue.id}>
       {venue.name}
      </option>
     ))}
    </select>
   );
  }

  // System field: Zone
  if (selectedField === '_zone') {
   return (
    <select
     value={condition.value || ''}
     onChange={(e) => updateCondition(conditionIndex, { value: e.target.value })}
     className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
    >
     <option value="">Select zone...</option>
     {zones.map((zone) => (
      <option key={zone.id} value={zone.id}>
       {zone.name}
      </option>
     ))}
    </select>
   );
  }

  // Form field: Check if it's a dropdown field
  const formField = allFields.find((f: any) => f.id === selectedField);
  if (formField && formField.fieldType === 'DROPDOWN' && formField.options) {
   try {
    const options = JSON.parse(formField.options);
    
    // If options are objects with id/name, use them
    if (options.length > 0 && typeof options[0] === 'object') {
     return (
      <select
       value={condition.value || ''}
       onChange={(e) => updateCondition(conditionIndex, { value: e.target.value })}
       className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
      >
       <option value="">Select value...</option>
       {options.map((option: any, idx: number) => (
        <option key={idx} value={option.id || option.name || option}>
         {option.name || option}
        </option>
       ))}
      </select>
     );
    } else {
     // Simple string options
     return (
      <select
       value={condition.value || ''}
       onChange={(e) => updateCondition(conditionIndex, { value: e.target.value })}
       className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
      >
       <option value="">Select value...</option>
       {options.map((option: string, idx: number) => (
        <option key={idx} value={option}>
         {option}
        </option>
       ))}
      </select>
     );
    }
   } catch (e) {
    // Fall through to default input if parsing fails
   }
  }

  // Default: Free text input
  return (
   <input
    type="text"
    value={condition.value || ''}
    onChange={(e) => updateCondition(conditionIndex, { value: e.target.value })}
    placeholder="Value"
    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
   />
  );
 };

 if (loading) {
  return (
   <DashboardLayout title="Automations">
    <InjuryReportsSubNav />
    <div className="flex items-center justify-center h-64">
     <div className="text-gray-500">Loading...</div>
    </div>
   </DashboardLayout>
  );
 }

 if (!template) {
  return (
   <DashboardLayout title="Automations">
    <InjuryReportsSubNav />
    <div className="text-center py-12">
     <div className="text-gray-400 text-lg">Template not found</div>
    </div>
   </DashboardLayout>
  );
 }

 const allFields = template.sections?.flatMap((s: any) => s.fields) || [];

 return (
  <DashboardLayout title="Automations">
   <InjuryReportsSubNav />
   <div className="space-y-6">
   {/* Header */}
   <div className="flex items-start justify-between">
    <div>
     <Link
      href="/dashboard/injury-reports/forms"
      className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-block"
>
      ← Back to Forms
     </Link>
     <h1 className="text-3xl font-bold text-gray-900">Automations</h1>
     <p className="text-gray-600 mt-1">{template.name}</p>
    </div>
    <button
     onClick={startNewAutomation}
     className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
>
     + Create Automation
    </button>
   </div>

   {/* Automations List */}
   {!showBuilder && (
    <div className="space-y-4">
     {automations.length === 0 ? (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
       <div className="text-6xl mb-4">⚡</div>
       <div className="text-gray-400 text-lg mb-2">No automations yet</div>
       <p className="text-gray-500 text-sm mb-6">Create automations to automatically process submissions</p>
       <button
        onClick={startNewAutomation}
        className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
>
        Create Your First Automation
       </button>
      </div>
     ) : (
      automations.map((automation) => (
       <div key={automation.id} className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex items-start justify-between">
         <div className="flex-1">
          <div className="flex items-center gap-3">
           <h3 className="text-xl font-semibold text-gray-900">{automation.name}</h3>
           {automation.active ? (
            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">Active</span>
           ) : (
            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">Inactive</span>
           )}
          </div>
          {automation.description && (
           <p className="text-gray-600 mt-2">{automation.description}</p>
          )}
          <div className="flex items-center gap-6 mt-4 text-sm text-gray-500">
           <div>
            Executed <span className="font-medium">{automation.executionCount}</span> times
           </div>
           {automation.lastExecuted && (
            <div>
             Last run: {new Date(automation.lastExecuted).toLocaleString()}
            </div>
           )}
          </div>
         </div>
         
         <div className="flex gap-2">
          <button
           onClick={() => toggleAutomation(automation.id, automation.active)}
           className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
>
           {automation.active ? 'Deactivate' : 'Activate'}
          </button>
          <button
           onClick={() => editAutomation(automation)}
           className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
>
           Edit
          </button>
          <button
           onClick={() => viewLogs(automation.id, automation.name)}
           className="px-3 py-2 text-sm border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50"
>
           Logs
          </button>
          <button
           onClick={() => deleteAutomation(automation.id, automation.name)}
           className="px-3 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
>
           Delete
          </button>
         </div>
        </div>
       </div>
      ))
     )}
    </div>
   )}

   {/* Automation Builder */}
   {showBuilder && (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
     {/* Header */}
     <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
      <div>
       <h2 className="text-2xl font-bold text-gray-900">
        {editingAutomation ? '✏️ Edit Automation' : '✨ New Automation'}
       </h2>
       <p className="text-sm text-gray-600 mt-1">
        Automate actions when specific events occur on your injury reports
       </p>
      </div>
      <button
       onClick={() => setShowBuilder(false)}
       className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
       title="Close"
>
       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
       </svg>
      </button>
     </div>

     <div className="p-6 space-y-6">
      {/* Visual Flow Indicator */}
      <div className="bg-gradient-to-r from-blue-50 via-amber-50 to-green-50 rounded-lg p-6 border border-gray-200">
       <h4 className="text-sm font-semibold text-gray-600 mb-3 text-center">Automation Workflow</h4>
       <div className="flex items-center justify-center gap-3">
        <div className="flex items-center gap-2">
         <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold shadow-md">1</div>
         <span className="text-sm font-medium text-gray-700">Trigger</span>
        </div>
        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <div className="flex items-center gap-2">
         <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center text-white font-bold shadow-md">2</div>
         <span className="text-sm font-medium text-gray-700">Conditions</span>
        </div>
        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <div className="flex items-center gap-2">
         <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold shadow-md">3</div>
         <span className="text-sm font-medium text-gray-700">Actions</span>
        </div>
       </div>
       <p className="text-xs text-gray-600 text-center mt-3">
        When the <strong>trigger</strong> event occurs and <strong>conditions</strong> are met, the <strong>actions</strong> will execute automatically
       </p>
      </div>

      {/* Basic Info */}
      <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
       <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <span className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center text-lg">📝</span>
        Basic Information
       </h3>
       <div className="space-y-4">
        <div>
         <label className="block text-sm font-medium text-gray-700 mb-2">
          Automation Name <span className="text-red-500">*</span>
         </label>
         <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          placeholder="e.g., Notify admin on critical injury"
         />
        </div>

        <div>
         <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
         </label>
         <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          rows={2}
          placeholder="Brief explanation of what this automation does..."
         />
        </div>
       </div>
      </div>

      {/* Trigger */}
      <div className="bg-blue-50 rounded-lg p-5 border border-blue-200">
       <div className="flex items-start gap-3 mb-4">
        <span className="w-8 h-8 bg-blue-200 rounded-lg flex items-center justify-center text-lg flex-shrink-0">⚡</span>
        <div className="flex-1">
         <h3 className="text-lg font-semibold text-gray-900 mb-1">Trigger Event</h3>
         <p className="text-sm text-blue-800">
          Choose when this automation should run. The trigger defines the event that starts the automation.
         </p>
        </div>
       </div>
       <select
        value={trigger}
        onChange={(e) => setTrigger(e.target.value)}
        className="w-full px-4 py-2.5 border border-blue-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
>
        <option value="ON_SUBMIT">When a form is submitted</option>
        <option value="ON_STATUS_CHANGE">When status changes</option>
       </select>
      </div>

      {/* Conditions */}
      <div className="bg-amber-50 rounded-lg p-5 border border-amber-200">
       <div className="flex items-start gap-3 mb-4">
        <span className="w-8 h-8 bg-amber-200 rounded-lg flex items-center justify-center text-lg flex-shrink-0">🔍</span>
        <div className="flex-1">
         <div className="flex items-center justify-between">
          <div>
           <h3 className="text-lg font-semibold text-gray-900 mb-1">Conditions (Optional)</h3>
           <p className="text-sm text-amber-800">
            Add conditions to run this automation only when specific criteria are met. Leave empty to run on every trigger event.
           </p>
          </div>
          <button
           onClick={addCondition}
           className="ml-4 px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-2 whitespace-nowrap"
>
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
           </svg>
           Add Condition
          </button>
         </div>
        </div>
       </div>

       {conditions.length > 0 && (
        <>
         <div className="mb-4 bg-white rounded-lg p-3 border border-amber-300">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
           <span>Match:</span>
           <select
            value={logic}
            onChange={(e) => setLogic(e.target.value)}
            className="px-3 py-1.5 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500"
>
            <option value="AND">All conditions (AND)</option>
            <option value="OR">Any condition (OR)</option>
           </select>
          </label>
         </div>

         <div className="space-y-3">
          {conditions.map((condition, index) => (
           <div key={index} className="flex items-center gap-2 bg-white p-3 rounded-lg border border-amber-200">
            <select
             value={condition.field}
             onChange={(e) => updateCondition(index, { field: e.target.value })}
             className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
>
             <option value="">Select field...</option>
             <optgroup label="System Fields">
              <option value="_status">Status</option>
              <option value="_priority">Priority</option>
              <option value="_gymsport">Gym Sport</option>
              <option value="_class">Class</option>
              <option value="_venue">Venue</option>
              <option value="_zone">Zone</option>
             </optgroup>
             <optgroup label="Form Fields">
              {allFields.map((field: Field) => (
               <option key={field.id} value={field.id}>{field.label}</option>
              ))}
             </optgroup>
            </select>
            
            <select
             value={condition.operator}
             onChange={(e) => updateCondition(index, { operator: e.target.value })}
             className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
>
             <option value="equals">Equals</option>
             <option value="notEquals">Not equals</option>
             <option value="contains">Contains</option>
             <option value="greaterThan">Greater than</option>
             <option value="lessThan">Less than</option>
            </select>
            
            {renderValueInput(condition, index)}
            
            <button
             onClick={() => removeCondition(index)}
             className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
             title="Remove condition"
>
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
             </svg>
            </button>
           </div>
          ))}
         </div>
        </>
       )}

       {conditions.length === 0 && (
        <div className="text-center py-6 bg-white rounded-lg border border-dashed border-amber-300">
         <p className="text-sm text-gray-500">No conditions added. This automation will run on every trigger event.</p>
        </div>
       )}
      </div>

      {/* Actions */}
      <div className="bg-green-50 rounded-lg p-5 border border-green-200">
       <div className="flex items-start gap-3 mb-4">
        <span className="w-8 h-8 bg-green-200 rounded-lg flex items-center justify-center text-lg flex-shrink-0">⚙️</span>
        <div className="flex-1">
         <div className="flex items-center justify-between">
          <div>
           <h3 className="text-lg font-semibold text-gray-900 mb-1">Actions</h3>
           <p className="text-sm text-green-800">
            Define what should happen when the trigger fires and conditions are met. You can add multiple actions.
           </p>
          </div>
          <div className="relative ml-4">
           <button
            onClick={() => setShowActionMenu(!showActionMenu)}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 whitespace-nowrap"
>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Action
           </button>
           {showActionMenu && (
            <>
             {/* Backdrop to close menu when clicking outside */}
             <div
              className="fixed inset-0 z-10"
              onClick={() => setShowActionMenu(false)}
             />
             <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-20 overflow-hidden">
              <button
               onClick={() => addAction('SEND_EMAIL')}
               className="w-full text-left px-4 py-3 text-sm hover:bg-green-50 flex items-center gap-3 transition-colors"
>
               <span className="text-lg">📧</span>
               <div>
                <div className="font-medium text-gray-900">Send Email</div>
                <div className="text-xs text-gray-500">Notify via email</div>
               </div>
              </button>
              <button
               onClick={() => addAction('SET_PRIORITY')}
               className="w-full text-left px-4 py-3 text-sm hover:bg-green-50 flex items-center gap-3 transition-colors border-t border-gray-100"
>
               <span className="text-lg">🔴</span>
               <div>
                <div className="font-medium text-gray-900">Set Priority</div>
                <div className="text-xs text-gray-500">Change priority level</div>
               </div>
              </button>
              <button
               onClick={() => addAction('SET_STATUS')}
               className="w-full text-left px-4 py-3 text-sm hover:bg-green-50 flex items-center gap-3 transition-colors border-t border-gray-100"
>
               <span className="text-lg">📊</span>
               <div>
                <div className="font-medium text-gray-900">Set Status</div>
                <div className="text-xs text-gray-500">Update report status</div>
               </div>
              </button>
              <button
               onClick={() => addAction('CREATE_NOTIFICATION')}
               className="w-full text-left px-4 py-3 text-sm hover:bg-green-50 flex items-center gap-3 transition-colors border-t border-gray-100"
>
               <span className="text-lg">🔔</span>
               <div>
                <div className="font-medium text-gray-900">Create Notification</div>
                <div className="text-xs text-gray-500">In-app notification</div>
               </div>
              </button>
             </div>
            </>
           )}
          </div>
         </div>
        </div>
       </div>

       {actions.length > 0 ? (
        <div className="space-y-3">
         {actions.map((action, index) => (
          <div key={index} className="bg-white border border-green-200 rounded-lg p-4 shadow-sm">
           <div className="flex items-center justify-between mb-3">
            <span className="font-medium text-gray-900 flex items-center gap-2">
             {action.type === 'SEND_EMAIL' && <><span className="text-lg">📧</span> Send Email</>}
             {action.type === 'SET_PRIORITY' && <><span className="text-lg">🔴</span> Set Priority</>}
             {action.type === 'SET_STATUS' && <><span className="text-lg">📊</span> Set Status</>}
             {action.type === 'CREATE_NOTIFICATION' && <><span className="text-lg">🔔</span> Create Notification</>}
            </span>
            <button
             onClick={() => removeAction(index)}
             className="text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
>
             Remove
            </button>
           </div>

          {action.type === 'SET_PRIORITY' && (
           <div className="bg-gray-50 p-3 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority Level</label>
            <select
             value={action.config.priority}
             onChange={(e) => updateAction(index, { config: { ...action.config, priority: e.target.value } })}
             className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
>
             <option value="LOW">🟢 Low</option>
             <option value="MEDIUM">🟡 Medium</option>
             <option value="HIGH">🟠 High</option>
             <option value="CRITICAL">🔴 Critical</option>
            </select>
           </div>
          )}

          {action.type === 'SEND_EMAIL' && (
           <div className="space-y-3">
            <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Recipients
             </label>
             <EmailRecipientsInput
              recipients={Array.isArray(action.config.recipients) ? action.config.recipients : []}
              onChange={(recipients) => updateAction(index, { config: { ...action.config, recipients } })}
             />
             <p className="text-xs text-gray-500 mt-2">
              💡 Tip: Use <code className="bg-gray-100 px-1 rounded">field:FIELD_ID</code> to send to an email captured in the form
             </p>
            </div>
            <div>
             <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
               Email Subject
              </label>
              <button
               type="button"
               onClick={() => setShowVariablePicker({ show: true, target: 'subject', actionIndex: index })}
               className="text-xs px-2 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100"
              >
               📋 Insert Variable
              </button>
             </div>
             <RichTextVariableEditor
              value={action.config.subject || ''}
              onChange={(newValue) => updateAction(index, { config: { ...action.config, subject: newValue } })}
              placeholder="e.g., New Injury Report Submitted"
              multiline={false}
              onInsertVariable={(insertFn) => {
                subjectEditorRefs.current[index] = insertFn;
              }}
             />
            </div>
            <div>
             <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
               Email Body
              </label>
              <button
               type="button"
               onClick={() => setShowVariablePicker({ show: true, target: 'body', actionIndex: index })}
               className="text-xs px-2 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100"
              >
               📋 Insert Variable
              </button>
             </div>
             <TipTapEditor
              value={action.config.body || ''}
              onChange={(newValue) => updateAction(index, { config: { ...action.config, body: newValue } })}
              placeholder="Compose your email message..."
              onInsertVariable={(insertFn) => {
                bodyEditorRefs.current[index] = insertFn;
              }}
             />
             <p className="text-xs text-gray-500 mt-2">
              💡 Use the toolbar to format text and click "Insert Variable" to add dynamic content from the form
             </p>
            </div>
           </div>
          )}

          {action.type === 'SET_STATUS' && (
           <div className="bg-gray-50 p-3 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">Set Status To</label>
            <select
             value={action.config.status}
             onChange={(e) => updateAction(index, { config: { ...action.config, status: e.target.value } })}
             className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
>
             <option value="NEW">New</option>
             <option value="UNDER_REVIEW">Under Review</option>
             <option value="RESOLVED">Resolved</option>
             <option value="CLOSED">Closed</option>
            </select>
           </div>
          )}

          {action.type === 'CREATE_NOTIFICATION' && (
           <div className="space-y-3 bg-gray-50 p-3 rounded-lg">
            <div>
             <label className="block text-sm font-medium text-gray-700 mb-2">Notification Title</label>
             <input
              type="text"
              value={action.config.title || ''}
              onChange={(e) => updateAction(index, { config: { ...action.config, title: e.target.value } })}
              placeholder="e.g., New Critical Injury Report"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
             />
            </div>
            <div>
             <label className="block text-sm font-medium text-gray-700 mb-2">Notification Message</label>
             <textarea
              value={action.config.message || ''}
              onChange={(e) => updateAction(index, { config: { ...action.config, message: e.target.value } })}
              placeholder="Message content..."
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
             />
            </div>
           </div>
          )}
         </div>
        ))}
       </div>
       ) : (
        <div className="text-center py-8 bg-white rounded-lg border border-dashed border-green-300">
         <span className="text-4xl mb-2 block">⚙️</span>
         <p className="text-sm text-gray-500">No actions added yet. Click "Add Action" to define what should happen.</p>
        </div>
       )}
      </div>

      {/* Escalation */}
      <div className="bg-purple-50 rounded-lg p-5 border border-purple-200">
       <div className="flex items-start gap-3 mb-4">
        <span className="w-8 h-8 bg-purple-200 rounded-lg flex items-center justify-center text-lg flex-shrink-0">⏰</span>
        <div className="flex-1">
         <h3 className="text-lg font-semibold text-gray-900 mb-1">Escalation (Optional)</h3>
         <p className="text-sm text-purple-800 mb-3">
          Automatically escalate if the report isn't addressed within a certain timeframe.
         </p>
         <label className="flex items-center gap-2 cursor-pointer">
          <input
           type="checkbox"
           checked={escalationEnabled}
           onChange={(e) => setEscalationEnabled(e.target.checked)}
           className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
          />
          <span className="font-medium text-gray-900">Enable escalation</span>
         </label>
        </div>
       </div>

       {escalationEnabled && (
        <div className="bg-white rounded-lg p-4 border border-purple-200 mt-3">
         <label className="block text-sm font-medium text-gray-700 mb-2">
          Escalate after (hours)
         </label>
         <input
          type="number"
          value={escalationHours}
          onChange={(e) => setEscalationHours(parseInt(e.target.value))}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          min="1"
          placeholder="24"
         />
         <p className="text-xs text-gray-500 mt-2">
          If no action is taken within this time, the automation will trigger again
         </p>
        </div>
       )}
      </div>

      {/* Save */}
      <div className="flex gap-3 pt-2">
       <button
        onClick={saveAutomation}
        className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 font-medium shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        {editingAutomation ? 'Update Automation' : 'Create Automation'}
       </button>
       <button
        onClick={() => setShowBuilder(false)}
        className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
>
        Cancel
       </button>
      </div>
     </div>
    </div>
   )}

   {/* Logs Modal */}
   {showLogs && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
     <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
      <div className="flex items-center justify-between p-6 border-b">
       <h2 className="text-2xl font-bold text-gray-900">
        Automation Logs: {selectedAutomationName}
       </h2>
       <button
        onClick={() => setShowLogs(false)}
        className="text-gray-500 hover:text-gray-700 text-2xl"
>
        ✕
       </button>
      </div>
      <div className="p-6 overflow-auto flex-1">
       <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm whitespace-pre-wrap overflow-x-auto">
        {selectedAutomationLogs}
       </div>
       <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">💡 How to view detailed logs:</h3>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
         <li>Open your browser's Developer Console (F12 or right-click → Inspect)</li>
         <li>Go to the Console tab</li>
         <li>Submit a new injury report to trigger the automation</li>
         <li>Look for logs starting with 🤖 and [Automation ...]</li>
         <li>Server logs will show detailed email sending information</li>
        </ol>
       </div>
      </div>
      <div className="flex justify-end gap-3 p-6 border-t">
       <button
        onClick={() => setShowLogs(false)}
        className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
>
        Close
       </button>
      </div>
     </div>
    </div>
   )}

   {/* Variable Picker Sidebar */}
   {showVariablePicker.show && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-end z-50">
     <div 
      className="fixed inset-0" 
      onClick={() => setShowVariablePicker({ show: false, target: null, actionIndex: null })}
     />
     <div className="bg-white h-full w-96 shadow-2xl flex flex-col relative z-10">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
       <h3 className="text-lg font-semibold">Insert Variable</h3>
       <button
        onClick={() => setShowVariablePicker({ show: false, target: null, actionIndex: null })}
        className="text-white hover:bg-white/20 rounded p-1"
       >
        ✕
       </button>
      </div>

      {/* Variable Lists */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
       {(() => {
        const { systemVariables, formFieldVariables } = getAvailableVariables();
        
        return (
         <>
          {/* System Variables */}
          <div>
           <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="text-lg">⚙️</span>
            System Variables
           </h4>
           <div className="space-y-2">
            {systemVariables.map((variable, idx) => (
             <button
              key={idx}
              onClick={() => insertVariable(variable)}
              className="w-full text-left px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors group"
             >
              <div className="text-sm font-medium text-gray-900 group-hover:text-blue-700">
               {variable.label}
              </div>
              <div className="text-xs text-gray-500 font-mono mt-1">
               {variable.value}
              </div>
             </button>
            ))}
           </div>
          </div>

          {/* Form Field Variables */}
          <div>
           <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="text-lg">📝</span>
            Form Fields
           </h4>
           <div className="space-y-2">
            {formFieldVariables.length === 0 ? (
             <div className="text-sm text-gray-500 text-center py-4">
              No form fields available
             </div>
            ) : (
             formFieldVariables.map((variable: any, idx: number) => (
              <button
               key={idx}
               onClick={() => insertVariable(variable)}
               className="w-full text-left px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors group"
              >
               <div className="text-sm font-medium text-gray-900 group-hover:text-blue-700">
                {variable.label}
               </div>
               <div className="text-xs text-gray-500 font-mono mt-1">
                {variable.value}
               </div>
              </button>
             ))
            )}
           </div>
          </div>
         </>
        );
       })()}
      </div>

      {/* Footer with instructions */}
      <div className="border-t bg-gray-50 p-4">
       <div className="text-xs text-gray-600">
        <p className="font-medium mb-1">💡 How to use:</p>
        <p>Click any variable to insert it as a pill into your email {showVariablePicker.target === 'subject' ? 'subject' : 'body'}.</p>
        <p className="mt-2">Variables appear as blue pills with friendly names. Hover over them to see the code.</p>
        <p className="mt-1">You can type freely around the variables and delete them with backspace.</p>
       </div>
      </div>
     </div>
    </div>
   )}
  </div>
  </DashboardLayout>
 );
}

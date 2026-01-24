'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';

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
  const router = useRouter();
  const templateId = params.id as string;

  const [template, setTemplate] = useState<any>(null);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [loading, setLoading] = useState(true);

  // Builder state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [trigger, setTrigger] = useState('ON_SUBMIT');
  const [conditions, setConditions] = useState<any[]>([]);
  const [logic, setLogic] = useState('AND');
  const [actions, setActions] = useState<any[]>([]);
  const [escalationEnabled, setEscalationEnabled] = useState(false);
  const [escalationHours, setEscalationHours] = useState(24);

  useEffect(() => {
    loadTemplate();
    loadAutomations();
  }, [templateId]);

  const loadTemplate = async () => {
    try {
      const res = await fetch(`/api/injury-forms/${templateId}`);
      if (res.ok) {
        const data = await res.json();
        setTemplate(data.template);
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
    setActions(parsedActions.actions || []);
    
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

    const automationData = {
      name,
      description,
      active: true,
      order: automations.length,
      triggerConditions: { trigger, conditions, logic },
      actions: { actions },
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
      }
    } catch (error) {
      console.error('Error saving automation:', error);
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

  const deleteAutomation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this automation?')) return;

    try {
      const res = await fetch(`/api/injury-forms/${templateId}/automations/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        loadAutomations();
      }
    } catch (error) {
      console.error('Error deleting automation:', error);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Automations">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!template) {
    return (
      <DashboardLayout title="Automations">
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg">Template not found</div>
        </div>
      </DashboardLayout>
    );
  }

  const allFields = template.sections?.flatMap((s: any) => s.fields) || [];

  return (
    <DashboardLayout title="Automations">
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
                      onClick={() => deleteAutomation(automation.id)}
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
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {editingAutomation ? 'Edit Automation' : 'New Automation'}
            </h2>
            <button
              onClick={() => setShowBuilder(false)}
              className="text-gray-600 hover:text-gray-900"
            >
              ✕
            </button>
          </div>

          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Automation Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., Notify admin on critical injury"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                rows={2}
                placeholder="What does this automation do?"
              />
            </div>

            {/* Trigger */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">⚡ Trigger</h3>
              <select
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="ON_SUBMIT">When a form is submitted</option>
                <option value="ON_STATUS_CHANGE">When status changes</option>
              </select>
            </div>

            {/* Conditions */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">🔍 Conditions</h3>
                <button
                  onClick={addCondition}
                  className="px-3 py-1 text-sm bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
                >
                  + Add Condition
                </button>
              </div>

              {conditions.length > 0 && (
                <div className="mb-4">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <span className="font-medium">Match:</span>
                    <select
                      value={logic}
                      onChange={(e) => setLogic(e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded"
                    >
                      <option value="AND">All conditions (AND)</option>
                      <option value="OR">Any condition (OR)</option>
                    </select>
                  </label>
                </div>
              )}

              <div className="space-y-3">
                {conditions.map((condition, index) => (
                  <div key={index} className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                    <select
                      value={condition.field}
                      onChange={(e) => updateCondition(index, { field: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Select field...</option>
                      <option value="_status">Status</option>
                      <option value="_priority">Priority</option>
                      {allFields.map((field: Field) => (
                        <option key={field.id} value={field.id}>{field.label}</option>
                      ))}
                    </select>
                    
                    <select
                      value={condition.operator}
                      onChange={(e) => updateCondition(index, { operator: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="equals">Equals</option>
                      <option value="notEquals">Not equals</option>
                      <option value="contains">Contains</option>
                      <option value="greaterThan">Greater than</option>
                      <option value="lessThan">Less than</option>
                    </select>
                    
                    <input
                      type="text"
                      value={condition.value}
                      onChange={(e) => updateCondition(index, { value: e.target.value })}
                      placeholder="Value"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    
                    <button
                      onClick={() => removeCondition(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">⚙️ Actions</h3>
                <div className="relative group">
                  <button className="px-3 py-1 text-sm bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200">
                    + Add Action
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg hidden group-hover:block z-10">
                    <button
                      onClick={() => addAction('SEND_EMAIL')}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                    >
                      📧 Send Email
                    </button>
                    <button
                      onClick={() => addAction('SET_PRIORITY')}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                    >
                      🔴 Set Priority
                    </button>
                    <button
                      onClick={() => addAction('SET_STATUS')}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                    >
                      📊 Set Status
                    </button>
                    <button
                      onClick={() => addAction('CREATE_NOTIFICATION')}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                    >
                      🔔 Create Notification
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {actions.map((action, index) => (
                  <div key={index} className="border border-gray-300 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-gray-900">
                        {action.type === 'SEND_EMAIL' && '📧 Send Email'}
                        {action.type === 'SET_PRIORITY' && '🔴 Set Priority'}
                        {action.type === 'SET_STATUS' && '📊 Set Status'}
                        {action.type === 'CREATE_NOTIFICATION' && '🔔 Create Notification'}
                      </span>
                      <button
                        onClick={() => removeAction(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>

                    {action.type === 'SET_PRIORITY' && (
                      <select
                        value={action.config.priority}
                        onChange={(e) => updateAction(index, { config: { ...action.config, priority: e.target.value } })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="CRITICAL">Critical</option>
                      </select>
                    )}

                    {action.type === 'SET_STATUS' && (
                      <select
                        value={action.config.status}
                        onChange={(e) => updateAction(index, { config: { ...action.config, status: e.target.value } })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="NEW">New</option>
                        <option value="UNDER_REVIEW">Under Review</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="CLOSED">Closed</option>
                      </select>
                    )}

                    {action.type === 'CREATE_NOTIFICATION' && (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={action.config.title || ''}
                          onChange={(e) => updateAction(index, { config: { ...action.config, title: e.target.value } })}
                          placeholder="Notification title"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                        <textarea
                          value={action.config.message || ''}
                          onChange={(e) => updateAction(index, { config: { ...action.config, message: e.target.value } })}
                          placeholder="Notification message"
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Escalation */}
            <div className="border-t pt-6">
              <label className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  checked={escalationEnabled}
                  onChange={(e) => setEscalationEnabled(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="font-medium text-gray-900">Enable escalation</span>
              </label>

              {escalationEnabled && (
                <div>
                  <label className="block text-sm text-gray-700 mb-1">
                    Escalate after (hours)
                  </label>
                  <input
                    type="number"
                    value={escalationHours}
                    onChange={(e) => setEscalationHours(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    min="1"
                  />
                </div>
              )}
            </div>

            {/* Save */}
            <div className="flex gap-3 pt-6 border-t">
              <button
                onClick={saveAutomation}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                {editingAutomation ? 'Update Automation' : 'Create Automation'}
              </button>
              <button
                onClick={() => setShowBuilder(false)}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </DashboardLayout>
  );
}

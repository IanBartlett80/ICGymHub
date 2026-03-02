'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ScheduledMaintenanceFormProps {
  equipmentId: string;
  equipmentName: string;
  onClose: () => void;
  onSuccess: () => void;
  existingTask?: any; // For editing existing tasks
}

export default function ScheduledMaintenanceForm({
  equipmentId,
  equipmentName,
  onClose,
  onSuccess,
  existingTask,
}: ScheduledMaintenanceFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    taskType: existingTask?.taskType || 'ROUTINE',
    title: existingTask?.title || '',
    description: existingTask?.description || '',
    dueDate: existingTask?.dueDate ? new Date(existingTask.dueDate).toISOString().split('T')[0] : '',
    assignedToName: existingTask?.assignedToName || '',
    assignedToEmail: existingTask?.assignedToEmail || '',
    priority: existingTask?.priority || 'MEDIUM',
    isRecurring: existingTask?.isRecurring || false,
    recurrencePattern: existingTask?.recurrencePattern || 'WEEKLY',
    recurrenceInterval: existingTask?.recurrenceInterval || 1,
    recurrenceDay: existingTask?.recurrenceDay || null,
    recurrenceDayOfWeek: existingTask?.recurrenceDayOfWeek || 'MONDAY',
    recurrenceEndDate: existingTask?.recurrenceEndDate 
      ? new Date(existingTask.recurrenceEndDate).toISOString().split('T')[0] 
      : '',
    reminder7Days: true,
    reminder3Days: true,
    reminder1Day: true,
    notes: existingTask?.notes || '',
  });

  // Parse existing reminder days if editing
  useEffect(() => {
    if (existingTask?.reminderDays) {
      try {
        const reminderDays = JSON.parse(existingTask.reminderDays);
        setFormData(prev => ({
          ...prev,
          reminder7Days: reminderDays.includes(7),
          reminder3Days: reminderDays.includes(3),
          reminder1Day: reminderDays.includes(1),
        }));
      } catch (e) {
        console.error('Failed to parse reminder days:', e);
      }
    }
  }, [existingTask]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Build reminder days array
      const reminderDays = [];
      if (formData.reminder7Days) reminderDays.push(7);
      if (formData.reminder3Days) reminderDays.push(3);
      if (formData.reminder1Day) reminderDays.push(1);

      // Calculate next reminder date based on due date and reminder days
      let nextReminderDate = null;
      if (reminderDays.length > 0 && formData.dueDate) {
        const dueDate = new Date(formData.dueDate);
        const maxReminderDays = Math.max(...reminderDays);
        const reminderDate = new Date(dueDate);
        reminderDate.setDate(reminderDate.getDate() - maxReminderDays);
        nextReminderDate = reminderDate.toISOString();
      }

      const payload = {
        equipmentId,
        taskType: formData.taskType,
        title: formData.title,
        description: formData.description,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
        assignedToName: formData.assignedToName || null,
        assignedToEmail: formData.assignedToEmail || null,
        priority: formData.priority,
        isRecurring: formData.isRecurring,
        recurrencePattern: formData.isRecurring ? formData.recurrencePattern : null,
        recurrenceInterval: formData.isRecurring ? parseInt(formData.recurrenceInterval.toString()) : null,
        recurrenceDay: formData.isRecurring && ['MONTHLY', 'WEEKLY'].includes(formData.recurrencePattern)
          ? parseInt(formData.recurrenceDay?.toString() || '0')
          : null,
        recurrenceDayOfWeek: formData.isRecurring && formData.recurrencePattern === 'WEEKLY'
          ? formData.recurrenceDayOfWeek
          : null,
        recurrenceEndDate: formData.isRecurring && formData.recurrenceEndDate
          ? new Date(formData.recurrenceEndDate).toISOString()
          : null,
        reminderDays: JSON.stringify(reminderDays),
        nextReminderDate,
        notes: formData.notes || null,
        status: 'PENDING',
      };

      const url = existingTask
        ? `/api/maintenance-tasks/${existingTask.id}`
        : '/api/maintenance-tasks';
      const method = existingTask ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save maintenance task');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      alert(error.message || 'Failed to save maintenance task');
    } finally {
      setLoading(false);
    }
  };

  const daysOfWeek = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {existingTask ? 'Edit' : 'Schedule'} Maintenance Task
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Equipment Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <span className="font-medium">Equipment:</span> {equipmentName}
            </p>
          </div>

          {/* Task Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.taskType}
              onChange={(e) => setFormData({ ...formData, taskType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="ROUTINE">Routine Maintenance</option>
              <option value="INSPECTION">Inspection</option>
              <option value="REPAIR">Repair</option>
              <option value="REPLACEMENT">Replacement</option>
              <option value="CLEANING">Cleaning</option>
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Monthly safety inspection"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Detailed description of the maintenance task..."
              required
            />
          </div>

          {/* Due Date and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
          </div>

          {/* Assigned Person */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Assignment</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assigned To (Name)
                </label>
                <input
                  type="text"
                  value={formData.assignedToName}
                  onChange={(e) => setFormData({ ...formData, assignedToName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email (for reminders)
                </label>
                <input
                  type="email"
                  value={formData.assignedToEmail}
                  onChange={(e) => setFormData({ ...formData, assignedToEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="john.smith@example.com"
                />
              </div>
            </div>
          </div>

          {/* Recurring Settings */}
          <div className="border-t pt-6">
            <div className="flex items-center mb-4">
              <input
                id="isRecurring"
                type="checkbox"
                checked={formData.isRecurring}
                onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="isRecurring" className="ml-2 text-lg font-medium text-gray-900">
                Recurring Maintenance
              </label>
            </div>

            {formData.isRecurring && (
              <div className="space-y-4 pl-6 border-l-2 border-blue-200">
                {/* Recurrence Pattern */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Frequency
                    </label>
                    <select
                      value={formData.recurrencePattern}
                      onChange={(e) => setFormData({ ...formData, recurrencePattern: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="DAILY">Daily</option>
                      <option value="WEEKLY">Weekly</option>
                      <option value="MONTHLY">Monthly</option>
                      <option value="YEARLY">Yearly</option>
                      <option value="CUSTOM">Custom (days)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Every
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={formData.recurrenceInterval}
                        onChange={(e) => setFormData({ ...formData, recurrenceInterval: parseInt(e.target.value) || 1 })}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="text-sm text-gray-600">
                        {formData.recurrencePattern === 'DAILY' && 'days'}
                        {formData.recurrencePattern === 'WEEKLY' && 'weeks'}
                        {formData.recurrencePattern === 'MONTHLY' && 'months'}
                        {formData.recurrencePattern === 'YEARLY' && 'years'}
                        {formData.recurrencePattern === 'CUSTOM' && 'days'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Weekly - Day of Week */}
                {formData.recurrencePattern === 'WEEKLY' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      On Day
                    </label>
                    <select
                      value={formData.recurrenceDayOfWeek}
                      onChange={(e) => setFormData({ ...formData, recurrenceDayOfWeek: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {daysOfWeek.map(day => (
                        <option key={day} value={day}>{day.charAt(0) + day.slice(1).toLowerCase()}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Monthly - Day of Month */}
                {formData.recurrencePattern === 'MONTHLY' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      On Day of Month
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={formData.recurrenceDay || ''}
                      onChange={(e) => setFormData({ ...formData, recurrenceDay: parseInt(e.target.value) || null })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="1-31"
                    />
                  </div>
                )}

                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date (optional)
                  </label>
                  <input
                    type="date"
                    value={formData.recurrenceEndDate}
                    onChange={(e) => setFormData({ ...formData, recurrenceEndDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Leave blank for indefinite recurring maintenance
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Email Reminders */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Email Reminders</h3>
            <p className="text-sm text-gray-600 mb-4">
              Send reminder emails to the assigned person before the due date
            </p>
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  id="reminder7Days"
                  type="checkbox"
                  checked={formData.reminder7Days}
                  onChange={(e) => setFormData({ ...formData, reminder7Days: e.target.checked })}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="reminder7Days" className="ml-2 text-sm text-gray-700">
                  7 days before due date
                </label>
              </div>

              <div className="flex items-center">
                <input
                  id="reminder3Days"
                  type="checkbox"
                  checked={formData.reminder3Days}
                  onChange={(e) => setFormData({ ...formData, reminder3Days: e.target.checked })}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="reminder3Days" className="ml-2 text-sm text-gray-700">
                  3 days before due date
                </label>
              </div>

              <div className="flex items-center">
                <input
                  id="reminder1Day"
                  type="checkbox"
                  checked={formData.reminder1Day}
                  onChange={(e) => setFormData({ ...formData, reminder1Day: e.target.checked })}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="reminder1Day" className="ml-2 text-sm text-gray-700">
                  1 day before due date
                </label>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Any additional information or special instructions..."
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : existingTask ? 'Update Task' : 'Schedule Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

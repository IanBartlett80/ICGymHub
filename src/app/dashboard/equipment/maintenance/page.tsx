'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import EquipmentManagementSubNav from '@/components/EquipmentManagementSubNav';
import ScheduledMaintenanceForm from '@/components/ScheduledMaintenanceForm';
import VenueSelector from '@/components/VenueSelector';
import { showToast } from '@/lib/toast';

interface EquipmentItem {
  id: string;
  name: string;
  category: string | null;
  zone?: {
    id: string;
    name: string;
  } | null;
}

interface MaintenanceTask {
  id: string;
  taskType: string;
  title: string;
  description: string;
  scheduledDate: string | null;
  dueDate: string | null;
  completedDate: string | null;
  assignedTo: string | null;
  assignedToName: string | null;
  assignedToEmail: string | null;
  completedBy: string | null;
  status: string;
  priority: string;
  cost: string | null;
  notes: string | null;
  isRecurring: boolean;
  equipmentId: string;
  equipment: {
    id: string;
    name: string;
    zone?: {
      id: string;
      name: string;
    } | null;
  };
}

export default function MaintenanceDuePage() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [taskTypeFilter, setTaskTypeFilter] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [equipmentFilter, setEquipmentFilter] = useState('');
  const [venueId, setVenueId] = useState<string | null>(null);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentItem | null>(null);
  const [editingTask, setEditingTask] = useState<MaintenanceTask | null>(null);
  const [bulkCreating, setBulkCreating] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (venueId && venueId !== 'all') params.set('venueId', venueId);
      if (statusFilter) params.set('status', statusFilter);
      if (priorityFilter) params.set('priority', priorityFilter);
      if (taskTypeFilter) params.set('taskType', taskTypeFilter);
      if (overdueOnly) params.set('overdue', 'true');
      if (equipmentFilter) params.set('equipmentId', equipmentFilter);
      params.set('limit', '500');

      const [tasksRes, equipmentRes] = await Promise.all([
        fetch(`/api/maintenance-tasks?${params.toString()}`),
        fetch(`/api/equipment?${venueId && venueId !== 'all' ? `venueId=${venueId}` : ''}`),
      ]);

      if (!tasksRes.ok) {
        throw new Error('Failed to load maintenance tasks');
      }

      if (!equipmentRes.ok) {
        throw new Error('Failed to load equipment list');
      }

      const tasksData = await tasksRes.json();
      const equipmentData = await equipmentRes.json();

      setTasks(tasksData.tasks || []);
      setEquipment(equipmentData.equipment || equipmentData || []);
    } catch (error: any) {
      showToast.error(error.message || 'Failed to load maintenance data');
    } finally {
      setLoading(false);
    }
  }, [equipmentFilter, overdueOnly, priorityFilter, statusFilter, taskTypeFilter, venueId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredTasks = useMemo(() => {
    if (!searchTerm.trim()) return tasks;

    const searchLower = searchTerm.toLowerCase();
    return tasks.filter((task) => {
      return (
        task.title.toLowerCase().includes(searchLower) ||
        task.description.toLowerCase().includes(searchLower) ||
        task.equipment.name.toLowerCase().includes(searchLower) ||
        task.assignedToName?.toLowerCase().includes(searchLower) ||
        task.assignedTo?.toLowerCase().includes(searchLower)
      );
    });
  }, [tasks, searchTerm]);

  const groupedByEquipment = useMemo(() => {
    const groups: Record<string, { equipmentName: string; zoneName: string; tasks: MaintenanceTask[] }> = {};

    filteredTasks.forEach((task) => {
      if (!groups[task.equipmentId]) {
        groups[task.equipmentId] = {
          equipmentName: task.equipment?.name || 'Unknown Equipment',
          zoneName: task.equipment?.zone?.name || 'No Zone',
          tasks: [],
        };
      }
      groups[task.equipmentId].tasks.push(task);
    });

    return Object.entries(groups).sort((a, b) => a[1].equipmentName.localeCompare(b[1].equipmentName));
  }, [filteredTasks]);

  const equipmentWithoutTasks = useMemo(() => {
    const equipmentWithTasks = new Set(tasks.map((task) => task.equipmentId));
    const searchLower = searchTerm.trim().toLowerCase();

    return equipment
      .filter((item) => !equipmentWithTasks.has(item.id))
      .filter((item) => {
        if (!searchLower) return true;
        return (
          item.name.toLowerCase().includes(searchLower) ||
          item.category?.toLowerCase().includes(searchLower) ||
          item.zone?.name?.toLowerCase().includes(searchLower)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [equipment, tasks, searchTerm]);

  const summary = useMemo(() => {
    const now = new Date();
    const weekAhead = new Date();
    weekAhead.setDate(weekAhead.getDate() + 7);

    const active = tasks.filter((t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS');
    const overdue = active.filter((t) => t.dueDate && new Date(t.dueDate) < now);
    const dueSoon = active.filter((t) => t.dueDate && new Date(t.dueDate) >= now && new Date(t.dueDate) <= weekAhead);
    const completed = tasks.filter((t) => t.status === 'COMPLETED');

    return {
      total: tasks.length,
      active: active.length,
      overdue: overdue.length,
      dueSoon: dueSoon.length,
      completed: completed.length,
    };
  }, [tasks]);

  const formatDate = (value: string | null) => {
    if (!value) return 'N/A';
    return new Date(value).toLocaleDateString();
  };

  const getStatusPill = (status: string) => {
    if (status === 'PENDING') return 'bg-blue-50 text-blue-700';
    if (status === 'IN_PROGRESS') return 'bg-yellow-50 text-yellow-700';
    if (status === 'COMPLETED') return 'bg-green-50 text-green-700';
    if (status === 'CANCELLED') return 'bg-gray-100 text-gray-700';
    return 'bg-gray-100 text-gray-700';
  };

  const getPriorityPill = (priority: string) => {
    if (priority === 'HIGH') return 'bg-orange-100 text-orange-800';
    if (priority === 'MEDIUM') return 'bg-yellow-100 text-yellow-800';
    if (priority === 'LOW') return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-700';
  };

  const refreshTasks = async () => {
    await loadData();
  };

  const openScheduleForm = (item: EquipmentItem) => {
    setSelectedEquipment(item);
    setEditingTask(null);
    setShowMaintenanceForm(true);
  };

  const openEditForm = (task: MaintenanceTask) => {
    const item = equipment.find((e) => e.id === task.equipmentId) || {
      id: task.equipment.id,
      name: task.equipment.name,
      category: null,
      zone: task.equipment.zone || null,
    };

    setSelectedEquipment(item);
    setEditingTask(task);
    setShowMaintenanceForm(true);
  };

  const updateTaskStatus = async (task: MaintenanceTask, nextStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED') => {
    try {
      const payload: any = { status: nextStatus };

      if (nextStatus === 'COMPLETED' && task.status !== 'COMPLETED') {
        const completedBy = window.prompt('Who completed this task?', task.assignedToName || task.assignedTo || '');
        if (!completedBy || !completedBy.trim()) {
          return;
        }
        payload.completedBy = completedBy.trim();
        payload.completedDate = new Date().toISOString();
      }

      const response = await fetch(`/api/maintenance-tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update task');
      }

      showToast.saveSuccess('Maintenance task');
      await refreshTasks();
    } catch (error: any) {
      showToast.error(error.message || 'Failed to update task');
    }
  };

  const deleteTask = async (task: MaintenanceTask) => {
    const confirmed = window.confirm(`Delete task \"${task.title}\" for ${task.equipment.name}?`);
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/maintenance-tasks/${task.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete task');
      }

      showToast.success('Maintenance task deleted');
      await refreshTasks();
    } catch (error: any) {
      showToast.error(error.message || 'Failed to delete task');
    }
  };

  const createBulkTasksForUnlinkedEquipment = async () => {
    if (equipmentWithoutTasks.length === 0 || bulkCreating) return;

    const confirmed = window.confirm(
      `Create initial maintenance tasks for ${equipmentWithoutTasks.length} equipment records with no linked tasks?`
    );

    if (!confirmed) return;

    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 30);
    const defaultDueDateValue = defaultDueDate.toISOString().split('T')[0];

    const dueDateInput = window.prompt(
      'Enter due date for all created tasks (YYYY-MM-DD):',
      defaultDueDateValue
    );

    if (dueDateInput === null) {
      return;
    }

    const parsedDueDate = new Date(dueDateInput);
    if (Number.isNaN(parsedDueDate.getTime())) {
      showToast.error('Invalid due date format. Use YYYY-MM-DD.');
      return;
    }

    setBulkCreating(true);

    try {
      let successCount = 0;
      let failCount = 0;

      for (const item of equipmentWithoutTasks) {
        const response = await fetch('/api/maintenance-tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            equipmentId: item.id,
            taskType: 'INSPECTION',
            title: 'Initial maintenance inspection',
            description: 'Initial scheduled maintenance inspection for this equipment record.',
            dueDate: parsedDueDate.toISOString(),
            priority: 'MEDIUM',
            status: 'PENDING',
          }),
        });

        if (response.ok) {
          successCount += 1;
        } else {
          failCount += 1;
        }
      }

      if (successCount > 0) {
        showToast.success(`Created ${successCount} maintenance task(s).`);
      }

      if (failCount > 0) {
        showToast.error(`${failCount} task(s) failed to create.`);
      }

      await refreshTasks();
    } catch (error: any) {
      showToast.error(error.message || 'Failed to create bulk maintenance tasks');
    } finally {
      setBulkCreating(false);
    }
  };

  return (
    <DashboardLayout hideSidebar={true}>
      <EquipmentManagementSubNav />
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance Due</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage and resolve all maintenance tasks linked to equipment in your club.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">Total Tasks</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{summary.total}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">Active</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">{summary.active}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">Overdue</p>
            <p className="text-2xl font-bold text-red-700 mt-1">{summary.overdue}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">Due in 7 Days</p>
            <p className="text-2xl font-bold text-orange-700 mt-1">{summary.dueSoon}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">Completed</p>
            <p className="text-2xl font-bold text-green-700 mt-1">{summary.completed}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <VenueSelector
              value={venueId}
              onChange={setVenueId}
              showAllOption={true}
            />

            <input
              type="text"
              placeholder="Search tasks, equipment, assignee"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="md:col-span-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />

            <select
              value={equipmentFilter}
              onChange={(e) => setEquipmentFilter(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">All Equipment</option>
              {equipment.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">All Priorities</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <select
              value={taskTypeFilter}
              onChange={(e) => setTaskTypeFilter(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">All Types</option>
              <option value="ROUTINE">Routine</option>
              <option value="INSPECTION">Inspection</option>
              <option value="REPAIR">Repair</option>
              <option value="REPLACEMENT">Replacement</option>
              <option value="CLEANING">Cleaning</option>
            </select>
          </div>

          <div className="mt-3 flex items-center gap-4">
            <label className="inline-flex items-center text-sm text-gray-700">
              <input
                type="checkbox"
                checked={overdueOnly}
                onChange={(e) => setOverdueOnly(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mr-2"
              />
              Overdue only
            </label>
            <button
              onClick={refreshTasks}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-56 bg-white border border-gray-200 rounded-lg">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          </div>
        ) : groupedByEquipment.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-10 text-center">
            <p className="text-gray-600">No maintenance tasks found for the selected filters.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedByEquipment.map(([equipmentId, group]) => {
              const equipmentItem = equipment.find((item) => item.id === equipmentId) || null;

              return (
                <div key={equipmentId} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{group.equipmentName}</h2>
                      <p className="text-sm text-gray-600">Zone: {group.zoneName} • {group.tasks.length} task(s)</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Link
                        href={`/dashboard/equipment/items/${equipmentId}`}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        View Equipment
                      </Link>
                      {equipmentItem && (
                        <button
                          onClick={() => openScheduleForm(equipmentItem)}
                          className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                        >
                          Schedule Task
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {group.tasks.map((task) => (
                      <div key={task.id} className="px-5 py-4">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusPill(task.status)}`}>
                                {task.status.replace('_', ' ')}
                              </span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityPill(task.priority)}`}>
                                {task.priority}
                              </span>
                              <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                                {task.taskType}
                              </span>
                              {task.isRecurring && (
                                <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-700">
                                  Recurring
                                </span>
                              )}
                            </div>

                            <h3 className="font-medium text-gray-900">{task.title}</h3>
                            <p className="text-sm text-gray-600 mt-1">{task.description}</p>

                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-xs text-gray-600">
                              <div>Due: {formatDate(task.dueDate)}</div>
                              <div>Scheduled: {formatDate(task.scheduledDate)}</div>
                              <div>Assigned: {task.assignedToName || task.assignedTo || 'Unassigned'}</div>
                              <div>Completed: {task.completedDate ? `${formatDate(task.completedDate)} by ${task.completedBy || 'Unknown'}` : 'No'}</div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 lg:justify-end">
                            {task.status !== 'IN_PROGRESS' && task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
                              <button
                                onClick={() => updateTaskStatus(task, 'IN_PROGRESS')}
                                className="px-3 py-1.5 text-xs font-medium rounded-md border border-yellow-300 text-yellow-800 bg-yellow-50 hover:bg-yellow-100"
                              >
                                Start
                              </button>
                            )}

                            {task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
                              <button
                                onClick={() => updateTaskStatus(task, 'COMPLETED')}
                                className="px-3 py-1.5 text-xs font-medium rounded-md border border-green-300 text-green-800 bg-green-50 hover:bg-green-100"
                              >
                                Resolve
                              </button>
                            )}

                            {task.status !== 'CANCELLED' && task.status !== 'COMPLETED' && (
                              <button
                                onClick={() => updateTaskStatus(task, 'CANCELLED')}
                                className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 text-gray-700 bg-gray-50 hover:bg-gray-100"
                              >
                                Cancel
                              </button>
                            )}

                            <button
                              onClick={() => openEditForm(task)}
                              className="px-3 py-1.5 text-xs font-medium rounded-md border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => deleteTask(task)}
                              className="px-3 py-1.5 text-xs font-medium rounded-md border border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-5 py-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Equipment With No Maintenance Tasks</h2>
              <p className="text-sm text-gray-600 mt-1">
                Create the first maintenance task for equipment records that are not yet linked.
              </p>
            </div>
            <button
              onClick={createBulkTasksForUnlinkedEquipment}
              disabled={equipmentWithoutTasks.length === 0 || bulkCreating}
              className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkCreating ? 'Creating Tasks...' : 'Create Tasks for All Unlinked'}
            </button>
          </div>

          {equipmentWithoutTasks.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-600">
              All equipment currently has at least one maintenance task.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {equipmentWithoutTasks.map((item) => (
                <div key={item.id} className="px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <div className="font-medium text-gray-900">{item.name}</div>
                    <div className="text-sm text-gray-600">
                      {item.category || 'Uncategorized'} • {item.zone?.name || 'No Zone'}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <Link
                      href={`/dashboard/equipment/items/${item.id}`}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      View Equipment
                    </Link>
                    <button
                      onClick={() => openScheduleForm(item)}
                      className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                      Schedule Task
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showMaintenanceForm && selectedEquipment && (
        <ScheduledMaintenanceForm
          equipmentId={selectedEquipment.id}
          equipmentName={selectedEquipment.name}
          onClose={() => {
            setShowMaintenanceForm(false);
            setSelectedEquipment(null);
            setEditingTask(null);
          }}
          onSuccess={async () => {
            setShowMaintenanceForm(false);
            setSelectedEquipment(null);
            setEditingTask(null);
            await refreshTasks();
          }}
          existingTask={editingTask || undefined}
        />
      )}
    </DashboardLayout>
  );
}

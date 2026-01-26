'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  ArrowLeftIcon, 
  WrenchScrewdriverIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface Equipment {
  id: string;
  name: string;
  category: string | null;
  serialNumber: string | null;
  purchaseDate: string | null;
  purchaseCost: string | null;
  condition: string;
  location: string | null;
  lastMaintenance: string | null;
  nextMaintenance: string | null;
  maintenanceNotes: string | null;
  inUse: boolean;
  currentClass: string | null;
  zone?: {
    id: string;
    name: string;
  } | null;
}

interface SafetyIssue {
  id: string;
  issueType: string;
  title: string;
  description: string;
  reportedBy: string;
  reportedByEmail: string | null;
  status: string;
  priority: string;
  photos: string[];
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
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
  completedBy: string | null;
  status: string;
  priority: string;
  cost: string | null;
  notes: string | null;
  photos: string[];
  createdAt: string;
}

interface MaintenanceLog {
  id: string;
  maintenanceType: string;
  description: string;
  performedBy: string | null;
  cost: string | null;
  performedAt: string;
}

export default function EquipmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const equipmentId = params.id as string;

  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [safetyIssues, setSafetyIssues] = useState<SafetyIssue[]>([]);
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'safety' | 'tasks' | 'logs'>('safety');

  useEffect(() => {
    loadData();
  }, [equipmentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [equipmentRes, issuesRes, tasksRes, logsRes] = await Promise.all([
        fetch(`/api/equipment/${equipmentId}`),
        fetch(`/api/safety-issues?equipmentId=${equipmentId}`),
        fetch(`/api/maintenance-tasks?equipmentId=${equipmentId}`),
        fetch(`/api/equipment/${equipmentId}/maintenance-logs`),
      ]);

      if (equipmentRes.ok) {
        setEquipment(await equipmentRes.json());
      }

      if (issuesRes.ok) {
        const data = await issuesRes.json();
        setSafetyIssues(data.issues || data);
      }

      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setMaintenanceTasks(data.tasks || data);
      }

      if (logsRes.ok) {
        const data = await logsRes.json();
        setMaintenanceLogs(data.logs || data);
      }
    } catch (error) {
      console.error('Failed to load equipment details:', error);
      alert('Failed to load equipment details');
    } finally {
      setLoading(false);
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'Excellent': return 'text-green-700 bg-green-50';
      case 'Good': return 'text-blue-700 bg-blue-50';
      case 'Fair': return 'text-yellow-700 bg-yellow-50';
      case 'Poor': return 'text-orange-700 bg-orange-50';
      case 'Out of Service': return 'text-red-700 bg-red-50';
      default: return 'text-gray-700 bg-gray-50';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'text-red-700 bg-red-50';
      case 'IN_PROGRESS': return 'text-yellow-700 bg-yellow-50';
      case 'RESOLVED': return 'text-green-700 bg-green-50';
      case 'CLOSED': return 'text-gray-700 bg-gray-50';
      case 'PENDING': return 'text-blue-700 bg-blue-50';
      case 'COMPLETED': return 'text-green-700 bg-green-50';
      case 'CANCELLED': return 'text-gray-700 bg-gray-50';
      default: return 'text-gray-700 bg-gray-50';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'text-red-700 bg-red-100';
      case 'HIGH': return 'text-orange-700 bg-orange-100';
      case 'MEDIUM': return 'text-yellow-700 bg-yellow-100';
      case 'LOW': return 'text-blue-700 bg-blue-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!equipment) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Equipment not found</p>
        </div>
      </DashboardLayout>
    );
  }

  const openIssues = safetyIssues.filter(i => i.status === 'OPEN' || i.status === 'IN_PROGRESS');
  const pendingTasks = maintenanceTasks.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="text-gray-400 hover:text-gray-600"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{equipment.name}</h1>
              <p className="text-sm text-gray-500">
                {equipment.category || 'Uncategorized'} • {equipment.zone?.name || 'No Zone'}
              </p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getConditionColor(equipment.condition)}`}>
            {equipment.condition}
          </span>
        </div>

        {/* Equipment Details Card */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Equipment Details</h2>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Serial Number</dt>
              <dd className="mt-1 text-sm text-gray-900">{equipment.serialNumber || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Purchase Date</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(equipment.purchaseDate)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Purchase Cost</dt>
              <dd className="mt-1 text-sm text-gray-900">${equipment.purchaseCost || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Location</dt>
              <dd className="mt-1 text-sm text-gray-900">{equipment.location || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Last Maintenance</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(equipment.lastMaintenance)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Next Maintenance</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(equipment.nextMaintenance)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Currently In Use</dt>
              <dd className="mt-1 text-sm text-gray-900">{equipment.inUse ? 'Yes' : 'No'}</dd>
            </div>
            {equipment.currentClass && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Current Class</dt>
                <dd className="mt-1 text-sm text-gray-900">{equipment.currentClass}</dd>
              </div>
            )}
          </dl>
          {equipment.maintenanceNotes && (
            <div className="mt-6">
              <dt className="text-sm font-medium text-gray-500">Maintenance Notes</dt>
              <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{equipment.maintenanceNotes}</dd>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Open Safety Issues</dt>
                    <dd className="text-lg font-medium text-gray-900">{openIssues.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <WrenchScrewdriverIcon className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Pending Tasks</dt>
                    <dd className="text-lg font-medium text-gray-900">{pendingTasks.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClockIcon className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Maintenance History</dt>
                    <dd className="text-lg font-medium text-gray-900">{maintenanceLogs.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white shadow rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('safety')}
                className={`${
                  activeTab === 'safety'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Safety Issues ({safetyIssues.length})
              </button>
              <button
                onClick={() => setActiveTab('tasks')}
                className={`${
                  activeTab === 'tasks'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Maintenance Tasks ({maintenanceTasks.length})
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`${
                  activeTab === 'logs'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Maintenance History ({maintenanceLogs.length})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Safety Issues Tab */}
            {activeTab === 'safety' && (
              <div className="space-y-4">
                {safetyIssues.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No safety issues reported</p>
                ) : (
                  safetyIssues.map(issue => (
                    <div key={issue.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(issue.status)}`}>
                              {issue.status.replace('_', ' ')}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(issue.priority)}`}>
                              {issue.priority}
                            </span>
                            <span className="text-xs text-gray-500">{issue.issueType.replace('_', ' ')}</span>
                          </div>
                          <h4 className="text-sm font-semibold text-gray-900">{issue.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{issue.description}</p>
                          <div className="mt-2 text-xs text-gray-500">
                            Reported by {issue.reportedBy} on {formatDate(issue.createdAt)}
                          </div>
                          {issue.resolvedAt && (
                            <div className="mt-2 p-3 bg-green-50 rounded">
                              <p className="text-sm font-medium text-green-800">Resolved</p>
                              <p className="text-xs text-green-600 mt-1">
                                By {issue.resolvedBy} on {formatDate(issue.resolvedAt)}
                              </p>
                              {issue.resolutionNotes && (
                                <p className="text-xs text-green-700 mt-1">{issue.resolutionNotes}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Maintenance Tasks Tab */}
            {activeTab === 'tasks' && (
              <div className="space-y-4">
                {maintenanceTasks.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No maintenance tasks</p>
                ) : (
                  maintenanceTasks.map(task => (
                    <div key={task.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
                              {task.status.replace('_', ' ')}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                            <span className="text-xs text-gray-500">{task.taskType}</span>
                          </div>
                          <h4 className="text-sm font-semibold text-gray-900">{task.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                          <div className="mt-2 text-xs text-gray-500 space-y-1">
                            {task.dueDate && <div>Due: {formatDate(task.dueDate)}</div>}
                            {task.assignedTo && <div>Assigned to: {task.assignedTo}</div>}
                            {task.completedDate && <div>Completed: {formatDate(task.completedDate)} by {task.completedBy}</div>}
                            {task.cost && <div>Cost: ${task.cost}</div>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Maintenance Logs Tab */}
            {activeTab === 'logs' && (
              <div className="space-y-4">
                {maintenanceLogs.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No maintenance history</p>
                ) : (
                  maintenanceLogs.map(log => (
                    <div key={log.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700">
                              {log.maintenanceType}
                            </span>
                            <span className="text-xs text-gray-500">{formatDate(log.performedAt)}</span>
                          </div>
                          <p className="text-sm text-gray-900 whitespace-pre-wrap">{log.description}</p>
                          <div className="mt-2 text-xs text-gray-500 space-y-1">
                            {log.performedBy && <div>Performed by: {log.performedBy}</div>}
                            {log.cost && <div>Cost: ${log.cost}</div>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

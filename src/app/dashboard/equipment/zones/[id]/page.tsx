'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { 
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  WrenchScrewdriverIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';

interface Zone {
  id: string;
  name: string;
  description: string | null;
  allowOverlap: boolean;
  active: boolean;
}

interface Equipment {
  id: string;
  name: string;
  category: string | null;
  condition: string;
  safetyIssues: SafetyIssue[];
  maintenanceTasks: MaintenanceTask[];
}

interface SafetyIssue {
  id: string;
  issueType: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  reportedBy: string;
  createdAt: string;
  equipment: {
    id: string;
    name: string;
  };
}

interface MaintenanceTask {
  id: string;
  taskType: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string | null;
  assignedTo: string | null;
  equipment: {
    id: string;
    name: string;
  };
}

export default function ZoneDetailPage() {
  const params = useParams();
  const router = useRouter();
  const zoneId = params.id as string;

  const [zone, setZone] = useState<Zone | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [safetyIssues, setSafetyIssues] = useState<SafetyIssue[]>([]);
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'safety' | 'equipment' | 'tasks'>('safety');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [zoneStatus, setZoneStatus] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [zoneId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [zoneRes, equipmentRes, issuesRes, tasksRes, statusRes] = await Promise.all([
        fetch(`/api/zones/${zoneId}`),
        fetch(`/api/equipment?zoneId=${zoneId}`),
        fetch(`/api/safety-issues?zoneId=${zoneId}`),
        fetch(`/api/maintenance-tasks?zoneId=${zoneId}`),
        fetch(`/api/equipment/analytics/zone-status`),
      ]);

      if (zoneRes.ok) {
        setZone(await zoneRes.json());
      }

      if (equipmentRes.ok) {
        const data = await equipmentRes.json();
        setEquipment(data.equipment || data);
      }

      if (issuesRes.ok) {
        const data = await issuesRes.json();
        setSafetyIssues(data.issues || data);
      }

      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setMaintenanceTasks(data.tasks || data);
      }

      if (statusRes.ok) {
        const data = await statusRes.json();
        const thisZoneStatus = data.zones.find((z: any) => z.zoneId === zoneId);
        setZoneStatus(thisZoneStatus);
      }
    } catch (error) {
      console.error('Failed to load zone details:', error);
      alert('Failed to load zone details');
    } finally {
      setLoading(false);
    }
  };

  const getZoneStatusBadge = () => {
    if (!zoneStatus) return null;

    const statusConfig = {
      NO_DEFECTS: { label: 'No Defects Detected', color: 'bg-green-100 text-green-800' },
      NON_CRITICAL_ISSUES: { label: 'Non-Critical Issues', color: 'bg-yellow-100 text-yellow-800' },
      REQUIRES_ATTENTION: { label: 'Requires Attention', color: 'bg-orange-100 text-orange-800' },
      CRITICAL_DEFECTS: { label: 'Critical Defects', color: 'bg-red-100 text-red-800' },
    };

    const config = statusConfig[zoneStatus.status as keyof typeof statusConfig] || statusConfig.NO_DEFECTS;

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        {config.label}
      </span>
    );
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const filteredIssues = statusFilter === 'all' 
    ? safetyIssues 
    : safetyIssues.filter(i => i.status === statusFilter);

  const filteredTasks = statusFilter === 'all'
    ? maintenanceTasks
    : maintenanceTasks.filter(t => t.status === statusFilter);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!zone) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Zone not found</p>
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
              onClick={() => router.push('/dashboard/equipment')}
              className="text-gray-400 hover:text-gray-600"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{zone.name}</h1>
              {zone.description && (
                <p className="text-sm text-gray-500">{zone.description}</p>
              )}
            </div>
          </div>
          {getZoneStatusBadge()}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CubeIcon className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Equipment in Zone</dt>
                    <dd className="text-lg font-medium text-gray-900">{equipment.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

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
                    <dt className="text-sm font-medium text-gray-500 truncate">Pending Maintenance</dt>
                    <dd className="text-lg font-medium text-gray-900">{pendingTasks.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Zone Statistics */}
        {zoneStatus && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Zone Statistics</h2>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Critical Issues</dt>
                <dd className="mt-1 text-2xl font-semibold text-red-600">{zoneStatus.criticalIssues}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Non-Critical Issues</dt>
                <dd className="mt-1 text-2xl font-semibold text-orange-600">{zoneStatus.nonCriticalIssues}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Overdue Maintenance</dt>
                <dd className="mt-1 text-2xl font-semibold text-yellow-600">{zoneStatus.overdueMaintenance}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Out of Service</dt>
                <dd className="mt-1 text-2xl font-semibold text-gray-600">{zoneStatus.outOfServiceEquipment}</dd>
              </div>
            </dl>
          </div>
        )}

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
                onClick={() => setActiveTab('equipment')}
                className={`${
                  activeTab === 'equipment'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Equipment ({equipment.length})
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
            </nav>
          </div>

          <div className="p-6">
            {/* Filter */}
            {(activeTab === 'safety' || activeTab === 'tasks') && (
              <div className="mb-4">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="PENDING">Pending</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </div>
            )}

            {/* Safety Issues Tab */}
            {activeTab === 'safety' && (
              <div className="space-y-4">
                {filteredIssues.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No safety issues found</p>
                ) : (
                  filteredIssues.map(issue => (
                    <div key={issue.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Link 
                              href={`/dashboard/equipment/items/${issue.equipment.id}`}
                              className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                            >
                              {issue.equipment.name}
                            </Link>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(issue.status)}`}>
                              {issue.status.replace('_', ' ')}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(issue.priority)}`}>
                              {issue.priority}
                            </span>
                          </div>
                          <h4 className="text-sm font-semibold text-gray-900">{issue.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{issue.description}</p>
                          <div className="mt-2 text-xs text-gray-500">
                            {issue.issueType.replace('_', ' ')} • Reported by {issue.reportedBy} • {formatDate(issue.createdAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Equipment Tab */}
            {activeTab === 'equipment' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {equipment.length === 0 ? (
                  <p className="text-gray-500 text-center py-8 col-span-full">No equipment in this zone</p>
                ) : (
                  equipment.map(item => {
                    const openIssuesCount = item.safetyIssues.filter(i => i.status === 'OPEN' || i.status === 'IN_PROGRESS').length;
                    const pendingTasksCount = item.maintenanceTasks.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS').length;

                    return (
                      <Link
                        key={item.id}
                        href={`/dashboard/equipment/items/${item.id}`}
                        className="block border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-gray-900">{item.name}</h4>
                            <p className="text-xs text-gray-500 mt-1">{item.category || 'Uncategorized'}</p>
                            <div className="mt-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getConditionColor(item.condition)}`}>
                                {item.condition}
                              </span>
                            </div>
                            {(openIssuesCount > 0 || pendingTasksCount > 0) && (
                              <div className="mt-2 flex items-center space-x-2 text-xs">
                                {openIssuesCount > 0 && (
                                  <span className="text-red-600">
                                    {openIssuesCount} issue{openIssuesCount !== 1 ? 's' : ''}
                                  </span>
                                )}
                                {pendingTasksCount > 0 && (
                                  <span className="text-yellow-600">
                                    {pendingTasksCount} task{pendingTasksCount !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            )}

            {/* Maintenance Tasks Tab */}
            {activeTab === 'tasks' && (
              <div className="space-y-4">
                {filteredTasks.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No maintenance tasks found</p>
                ) : (
                  filteredTasks.map(task => (
                    <div key={task.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Link
                              href={`/dashboard/equipment/items/${task.equipment.id}`}
                              className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                            >
                              {task.equipment.name}
                            </Link>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
                              {task.status.replace('_', ' ')}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                          </div>
                          <h4 className="text-sm font-semibold text-gray-900">{task.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                          <div className="mt-2 text-xs text-gray-500">
                            {task.taskType} 
                            {task.dueDate && ` • Due: ${formatDate(task.dueDate)}`}
                            {task.assignedTo && ` • Assigned to: ${task.assignedTo}`}
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

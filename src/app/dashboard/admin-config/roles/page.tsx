'use client'

import DashboardLayout from '@/components/DashboardLayout'

export default function RolesPermissionsPage() {
  return (
    <DashboardLayout title="Roles & Permissions" backTo={{ label: 'Back to Club Management', href: '/dashboard/admin-config' }} showClubManagementNav={true}>
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Roles & Permissions</h2>
            <p className="text-gray-600 mt-2">
              Manage user roles and access permissions across the application.
            </p>
          </div>

          {/* Coming Soon Card */}
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">🔐</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Coming Soon</h3>
            <p className="text-gray-600 max-w-2xl mx-auto mb-6">
              The Roles & Permissions management system is currently under development. This feature will allow 
              administrators to:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto text-left mb-8">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">👥</span>
                  <h4 className="font-semibold text-blue-900">User Roles</h4>
                </div>
                <p className="text-sm text-blue-800">
                  Create and manage custom user roles (Admin, Coach, Manager, etc.)
                </p>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🔑</span>
                  <h4 className="font-semibold text-green-900">Access Control</h4>
                </div>
                <p className="text-sm text-green-800">
                  Define granular permissions for different features and data
                </p>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">📋</span>
                  <h4 className="font-semibold text-purple-900">Role Templates</h4>
                </div>
                <p className="text-sm text-purple-800">
                  Use predefined role templates or create custom ones
                </p>
              </div>

              <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🔍</span>
                  <h4 className="font-semibold text-orange-900">Audit Logs</h4>
                </div>
                <p className="text-sm text-orange-800">
                  Track role changes and permission assignments
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 max-w-2xl mx-auto">
              <h4 className="font-semibold text-gray-900 mb-3">Planned Features</h4>
              <ul className="text-left text-sm text-gray-700 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Role-based access control (RBAC) for all application features</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Fine-grained permissions for rosters, equipment, injury reports, and more</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Bulk role assignment for multiple users</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Permission inheritance and role hierarchies</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Integration with existing coach and user management systems</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">Development Roadmap</h3>
                <p className="text-sm text-blue-800">
                  This feature is planned for a future release. If you have specific requirements or suggestions 
                  for the roles and permissions system, please reach out to the development team.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

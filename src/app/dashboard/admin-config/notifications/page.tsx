'use client'

import { useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'

interface NotificationSettings {
  emailNotifications: boolean
  rosterReminders: boolean
  maintenanceAlerts: boolean
  injuryReportNotifications: boolean
  automationNotifications: boolean
  digestFrequency: 'realtime' | 'daily' | 'weekly' | 'never'
}

export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    rosterReminders: true,
    maintenanceAlerts: true,
    injuryReportNotifications: true,
    automationNotifications: true,
    digestFrequency: 'daily',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  // Note: In a real implementation, you would fetch and save these settings to a database
  // For now, this is a placeholder UI

  const handleSave = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // TODO: Implement API endpoint for notification settings
      // const res = await fetch('/api/settings/notifications', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(settings),
      // })

      // Simulate save
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setSuccess('Notification settings saved successfully')
    } catch (err) {
      setError('Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout title="System Notifications" backTo={{ label: 'Back to Club Management', href: '/dashboard/admin-config' }} showClubManagementNav={true}>
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Notification Settings</h2>
            <p className="text-gray-600 mt-2">
              Configure how and when the system sends notifications to users.
            </p>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {success}
            </div>
          )}

          <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
            {/* Email Notifications */}
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Notifications</h3>
              
              <label className="flex items-start gap-3 mb-4">
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                  className="mt-1 rounded"
                />
                <div>
                  <span className="font-medium text-gray-900">Enable Email Notifications</span>
                  <p className="text-sm text-gray-600">
                    Master switch for all email notifications. When disabled, no emails will be sent.
                  </p>
                </div>
              </label>
            </div>

            {/* Notification Types */}
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Types</h3>
              <div className="space-y-3">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={settings.rosterReminders}
                    onChange={(e) => setSettings({ ...settings, rosterReminders: e.target.checked })}
                    disabled={!settings.emailNotifications}
                    className="mt-1 rounded disabled:opacity-50"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Roster Reminders</span>
                    <p className="text-sm text-gray-600">
                      Send reminders to coaches about upcoming class rosters and assignments.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={settings.maintenanceAlerts}
                    onChange={(e) => setSettings({ ...settings, maintenanceAlerts: e.target.checked })}
                    disabled={!settings.emailNotifications}
                    className="mt-1 rounded disabled:opacity-50"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Maintenance Alerts</span>
                    <p className="text-sm text-gray-600">
                      Notify relevant staff when equipment maintenance is due or overdue.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={settings.injuryReportNotifications}
                    onChange={(e) => setSettings({ ...settings, injuryReportNotifications: e.target.checked })}
                    disabled={!settings.emailNotifications}
                    className="mt-1 rounded disabled:opacity-50"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Injury Report Notifications</span>
                    <p className="text-sm text-gray-600">
                      Alert administrators when new injury reports are submitted.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={settings.automationNotifications}
                    onChange={(e) => setSettings({ ...settings, automationNotifications: e.target.checked })}
                    disabled={!settings.emailNotifications}
                    className="mt-1 rounded disabled:opacity-50"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Automation Notifications</span>
                    <p className="text-sm text-gray-600">
                      Receive updates about automated tasks and scheduled jobs.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Digest Frequency */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Frequency</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="digestFrequency"
                    value="realtime"
                    checked={settings.digestFrequency === 'realtime'}
                    onChange={() => setSettings({ ...settings, digestFrequency: 'realtime' })}
                    disabled={!settings.emailNotifications}
                    className="rounded-full disabled:opacity-50"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Real-time</span>
                    <p className="text-sm text-gray-600">Send notifications immediately as events occur</p>
                  </div>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="digestFrequency"
                    value="daily"
                    checked={settings.digestFrequency === 'daily'}
                    onChange={() => setSettings({ ...settings, digestFrequency: 'daily' })}
                    disabled={!settings.emailNotifications}
                    className="rounded-full disabled:opacity-50"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Daily Digest</span>
                    <p className="text-sm text-gray-600">Receive a summary of notifications once per day</p>
                  </div>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="digestFrequency"
                    value="weekly"
                    checked={settings.digestFrequency === 'weekly'}
                    onChange={() => setSettings({ ...settings, digestFrequency: 'weekly' })}
                    disabled={!settings.emailNotifications}
                    className="rounded-full disabled:opacity-50"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Weekly Digest</span>
                    <p className="text-sm text-gray-600">Receive a summary of notifications once per week</p>
                  </div>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="digestFrequency"
                    value="never"
                    checked={settings.digestFrequency === 'never'}
                    onChange={() => setSettings({ ...settings, digestFrequency: 'never' })}
                    disabled={!settings.emailNotifications}
                    className="rounded-full disabled:opacity-50"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Never</span>
                    <p className="text-sm text-gray-600">Do not send any notifications</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={handleSave}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <span className="text-2xl">ℹ️</span>
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">About Notification Settings</h3>
                <p className="text-sm text-blue-800">
                  These settings apply globally to all users in the system. Individual users may be able to customize 
                  their own notification preferences in their profile settings.
                </p>
              </div>
            </div>
          </div>

          {/* Placeholder Notice */}
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-semibold text-yellow-900 mb-1">Feature Under Development</h3>
                <p className="text-sm text-yellow-800">
                  This notification settings page is currently a placeholder. The backend API endpoints and 
                  database schema for storing these preferences will be implemented in a future update.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

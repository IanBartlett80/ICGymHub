'use client'

import { UserCircle, Globe, Lock, CreditCard, DatabaseBackup, Trash2, ArrowRightLeft, AlertTriangle } from 'lucide-react'
import HelpLayout from '../HelpLayout'

function Section({ icon: Icon, title, children, color = 'blue' }: { icon: any; title: string; children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    amber: 'bg-amber-100 text-amber-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600',
    gray: 'bg-gray-100 text-gray-600',
  }
  return (
    <div className="mb-10 last:mb-0">
      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors[color] || colors.blue}`}>
          <Icon className="w-5 h-5" />
        </div>
        {title}
      </h2>
      <div className="text-gray-700 space-y-3 ml-11">
        {children}
      </div>
    </div>
  )
}

export default function ProfileManagementHelpPage() {
  return (
    <HelpLayout
      title="Club Profile Management — Admin Guide"
      description="Complete guide to managing your club profile, subscriptions, data backups, and account lifecycle."
    >
      <div className="prose prose-gray max-w-none">

        {/* Account Information */}
        <Section icon={UserCircle} title="Account Information" color="blue">
          <p>
            The Account Information section displays your personal admin details and allows you to update them.
          </p>
          <h4 className="font-semibold text-gray-900 mt-4 mb-2">What you can view and edit:</h4>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Full Name</strong> — Your display name shown across the platform</li>
            <li><strong>Email Address</strong> — Used for notifications, verification, and account recovery</li>
            <li><strong>Username</strong> — Your login username (shown as username@clubdomain)</li>
          </ul>
          <h4 className="font-semibold text-gray-900 mt-4 mb-2">How to update:</h4>
          <ol className="list-decimal list-inside space-y-2">
            <li>Navigate to <strong>Club Settings → Profile Settings</strong></li>
            <li>Edit the fields you wish to change</li>
            <li>Click <strong>Save Changes</strong></li>
          </ol>
          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg mt-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Your username determines how you sign in to GymHub. If you change it, you&apos;ll need to use the new username at your next login.
            </p>
          </div>
        </Section>

        {/* Club Timezone */}
        <Section icon={Globe} title="Club Timezone" color="purple">
          <p>
            The timezone setting controls how dates and times are displayed throughout GymHub, including roster schedules, compliance due dates, and activity logs.
          </p>
          <h4 className="font-semibold text-gray-900 mt-4 mb-2">How to change:</h4>
          <ol className="list-decimal list-inside space-y-2">
            <li>Scroll to the <strong>Club Timezone</strong> section in Profile Settings</li>
            <li>Select your timezone from the dropdown (grouped by region)</li>
            <li>Click <strong>Save Timezone</strong></li>
          </ol>
          <h4 className="font-semibold text-gray-900 mt-4 mb-2">Available regions:</h4>
          <ul className="list-disc list-inside space-y-1">
            <li>Australia (Sydney, Melbourne, Brisbane, Perth, Adelaide, Hobart, Darwin)</li>
            <li>New Zealand &amp; Pacific</li>
            <li>Asia (Tokyo, Singapore, Hong Kong)</li>
            <li>Europe (London, Paris, Berlin)</li>
            <li>Americas (New York, Chicago, Denver, Los Angeles, Toronto, Vancouver)</li>
          </ul>
          <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-lg mt-4">
            <p className="text-sm text-amber-800">
              <strong>Important:</strong> Changing the timezone affects all users in your club. Ensure you select the correct timezone for your primary venue location.
            </p>
          </div>
        </Section>

        {/* Change Password */}
        <Section icon={Lock} title="Change Password" color="gray">
          <p>
            Keep your account secure by regularly updating your password.
          </p>
          <h4 className="font-semibold text-gray-900 mt-4 mb-2">Password requirements:</h4>
          <ul className="list-disc list-inside space-y-1">
            <li>Minimum 8 characters</li>
            <li>At least one uppercase letter</li>
            <li>At least one lowercase letter</li>
            <li>At least one number</li>
          </ul>
          <h4 className="font-semibold text-gray-900 mt-4 mb-2">How to change:</h4>
          <ol className="list-decimal list-inside space-y-2">
            <li>Scroll to the <strong>Change Password</strong> section</li>
            <li>Enter your <strong>current password</strong></li>
            <li>Enter your <strong>new password</strong></li>
            <li>Confirm the new password</li>
            <li>Click <strong>Update Password</strong></li>
          </ol>
          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg mt-4">
            <p className="text-sm text-blue-800">
              <strong>Security tip:</strong> Use a unique password that you don&apos;t use for other services. Consider using a password manager.
            </p>
          </div>
        </Section>

        {/* Billing & Subscriptions */}
        <Section icon={CreditCard} title="Billing & Subscriptions" color="green">
          <p>
            GymHub operates on a simple flat-rate subscription of <strong>$100 AUD per month</strong> (inclusive of GST). All new clubs receive a <strong>30-day free trial</strong>.
          </p>

          <h4 className="font-semibold text-gray-900 mt-4 mb-2">Viewing your subscription:</h4>
          <ol className="list-decimal list-inside space-y-2">
            <li>Go to <strong>Club Settings → Profile Settings</strong></li>
            <li>Click <strong>Billing &amp; Subscriptions</strong> in the side menu (or the card link)</li>
            <li>View your plan, monthly rate, agreement date, trial status, and subscription status</li>
          </ol>

          <h4 className="font-semibold text-gray-900 mt-4 mb-2">Subscription statuses:</h4>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Active</strong> (green badge) — Your subscription is current and all features are available</li>
            <li><strong>Inactive</strong> (red badge) — Your subscription has been cancelled</li>
          </ul>

          <h3 className="text-lg font-bold text-gray-900 mt-6 mb-3">Cancelling Your Subscription</h3>
          <p>
            If you need to cancel your subscription:
          </p>
          <ol className="list-decimal list-inside space-y-2">
            <li>Go to <strong>Billing &amp; Subscriptions</strong></li>
            <li>Scroll to <strong>Cancel Subscription</strong> (red section at the bottom)</li>
            <li>Click <strong>Cancel Subscription</strong></li>
            <li>Enter your password to confirm</li>
          </ol>

          <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-lg mt-4">
            <p className="text-sm text-amber-800">
              <strong>What happens when you cancel:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-amber-800 mt-2">
              <li>Your subscription status changes to <strong>Inactive</strong></li>
              <li>A <strong>warning banner</strong> appears on every page showing a 30-day countdown</li>
              <li>You retain <strong>full access</strong> to all features during the 30-day grace period</li>
              <li>After 30 days, you will be <strong>restricted</strong> to only the Profile page where you can re-enable your subscription or delete your club</li>
              <li>A notification email is sent to GymHub support so your billing can be updated</li>
            </ul>
          </div>

          <h3 className="text-lg font-bold text-gray-900 mt-6 mb-3">Re-Enabling Your Subscription</h3>
          <p>
            If you change your mind after cancelling, you can re-enable your subscription at any time (during or after the 30-day grace period, as long as the club has not been deleted).
          </p>
          <h4 className="font-semibold text-gray-900 mt-4 mb-2">How to re-enable:</h4>
          <p>You can re-enable from <strong>three different locations</strong>:</p>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Warning banner</strong> — Click the green &quot;Re-Enable Subscription&quot; button that appears at the top of every page</li>
            <li><strong>Billing page</strong> — Go to Billing &amp; Subscriptions and click &quot;Re-Enable Subscription&quot; in the green section</li>
            <li><strong>Profile Danger Zone</strong> — Scroll to the Danger Zone section and click &quot;Re-Enable Subscription&quot;</li>
          </ul>

          <div className="bg-green-50 border-l-4 border-green-400 p-3 rounded-r-lg mt-4">
            <p className="text-sm text-green-800">
              <strong>What happens when you re-enable:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-green-800 mt-2">
              <li>Status immediately changes back to <strong>Active</strong></li>
              <li>The warning banner disappears</li>
              <li>Full access to all features is restored</li>
              <li>A notification email is sent to GymHub support to re-activate your billing</li>
              <li>No data is lost — everything is exactly as you left it</li>
            </ul>
          </div>
        </Section>

        {/* Backup & Restore */}
        <Section icon={DatabaseBackup} title="Backup & Restore" color="amber">
          <p>
            GymHub allows you to download a complete backup of all your club data as a JSON file, and restore missing records from a previous backup.
          </p>

          <h3 className="text-lg font-bold text-gray-900 mt-6 mb-3">Downloading a Backup</h3>
          <ol className="list-decimal list-inside space-y-2">
            <li>Go to <strong>Profile Settings</strong></li>
            <li>Scroll to the <strong>Danger Zone</strong> section</li>
            <li>Click <strong>Download Backup</strong></li>
            <li>A JSON file will be downloaded containing all your club data</li>
          </ol>

          <h4 className="font-semibold text-gray-900 mt-4 mb-2">What&apos;s included in a backup:</h4>
          <ul className="list-disc list-inside space-y-1">
            <li>Coaches and their gymsport assignments</li>
            <li>Gymsports</li>
            <li>Venues and zones</li>
            <li>Equipment and equipment categories</li>
            <li>Class templates and class sessions</li>
            <li>Roster templates and rosters</li>
            <li>Compliance categories and compliance items</li>
            <li>Maintenance tasks and safety issues</li>
            <li>Injury form templates (with sections, fields, and automations)</li>
            <li>Injury submissions (with form data and comments)</li>
            <li>User accounts (names, emails, roles — passwords are not exported)</li>
          </ul>

          <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-lg mt-4">
            <p className="text-sm text-amber-800">
              <strong>Recommendation:</strong> Download a backup regularly, especially before making major changes. Australian WHS regulations require 7 years of injury/incident data retention — keep your backups safe.
            </p>
          </div>

          <h3 className="text-lg font-bold text-gray-900 mt-6 mb-3">Restoring from a Backup</h3>
          <p>
            The restore process only recreates <strong>missing records</strong> — it will never overwrite or duplicate existing data.
          </p>
          <ol className="list-decimal list-inside space-y-2">
            <li>In the Danger Zone, click <strong>Choose File</strong> in the Restore section</li>
            <li>Select a previously downloaded backup JSON file</li>
            <li>Click <strong>Validate Backup</strong> and enter your password</li>
            <li>Review the validation summary showing how many records are in the file</li>
            <li>Click <strong>Restore Missing Items</strong> and enter your password again</li>
            <li>Review the restore results showing how many items were recreated</li>
          </ol>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg mt-4">
            <p className="text-sm text-blue-800">
              <strong>Important:</strong> Backups can only be restored to the same club (matched by domain). You cannot restore one club&apos;s backup into a different club&apos;s account.
            </p>
          </div>
        </Section>

        {/* Subscription Lifecycle */}
        <Section icon={ArrowRightLeft} title="Subscription Lifecycle" color="purple">
          <p>
            Understanding the full lifecycle of your GymHub subscription helps you plan any transitions:
          </p>

          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 mt-4">
            <h4 className="font-semibold text-gray-900 mb-3">Timeline Overview</h4>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-sm font-bold text-blue-600">1</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Registration</p>
                  <p className="text-sm text-gray-600">Club is created, 30-day free trial begins. Full access to all features.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-sm font-bold text-green-600">2</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Active Subscription</p>
                  <p className="text-sm text-gray-600">After trial, monthly billing of $100 AUD begins. Full access continues.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-sm font-bold text-amber-600">3</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Cancellation (30-day grace period)</p>
                  <p className="text-sm text-gray-600">Warning banner appears. Full access continues. You can re-enable at any time.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-sm font-bold text-red-600">4</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Grace Period Expired</p>
                  <p className="text-sm text-gray-600">Access is restricted to the Profile page only. You can still re-enable or delete your club.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-sm font-bold text-gray-600">5</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Deletion (if chosen)</p>
                  <p className="text-sm text-gray-600">All data permanently removed. Club can re-register at gymhub.club if desired.</p>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* Deleting Your Club */}
        <Section icon={Trash2} title="Deleting Your Club" color="red">
          <p>
            Deleting your club is a <strong>permanent, irreversible action</strong> that immediately removes all data from GymHub.
          </p>

          <h4 className="font-semibold text-gray-900 mt-4 mb-2">Before you delete:</h4>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Download a backup</strong> — Once deleted, data cannot be recovered</li>
            <li>Ensure you have exported any injury/incident records required for WHS compliance (7-year retention)</li>
            <li>Consider re-enabling your subscription instead if you&apos;re unsure</li>
          </ul>

          <h4 className="font-semibold text-gray-900 mt-4 mb-2">How to delete:</h4>
          <ol className="list-decimal list-inside space-y-2">
            <li>Go to <strong>Profile Settings</strong></li>
            <li>Scroll to the <strong>Danger Zone</strong></li>
            <li>Type your <strong>exact club name</strong> in the confirmation field</li>
            <li>Click <strong>Delete Club Permanently</strong></li>
            <li>Enter your <strong>password</strong> to confirm</li>
          </ol>

          <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded-r-lg mt-4">
            <p className="text-sm text-red-800">
              <strong>What gets deleted:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-red-800 mt-2">
              <li>All user accounts associated with the club</li>
              <li>All rosters, class templates, and class sessions</li>
              <li>All equipment records, maintenance tasks, and safety issues</li>
              <li>All injury form templates, submissions, and comments</li>
              <li>All compliance categories and items</li>
              <li>All coaches and gymsport configurations</li>
              <li>All venues and zones (including QR codes)</li>
              <li>All notifications and audit logs</li>
            </ul>
          </div>

          <h4 className="font-semibold text-gray-900 mt-4 mb-2">After deletion:</h4>
          <ul className="list-disc list-inside space-y-2">
            <li>You will see a confirmation page: <strong>&quot;Sorry to See You Leave&quot;</strong></li>
            <li>Clicking <strong>OK</strong> takes you back to <strong>gymhub.club</strong></li>
            <li>A notification email is sent to GymHub support to update billing records</li>
            <li>If you wish to return, you can register a new club at any time with the same or different details</li>
          </ul>
        </Section>

        {/* FAQ */}
        <Section icon={AlertTriangle} title="Frequently Asked Questions" color="amber">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900">Can I cancel and keep using GymHub?</h4>
              <p className="text-sm">
                Yes. After cancelling, you have a 30-day grace period with full access. After 30 days, access is restricted to the Profile page only, but you can re-enable your subscription at any time to restore full access.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Will I lose data if I cancel?</h4>
              <p className="text-sm">
                No. Cancelling your subscription does not delete any data. Your data is retained and will be available when you re-enable. Data is only deleted if you explicitly choose to delete your club.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Can I re-register after deleting my club?</h4>
              <p className="text-sm">
                Yes. You can register a new club at gymhub.club at any time. However, your previous data will not be available — deletion is permanent. If you have a backup file, you can restore data after re-registering.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Who can cancel or delete the club?</h4>
              <p className="text-sm">
                Only users with the <strong>Admin</strong> role can cancel subscriptions, re-enable subscriptions, or delete the club. Standard users do not have access to these actions.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">How do I download a backup?</h4>
              <p className="text-sm">
                Go to Profile Settings → Danger Zone → Click &quot;Download Backup&quot;. The file is saved as a JSON file that you should store securely.
              </p>
            </div>
          </div>
        </Section>
      </div>
    </HelpLayout>
  )
}

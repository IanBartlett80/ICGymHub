'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import PasswordVerificationModal from '@/components/PasswordVerificationModal'
import axiosInstance from '@/lib/axios'
import { Download, Upload, Trash2, AlertTriangle } from 'lucide-react'

interface UserData {
 id: string
 username: string
 email: string
 fullName: string
 role: string
 clubId: string
 clubName: string
}

export default function ProfilePage() {
 const router = useRouter()
 const [user, setUser] = useState<UserData | null>(null)
 const [formData, setFormData] = useState({
  fullName: '',
  email: '',
  username: '',
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
 })
 const [loading, setLoading] = useState(false)
 const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
 
 // Club management states
 const [deletionStatus, setDeletionStatus] = useState<any>(null)
 const [showDeleteModal, setShowDeleteModal] = useState(false)
 const [showCancelDeleteModal, setShowCancelDeleteModal] = useState(false)
 const [showRestoreModal, setShowRestoreModal] = useState(false)
 const [restoreFile, setRestoreFile] = useState<File | null>(null)
 const [clubActionLoading, setClubActionLoading] = useState(false)

 useEffect(() => {
  const userData = localStorage.getItem('userData')
  if (!userData) {
   router.push('/sign-in')
   return
  }
  const parsed = JSON.parse(userData)
  setUser(parsed)
  setFormData(prev => ({
   ...prev,
   fullName: parsed.fullName,
   email: parsed.email,
   username: parsed.username
  }))
  
  // Fetch deletion status
  fetchDeletionStatus()
 }, [router])
 
 const fetchDeletionStatus = async () => {
  try {
   const response = await axiosInstance.get('/api/clubs/delete')
   setDeletionStatus(response.data)
  } catch (error) {
   console.error('Failed to fetch deletion status:', error)
  }
 }

 const handleUpdateProfile = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)
  setMessage(null)

  try {
   // Validate password fields if changing password
   if (formData.newPassword) {
    if (formData.newPassword !== formData.confirmPassword) {
     setMessage({ type: 'error', text: 'New passwords do not match' })
     setLoading(false)
     return
    }
    if (formData.newPassword.length < 6) {
     setMessage({ type: 'error', text: 'New password must be at least 6 characters' })
     setLoading(false)
     return
    }
    if (!formData.currentPassword) {
     setMessage({ type: 'error', text: 'Current password is required to change password' })
     setLoading(false)
     return
    }
   }

   // Build update data
   const updateData: any = {
    fullName: formData.fullName,
    email: formData.email
   }

   // Include username if user is admin
   if (user?.role === 'ADMIN') {
    updateData.username = formData.username
   }

   // If password is being changed, include password fields
   if (formData.newPassword) {
    updateData.currentPassword = formData.currentPassword
    updateData.newPassword = formData.newPassword
   }

   // Call API to update profile
   const response = await axiosInstance.patch('/api/users/profile', updateData)

   if (response.data.user) {
    // Update localStorage with new user data
    localStorage.setItem('userData', JSON.stringify(response.data.user))
    setUser(response.data.user)
    
    // Update form data with latest values
    setFormData(prev => ({
     ...prev,
     fullName: response.data.user.fullName,
     email: response.data.user.email,
     username: response.data.user.username,
     currentPassword: '',
     newPassword: '',
     confirmPassword: ''
    }))

    setMessage({ type: 'success', text: response.data.message || 'Profile updated successfully' })
   }
  } catch (error: any) {
   console.error('Update error:', error)
   const errorMessage = error.response?.data?.error || 'Failed to update profile'
   setMessage({ type: 'error', text: errorMessage })
  } finally {
   setLoading(false)
  }
 }

 const handleBackupClub = async () => {
  setClubActionLoading(true)
  setMessage(null)
  
  try {
   const response = await axiosInstance.post('/api/clubs/backup', {}, {
    responseType: 'blob',
   })
   
   // Create download link
   const blob = new Blob([response.data], { type: 'application/zip' })
   const url = window.URL.createObjectURL(blob)
   const link = document.createElement('a')
   link.href = url
   link.download = `gymhub-backup-${user?.clubName?.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.zip`
   document.body.appendChild(link)
   link.click()
   document.body.removeChild(link)
   window.URL.revokeObjectURL(url)
   
   setMessage({ type: 'success', text: 'Backup downloaded successfully' })
  } catch (error: any) {
   console.error('Backup error:', error)
   setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to create backup' })
  } finally {
   setClubActionLoading(false)
  }
 }

 const handleRestoreClub = async (password: string) => {
  if (!restoreFile) return
  
  setClubActionLoading(true)
  setMessage(null)
  
  try {
   const formData = new FormData()
   formData.append('file', restoreFile)
   formData.append('password', password)
   
   await axiosInstance.post('/api/clubs/restore', formData, {
    headers: {
     'Content-Type': 'multipart/form-data',
    },
   })
   
   setMessage({ type: 'success', text: 'Club data restored successfully. Please refresh the page.' })
   setShowRestoreModal(false)
   setRestoreFile(null)
   
   // Refresh page after 2 seconds
   setTimeout(() => {
    window.location.reload()
   }, 2000)
  } catch (error: any) {
   console.error('Restore error:', error)
   setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to restore backup' })
  } finally {
   setClubActionLoading(false)
  }
 }

 const handleDeleteClub = async (password: string) => {
  setClubActionLoading(true)
  setMessage(null)
  
  try {
   await axiosInstance.post('/api/clubs/delete', {
    password,
    confirmationText: user?.clubName,
   })
   
   setMessage({ 
    type: 'success', 
    text: `Club deletion scheduled. All data will be permanently deleted in 30 days.`,
   })
   setShowDeleteModal(false)
   await fetchDeletionStatus()
  } catch (error: any) {
   console.error('Delete error:', error)
   setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to schedule deletion' })
  } finally {
   setClubActionLoading(false)
  }
 }

 const handleCancelDeletion = async () => {
  setClubActionLoading(true)
  setMessage(null)
  
  try {
   await axiosInstance.delete('/api/clubs/delete')
   setMessage({ type: 'success', text: 'Club deletion cancelled successfully' })
   setShowCancelDeleteModal(false)
   await fetchDeletionStatus()
  } catch (error: any) {
   console.error('Cancel deletion error:', error)
   setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to cancel deletion' })
  } finally {
   setClubActionLoading(false)
  }
 }

 const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (file) {
   setRestoreFile(file)
   setShowRestoreModal(true)
  }
 }

 if (!user) {
  return null
 }

 return (
  <DashboardLayout title="Profile Settings" backTo={{ label: 'Back to Home', href: '/dashboard' }}>
   <div className="p-6 max-w-4xl mx-auto">
    {message && (
     <div
      className={`mb-6 p-4 rounded-lg ${
       message.type === 'success'
        ? 'bg-green-50 text-green-800 border border-green-200'
        : 'bg-red-50 text-red-800 border border-red-200'
      }`}
>
      {message.text}
     </div>
    )}

    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
     {/* Account Information Section */}
     <div className="p-6 border-b border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Account Information</h2>
      <p className="text-sm text-gray-500">Update your personal details and email address</p>
     </div>

     <form onSubmit={handleUpdateProfile} className="p-6 space-y-6">
      {/* Personal Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
       <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
         Full Name
        </label>
        <input
         type="text"
         id="fullName"
         value={formData.fullName}
         onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
         className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
         required
        />
       </div>

       <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
         Email Address
        </label>
        <input
         type="email"
         id="email"
         value={formData.email}
         onChange={(e) => setFormData({ ...formData, email: e.target.value })}
         className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
         required
        />
       </div>
      </div>

      {/* Read-only fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
       <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
         Username
         {user?.role === 'ADMIN' && (
          <span className="ml-2 text-xs text-blue-600">(Editable for Admins)</span>
         )}
        </label>
        <input
         type="text"
         id="username"
         value={formData.username}
         onChange={(e) => setFormData({ ...formData, username: e.target.value })}
         className={`w-full px-4 py-2 border rounded-lg ${
          user?.role === 'ADMIN'
           ? 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
           : 'border-gray-200 bg-gray-50 text-gray-500'
         }`}
         disabled={user?.role !== 'ADMIN'}
         required={user?.role === 'ADMIN'}
        />
        {user?.role === 'ADMIN' && (
         <p className="mt-1 text-xs text-gray-500">
          Username must be unique across the platform
         </p>
        )}
       </div>

       <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
        <input
         type="text"
         value={user?.role || ''}
         className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
         disabled
        />
       </div>
      </div>

      <div>
       <label className="block text-sm font-medium text-gray-700 mb-2">Club</label>
       <input
        type="text"
        value={user?.clubName || ''}
        className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
        disabled
       />
      </div>

      {/* Password Change Section */}
      <div className="pt-6 border-t border-gray-200">
       <h3 className="text-lg font-semibold text-gray-900 mb-1">Change Password</h3>
       <p className="text-sm text-gray-500 mb-4">Leave blank if you don't want to change your password</p>

       <div className="space-y-4">
        <div>
         <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
          Current Password
         </label>
         <input
          type="password"
          id="currentPassword"
          value={formData.currentPassword}
          onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
         />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
           New Password
          </label>
          <input
           type="password"
           id="newPassword"
           value={formData.newPassword}
           onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
           className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
         </div>

         <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
           Confirm New Password
          </label>
          <input
           type="password"
           id="confirmPassword"
           value={formData.confirmPassword}
           onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
           className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
         </div>
        </div>
       </div>
      </div>

      {/* Submit Button */}
      <div className="pt-6 border-t border-gray-200 flex justify-end">
       <button
        type="submit"
        disabled={loading}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
>
        {loading ? 'Saving...' : 'Save Changes'}
       </button>
      </div>
     </form>
    </div>

    {/* Danger Zone - Club Management */}
    {user?.role === 'ADMIN' && (
     <div className="bg-white rounded-lg shadow-sm border border-red-200 mt-6">
      <div className="p-6 border-b border-red-200 bg-red-50">
       <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-red-600" />
        <h2 className="text-lg font-semibold text-red-900">Danger Zone - Club Management</h2>
       </div>
       <p className="text-sm text-red-700 mt-1">
        Perform sensitive club-wide operations. These actions require password verification.
       </p>
      </div>

      <div className="p-6 space-y-6">
       {/* Deletion Warning Banner */}
       {deletionStatus?.isPendingDeletion && (
        <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4">
         <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
           <h3 className="font-semibold text-red-900 mb-1">Club Deletion Scheduled</h3>
           <p className="text-sm text-red-800 mb-2">
            This club is scheduled for permanent deletion on{' '}
            <strong>{new Date(deletionStatus.deletionScheduledFor).toLocaleDateString()}</strong>.
            All data will be permanently deleted in{' '}
            <strong>{deletionStatus.daysUntilDeletion} days</strong>.
           </p>
           <p className="text-sm text-red-800 mb-3">
            Deleted by: {deletionStatus.deletedBy}
           </p>
           <button
            onClick={() => setShowCancelDeleteModal(true)}
            disabled={clubActionLoading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 text-sm font-medium"
           >
            Cancel Deletion
           </button>
          </div>
         </div>
        </div>
       )}

       {/* Backup & Restore */}
       <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
         <Download className="w-5 h-5 text-blue-600" />
         Backup & Restore
        </h3>
        <p className="text-sm text-gray-600 mb-4">
         Export all your club data as a compressed backup file, or restore from a previous backup.
        </p>
        <div className="flex flex-wrap gap-3">
         <button
          onClick={handleBackupClub}
          disabled={clubActionLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
         >
          <Download className="w-4 h-4" />
          {clubActionLoading ? 'Creating Backup...' : 'Download Backup'}
         </button>
         
         <label className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition cursor-pointer flex items-center gap-2 disabled:opacity-50">
          <Upload className="w-4 h-4" />
          Restore from Backup
          <input
           type="file"
           accept=".zip"
           onChange={handleFileSelect}
           disabled={clubActionLoading}
           className="hidden"
          />
         </label>
        </div>
        <p className="text-xs text-gray-500 mt-3">
         <strong>Note:</strong> Backups include all club data, settings, and records. Restoring will overwrite all current data.
        </p>
       </div>

       {/* Delete Club */}
       {!deletionStatus?.isPendingDeletion && (
        <div className="border border-red-300 rounded-lg p-4 bg-red-50">
         <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-red-600" />
          Delete Club
         </h3>
         <div className="space-y-3">
          <p className="text-sm text-red-800">
           Permanently delete this club and all associated data. This action cannot be undone.
          </p>
          <div className="bg-yellow-50 border border-yellow-300 rounded p-3 text-sm text-yellow-900">
           <strong>⚠️ Important:</strong>
           <ul className="mt-2 ml-4 list-disc space-y-1">
            <li>All club data will be deleted after a 30-day cooling-off period</li>
            <li>All users, venues, equipment, rosters, and submissions will be removed</li>
            <li>Injury reports must be retained for 7 years per Australian WHS regulations</li>
            <li>You should download a backup before proceeding</li>
           </ul>
          </div>
          <button
           onClick={() => setShowDeleteModal(true)}
           disabled={clubActionLoading}
           className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
           <Trash2 className="w-4 h-4" />
           Schedule Club Deletion
          </button>
         </div>
        </div>
       )}
      </div>
     </div>
    )}

    {/* Password Verification Modals */}
    <PasswordVerificationModal
     isOpen={showDeleteModal}
     onClose={() => setShowDeleteModal(false)}
     onVerify={handleDeleteClub}
     title="Confirm Club Deletion"
     message="This will schedule your club for permanent deletion in 30 days. All data will be permanently removed. You can cancel this action within 30 days."
     confirmButtonText="Schedule Deletion"
     confirmButtonColor="bg-red-600 hover:bg-red-700"
     requireConfirmation={true}
     confirmationText={user?.clubName || ''}
     confirmationPlaceholder={`Type "${user?.clubName}" to confirm`}
     loading={clubActionLoading}
    />

    <PasswordVerificationModal
     isOpen={showCancelDeleteModal}
     onClose={() => setShowCancelDeleteModal(false)}
     onVerify={handleCancelDeletion}
     title="Cancel Club Deletion"
     message="Cancel the scheduled deletion of your club. Your club will remain active."
     confirmButtonText="Cancel Deletion"
     confirmButtonColor="bg-green-600 hover:bg-green-700"
     loading={clubActionLoading}
    />

    <PasswordVerificationModal
     isOpen={showRestoreModal}
     onClose={() => {
      setShowRestoreModal(false)
      setRestoreFile(null)
     }}
     onVerify={handleRestoreClub}
     title="Restore Club Data"
     message={`This will restore your club data from the backup file: ${restoreFile?.name}. This will overwrite all current data. This action cannot be undone.`}
     confirmButtonText="Restore Data"
     confirmButtonColor="bg-orange-600 hover:bg-orange-700"
     loading={clubActionLoading}
    />
   </div>
  </DashboardLayout>
 )
}

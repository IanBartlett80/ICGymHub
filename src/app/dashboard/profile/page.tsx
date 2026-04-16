'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DashboardLayout from '@/components/DashboardLayout'
import axiosInstance from '@/lib/axios'
import PasswordVerificationModal from '@/components/PasswordVerificationModal'

const TIMEZONE_OPTIONS = [
  { group: 'Australia', zones: [
    { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
    { value: 'Australia/Melbourne', label: 'Melbourne (AEST/AEDT)' },
    { value: 'Australia/Brisbane', label: 'Brisbane (AEST)' },
    { value: 'Australia/Perth', label: 'Perth (AWST)' },
    { value: 'Australia/Adelaide', label: 'Adelaide (ACST/ACDT)' },
    { value: 'Australia/Hobart', label: 'Hobart (AEST/AEDT)' },
    { value: 'Australia/Darwin', label: 'Darwin (ACST)' },
    { value: 'Australia/Lord_Howe', label: 'Lord Howe Island' },
  ]},
  { group: 'New Zealand & Pacific', zones: [
    { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)' },
    { value: 'Pacific/Fiji', label: 'Fiji' },
  ]},
  { group: 'Asia', zones: [
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
    { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
  ]},
  { group: 'Europe', zones: [
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
    { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  ]},
  { group: 'Americas', zones: [
    { value: 'America/New_York', label: 'New York (EST/EDT)' },
    { value: 'America/Chicago', label: 'Chicago (CST/CDT)' },
    { value: 'America/Denver', label: 'Denver (MST/MDT)' },
    { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
    { value: 'America/Toronto', label: 'Toronto (EST/EDT)' },
    { value: 'America/Vancouver', label: 'Vancouver (PST/PDT)' },
  ]},
]

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
 const [backupLoading, setBackupLoading] = useState(false)
 const [deleteLoading, setDeleteLoading] = useState(false)
 const [showDeleteModal, setShowDeleteModal] = useState(false)
 const [showRestoreModal, setShowRestoreModal] = useState(false)
 const [confirmDeleteText, setConfirmDeleteText] = useState('')
 const [deletionStatus, setDeletionStatus] = useState<{ deletionScheduledFor: string | null; deletedBy: string | null } | null>(null)
 const [restoreFile, setRestoreFile] = useState<File | null>(null)
 const [restoreValidation, setRestoreValidation] = useState<any>(null)
 const [restoreLoading, setRestoreLoading] = useState(false)
 const [showRestoreConfirmModal, setShowRestoreConfirmModal] = useState(false)
 const [restoreResults, setRestoreResults] = useState<any>(null)
 const [clubTimezone, setClubTimezone] = useState('Australia/Sydney')
 const [originalClubTimezone, setOriginalClubTimezone] = useState('Australia/Sydney')
 const [timezoneSaving, setTimezoneSaving] = useState(false)
 const [lastBackupDate, setLastBackupDate] = useState<string | null>(null)
 const [activeSection, setActiveSection] = useState('account')

 const sectionRefs = {
  account: useRef<HTMLDivElement>(null),
  billing: useRef<HTMLDivElement>(null),
  danger: useRef<HTMLDivElement>(null),
 }

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

  // Fetch deletion status if admin
  if (parsed.role === 'ADMIN') {
   axiosInstance.get('/api/clubs/delete').then(res => {
    setDeletionStatus(res.data)
   }).catch(() => {})
   // Fetch last backup date
   axiosInstance.get('/api/clubs/backup').then(res => {
    const backups = res.data?.backups
    if (backups?.length > 0) {
     const lastCompleted = backups.find((b: any) => b.status === 'COMPLETED')
     if (lastCompleted) {
      setLastBackupDate(lastCompleted.completedAt || lastCompleted.createdAt)
     }
    }
   }).catch(() => {})
   // Fetch club timezone
   fetch('/api/clubs/settings').then(res => {
    if (res.ok) return res.json()
   }).then(data => {
    if (data?.club?.timezone) {
     setClubTimezone(data.club.timezone)
     setOriginalClubTimezone(data.club.timezone)
    }
   }).catch(() => {})
  }
 }, [router])

 useEffect(() => {
  const observers: IntersectionObserver[] = []
  const entries = Object.entries(sectionRefs) as [string, React.RefObject<HTMLDivElement | null>][]
  entries.forEach(([key, ref]) => {
   if (ref.current) {
    const observer = new IntersectionObserver(
     ([entry]) => {
      if (entry.isIntersecting) setActiveSection(key)
     },
     { rootMargin: '-20% 0px -60% 0px' }
    )
    observer.observe(ref.current)
    observers.push(observer)
   }
  })
  return () => observers.forEach(o => o.disconnect())
 })

 const scrollToSection = (key: string) => {
  const ref = sectionRefs[key as keyof typeof sectionRefs]
  ref?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
 }

 const handleSaveTimezone = async () => {
  setTimezoneSaving(true)
  setMessage(null)
  try {
   const res = await fetch('/api/clubs/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ timezone: clubTimezone }),
   })
   if (res.ok) {
    setOriginalClubTimezone(clubTimezone)
    // Update localStorage
    const userData = localStorage.getItem('userData')
    if (userData) {
     const parsed = JSON.parse(userData)
     parsed.clubTimezone = clubTimezone
     localStorage.setItem('userData', JSON.stringify(parsed))
    }
    setMessage({ type: 'success', text: 'Club timezone updated successfully' })
   } else {
    const data = await res.json()
    setMessage({ type: 'error', text: data.error || 'Failed to update timezone' })
   }
  } catch {
   setMessage({ type: 'error', text: 'Failed to update timezone' })
  } finally {
   setTimezoneSaving(false)
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

 const handleBackup = async () => {
  setBackupLoading(true)
  setMessage(null)
  try {
   const response = await axiosInstance.post('/api/clubs/backup', {}, { responseType: 'blob' })
   const blob = new Blob([response.data], { type: 'application/json' })
   const url = window.URL.createObjectURL(blob)
   const a = document.createElement('a')
   a.href = url
   a.download = `${user?.clubName?.replace(/\s+/g, '-').toLowerCase()}-backup-${new Date().toISOString().split('T')[0]}.json`
   document.body.appendChild(a)
   a.click()
   window.URL.revokeObjectURL(url)
   a.remove()
   setLastBackupDate(new Date().toISOString())
   setMessage({ type: 'success', text: 'Backup downloaded successfully' })
  } catch (error: any) {
   setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to create backup' })
  } finally {
   setBackupLoading(false)
  }
 }

 const handleRestore = async (password: string) => {
  if (!restoreFile) return
  setShowRestoreModal(false)
  setMessage(null)
  setRestoreLoading(true)
  setRestoreResults(null)
  try {
   const formData = new FormData()
   formData.append('file', restoreFile)
   formData.append('password', password)
   const response = await axiosInstance.post('/api/clubs/restore', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
   })
   setRestoreValidation(response.data.summary)
   setMessage({ type: 'success', text: `Backup validated: ${response.data.summary.recordCount} records from ${new Date(response.data.summary.exportedAt).toLocaleDateString()}` })
  } catch (error: any) {
   setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to validate backup' })
   setRestoreFile(null)
  } finally {
   setRestoreLoading(false)
  }
 }

 const handleExecuteRestore = async (password: string) => {
  if (!restoreFile) return
  setShowRestoreConfirmModal(false)
  setMessage(null)
  setRestoreLoading(true)
  try {
   const formData = new FormData()
   formData.append('file', restoreFile)
   formData.append('password', password)
   const response = await axiosInstance.put('/api/clubs/restore', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
   })
   setRestoreResults(response.data)
   setMessage({ type: 'success', text: response.data.message })
   setRestoreFile(null)
   setRestoreValidation(null)
  } catch (error: any) {
   setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to restore backup' })
  } finally {
   setRestoreLoading(false)
  }
 }

 const handleScheduleDelete = async (password: string) => {
  setShowDeleteModal(false)
  setDeleteLoading(true)
  setMessage(null)
  try {
   const response = await axiosInstance.post('/api/clubs/delete', {
    password,
    confirmationText: confirmDeleteText,
   })
   setDeletionStatus({ deletionScheduledFor: response.data.deletionScheduledFor, deletedBy: user?.fullName || null })
   setMessage({ type: 'success', text: `Club deletion scheduled for ${new Date(response.data.deletionScheduledFor).toLocaleDateString()}` })
   setConfirmDeleteText('')
  } catch (error: any) {
   setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to schedule deletion' })
  } finally {
   setDeleteLoading(false)
  }
 }

 const handleCancelDelete = async () => {
  setMessage(null)
  try {
   await axiosInstance.delete('/api/clubs/delete')
   setDeletionStatus({ deletionScheduledFor: null, deletedBy: null })
   setMessage({ type: 'success', text: 'Scheduled deletion has been cancelled' })
  } catch (error: any) {
   setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to cancel deletion' })
  }
 }

 if (!user) {
  return null
 }

 return (
  <DashboardLayout title="Profile Settings" backTo={{ label: 'Back to Home', href: '/dashboard' }}>
   <div className="p-6 max-w-6xl mx-auto">
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

    <div className="flex gap-8">
     {/* Left Sidebar Navigation */}
     <nav className="w-56 shrink-0 hidden md:block">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
       <button
        onClick={() => scrollToSection('account')}
        className={`w-full text-left px-4 py-3 text-sm font-medium transition border-l-2 ${
         activeSection === 'account'
          ? 'bg-blue-50 text-blue-700 border-blue-600'
          : 'text-gray-700 hover:bg-gray-50 border-transparent'
        }`}
       >
        Account Information
       </button>
       {user?.role === 'ADMIN' && (
        <>
         <button
          onClick={() => scrollToSection('billing')}
          className={`w-full text-left px-4 py-3 text-sm font-medium transition border-l-2 ${
           activeSection === 'billing'
            ? 'bg-blue-50 text-blue-700 border-blue-600'
            : 'text-gray-700 hover:bg-gray-50 border-transparent'
          }`}
         >
          Billing &amp; Subscription
         </button>
         <button
          onClick={() => scrollToSection('danger')}
          className={`w-full text-left px-4 py-3 text-sm font-medium transition border-l-2 ${
           activeSection === 'danger'
            ? 'bg-red-50 text-red-700 border-red-600'
            : 'text-gray-700 hover:bg-gray-50 border-transparent'
          }`}
         >
          Danger Zone
         </button>
        </>
       )}
      </div>
     </nav>

     {/* Main Content */}
     <div className="flex-1 min-w-0">

    <div ref={sectionRefs.account} className="bg-white rounded-lg shadow-sm border border-gray-200 scroll-mt-6">
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

      {/* Club Timezone - Admin Only */}
      {user?.role === 'ADMIN' && (
       <div className="pt-6 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Club Timezone</h3>
        <p className="text-sm text-gray-500 mb-4">This timezone is used for all roster scheduling, time displays, and email reports across the application.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
         <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
          <select
           value={clubTimezone}
           onChange={(e) => setClubTimezone(e.target.value)}
           className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
           {TIMEZONE_OPTIONS.map((group) => (
            <optgroup key={group.group} label={group.group}>
             {group.zones.map((tz) => (
              <option key={tz.value} value={tz.value}>
               {tz.label}
              </option>
             ))}
            </optgroup>
           ))}
          </select>
         </div>
         <div>
          {clubTimezone !== originalClubTimezone && (
           <button
            type="button"
            onClick={handleSaveTimezone}
            disabled={timezoneSaving}
            className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
           >
            {timezoneSaving ? 'Saving...' : 'Save Timezone'}
           </button>
          )}
         </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
         Current time: {new Date().toLocaleString('en-US', { timeZone: clubTimezone, weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
       </div>
      )}

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

    {/* Billing & Subscription - Admin Only */}
    {user?.role === 'ADMIN' && (
     <div ref={sectionRefs.billing} className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 scroll-mt-6">
      <div className="p-6 border-b border-gray-200">
       <h2 className="text-lg font-semibold text-gray-900 mb-1">💳 Billing &amp; Subscription</h2>
       <p className="text-sm text-gray-500">Manage your subscription, review payment terms, or cancel</p>
      </div>
      <div className="p-6">
       <Link
        href="/dashboard/profile/billing"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
       >
        View Billing Profile →
       </Link>
      </div>
     </div>
    )}

    {/* Danger Zone - Admin Only */}
    {user?.role === 'ADMIN' && (
     <div ref={sectionRefs.danger} className="mt-8 bg-white rounded-lg shadow-sm border-2 border-red-200 scroll-mt-6">
      <div className="p-6 border-b border-red-200 bg-red-50 rounded-t-lg">
       <h2 className="text-lg font-semibold text-red-800 mb-1">⚠️ Danger Zone</h2>
       <p className="text-sm text-red-600">These actions are irreversible. Please proceed with caution.</p>
      </div>

      <div className="p-6 space-y-6">
       {/* Backup */}
       <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div>
         <h3 className="font-medium text-gray-900">Download Backup</h3>
         <p className="text-sm text-gray-500">Export all club data as a JSON file</p>
         {lastBackupDate && (
          <p className="text-xs text-gray-400 mt-1">
           Last backup: {new Date(lastBackupDate).toLocaleString()}
          </p>
         )}
        </div>
        <button
         onClick={handleBackup}
         disabled={backupLoading}
         className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition disabled:opacity-50"
        >
         {backupLoading ? 'Creating...' : 'Download Backup'}
        </button>
       </div>

       {/* Restore */}
       <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
         <div>
          <h3 className="font-medium text-gray-900">Restore from Backup</h3>
          <p className="text-sm text-gray-500">Restore missing data from a backup file (requires password)</p>
         </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
         <input
          type="file"
          accept=".json"
          onChange={(e) => {
           setRestoreFile(e.target.files?.[0] || null)
           setRestoreValidation(null)
           setRestoreResults(null)
          }}
          className="text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-gray-300 file:text-sm file:font-medium file:bg-white file:text-gray-700 hover:file:bg-gray-50"
         />
         {restoreFile && !restoreValidation && (
          <button
           onClick={() => setShowRestoreModal(true)}
           disabled={restoreLoading}
           className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition disabled:opacity-50"
          >
           {restoreLoading ? 'Validating...' : 'Validate Backup'}
          </button>
         )}
        </div>

        {/* Validation Results */}
        {restoreValidation && (
         <div className="mt-4 border border-blue-200 bg-blue-50 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Backup Contents — {restoreValidation.clubName}</h4>
          <p className="text-sm text-blue-700 mb-3">
           Exported: {new Date(restoreValidation.exportedAt).toLocaleString()} &bull; {restoreValidation.recordCount} total records
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
           {restoreValidation.tables.filter((t: any) => t.count > 0).map((table: any) => (
            <div key={table.name} className="flex justify-between text-sm bg-white px-3 py-1.5 rounded border border-blue-100">
             <span className="text-gray-700 capitalize">{table.name.replace(/([A-Z])/g, ' $1').trim()}</span>
             <span className="font-medium text-blue-700">{table.count}</span>
            </div>
           ))}
          </div>
          <div className="flex gap-3">
           <button
            onClick={() => setShowRestoreConfirmModal(true)}
            disabled={restoreLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
           >
            {restoreLoading ? 'Restoring...' : 'Restore Missing Items'}
           </button>
           <button
            onClick={() => {
             setRestoreFile(null)
             setRestoreValidation(null)
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
           >
            Cancel
           </button>
          </div>
         </div>
        )}

        {/* Restore Results */}
        {restoreResults && (
         <div className={`mt-4 border rounded-lg p-4 ${restoreResults.totalRestored > 0 ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'}`}>
          <h4 className={`font-medium mb-2 ${restoreResults.totalRestored > 0 ? 'text-green-900' : 'text-blue-900'}`}>Restore Complete</h4>
          <p className={`text-sm mb-3 ${restoreResults.totalRestored > 0 ? 'text-green-700' : 'text-blue-700'}`}>{restoreResults.message}</p>
          {restoreResults.totalRestored > 0 && (
           <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
            {Object.entries(restoreResults.restored)
             .filter(([, count]: [string, unknown]) => (count as number) > 0)
             .map(([name, count]: [string, unknown]) => (
              <div key={name} className="flex justify-between text-sm bg-white px-3 py-1.5 rounded border border-green-100">
               <span className="text-gray-700 capitalize">{name.replace(/([A-Z])/g, ' $1').trim()}</span>
               <span className="font-medium text-green-700">{count as number} restored</span>
              </div>
             ))}
           </div>
          )}
          {restoreResults.errors?.length > 0 && (
           <div className="mt-2">
            <p className="text-sm font-medium text-amber-700 mb-1">Some items could not be restored:</p>
            <ul className="text-xs text-amber-600 space-y-1">
             {restoreResults.errors.slice(0, 10).map((err: string, i: number) => (
              <li key={i}>&bull; {err}</li>
             ))}
             {restoreResults.errors.length > 10 && (
              <li>...and {restoreResults.errors.length - 10} more</li>
             )}
            </ul>
           </div>
          )}
          <button
           onClick={() => setRestoreResults(null)}
           className="mt-3 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition"
          >
           Dismiss
          </button>
         </div>
        )}
       </div>

       {/* Delete Club */}
       <div className="p-4 bg-red-50 rounded-lg border border-red-200">
        {deletionStatus?.deletionScheduledFor ? (
         <div>
          <h3 className="font-medium text-red-800">Deletion Scheduled</h3>
          <p className="text-sm text-red-600 mt-1">
           This club is scheduled for permanent deletion on{' '}
           <strong>{new Date(deletionStatus.deletionScheduledFor).toLocaleDateString()}</strong>.
           Scheduled by: {deletionStatus.deletedBy}
          </p>
          <button
           onClick={handleCancelDelete}
           className="mt-3 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition"
          >
           Cancel Deletion
          </button>
         </div>
        ) : (
         <div>
          <h3 className="font-medium text-red-800">Delete Club</h3>
          <p className="text-sm text-red-600 mt-1">
           Once deleted, all data will be permanently removed after a 30-day cooling-off period.
           Australian WHS regulations require 7-year data retention — please download a backup first.
          </p>
          <div className="mt-3 space-y-3">
           <div>
            <label className="block text-sm font-medium text-red-700 mb-1">
             Type &quot;{user?.clubName}&quot; to confirm
            </label>
            <input
             type="text"
             value={confirmDeleteText}
             onChange={(e) => setConfirmDeleteText(e.target.value)}
             className="w-full max-w-md px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
             placeholder={`Type ${user?.clubName} to confirm`}
            />
           </div>
           <button
            onClick={() => setShowDeleteModal(true)}
            disabled={confirmDeleteText !== user?.clubName || deleteLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
           >
            {deleteLoading ? 'Processing...' : 'Schedule Deletion'}
           </button>
          </div>
         </div>
        )}
       </div>
      </div>
     </div>
    )}

    {/* Password Modals */}
    <PasswordVerificationModal
     isOpen={showDeleteModal}
     onClose={() => setShowDeleteModal(false)}
     onVerified={handleScheduleDelete}
     title="Confirm Club Deletion"
     description="Enter your password to schedule this club for deletion."
     confirmLabel="Schedule Deletion"
    />
    <PasswordVerificationModal
     isOpen={showRestoreModal}
     onClose={() => setShowRestoreModal(false)}
     onVerified={handleRestore}
     title="Validate Backup"
     description="Enter your password to validate this backup file."
     confirmLabel="Validate"
    />
    <PasswordVerificationModal
     isOpen={showRestoreConfirmModal}
     onClose={() => setShowRestoreConfirmModal(false)}
     onVerified={handleExecuteRestore}
     title="Confirm Restore"
     description="Enter your password to restore missing items from the backup. Only items missing from the database will be recreated."
     confirmLabel="Restore Missing Items"
    />

     </div>{/* end Main Content */}
    </div>{/* end flex container */}
   </div>
  </DashboardLayout>
 )
}

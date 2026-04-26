'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import axiosInstance from '@/lib/axios'
import PasswordVerificationModal from '@/components/PasswordVerificationModal'

interface BillingData {
  paymentStatus: string
  paymentAgreedAt: string | null
  paymentCancelledAt: string | null
  trialEndsAt: string | null
  monthlyRateAud: number
  isInTrial: boolean
  trialDaysRemaining: number | null
  hasXeroContact: boolean
  hasRecurringInvoice: boolean
  clubCreatedAt: string
}

export default function BillingPage() {
  const router = useRouter()
  const [billing, setBilling] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [reEnableLoading, setReEnableLoading] = useState(false)
  const [user, setUser] = useState<{ role: string } | null>(null)

  useEffect(() => {
    const userData = localStorage.getItem('userData')
    if (!userData) {
      router.push('/sign-in')
      return
    }
    const parsed = JSON.parse(userData)
    setUser(parsed)

    axiosInstance
      .get('/api/billing')
      .then((res) => {
        setBilling(res.data.billing)
      })
      .catch(() => {
        setMessage({ type: 'error', text: 'Failed to load billing information' })
      })
      .finally(() => setLoading(false))
  }, [router])

  const handleCancelSubscription = async (password: string) => {
    setShowCancelModal(false)
    setCancelLoading(true)
    setMessage(null)
    try {
      // Verify password first
      await axiosInstance.post('/api/auth/verify-password', { password })

      const res = await axiosInstance.post('/api/billing', { action: 'cancel' })
      setMessage({ type: 'success', text: res.data.message })
      // Refresh billing data
      const billingRes = await axiosInstance.get('/api/billing')
      setBilling(billingRes.data.billing)
      // Update localStorage so DashboardLayout banner appears
      const storedData = localStorage.getItem('userData')
      if (storedData) {
        const parsed = JSON.parse(storedData)
        parsed.paymentStatus = 'CANCELLED'
        parsed.paymentCancelledAt = new Date().toISOString()
        localStorage.setItem('userData', JSON.stringify(parsed))
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to cancel subscription',
      })
    } finally {
      setCancelLoading(false)
    }
  }

  const handleReEnableSubscription = async () => {
    setReEnableLoading(true)
    setMessage(null)
    try {
      const res = await axiosInstance.post('/api/billing', { action: 'reactivate' })
      setMessage({ type: 'success', text: res.data.message })
      // Refresh billing data
      const billingRes = await axiosInstance.get('/api/billing')
      setBilling(billingRes.data.billing)
      // Update localStorage so DashboardLayout banner disappears
      const storedData = localStorage.getItem('userData')
      if (storedData) {
        const parsed = JSON.parse(storedData)
        parsed.paymentStatus = 'AGREED'
        parsed.paymentCancelledAt = null
        localStorage.setItem('userData', JSON.stringify(parsed))
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to re-enable subscription',
      })
    } finally {
      setReEnableLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      AGREED: 'bg-green-100 text-green-800',
      SKIPPED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      NONE: 'bg-green-100 text-green-800',
    }
    const labels: Record<string, string> = {
      AGREED: 'Active',
      SKIPPED: 'Active',
      CANCELLED: 'Inactive',
      NONE: 'Active',
    }
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${styles[status] || styles.NONE}`}>
        {labels[status] || status}
      </span>
    )
  }

  if (loading) {
    return (
      <DashboardLayout title="Billing" backTo={{ label: 'Back to Profile', href: '/dashboard/profile' }}>
        <div className="p-6 max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-48" />
            <div className="h-48 bg-gray-200 rounded" />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Billing" backTo={{ label: 'Back to Profile', href: '/dashboard/profile' }}>
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

        {/* Subscription Overview */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Subscription</h2>
                <p className="text-sm text-gray-500 mt-1">Your GymHub billing summary</p>
              </div>
              {billing && getStatusBadge(billing.paymentStatus)}
            </div>
          </div>

          <div className="p-6">
            {billing && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500">Plan</p>
                  <p className="text-lg font-semibold text-gray-900">GymHub Monthly</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Monthly Rate</p>
                  <p className="text-lg font-semibold text-gray-900">
                    ${billing.monthlyRateAud} AUD / month
                  </p>
                </div>
                {billing.paymentAgreedAt && (
                  <div>
                    <p className="text-sm text-gray-500">Agreement Date</p>
                    <p className="text-gray-900">
                      {new Date(billing.paymentAgreedAt).toLocaleDateString('en-AU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                )}
                {billing.trialEndsAt && (
                  <div>
                    <p className="text-sm text-gray-500">Free Trial Ends</p>
                    <p className="text-gray-900">
                      {new Date(billing.trialEndsAt).toLocaleDateString('en-AU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                      {billing.isInTrial && billing.trialDaysRemaining !== null && (
                        <span className="ml-2 text-sm text-green-600">
                          ({billing.trialDaysRemaining} days remaining)
                        </span>
                      )}
                    </p>
                  </div>
                )}
                {billing.paymentCancelledAt && (
                  <div>
                    <p className="text-sm text-gray-500">Cancelled On</p>
                    <p className="text-red-600">
                      {new Date(billing.paymentCancelledAt).toLocaleDateString('en-AU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Billing Provider</p>
                  <p className="text-gray-900">
                    {billing.hasRecurringInvoice ? 'Xero (Automated)' : 'Not configured'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Trial Banner */}
        {billing?.isInTrial && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎉</span>
              <div>
                <p className="font-semibold text-green-800">Free Trial Active</p>
                <p className="text-sm text-green-700">
                  You have {billing.trialDaysRemaining} day{billing.trialDaysRemaining !== 1 ? 's' : ''} remaining on your free trial.
                  Your first invoice will be generated after{' '}
                  {billing.trialEndsAt
                    ? new Date(billing.trialEndsAt).toLocaleDateString('en-AU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : 'your trial ends'}
                  .
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Payment Terms */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Payment Terms &amp; Conditions</h2>
          </div>
          <div className="p-6">
            <div className="prose prose-sm max-w-none text-gray-700 space-y-4">
              <h3 className="text-base font-semibold text-gray-900">1. Subscription Agreement</h3>
              <p>
                By subscribing to GymHub, you agree to pay a monthly subscription fee of $100 AUD
                (inclusive of GST) per calendar month. This fee covers full access to all GymHub
                features including Class Rostering, Injury &amp; Incident Management, Equipment
                Tracking, Compliance Manager, and Multi-Venue Support.
              </p>

              <h3 className="text-base font-semibold text-gray-900">2. Free Trial</h3>
              <p>
                New subscribers receive a 30-day free trial starting from the date of registration.
                No charges will be incurred during the trial period. Your first invoice will be
                automatically generated on the day following the trial expiry.
              </p>

              <h3 className="text-base font-semibold text-gray-900">3. Billing &amp; Invoicing</h3>
              <p>
                Invoices are generated monthly via Xero and sent to the email address associated with
                your admin account. Payment is due within 20 days of the invoice date. All amounts
                are in Australian Dollars (AUD) and include GST where applicable.
              </p>

              <h3 className="text-base font-semibold text-gray-900">4. Cancellation</h3>
              <p>
                You may cancel your subscription at any time from this Billing page. Upon
                cancellation, your access will continue until the end of the current billing period.
                No refunds are provided for partial months.
              </p>

              <h3 className="text-base font-semibold text-gray-900">5. Data Retention</h3>
              <p>
                Upon cancellation, your data will be retained for 30 days. After this period, you may
                request permanent deletion. We recommend downloading a backup from your Profile
                Settings before cancellation.
              </p>

              <p className="text-xs text-gray-400 mt-6">
                These terms are provided as a summary. For the full legal terms, please contact
                ICB Solutions Pty Ltd at support@gymhub.club.
              </p>
            </div>
          </div>
        </div>

        {/* Cancel Subscription - Admin Only */}
        {user?.role === 'ADMIN' && billing?.paymentStatus !== 'CANCELLED' && (
          <div className="bg-white rounded-lg shadow-sm border-2 border-red-200">
            <div className="p-6 border-b border-red-200 bg-red-50 rounded-t-lg">
              <h2 className="text-lg font-semibold text-red-800">Cancel Subscription</h2>
              <p className="text-sm text-red-600 mt-1">
                This will cancel your monthly subscription. Your data will be retained for 30 days.
                You can re-enable your subscription at any time during this period.
              </p>
            </div>
            <div className="p-6">
              <button
                onClick={() => setShowCancelModal(true)}
                disabled={cancelLoading}
                className="px-6 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelLoading ? 'Processing...' : 'Cancel Subscription'}
              </button>
            </div>
          </div>
        )}

        {/* Re-Enable Subscription - Admin Only, when cancelled */}
        {user?.role === 'ADMIN' && billing?.paymentStatus === 'CANCELLED' && (
          <div className="bg-white rounded-lg shadow-sm border-2 border-green-200">
            <div className="p-6 border-b border-green-200 bg-green-50 rounded-t-lg">
              <h2 className="text-lg font-semibold text-green-800">Re-Enable Subscription</h2>
              <p className="text-sm text-green-700 mt-1">
                Your subscription is currently inactive.
                {billing.paymentCancelledAt && (() => {
                  const cancelDate = new Date(billing.paymentCancelledAt)
                  const expiryDate = new Date(cancelDate.getTime() + 30 * 24 * 60 * 60 * 1000)
                  const days = Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                  return days > 0
                    ? ` Your data will be deleted in ${days} day${days !== 1 ? 's' : ''} if you don't re-enable.`
                    : ' Your grace period has expired. Re-enable now to keep your data.'
                })()}
              </p>
            </div>
            <div className="p-6">
              <button
                onClick={handleReEnableSubscription}
                disabled={reEnableLoading}
                className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {reEnableLoading ? 'Processing...' : 'Re-Enable Subscription'}
              </button>
            </div>
          </div>
        )}

        <PasswordVerificationModal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onVerified={handleCancelSubscription}
          title="Confirm Cancellation"
          description="Enter your password to confirm subscription cancellation."
          confirmLabel="Cancel Subscription"
        />
      </div>
    </DashboardLayout>
  )
}

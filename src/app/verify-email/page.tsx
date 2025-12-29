'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [message, setMessage] = useState('')
  const [clubName, setClubName] = useState('')

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token')

      if (!token) {
        setError('No verification token provided. Please check your email link.')
        setLoading(false)
        return
      }

      try {
        const response = await axios.post('/api/auth/verify-email', { token })
        setSuccess(true)
        setMessage(response.data.message)
        setClubName(response.data.clubName)

        // Redirect to sign-in after 3 seconds
        setTimeout(() => {
          router.push('/sign-in?verified=true')
        }, 3000)
      } catch (err: any) {
        const errorMessage = err.response?.data?.error || 'Verification failed. Please try again.'
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    verifyEmail()
  }, [searchParams, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-neutral-800 border border-neutral-700 rounded-2xl p-8 text-center">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Verifying Email</h1>
          <p className="text-neutral-400">Please wait while we verify your email address...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-neutral-800 border border-neutral-700 rounded-2xl p-8">
          <div className="text-5xl text-error mb-4 text-center">❌</div>
          <h1 className="text-2xl font-bold text-white mb-4 text-center">Verification Failed</h1>
          <div className="bg-error/10 border border-error/30 rounded-lg p-4 mb-6">
            <p className="text-error text-sm">{error}</p>
          </div>
          <div className="space-y-3">
            <p className="text-neutral-400 text-sm text-center">
              If the link has expired, you can request a new verification email.
            </p>
            <Link
              href="/sign-in"
              className="block w-full text-center px-4 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold transition"
            >
              Return to Sign In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-neutral-800 border border-neutral-700 rounded-2xl p-8">
          <div className="text-5xl text-success mb-4 text-center">✅</div>
          <h1 className="text-2xl font-bold text-white mb-2 text-center">Email Verified!</h1>
          <p className="text-center text-neutral-300 font-medium mb-2">{clubName}</p>
          <p className="text-neutral-400 text-center text-sm mb-6">{message}</p>
          <div className="text-center text-neutral-400 text-sm">
            Redirecting to sign in in 3 seconds...
          </div>
        </div>
      </div>
    )
  }

  return null
}

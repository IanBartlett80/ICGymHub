'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import axios from 'axios'
import { useAuth } from '@/components/AuthProvider'

type FormData = {
  username: string
  password: string
}

const CLUB_NOT_ACTIVE_ERROR = 'Your club account is not active. Please contact support.'

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setAuthUser } = useAuth()
  const [formData, setFormData] = useState<FormData>({
    username: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Resend verification state
  const [showResend, setShowResend] = useState(false)
  const [resendEmail, setResendEmail] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState('')
  const [resendError, setResendError] = useState('')

  const registered = searchParams.get('registered') === 'true'
  const verified = searchParams.get('verified') === 'true'
  const sessionExpired = searchParams.get('sessionExpired') === 'true'
  const inactivity = searchParams.get('inactivity') === 'true'

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setShowResend(false)

    try {
      const response = await axios.post('/api/auth/login', formData)
      // Update AuthProvider state immediately
      setAuthUser(response.data.user)
      // Redirect to dashboard
      router.push('/dashboard')
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Sign in failed. Please try again.'
      setError(errorMessage)
      if (errorMessage === CLUB_NOT_ACTIVE_ERROR) {
        setShowResend(true)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault()
    setResendLoading(true)
    setResendError('')
    setResendSuccess('')

    try {
      await axios.post('/api/auth/resend-verification', { email: resendEmail })
      setResendSuccess('Verification email sent! Check your inbox — the link is valid for 24 hours.')
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to send verification email. Please try again.'
      // Treat "already verified" as a success message, not an error
      if (msg === 'This club is already verified') {
        setResendSuccess('Your club is already verified. You can sign in with your credentials.')
      } else {
        setResendError(msg)
      }
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col px-4 pt-8">
      <div className="w-full max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-block mb-4">
            <Image 
              src="/imgs/GymHub_Logo.png" 
              alt="GymHub Logo" 
              width={200} 
              height={100}
              className="object-contain"
            />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Sign In</h1>
          <p className="text-gray-600 mt-2">Welcome back</p>
        </div>

        {/* Success Message */}
        {registered && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            Registration successful! Please check your email to verify your club before signing in.
          </div>
        )}

        {verified && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            ✅ Email verified! Your club is now active. You can sign in below.
          </div>
        )}

        {sessionExpired && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
            ⏰ Your session has expired. Please sign in again to continue.
          </div>
        )}

        {inactivity && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
            💤 You were logged out due to inactivity. Please sign in again.
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-8 space-y-6 shadow-sm">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Resend verification — shown only when club is not yet active */}
          {showResend && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
              <p className="text-amber-800 text-sm font-medium">
                Your club account hasn&apos;t been verified yet.
              </p>
              <p className="text-amber-700 text-sm">
                Enter your registered email address and we&apos;ll send a new verification link (valid for 24 hours).
              </p>
              {resendSuccess ? (
                <p className="text-green-700 text-sm font-medium">{resendSuccess}</p>
              ) : (
                <form onSubmit={handleResend} className="flex gap-2">
                  <input
                    type="email"
                    value={resendEmail}
                    onChange={e => setResendEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="flex-1 px-3 py-2 text-sm border border-amber-300 rounded-lg focus:outline-none focus:border-amber-500 bg-white text-gray-900"
                  />
                  <button
                    type="submit"
                    disabled={resendLoading}
                    className="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg font-medium transition whitespace-nowrap"
                  >
                    {resendLoading ? 'Sending…' : 'Resend link'}
                  </button>
                </form>
              )}
              {resendError && (
                <p className="text-red-600 text-sm">{resendError}</p>
              )}
            </div>
          )}

          <div>
            <label htmlFor="username" className="block text-gray-900 font-medium mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none transition"
              placeholder="Enter your username"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-gray-900 font-medium mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none transition"
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-semibold transition"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        {/* Links */}
        <div className="mt-6 space-y-3">
          <div className="text-center">
            <Link href="/forgot-password" className="text-blue-600 hover:text-blue-700 text-sm">
              Forgot your password?
            </Link>
          </div>
          <div className="text-center text-gray-600">
            Don't have an account?{' '}
            <Link href="/register" className="text-blue-600 hover:text-blue-700">
              Register your club
            </Link>
          </div>
        </div>

        {/* Support */}
        <div className="mt-8 p-4 bg-gray-100 border border-gray-200 rounded-lg text-center">
          <p className="text-gray-600 text-sm">
            Need help?{' '}
            <Link href="mailto:GymHub@icb.solutions" className="text-blue-600 hover:text-blue-700">
              Contact support
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SignInForm />
    </Suspense>
  )
}

'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import axios from 'axios'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const validatePassword = (pw: string): string | null => {
    if (pw.length < 8) return 'Password must be at least 8 characters'
    if (!/[A-Z]/.test(pw)) return 'Password must contain an uppercase letter'
    if (!/[a-z]/.test(pw)) return 'Password must contain a lowercase letter'
    if (!/[0-9]/.test(pw)) return 'Password must contain a number'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    const validationError = validatePassword(password)
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)

    try {
      await axios.post('/api/auth/reset-password', { token, password })
      setSuccess(true)
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Something went wrong. Please try again.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col px-4 pt-8">
        <div className="w-full max-w-md mx-auto">
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
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm text-center">
            <div className="mb-4 text-red-500">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid Reset Link</h2>
            <p className="text-gray-600 mb-6">
              This password reset link is invalid or missing. Please request a new one.
            </p>
            <Link
              href="/forgot-password"
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
            >
              Request New Reset Link
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col px-4 pt-8">
        <div className="w-full max-w-md mx-auto">
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
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm text-center">
            <div className="mb-4 text-green-600">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Password Reset Successful</h2>
            <p className="text-gray-600 mb-6">
              Your password has been updated. You can now sign in with your new password.
            </p>
            <Link
              href="/sign-in"
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    )
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
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Reset Password</h1>
          <p className="text-gray-600 mt-2">Enter your new password below.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-8 space-y-6 shadow-sm">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-gray-900 font-medium mb-2">
              New Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none transition"
              placeholder="Enter new password"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              At least 8 characters, with uppercase, lowercase, and number.
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-gray-900 font-medium mb-2">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none transition"
              placeholder="Confirm new password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-semibold transition"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        {/* Links */}
        <div className="mt-6 text-center">
          <Link href="/sign-in" className="text-blue-600 hover:text-blue-700 text-sm">
            Back to Sign In
          </Link>
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  )
}

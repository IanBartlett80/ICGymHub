'use client'

import { useState } from 'react'
import Link from 'next/link'
import axios from 'axios'

export default function ResendVerificationPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [verificationLink, setVerificationLink] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await axios.post('/api/auth/resend-verification', { email })
      setSuccess(true)
      // In development, show the link; remove in production
      if (response.data.verificationLink) {
        setVerificationLink(response.data.verificationLink)
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to resend verification email'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 py-12 px-4">
        <div className="max-w-md mx-auto">
          <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-8 text-center">
            <div className="text-5xl mb-4">✉️</div>
            <h1 className="text-3xl font-bold text-white mb-4">Verification Email Sent</h1>
            <p className="text-neutral-400 mb-6">
              We've sent a new verification link to <strong>{email}</strong>. Please check your email and click the link to verify your club.
            </p>
            <p className="text-sm text-neutral-500 mb-6">
              The link will expire in 24 hours.
            </p>

            {/* Development only: Show the link */}
            {verificationLink && (
              <div className="mb-6 p-4 bg-neutral-700/50 rounded-lg">
                <p className="text-xs text-neutral-400 mb-2">Development: Direct verification link</p>
                <a
                  href={verificationLink}
                  className="text-primary hover:text-primary-light text-sm break-all"
                >
                  {verificationLink}
                </a>
              </div>
            )}

            <Link
              href="/sign-in"
              className="inline-block w-full px-4 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold transition"
            >
              Return to Sign In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-primary hover:text-primary-dark transition">
            GymHub
          </Link>
          <h1 className="text-3xl font-bold text-white mt-6">Resend Verification Email</h1>
          <p className="text-neutral-400 mt-2">Enter your email to receive a new verification link</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-neutral-800 border border-neutral-700 rounded-2xl p-8 space-y-6">
          {error && (
            <div className="p-4 bg-error/10 border border-error/30 rounded-lg text-error text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-white font-medium mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:border-primary focus:outline-none transition"
              placeholder="admin@example.com"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white rounded-lg font-semibold transition"
          >
            {loading ? 'Sending...' : 'Send Verification Email'}
          </button>
        </form>

        <p className="text-center text-neutral-400 mt-6">
          <Link href="/sign-in" className="text-primary hover:text-primary-light">
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}

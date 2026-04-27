'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import axios from 'axios'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await axios.post('/api/auth/forgot-password', { email, username })
      setSubmitted(true)
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Something went wrong. Please try again.'
      setError(errorMessage)
    } finally {
      setLoading(false)
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
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Forgot Password</h1>
          <p className="text-gray-600 mt-2">
            Enter your username and email address to receive a password reset link.
          </p>
        </div>

        {submitted ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
            <div className="text-center">
              <div className="mb-4 text-green-600">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Check Your Email</h2>
              <p className="text-gray-600 mb-6">
                If an account exists with that email and username, we&apos;ve sent a password reset link. Please check your inbox and spam folder.
              </p>
              <p className="text-gray-500 text-sm mb-6">
                The link will expire in 1 hour.
              </p>
              <Link
                href="/sign-in"
                className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Form */}
            <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-8 space-y-6 shadow-sm">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="username" className="block text-gray-900 font-medium mb-2">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none transition"
                  placeholder="Enter your username"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-gray-900 font-medium mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none transition"
                  placeholder="Enter your email address"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-semibold transition"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>

            {/* Links */}
            <div className="mt-6 text-center">
              <Link href="/sign-in" className="text-blue-600 hover:text-blue-700 text-sm">
                Back to Sign In
              </Link>
            </div>
          </>
        )}

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

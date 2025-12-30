'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'

type FormData = {
  username: string
  password: string
}

export default function SignInPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState<FormData>({
    username: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const registered = searchParams.get('registered') === 'true'
  const verified = searchParams.get('verified') === 'true'

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

    try {
      const response = await axios.post('/api/auth/login', formData)
      // Store user data in localStorage
      localStorage.setItem('userData', JSON.stringify(response.data.user))
      // Redirect to dashboard
      router.push('/dashboard')
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Sign in failed. Please try again.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-primary hover:text-primary-dark transition">
            GymHub
          </Link>
          <h1 className="text-4xl font-bold text-white mt-6">Sign In</h1>
          <p className="text-neutral-400 mt-2">Welcome back to GymHub</p>
        </div>

        {/* Success Message */}
        {registered && (
          <div className="mb-6 p-4 bg-success/10 border border-success/30 rounded-lg text-success">
            Registration successful! Please check your email to verify your club before signing in.
          </div>
        )}

        {verified && (
          <div className="mb-6 p-4 bg-success/10 border border-success/30 rounded-lg text-success">
            ✅ Email verified! Your club is now active. You can sign in below.
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-neutral-800 border border-neutral-700 rounded-2xl p-8 space-y-6">
          {error && (
            <div className="p-4 bg-error/10 border border-error/30 rounded-lg text-error text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="username" className="block text-white font-medium mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:border-primary focus:outline-none transition"
              placeholder="Enter your username"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-white font-medium mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:border-primary focus:outline-none transition"
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white rounded-lg font-semibold transition"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        {/* Links */}
        <div className="mt-6 space-y-3">
          <div className="text-center">
            <Link href="#" className="text-primary hover:text-primary-light text-sm">
              Forgot your password?
            </Link>
          </div>
          <div className="text-center text-neutral-400">
            Don't have an account?{' '}
            <Link href="/register" className="text-primary hover:text-primary-light">
              Register your club
            </Link>
          </div>
        </div>

        {/* Support */}
        <div className="mt-8 p-4 bg-neutral-800/50 border border-neutral-700 rounded-lg text-center">
          <p className="text-neutral-400 text-sm">
            Need help?{' '}
            <Link href="mailto:support@icgymhub.com" className="text-primary hover:text-primary-light">
              Contact support
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import axios from 'axios'

type FormData = {
  clubName: string
  abn: string
  clubDomain: string
  address: string
  city: string
  state: string
  postalCode: string
  phone: string
  adminFullName: string
  adminEmail: string
  adminUsername: string
  adminPassword: string
  agreeToTerms: boolean
}

const australianStates = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']

// Normalize domain - strip www. prefix and extract hostname from URLs
const normalizeDomainForDisplay = (domain: string): string => {
  if (!domain) return ''
  let normalized = domain.trim().toLowerCase()
  
  // Extract hostname from URL if provided
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    try {
      normalized = new URL(normalized).hostname
    } catch {
      // If URL parsing fails, continue with the raw string
    }
  }
  
  // Strip www. prefix
  if (normalized.startsWith('www.')) {
    normalized = normalized.substring(4)
  }
  
  return normalized
}

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    clubName: '',
    abn: '',
    clubDomain: '',
    address: '',
    city: '',
    state: 'NSW',
    postalCode: '',
    phone: '',
    adminFullName: '',
    adminEmail: '',
    adminUsername: '',
    adminPassword: '',
    agreeToTerms: false,
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const validateStep = (currentStep: number): boolean => {
    setError('')
    if (currentStep === 1) {
      if (!formData.clubName) {
        setError('Club name is required')
        return false
      }
      if (!formData.clubDomain) {
        setError('Club domain is required')
        return false
      }
    } else if (currentStep === 2) {
      if (!formData.address) {
        setError('Address is required')
        return false
      }
      if (!formData.city) {
        setError('City is required')
        return false
      }
      if (!formData.postalCode) {
        setError('Postal code is required')
        return false
      }
      if (!formData.phone) {
        setError('Phone number is required')
        return false
      }
    } else if (currentStep === 3) {
      if (!formData.adminFullName) {
        setError('Full name is required')
        return false
      }
      if (!formData.adminEmail) {
        setError('Email is required')
        return false
      }
      if (!formData.adminUsername) {
        setError('Username is required')
        return false
      }
      if (!formData.adminPassword || formData.adminPassword.length < 8) {
        setError('Password must be at least 8 characters')
        return false
      }
    } else if (currentStep === 4) {
      if (!formData.agreeToTerms) {
        setError('You must agree to the terms and conditions')
        return false
      }
    }
    return true
  }

  const handleNextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1)
    }
  }

  const handlePreviousStep = () => {
    setStep(step - 1)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateStep(4)) return

    setLoading(true)
    setError('')

    const normalizedDomain = normalizeDomainForDisplay(formData.clubDomain)

    try {
      await axios.post('/api/auth/register', {
        ...formData,
        clubDomain: normalizedDomain,
      })
      setSuccess(true)
      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/sign-in?registered=true')
      }, 2000)
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Registration failed. Please try again.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <div className="text-5xl mb-4 text-center">✅</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4 text-center">Registration Successful!</h1>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-700 font-semibold mb-2">📧 Email Verification Required</p>
            <p className="text-sm text-gray-700">
              We've sent a verification link to your email address. Please click the link to verify your club domain and activate your account.
            </p>
          </div>

          <div className="space-y-3 mb-6">
            <p className="text-gray-600 text-sm">
              <strong>What's next?</strong>
            </p>
            <ul className="text-gray-600 text-sm space-y-2">
              <li className="flex gap-2">
                <span>1️⃣</span>
                <span>Check your email (it may be in spam)</span>
              </li>
              <li className="flex gap-2">
                <span>2️⃣</span>
                <span>Click the verification link</span>
              </li>
              <li className="flex gap-2">
                <span>3️⃣</span>
                <span>Return here and sign in</span>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => router.push('/sign-in')}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
            >
              Go to Sign In
            </button>
            <Link
              href="/resend-verification"
              className="block w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-semibold transition text-center"
            >
              Resend Verification Email
            </Link>
          </div>

          <p className="text-center text-gray-500 text-xs mt-4">
            Verification link expires in 24 hours
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <Image 
              src="/imgs/GymHub_Logo.png" 
              alt="GymHub Logo" 
              width={200} 
              height={100}
              className="object-contain mx-auto"
            />
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mt-4">Register Your Club</h1>
          <p className="text-gray-600 mt-2">Step {step} of 4</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 flex gap-2">
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className={`flex-1 h-2 rounded-full ${i <= step ? 'bg-blue-600' : 'bg-gray-200'}`}
            />
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Step 1: Club Information */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Club Information</h2>
              <div>
                <label className="block text-gray-900 font-medium mb-2">Club Name</label>
                <input
                  type="text"
                  name="clubName"
                  value={formData.clubName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., Elite Gymnastics Club"
                />
              </div>
              <div>
                <label className="block text-gray-900 font-medium mb-2">Club Domain</label>
                <input
                  type="text"
                  name="clubDomain"
                  value={formData.clubDomain}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., contoso.com"
                />
                <p className="text-sm text-gray-600 mt-2">Enter your organization's domain name (e.g., contoso.com)</p>
              </div>
              <div>
                <label className="block text-gray-900 font-medium mb-2">ABN (Australian Business Number) <span className="text-gray-600 font-normal">- Optional</span></label>
                <input
                  type="text"
                  name="abn"
                  value={formData.abn}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., 12 345 678 901"
                />
              </div>
            </div>
          )}

          {/* Step 2: Address Information */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Club Location</h2>
              <div>
                <label className="block text-gray-900 font-medium mb-2">Street Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., 123 Gymnastics Lane"
                />
              </div>
              <div>
                <label className="block text-gray-900 font-medium mb-2">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., Sydney"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-900 font-medium mb-2">State</label>
                  <select
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:border-blue-500 focus:outline-none"
                  >
                    {australianStates.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-900 font-medium mb-2">Postal Code</label>
                  <input
                    type="text"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                    placeholder="e.g., 2000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-900 font-medium mb-2">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., +61 2 9000 0000"
                />
              </div>
            </div>
          )}

          {/* Step 3: Admin Account */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Admin Account Setup</h2>
              <div>
                <label className="block text-gray-900 font-medium mb-2">Full Name</label>
                <input
                  type="text"
                  name="adminFullName"
                  value={formData.adminFullName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., John Smith"
                />
              </div>
              <div>
                <label className="block text-gray-900 font-medium mb-2">Email Address</label>
                <input
                  type="email"
                  name="adminEmail"
                  value={formData.adminEmail}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., admin@example.com"
                />
                <p className="text-sm text-gray-600 mt-2">Use your club domain email for quick verification.</p>
              </div>
              <div>
                <label className="block text-gray-900 font-medium mb-2">Username</label>
                <div className="relative">
                  <input
                    type="text"
                    name="adminUsername"
                    value={formData.adminUsername}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none pr-32"
                    placeholder="e.g., Admin"
                    style={{ paddingRight: formData.clubDomain ? `${(normalizeDomainForDisplay(formData.clubDomain).length + 1) * 9 + 16}px` : '16px' }}
                  />
                  {formData.clubDomain && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none select-none">
                      @{normalizeDomainForDisplay(formData.clubDomain)}
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-2">You'll use this to sign in (with your domain).</p>
              </div>
              <div>
                <label className="block text-gray-900 font-medium mb-2">Password</label>
                <input
                  type="password"
                  name="adminPassword"
                  value={formData.adminPassword}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  placeholder="••••••••"
                />
                <p className="text-sm text-gray-600 mt-2">At least 8 characters, with uppercase, lowercase, and number.</p>
              </div>
            </div>
          )}

          {/* Step 4: Review & Confirm */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Review & Confirm</h2>
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <div>
                  <p className="text-gray-600 text-sm">Club Name</p>
                  <p className="text-gray-900 font-semibold">{formData.clubName}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Location</p>
                  <p className="text-gray-900 font-semibold">{formData.city}, {formData.state} {formData.postalCode}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Admin Email</p>
                  <p className="text-gray-900 font-semibold">{formData.adminEmail}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Admin Username</p>
                  <p className="text-gray-900 font-semibold">{formData.adminUsername}@{normalizeDomainForDisplay(formData.clubDomain)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  name="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onChange={handleInputChange}
                  className="mt-1 w-4 h-4 bg-white border border-gray-300 rounded cursor-pointer"
                />
                <label className="text-gray-700 text-sm">
                  I agree to the{' '}
                  <Link href="#" className="text-blue-600 hover:text-blue-700">
                    Terms and Conditions
                  </Link>{' '}
                  and{' '}
                  <Link href="#" className="text-blue-600 hover:text-blue-700">
                    Privacy Policy
                  </Link>
                </label>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-4 mt-8">
            {step > 1 && (
              <button
                type="button"
                onClick={handlePreviousStep}
                className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-semibold transition"
              >
                Previous
              </button>
            )}
            {step < 4 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-semibold transition"
              >
                {loading ? 'Registering...' : 'Complete Registration'}
              </button>
            )}
          </div>
        </form>

        {/* Sign In Link */}
        <p className="text-center text-gray-600 mt-6">
          Already have an account?{' '}
          <Link href="/sign-in" className="text-blue-600 hover:text-blue-700">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'

interface PasswordVerificationModalProps {
  isOpen: boolean
  onClose: () => void
  onVerified: (password: string) => void
  title: string
  description: string
  confirmLabel?: string
}

export default function PasswordVerificationModal({
  isOpen,
  onClose,
  onVerified,
  title,
  description,
  confirmLabel = 'Confirm',
}: PasswordVerificationModalProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) {
      setError('Password is required')
      return
    }
    setError('')
    onVerified(password)
    setPassword('')
  }

  const handleClose = () => {
    setPassword('')
    setError('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-4">{description}</p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="verify-password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="verify-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your password"
              autoFocus
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
            >
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

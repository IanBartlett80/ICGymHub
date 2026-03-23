'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface PasswordVerificationModalProps {
  isOpen: boolean
  onClose: () => void
  onVerify: (password: string) => void
  title: string
  message: string
  confirmButtonText?: string
  confirmButtonColor?: string
  requireConfirmation?: boolean
  confirmationText?: string
  confirmationPlaceholder?: string
  loading?: boolean
}

export default function PasswordVerificationModal({
  isOpen,
  onClose,
  onVerify,
  title,
  message,
  confirmButtonText = 'Confirm',
  confirmButtonColor = 'bg-red-600 hover:bg-red-700',
  requireConfirmation = false,
  confirmationText = '',
  confirmationPlaceholder = 'Type to confirm',
  loading = false,
}: PasswordVerificationModalProps) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!password) {
      setError('Password is required')
      return
    }

    if (requireConfirmation && confirmation !== confirmationText) {
      setError('Confirmation text does not match')
      return
    }

    onVerify(password)
  }

  const handleClose = () => {
    if (!loading) {
      setPassword('')
      setConfirmation('')
      setError('')
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="text-sm text-gray-600">
            {message}
          </div>

          {requireConfirmation && (
            <div>
              <label htmlFor="confirmation" className="block text-sm font-medium text-gray-700 mb-2">
                Confirmation
              </label>
              <input
                type="text"
                id="confirmation"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder={confirmationPlaceholder}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Type <strong>{confirmationText}</strong> to confirm
              </p>
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Your Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
              required
              autoFocus
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed ${confirmButtonColor}`}
            >
              {loading ? 'Processing...' : confirmButtonText}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

'use client'

import Image from 'next/image'

export default function AccountDeletedPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl p-8 shadow-sm text-center">
        <div className="mb-6">
          <Image
            src="/imgs/GymHub_Logo.png"
            alt="GymHub Logo"
            width={160}
            height={80}
            className="object-contain mx-auto"
          />
        </div>

        <div className="text-5xl mb-4">👋</div>

        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Sorry to See You Leave
        </h1>

        <p className="text-gray-600 mb-2">
          Your club profile has been deleted successfully.
        </p>
        <p className="text-gray-500 text-sm mb-8">
          All club data has been permanently removed. If you ever want to come back, you&apos;re welcome to register again at any time.
        </p>

        <a
          href="https://gymhub.club"
          className="inline-block w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
        >
          OK
        </a>
      </div>
    </div>
  )
}

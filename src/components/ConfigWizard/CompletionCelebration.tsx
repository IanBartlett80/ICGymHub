'use client'

import { useEffect } from 'react'
import { CheckCircle, Sparkles } from 'lucide-react'
import type { WizardData } from './ConfigWizard'

interface CompletionCelebrationProps {
  data: WizardData
  onFinish: () => void
}

export default function CompletionCelebration({ data, onFinish }: CompletionCelebrationProps) {
  useEffect(() => {
    // Confetti animation (placeholder for future enhancement)
    const duration = 3000
    const animationEnd = Date.now() + duration

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        return clearInterval(interval)
      }

      // Create confetti particles (simplified version - you can use a library like canvas-confetti)
      // For now, we'll just show the success message
    }, 250)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 animate-fadeIn">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-12 text-center animate-scaleIn">
        {/* Success icon with animation */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <CheckCircle className="w-24 h-24 text-green-500 animate-bounce" />
            <Sparkles className="w-8 h-8 text-yellow-400 absolute -top-2 -right-2 animate-pulse" />
          </div>
        </div>

        {/* Success message */}
        <h2 className="text-4xl font-bold text-gray-900 mb-4">
          🎉 Setup Complete!
        </h2>
        <p className="text-lg text-gray-600 mb-8">
          Congratulations! Your club is now configured and ready to use.
        </p>

        {/* Summary of what was configured */}
        <div className="bg-blue-50 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-4">What you've set up:</h3>
          <div className="grid grid-cols-2 gap-4 text-left">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-gray-700">
                {data.venuesCount} Venue{data.venuesCount !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-gray-700">
                {data.gymsportsCount} Gym Sport{data.gymsportsCount !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-gray-700">
                {data.zonesCount} Zone{data.zonesCount !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-gray-700">
                {data.coachesCount} Coach{data.coachesCount !== 1 ? 'es' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Next steps */}
        <div className="text-left bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-3">What's next?</h3>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Create your first class template in <strong>Roster Config</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Start building class rosters in <strong>Rosters</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Set up equipment tracking in <strong>Equipment</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Configure compliance items in <strong>Compliance Manager</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Report and track injuries in <strong>Injuries & Incidents</strong></span>
            </li>
          </ul>
        </div>

        {/* Finish button */}
        <button
          onClick={onFinish}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-lg transition-colors shadow-lg hover:shadow-xl"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  )
}

'use client'

import { Check } from 'lucide-react'

interface WizardProgressProps {
  currentStep: number
  totalSteps: number
  completedSteps: number[]
  steps: string[]
}

export default function WizardProgress({ currentStep, totalSteps, completedSteps, steps }: WizardProgressProps) {
  const progressPercentage = (currentStep / totalSteps) * 100

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-8 py-6 border-b border-gray-200">
      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Step {currentStep} of {totalSteps}
          </span>
          <span className="text-sm text-gray-500">
            {completedSteps.length} completed
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex justify-between items-center">
        {steps.map((stepName, index) => {
          const stepNumber = index + 1
          const isCompleted = completedSteps.includes(stepNumber)
          const isCurrent = currentStep === stepNumber
          const isPast = stepNumber < currentStep

          return (
            <div key={stepNumber} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300
                    ${isCurrent ? 'bg-blue-600 text-white scale-110 shadow-lg' : ''}
                    ${isCompleted ? 'bg-green-500 text-white' : ''}
                    ${!isCurrent && !isCompleted && !isPast ? 'bg-gray-200 text-gray-500' : ''}
                    ${isPast && !isCompleted ? 'bg-blue-300 text-white' : ''}
                  `}
                >
                  {isCompleted ? <Check size={16} /> : stepNumber}
                </div>
                <span className={`
                  text-xs mt-1 text-center
                  ${isCurrent ? 'text-blue-600 font-semibold' : 'text-gray-600'}
                `}>
                  {stepName}
                </span>
              </div>
              {stepNumber < totalSteps && (
                <div className={`
                  flex-1 h-0.5 mx-2 transition-all duration-300
                  ${stepNumber < currentStep || isCompleted ? 'bg-blue-500' : 'bg-gray-300'}
                `} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

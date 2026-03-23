'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface WizardNavigationProps {
  currentStep: number
  totalSteps: number
  onBack: () => void
  onNext: () => void
  onSkip: () => void
  isStepComplete: boolean
  canSkipStep?: boolean
}

export default function WizardNavigation({
  currentStep,
  totalSteps,
  onBack,
  onNext,
  onSkip,
  isStepComplete,
  canSkipStep = true,
}: WizardNavigationProps) {
  const isFirstStep = currentStep === 1
  const isLastStep = currentStep === totalSteps

  return (
    <div className="bg-gray-50 px-8 py-4 border-t border-gray-200 flex justify-between items-center">
      {/* Skip button - only shown on skippable steps */}
      {canSkipStep ? (
        <button
          onClick={onSkip}
          className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
        >
          Skip for now
        </button>
      ) : (
        <div />
      )}

      {/* Navigation buttons */}
      <div className="flex items-center gap-3">
        {!isStepComplete && !isLastStep && (
          <span className="text-sm text-amber-600 mr-2">
            Complete this step to continue
          </span>
        )}

        {/* Back button */}
        {!isFirstStep && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors"
          >
            <ChevronLeft size={18} />
            Back
          </button>
        )}

        {/* Next/Finish button */}
        <button
          onClick={onNext}
          className={`
            flex items-center gap-2 px-6 py-2.5 font-medium rounded-lg transition-all
            ${isStepComplete 
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
          disabled={!isStepComplete}
        >
          {isLastStep ? 'Finish Setup' : 'Continue'}
          {!isLastStep && <ChevronRight size={18} />}
        </button>
      </div>
    </div>
  )
}

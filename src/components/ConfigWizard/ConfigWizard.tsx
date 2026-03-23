'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import WizardProgress from './WizardProgress'
import WizardNavigation from './WizardNavigation'
import Step0ClubSettings from './steps/Step0ClubSettings'
import Step1Venues from './steps/Step1Venues'
import Step2Gymsports from './steps/Step2Gymsports'
import Step3Zones from './steps/Step3Zones'
import Step4Coaches from './steps/Step4Coaches'
import CompletionCelebration from './CompletionCelebration'

interface ConfigWizardProps {
  isOpen: boolean
  onClose: () => void
  initialStep?: number
}

export type WizardData = {
  venuesCount: number
  gymsportsCount: number
  zonesCount: number
  coachesCount: number
}

export default function ConfigWizard({ isOpen, onClose, initialStep = 1 }: ConfigWizardProps) {
  const [currentStep, setCurrentStep] = useState(initialStep)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [isCompleted, setIsCompleted] = useState(false)
  const [wizardData, setWizardData] = useState<WizardData>({
    venuesCount: 0,
    gymsportsCount: 0,
    zonesCount: 0,
    coachesCount: 0,
  })

  // Save progress to localStorage
  useEffect(() => {
    if (isOpen) {
      localStorage.setItem('gymhub_wizard_progress', JSON.stringify({
        currentStep,
        completedSteps,
        lastUpdated: new Date().toISOString(),
      }))
    }
  }, [currentStep, completedSteps, isOpen])

  // Load progress from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('gymhub_wizard_progress')
    if (saved) {
      try {
        const { currentStep: savedStep, completedSteps: savedCompleted } = JSON.parse(saved)
        if (savedStep) setCurrentStep(savedStep)
        if (savedCompleted) setCompletedSteps(savedCompleted)
      } catch (e) {
        console.error('Failed to parse wizard progress', e)
      }
    }
  }, [])

  const handleNext = () => {
    if (currentStep < 5) {
      if (!completedSteps.includes(currentStep)) {
        setCompletedSteps([...completedSteps, currentStep])
      }
      setCurrentStep(currentStep + 1)
    } else {
      // Final step completed
      if (!completedSteps.includes(5)) {
        setCompletedSteps([...completedSteps, 5])
      }
      setIsCompleted(true)
      localStorage.setItem('gymhub_wizard_completed', 'true')
      localStorage.setItem('gymhub_wizard_completed_at', new Date().toISOString())
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    localStorage.setItem('gymhub_wizard_dismissed', 'true')
    localStorage.setItem('gymhub_wizard_dismissed_at', new Date().toISOString())
    onClose()
  }

  const handleStepComplete = (stepNumber: number, data?: Partial<WizardData>) => {
    if (data) {
      setWizardData({ ...wizardData, ...data })
    }
    if (!completedSteps.includes(stepNumber)) {
      setCompletedSteps([...completedSteps, stepNumber])
    }
  }

  const handleFinish = () => {
    localStorage.removeItem('gymhub_wizard_progress')
    onClose()
    // Navigate to dashboard
    window.location.href = '/dashboard'
  }

  if (!isOpen) return null

  // Show completion celebration
  if (isCompleted) {
    return (
      <CompletionCelebration
        data={wizardData}
        onFinish={handleFinish}
      />
    )
  }

  const steps = [
    {
      number: 1,
      title: 'Club Settings',
      component: <Step0ClubSettings onComplete={(data: Partial<WizardData>) => handleStepComplete(1, data)} />,
    },
    {
      number: 2,
      title: 'Venues',
      component: <Step1Venues onComplete={(data: Partial<WizardData>) => handleStepComplete(2, data)} />,
    },
    {
      number: 3,
      title: 'Gym Sports',
      component: <Step2Gymsports onComplete={(data: Partial<WizardData>) => handleStepComplete(3, data)} />,
    },
    {
      number: 4,
      title: 'Gym Zones',
      component: <Step3Zones onComplete={(data: Partial<WizardData>) => handleStepComplete(4, data)} />,
    },
    {
      number: 5,
      title: 'Coaches',
      component: <Step4Coaches onComplete={(data: Partial<WizardData>) => handleStepComplete(5, data)} />,
    },
  ]

  const currentStepData = steps[currentStep - 1]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 animate-fadeIn">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-scaleIn">
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-600 transition-colors"
          title="Close wizard"
        >
          <X size={24} />
        </button>

        {/* Progress bar */}
        <WizardProgress
          currentStep={currentStep}
          totalSteps={5}
          completedSteps={completedSteps}
          steps={steps.map(s => s.title)}
        />

        {/* Step content */}
        <div className="p-8 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-semibold">
                {currentStep}
              </span>
              <h2 className="text-3xl font-bold text-gray-900">
                {currentStepData.title}
              </h2>
            </div>
          </div>

          {/* Render current step */}
          {currentStepData.component}
        </div>

        {/* Navigation */}
        <WizardNavigation
          currentStep={currentStep}
          totalSteps={5}
          onBack={handleBack}
          onNext={handleNext}
          onSkip={handleSkip}
          isStepComplete={completedSteps.includes(currentStep)}
          canSkipStep={currentStep === 5}
        />
      </div>
    </div>
  )
}

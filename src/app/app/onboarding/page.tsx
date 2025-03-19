'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { useOnboarding } from '@/context/onboarding-context'
import logger from '@/utils/logger'
import WelcomeStep from '@/components/onboarding/WelcomeStep'
import LanguageSelectionStep from '@/components/onboarding/LanguageSelectionStep'
import LearningPurposeStep from '@/components/onboarding/LearningPurposeStep'
import ProficiencyStep from '@/components/onboarding/ProficiencyStep'
import AssessmentStep from '@/components/onboarding/AssessmentStep'

export default function OnboardingPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { isOnboardingComplete, markStepComplete, loading, getOnboarding } = useOnboarding()
  const [currentStep, setCurrentStep] = useState<string>('welcome')
  const [formData, setFormData] = useState({
    nativeLanguage: '',
    targetLanguage: '',
    learningPurpose: '',
    proficiencyLevel: ''
  })

  // Rehydrate state from onboarding session
  useEffect(() => {
    const fetchOnboardingData = async () => {
      try {
        const onboarding = await getOnboarding()
        if (onboarding) {
          // Update form data
          setFormData({
            nativeLanguage: onboarding.nativeLanguage || '',
            targetLanguage: onboarding.targetLanguage || '',
            learningPurpose: onboarding.learningPurpose || '',
            proficiencyLevel: onboarding.proficiencyLevel || ''
          })

          // Determine current step based on completed steps
          const steps = ['welcome', 'languages', 'purpose', 'proficiency', 'assessment']
          const completedSteps = Object.keys(onboarding.steps || {})
          const lastCompletedStep = completedSteps[completedSteps.length - 1]
          
          if (lastCompletedStep) {
            const nextStep = getNextStep(lastCompletedStep)
            setCurrentStep(nextStep)
          }
        }
      } catch (error) {
        logger.error('Error fetching onboarding data:', error)
      }
    }

    fetchOnboardingData()
  }, [getOnboarding])

  // Check if onboarding is complete
  useEffect(() => {
    if (isOnboardingComplete && user) {
      router.push('/app/lessons')
    }
  }, [isOnboardingComplete, user, router])

  const handleNextStep = async (step: string, data?: any) => {
    if (data) {
      setFormData(prev => ({ ...prev, ...data }))
    }
    
    try {
      await markStepComplete(step)
      setCurrentStep(getNextStep(step))
    } catch (error) {
      logger.error('Error moving to next step:', error)
    }
  }

  const getNextStep = (currentStep: string): string => {
    const steps = ['welcome', 'languages', 'purpose', 'proficiency', 'assessment']
    const currentIndex = steps.indexOf(currentStep)
    return steps[currentIndex + 1] || 'assessment'
  }

  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return <WelcomeStep onNext={() => handleNextStep('welcome')} loading={loading} />
      case 'languages':
        return (
          <LanguageSelectionStep 
            onNext={(data) => handleNextStep('languages', data)} 
            formData={formData}
            loading={loading} 
          />
        )
      case 'purpose':
        return (
          <LearningPurposeStep 
            onNext={(data) => handleNextStep('purpose', data)} 
            formData={formData}
            loading={loading} 
          />
        )
      case 'proficiency':
        return (
          <ProficiencyStep 
            onNext={(data) => handleNextStep('proficiency', data)} 
            formData={formData}
            loading={loading} 
          />
        )
      case 'assessment':
        return <AssessmentStep onComplete={() => router.push('/app/lessons')} loading={loading} />
      default:
        return <WelcomeStep onNext={() => handleNextStep('welcome')} loading={loading} />
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {renderStep()}
      </div>
    </div>
  )
} 
import React, { useState, useEffect } from 'react'
import { useOnboarding } from '@/context/onboarding-context'
import { AssessmentLesson, OnboardingModel } from '@/models/AppAllModels.model'
import ChatAssessment from '@/components/onboarding/ChatAssessments'
import { toast } from 'react-hot-toast'

interface AssessmentStepProps {
  onComplete: () => void
  loading: boolean
  targetLanguage: string
}

export default function AssessmentStep({ onComplete, loading, targetLanguage }: AssessmentStepProps) {
  const { getAssessmentLessons, completeAssessmentLesson, completeOnboardingWithLessons } = useOnboarding()
  const [lessons, setLessons] = useState<AssessmentLesson[]>([])
  const [usingChat, setUsingChat] = useState(true) // Default to chat interface
  const [isCompleting, setIsCompleting] = useState(false)

  useEffect(() => {
    const fetchLessons = async () => {
      const assessmentLessons = await getAssessmentLessons()
      setLessons(assessmentLessons)
    }
    
    fetchLessons()
  }, [])

  const handleLessonComplete = async (lessonId: string, userResponse: string) => {
    await completeAssessmentLesson(lessonId, userResponse)
  }

  const handleComplete = async () => {
    setIsCompleting(true)
    try {
      await completeOnboardingWithLessons()
      onComplete()
    } catch (error) {
      toast.error('Something went wrong completing your assessment')
    } finally {
      setIsCompleting(false)
    }
  }

  if (lessons.length === 0) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin mr-3 h-5 w-5 text-accent-6">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <span className="text-neutral-9">Loading assessment...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-center mb-6">
        <div className="inline-flex rounded-md shadow-sm" role="group">
          <button
            type="button"
            onClick={() => setUsingChat(true)}
            className={`px-4 py-2 text-sm font-medium border transition-colors ${
              usingChat 
                ? 'bg-accent-6 text-neutral-1 border-accent-6' 
                : 'bg-neutral-1 text-neutral-9 border-neutral-5 hover:bg-neutral-2'
            } rounded-l-md focus:z-10 focus:ring-2 focus:ring-accent-6 focus:outline-none`}
          >
            Chat Mode
          </button>
          <button
            type="button"
            onClick={() => setUsingChat(false)}
            className={`px-4 py-2 text-sm font-medium border transition-colors ${
              !usingChat 
                ? 'bg-accent-6 text-neutral-1 border-accent-6' 
                : 'bg-neutral-1 text-neutral-9 border-neutral-5 hover:bg-neutral-2'
            } rounded-r-md focus:z-10 focus:ring-2 focus:ring-accent-6 focus:outline-none`}
          >
            Standard Mode
          </button>
        </div>
      </div>

      {usingChat ? (
        <ChatAssessment 
          lessons={lessons}
          onComplete={handleComplete}
          onLessonComplete={handleLessonComplete}
          loading={loading || isCompleting}
          targetLanguage={targetLanguage}
        />
      ) : (
        // Original assessment UI code with updated styling
        <div className="space-y-6 bg-neutral-2 p-4 rounded-lg border border-neutral-4">
          <div className="text-center py-8">
            <p className="text-neutral-8">Standard assessment interface has been replaced with Chat Mode</p>
            <button
              onClick={() => setUsingChat(true)}
              className="mt-4 py-2 px-4 bg-accent-6 text-neutral-1 rounded-md transition-colors hover:bg-accent-7
                        focus:outline-none focus:ring-2 focus:ring-accent-8 focus:ring-offset-2 text-sm font-medium"
            >
              Switch to Chat Mode
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
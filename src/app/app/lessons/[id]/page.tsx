'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useLesson } from '@/context/lesson-context'
import { useOnboarding } from '@/context/onboarding-context'
import { LessonModel, LessonStep } from '@/models/AppAllModels.model'
import LessonChat from '@/components/lessons/lessonChat'
import logger from '@/utils/logger'

export default function LessonDetailPage() {
  const router = useRouter()
  const { id } = useParams()

  const { onboarding } = useOnboarding()
  const { getLessonById, completeLesson, recordStepAttempt, loading } = useLesson()
  const [lesson, setLesson] = useState<LessonModel | null>(null)

  useEffect(() => {
    const init = async () => {
      logger.info('init', { id })
      const fetchedLesson = await getLessonById(id as string)
      setLesson(fetchedLesson)
    }
    init()
  }, [id])

  const handleStepComplete = async (step: LessonStep, userResponse: string) => {
    // todo: improve this
    // Fix comparison to use translation instead of content

    logger.info('handleStepComplete', { step, userResponse })
    if(!userResponse) {
      throw new Error('there is no response')
    }
    if(userResponse.length < 3) {
      throw new Error('the response is too short')
    }

    const correct = userResponse.trim().toLowerCase() === 
      (step.translation as string).trim().toLowerCase()

    // Add error handling and use step.stepNumber for updates
    try {
        await recordStepAttempt(lesson!.id, String(step.stepNumber), { userResponse, correct })
        
        setLesson(prev => prev ? {
            ...prev,
            steps: prev.steps.map(s => 
                s.stepNumber === step.stepNumber ? { ...s, userResponse } : s
            )
        } : null)
    } catch (error) {
      logger.error("Failed to record step attempt:", error)
    }
  }

  const handleLessonComplete = async () => {
    if (lesson) {
      await completeLesson(lesson.id)
      router.push('/app/lessons')
    }
  }

  if (!lesson || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black mb-4"></div>
        <p className="text-xl">Loading lesson...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <LessonChat
        lesson={lesson}
        onComplete={handleLessonComplete}
        onStepComplete={handleStepComplete}
        loading={loading}
        targetLanguage={onboarding?.targetLanguage || 'English'}
      />
    </div>
  )
}
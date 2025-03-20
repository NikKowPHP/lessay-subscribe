'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { useLesson } from '@/context/lesson-context'
import { useOnboarding } from '@/context/onboarding-context'
import { LessonModel, LessonStep } from '@/models/AppAllModels.model'
import LessonChat from '@/components/lessons/lessonChat'

export default function LessonDetailPage() {
  const router = useRouter()
  const { id } = useParams()

  const { onboarding } = useOnboarding()
  const {  getLessonById, completeLesson, loading } = useLesson()
  const [lesson, setLesson] = useState<LessonModel | null>(null)

  useEffect(() => {
    const init = async () => {
      const fetchedLesson = await getLessonById(id as string)
      setLesson(fetchedLesson)
    }
    init()
  }, [id])

  const handleStepComplete = async (step: LessonStep, userResponse: string) => {
    // Update step with user response
    const updatedSteps = lesson?.sequence?.map(s => 
      s.step === step.step ? { ...s, userResponse } : s
    ) || []
    
    setLesson(prev => prev ? { ...prev, sequence: updatedSteps } : null)
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
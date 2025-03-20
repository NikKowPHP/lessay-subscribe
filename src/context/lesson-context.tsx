'use client'

import { createContext, useContext, useState } from 'react'
import { getLessonsAction, getLessonByIdAction, createLessonAction, updateLessonAction, completeLessonAction, deleteLessonAction, recordStepAttemptAction, getStepHistoryAction } from '@/lib/server-actions/lesson-actions'
import logger from '@/utils/logger'
import { LessonModel, LessonStep } from '@/models/AppAllModels.model'
import toast from 'react-hot-toast'

interface LessonContextType {
  currentLesson: LessonModel | null
  lessons: LessonModel[]
  loading: boolean
  error: string | null
  clearError: () => void
  getLessons: () => Promise<LessonModel[]>
  getLessonById: (lessonId: string) => Promise<LessonModel | null>
  createLesson: (lessonData: {
    focusArea: string
    targetSkills: string[]
    steps: LessonStep[]
  }) => Promise<LessonModel>
  updateLesson: (lessonId: string, lessonData: Partial<LessonModel>) => Promise<LessonModel>
  completeLesson: (lessonId: string, performanceMetrics?: {
    accuracy?: number
    pronunciationScore?: number
    errorPatterns?: string[]
  }) => Promise<LessonModel>
  deleteLesson: (lessonId: string) => Promise<void>
  recordStepAttempt: (lessonId: string, stepId: string, data: {
    userResponse: string
    correct: boolean
    errorPatterns?: string[]
  }) => Promise<LessonStep>
  getStepHistory: (lessonId: string, stepId: string) => Promise<LessonStep[]>
  setCurrentLesson: (lesson: LessonModel | null) => void
}

const LessonContext = createContext<LessonContextType | undefined>(undefined)

export function LessonProvider({ children }: { children: React.ReactNode }) {
  const [currentLesson, setCurrentLesson] = useState<LessonModel | null>(null)
  const [lessons, setLessons] = useState<LessonModel[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Helper method to handle async operations with loading and error states
  const withLoadingAndErrorHandling = async <T,>(operation: () => Promise<T>): Promise<T> => {
    setLoading(true)
    try {
      return await operation()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred'
      setError(message)
      logger.error(message)
      toast.error(message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const getLessons = async () => {
    return withLoadingAndErrorHandling(async () => {
      const fetchedLessons = await getLessonsAction()
      setLessons(fetchedLessons)
      return fetchedLessons
    })
  }

  const getLessonById = async (lessonId: string) => {
    return withLoadingAndErrorHandling(async () => {
      const lesson = await getLessonByIdAction(lessonId)
      if (lesson) {
        setCurrentLesson(lesson)
      }
      return lesson
    })
  }

  const createLesson = async (lessonData: {
    focusArea: string
    targetSkills: string[]
    steps: LessonStep[]
  }) => {
    return withLoadingAndErrorHandling(async () => {
      const newLesson = await createLessonAction(lessonData)
      setLessons(prevLessons => [newLesson, ...prevLessons])
      setCurrentLesson(newLesson)
      return newLesson
    })
  }

  const updateLesson = async (lessonId: string, lessonData: Partial<LessonModel>) => {
    return withLoadingAndErrorHandling(async () => {
      const updatedLesson = await updateLessonAction(lessonId, lessonData)
      setLessons(prevLessons => 
        prevLessons.map(lesson => 
          lesson.id === lessonId ? updatedLesson : lesson
        )
      )
      if (currentLesson?.id === lessonId) {
        setCurrentLesson(updatedLesson)
      }
      return updatedLesson
    })
  }

  const completeLesson = async (lessonId: string, performanceMetrics?: {
    accuracy?: number
    pronunciationScore?: number
    errorPatterns?: string[]
  }) => {
    return withLoadingAndErrorHandling(async () => {
      const completedLesson = await completeLessonAction(lessonId, performanceMetrics)
      setLessons(prevLessons => 
        prevLessons.map(lesson => 
          lesson.id === lessonId ? completedLesson : lesson
        )
      )
      if (currentLesson?.id === lessonId) {
        setCurrentLesson(completedLesson)
      }
      return completedLesson
    })
  }

  const deleteLesson = async (lessonId: string) => {
    return withLoadingAndErrorHandling(async () => {
      await deleteLessonAction(lessonId)
      setLessons(prevLessons => 
        prevLessons.filter(lesson => lesson.id !== lessonId)
      )
      if (currentLesson?.id === lessonId) {
        setCurrentLesson(null)
      }
    })
  }

  const recordStepAttempt = async (
    lessonId: string,
    stepId: string,
    data: { userResponse: string; correct: boolean; errorPatterns?: string[] }
  ) => {
    return withLoadingAndErrorHandling(async () => {
      const updatedStep = await recordStepAttemptAction(lessonId, stepId, data)
      // Optionally update the current lesson’s step response locally:
      setCurrentLesson(prev => {
        if (!prev) return prev
        const updatedsteps = prev?.steps?.map(s =>
          s.stepNumber === updatedStep.stepNumber ? { ...s, ...updatedStep } : s
        )
        return { ...prev, steps: updatedsteps }
      })
      return updatedStep
    })
  }

  const getStepHistory = async (lessonId: string, stepId: string) => {
    return withLoadingAndErrorHandling(async () => {
      const history = await getStepHistoryAction(lessonId, stepId)
      return history
    })
  }
  
  const clearError = () => setError(null)

  return (
    <LessonContext.Provider value={{
      currentLesson,
      lessons,
      loading,
      error,
      clearError,
      getLessons,
      getLessonById,
      createLesson,
      updateLesson,
      completeLesson,
      deleteLesson,
      recordStepAttempt,
      getStepHistory,
      setCurrentLesson
    }}>
      {children}
    </LessonContext.Provider>
  )
}

export const useLesson = () => {
  const context = useContext(LessonContext)
  if (context === undefined) {
    throw new Error('useLesson must be used within a LessonProvider')
  }
  return context
}
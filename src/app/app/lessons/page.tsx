'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { useLesson } from '@/context/lesson-context'
import { useOnboarding } from '@/context/onboarding-context'
import { LessonModel } from '@/models/AppAllModels.model'

export default function LessonsPage() {
  const router = useRouter()
  const { onboarding } = useOnboarding()
  const { lessons, getLessons, loading } = useLesson()
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    const init = async () => {
      // Fetch lessons
      await getLessons()
      setInitialized(true)
    }

    init()
  }, [])

  const handleStartLesson = (lesson: LessonModel) => {
    router.push(`/app/lessons/${lesson.id}`)
  }

  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black mb-4"></div>
        <p className="text-xl">Loading your personalized lessons...</p>
        <p className="text-sm text-gray-500 mt-2">We're preparing content based on your assessment</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Your Lessons</h1>
      
      {lessons.length === 0 ? (
        <div className="text-center py-12 border rounded-lg p-8 bg-gray-50">
          <h2 className="text-2xl font-bold mb-4">Generating Your Personalized Learning Plan</h2>
          <p className="text-xl mb-4">
            Based on your {onboarding?.proficiencyLevel || 'beginner'} proficiency in {onboarding?.targetLanguage || 'your chosen language'}
          </p>
          <div className="animate-pulse bg-gray-200 h-4 w-3/4 mx-auto mb-3 rounded"></div>
          <div className="animate-pulse bg-gray-200 h-4 w-1/2 mx-auto mb-8 rounded"></div>
          <p>We're creating lessons tailored to your goals. Please check back in a few moments.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lessons.map(lesson => (
            <div 
              key={lesson.id} 
              className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-2">{lesson.focusArea}</h2>
                <div className="mb-4">
                  <p className="text-sm text-gray-500">
                    {lesson.targetSkills.join(', ')}
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    lesson.completed ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {lesson.completed ? 'Completed' : 'In Progress'}
                  </span>
                  <button
                    onClick={() => handleStartLesson(lesson)}
                    className="px-4 py-2 bg-black text-white rounded-md hover:bg-black/90 text-sm"
                  >
                    {lesson.completed ? 'Review' : 'Start'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
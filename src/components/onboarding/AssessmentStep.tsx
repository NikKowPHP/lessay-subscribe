import React, { useState, useEffect } from 'react'
import { useOnboarding } from '@/context/onboarding-context'
import { AssessmentLesson } from '@/models/AppAllModels.model'

interface AssessmentStepProps {
  onComplete: () => void
  loading: boolean
}

export default function AssessmentStep({ onComplete, loading }: AssessmentStepProps) {
  const { getAssessmentLessons, completeAssessmentLesson } = useOnboarding()
  const [lessons, setLessons] = useState<AssessmentLesson[]>([])
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0)
  const [userResponse, setUserResponse] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [assessmentComplete, setAssessmentComplete] = useState(false)

  useEffect(() => {
    const fetchLessons = async () => {
      const assessmentLessons = await getAssessmentLessons()
      setLessons(assessmentLessons)
    }
    
    fetchLessons()
  }, [getAssessmentLessons])

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      setFeedback('Voice recognition is not supported in your browser')
      return
    }

    const SpeechRecognition = window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    
    recognition.lang = 'en-US' // Should be dynamic based on target language
    recognition.interimResults = false
    
    recognition.onstart = () => {
      setIsListening(true)
      setFeedback('Listening...')
    }
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setUserResponse(transcript)
      setIsListening(false)
      setFeedback('')
    }
    
    recognition.onerror = (event) => {
      setIsListening(false)
      setFeedback(`Error occurred: ${event.error}`)
    }
    
    recognition.onend = () => {
      setIsListening(false)
    }
    
    recognition.start()
  }

  const handleSubmitResponse = async () => {
    if (!userResponse || currentLessonIndex >= lessons.length) return
    
    const currentLesson = lessons[currentLessonIndex]
    
    try {
      await completeAssessmentLesson(currentLesson.id, userResponse)
      
      if (currentLessonIndex < lessons.length - 1) {
        setCurrentLessonIndex(prevIndex => prevIndex + 1)
        setUserResponse('')
      } else {
        setAssessmentComplete(true)
      }
    } catch (error) {
      setFeedback('Error submitting response')
    }
  }

  if (lessons.length === 0) {
    return <div className="text-center py-6">Loading assessment...</div>
  }

  if (assessmentComplete) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Assessment Complete!</h2>
        <p className="mb-6">Thank you for completing the assessment. We'll prepare your personalized lessons.</p>
        <button
          onClick={onComplete}
          className="px-4 py-2 bg-black text-white rounded-md hover:bg-black/90"
        >
          Continue to Lessons
        </button>
      </div>
    )
  }

  const currentLesson = lessons[currentLessonIndex]

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center">
        Language Assessment - Question {currentLessonIndex + 1}/{lessons.length}
      </h2>
      
      <div className="p-4 border rounded-md bg-gray-50">
        <h3 className="font-medium mb-2">Prompt:</h3>
        <p className="text-lg">{currentLesson.prompt}</p>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Your Response:
          </label>
          <div className="relative">
            <textarea
              value={userResponse}
              onChange={(e) => setUserResponse(e.target.value)}
              className="w-full p-2 border rounded-md"
              rows={3}
              disabled={isListening}
              placeholder="Speak or type your answer here"
            />
          </div>
        </div>
        
        {feedback && (
          <div className="text-sm text-gray-500">{feedback}</div>
        )}
        
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={startListening}
            disabled={isListening || loading}
            className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isListening ? 'Listening...' : 'Use Voice'}
          </button>
          
          <button
            type="button"
            onClick={handleSubmitResponse}
            disabled={!userResponse || isListening || loading}
            className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
          >
            Submit & Continue
          </button>
        </div>
      </div>
      
      <div className="pt-4">
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-black h-2.5 rounded-full" 
            style={{ width: `${((currentLessonIndex + 1) / lessons.length) * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  )
}
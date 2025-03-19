import React, { useState, useEffect, useRef, useMemo } from 'react'
import { AssessmentLesson } from '@/models/AppAllModels.model'
import logger from '@/utils/logger';

// Add this interface at the top of the file
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognition extends EventTarget {
  new (): SpeechRecognition;
  start(): void;
  stop(): void;
  abort(): void;
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    webkitSpeechRecognition: SpeechRecognition;
  }
}

interface ChatAssessmentProps {
  lessons: AssessmentLesson[]
  onComplete: () => void
  onLessonComplete: (lessonId: string, userResponse: string) => Promise<void>
  loading: boolean
}

export default function ChatAssessment({ 
  lessons, 
  onComplete, 
  onLessonComplete, 
  loading 
}: ChatAssessmentProps) {
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0)
  const [userResponse, setUserResponse] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [assessmentComplete, setAssessmentComplete] = useState(false)
  const [chatHistory, setChatHistory] = useState<Array<{type: 'prompt' | 'response', content: string}>>([])
  
  const recognitionRef = useRef<any>(null)
  
  const showMockButtons = useMemo(() => {
    return process.env.NEXT_PUBLIC_MOCK_USER_RESPONSES === 'true'
  }, [])

  // Initialize chat history with current and previous prompts/responses
  useEffect(() => {
    if (lessons.length > 0) {
      // debugger
      logger.info('lessons:', lessons)
      const history: Array<{type: 'prompt' | 'response', content: string}> = []
      
      // Add all previous lessons' prompts and responses
      for (let i = 0; i < lessons.length; i++) {
        const lesson = lessons[i]
        history.push({ type: 'prompt', content: lesson.prompt })
        
        // Add user response if it exists
        if (lesson.userResponse) {
          history.push({ type: 'response', content: lesson.userResponse })
        }
      }
      
      setChatHistory(history)
    }
  }, [lessons ])

  // Set up speech recognition
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window)) {
      setFeedback('Voice recognition is not supported in your browser')
      return
    }

    const SpeechRecognition = window.webkitSpeechRecognition
    recognitionRef.current = new SpeechRecognition()
    
    const recognition = recognitionRef.current
    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.continuous = true
    
    recognition.onstart = () => {
      setIsListening(true)
      setFeedback('Listening...')
    }
    
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0])
        .map((result) => result.transcript)
        .join('');
      
      setUserResponse(transcript)
      
      const currentLesson = lessons[currentLessonIndex]
      if (currentLesson && isResponseCorrect(transcript, currentLesson.modelAnswer)) {
        handleCorrectResponse(currentLesson, transcript)
      }
    }
    
    recognition.onerror = (event: Event) => {
      setIsListening(false)
      setFeedback(`Error occurred: ${(event as ErrorEvent).error}`)
    }
    
    recognition.onend = () => {
      setIsListening(false)
    }
    
    return () => {
      if (recognition) {
        recognition.abort()
      }
    }
  }, [currentLessonIndex, lessons])

  // Check if response is correct (this can be enhanced with more sophisticated matching)
  const isResponseCorrect = (response: string, modelAnswer: string): boolean => {
    // Simple string comparison - this should be more sophisticated in production
    return response.toLowerCase().includes(modelAnswer.toLowerCase())
  }

  const handleCorrectResponse = async (lesson: AssessmentLesson, response: string) => {
    if (isListening) {
      pauseListening()
    }
    
    try {
      await onLessonComplete(lesson.id, response)
      
      // Add response to chat history
      setChatHistory(prev => [...prev, { type: 'response', content: response }])
      
      if (currentLessonIndex < lessons.length - 1) {
        // Move to next lesson
        const nextIndex = currentLessonIndex + 1
        setCurrentLessonIndex(nextIndex)
        setUserResponse('')
        
        // Add next prompt to chat history
        setTimeout(() => {
          setChatHistory(prev => [...prev, { type: 'prompt', content: lessons[nextIndex].prompt }])
          startListening()
        }, 1000)
      } else {
        setAssessmentComplete(true)
      }
    } catch (error) {
      setFeedback('Error processing response')
    }
  }

  const startListening = () => {
    if (!recognitionRef.current) return
    
    try {
      recognitionRef.current.start()
    } catch (error) {
      // Already started error can occur when continuous is true
      console.log('Recognition already started')
    }
  }

  const pauseListening = () => {
    if (!recognitionRef.current) return
    recognitionRef.current.stop()
  }

  const toggleListening = () => {
    if (isListening) {
      pauseListening()
    } else {
      startListening()
    }
  }

  const handleMockResponse = (matchesModel: boolean) => {
    const currentLesson = lessons[currentLessonIndex]
    if (!currentLesson) return
    
    const response = matchesModel ? 
      currentLesson.modelAnswer : 
      'This is a mock response that does not match the model answer'
    
    setUserResponse(response)
    
    if (matchesModel) {
      handleCorrectResponse(currentLesson, response)
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

  return (
    <div className="flex flex-col h-[600px] border rounded-md bg-gray-50 overflow-hidden">
      {/* Chat Header */}
      <div className="p-4 bg-black text-white">
        <h2 className="text-xl font-bold">
          Language Assessment - Question {currentLessonIndex + 1}/{lessons.length}
        </h2>
      </div>
      
      {/* Chat Messages */}
      <div className="flex-grow p-4 overflow-y-auto space-y-4">
        {chatHistory.map((message, index) => (
          <div 
            key={index} 
            className={`flex ${message.type === 'prompt' ? 'justify-start' : 'justify-end'}`}
          >
            <div 
              className={`max-w-[75%] p-3 rounded-lg ${
                message.type === 'prompt' 
                  ? 'bg-gray-200 text-gray-800' 
                  : 'bg-blue-600 text-white'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
      </div>
      
      {/* User Input Area */}
      <div className="border-t p-4 bg-white">
        {/* Real-time Transcription Display */}
        <div className="mb-4 min-h-[60px] p-2 border rounded-md bg-gray-50">
          {userResponse || (isListening ? 'Listening...' : 'Ready to listen')}
        </div>
        
        {feedback && (
          <div className="text-sm text-gray-500 mb-2">{feedback}</div>
        )}

        {/* Mock Response Buttons */}
        {showMockButtons && (
          <div className="flex space-x-2 mb-4">
            <button
              type="button"
              onClick={() => handleMockResponse(true)}
              className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Mock Correct Response
            </button>
            <button
              type="button"
              onClick={() => handleMockResponse(false)}
              className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Mock Incorrect Response
            </button>
          </div>
        )}

        {/* Controls */}
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={toggleListening}
            disabled={loading}
            className={`flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              isListening 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50`}
          >
            {isListening ? 'Pause Listening' : 'Start Listening'}
          </button>
          
          <button
            type="button"
            onClick={() => handleCorrectResponse(lessons[currentLessonIndex], userResponse)}
            disabled={!userResponse || loading}
            className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
          >
            Skip & Continue
          </button>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 h-2">
        <div 
          className="bg-black h-2" 
          style={{ width: `${((currentLessonIndex + 1) / lessons.length) * 100}%` }}
        ></div>
      </div>
    </div>
  )
}
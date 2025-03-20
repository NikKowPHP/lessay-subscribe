import React, { useState, useEffect, useRef, useMemo } from 'react'
import { LessonModel, LessonStep } from '@/models/AppAllModels.model'
import logger from '@/utils/logger'
import { mapLanguageToCode } from '@/utils/map-language-to-code.util'

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

interface LessonChatProps {
  lesson: LessonModel;
  onComplete: () => void;
  onStepComplete: (step: LessonStep, userResponse: string) => Promise<void>;
  loading: boolean;
  targetLanguage: string;
}

export default function LessonChat({
  lesson,
  onComplete,
  onStepComplete,
  loading,
  targetLanguage
}: LessonChatProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [userResponse, setUserResponse] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [chatHistory, setChatHistory] = useState<Array<{ type: 'prompt' | 'response'; content: string }>>([])

  const recognitionRef = useRef<any>(null)
  const chatMessagesRef = useRef<HTMLDivElement>(null)

  // Initialize chat history with the first prompt from the lesson steps
  useEffect(() => {
    if (lesson && lesson.steps && Array.isArray(lesson.steps) && chatHistory.length === 0) {
        const initialHistory: Array<{ type: 'prompt' | 'response'; content: string }> = [];
        
        // Iterate through sorted steps and add prompts + responses
        lesson.steps.forEach(step => {
            // Add prompt
            initialHistory.push({ type: 'prompt', content: step.content as string });
            
            // Add user response if present
            if (step.userResponse) {
                initialHistory.push({ type: 'response', content: step.userResponse });
            }
        });

        setChatHistory(initialHistory);
        const firstIncompleteStepIndex = lesson.steps.findIndex(step => !step.userResponse);
        setCurrentStepIndex(firstIncompleteStepIndex >= 0 ? firstIncompleteStepIndex : lesson.steps.length - 1);
    }
  }, [lesson]);

  // Set up speech recognition
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window)) {
      setFeedback('Voice recognition is not supported in your browser')
      return
    }

    const SpeechRecognition = window.webkitSpeechRecognition
    recognitionRef.current = new SpeechRecognition()

    const recognition = recognitionRef.current
    recognition.lang = mapLanguageToCode(targetLanguage)
    recognition.interimResults = true
    recognition.continuous = true

    recognition.onstart = () => {
      setIsListening(true)
      setFeedback('Listening...')
      logger.info("LessonChat: Speech recognition started")
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0])
        .map((result) => result.transcript)
        .join('');
      setUserResponse(transcript)
      logger.info("LessonChat: Recognized speech", { transcript })

      // For lessons, you might accept any non-empty answer or compare with an expected answer if available.
      const currentStep = lesson.steps[currentStepIndex] as LessonStep
      if (currentStep && currentStep.type === 'prompt' && transcript.trim().length > 3) {
        handleSubmitStep(currentStep, transcript)
      }
    }

    recognition.onerror = (event: Event) => {
      setIsListening(false)
      setFeedback(`Error occurred: ${(event as ErrorEvent).error}`)
      logger.error("LessonChat: Speech recognition error", { error: (event as ErrorEvent).error })
    }

    recognition.onend = () => {
      setIsListening(false)
      logger.info("LessonChat: Speech recognition ended")
    }

    return () => {
      if (recognition) {
        recognition.abort()
      }
    }
  }, [currentStepIndex, lesson, targetLanguage])

  // Scroll to bottom when chat history changes
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight
    }
  }, [chatHistory])

  const handleSubmitStep = async (step: LessonStep, response: string) => {
    if(!response) {
      setFeedback('there is no response')
      throw new Error('there is no response')
    }
    if(response.length < 3) {
      setFeedback('the response is too short')
      throw new Error('the response is too short')
    }
    if (isListening) {
      pauseListening()
    }
    
    try {
      await onStepComplete(step, response)
      
      // Use step.stepNumber instead of index for reliability
      const nextStep = lesson.steps.find(s => s.stepNumber === step.stepNumber + 1)
      
      if (nextStep) {
        setCurrentStepIndex(prev => prev + 1)
        setUserResponse('')
        // Add next prompt immediately
        setChatHistory(prev => [...prev, 
          { type: 'response', content: response },
          { type: 'prompt', content: nextStep.content }
        ])
        startListening()
      } else {
        onComplete()
      }
    } catch (error) {
      setFeedback('Error processing response')
      logger.error("LessonChat: Error completing step", { error })
    }
  }

  const startListening = () => {
    if (!recognitionRef.current) return
    try {
      recognitionRef.current.start()
      logger.info("LessonChat: Start listening")
    } catch (error) {
      logger.warn("LessonChat: Recognition already started")
    }
  }

  const pauseListening = () => {
    if (!recognitionRef.current) return
    recognitionRef.current.stop()
    logger.info("LessonChat: Paused listening")
  }

  const toggleListening = () => {
    if (isListening) {
      pauseListening()
    } else {
      startListening()
    }
  }

  const handleMockResponse = (forStep: boolean) => {
    const currentStep: LessonStep = lesson.steps[currentStepIndex] as LessonStep
    if (!currentStep) return
    const response = forStep
      ? currentStep.content
      : 'This is a mock response different from the expected'
    setUserResponse(response)
    handleSubmitStep(currentStep, response)
  }

  return (
    <div className="flex flex-col h-full border rounded-md bg-gray-50 overflow-hidden">
      {/* Chat Header */}
      <div className="p-4 bg-black text-white">
        <h2 className="text-xl font-bold">
          Lesson: {lesson.focusArea} - Step {currentStepIndex + 1}/{lesson.steps.length}
        </h2>
      </div>
      {/* Chat Messages */}
      <div ref={chatMessagesRef} className="flex-1 p-4 overflow-y-auto space-y-4">
        {chatHistory.map((msg, index) => (
          <div key={index} className={`flex ${msg.type === 'prompt' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[75%] p-3 rounded-lg ${msg.type === 'prompt' ? 'bg-gray-200 text-gray-800' : 'bg-blue-600 text-white'}`}>
              {msg.content}
            </div>
          </div>
        ))}
      </div>
      {/* User Input Area */}
      <div className="border-t p-4 bg-white">
        <div className="mb-4 min-h-[60px] p-2 border rounded-md bg-gray-50">
          {userResponse || (isListening ? 'Listening...' : 'Ready to listen')}
        </div>
        {feedback && (
          <div className="text-sm text-gray-500 mb-2">{feedback}</div>
        )}
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={toggleListening}
            disabled={loading}
            className={`flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${isListening ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50`}
          >
            {isListening ? 'Pause Listening' : 'Start Listening'}
          </button>
          <button
            type="button"
            onClick={() => handleSubmitStep(lesson.steps[currentStepIndex] as LessonStep, userResponse)}
            disabled={!userResponse || loading}
            className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
          >
            Skip & Continue
          </button>
        </div>
        {process.env.NEXT_PUBLIC_MOCK_USER_RESPONSES === 'true' && (
          <div className="flex space-x-2 mt-4">
            <button
              type="button"
              onClick={() => handleMockResponse(true)}
              className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            >
              Mock Correct Response
            </button>
            <button
              type="button"
              onClick={() => handleMockResponse(false)}
              className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
            >
              Mock Incorrect Response
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
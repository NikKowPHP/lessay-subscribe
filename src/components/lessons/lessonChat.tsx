import React, { useState, useEffect, useRef } from 'react';
import {
  AssessmentLesson,
  AssessmentStep,
  LessonModel,
  LessonStep,
} from '@/models/AppAllModels.model';
import logger from '@/utils/logger';
import { mapLanguageToCode } from '@/utils/map-language-to-code.util';
import ChatMessages, { ChatMessage } from './ChatMessages';
import ChatInput from './ChatInput';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

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
  lesson: LessonModel | AssessmentLesson;
  onComplete: () => void;
  onStepComplete: (
    step: LessonStep | AssessmentStep,
    userResponse: string
  ) => Promise<AssessmentStep | LessonStep>;
  loading: boolean;
  targetLanguage: string;
  isAssessment?: boolean; // Add this flag to differentiate between lesson and assessment
}

export default function LessonChat({
  lesson,
  onComplete,
  onStepComplete,
  loading,
  targetLanguage,
  isAssessment = false,
}: LessonChatProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [userResponse, setUserResponse] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
 
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpeechTimestampRef = useRef<number>(0);
  const SILENCE_TIMEOUT_MS = 1000; // 1 second silence detection
  const router = useRouter();
  const recognitionRef = useRef<any>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (
      lesson &&
      lesson.steps &&
      Array.isArray(lesson.steps) &&
      chatHistory.length === 0
    ) {
      const initialHistory: ChatMessage[] = [];

      // Find the last completed step
      let lastCompletedIndex = -1;
      lesson.steps.forEach((step, index) => {
        if (step.userResponse) {
          lastCompletedIndex = index;
        }
      });

      // Add all completed steps with their prompts and responses
      for (let i = 0; i <= lastCompletedIndex; i++) {
        const step = lesson.steps[i];
        initialHistory.push({ type: 'prompt', content: step.content });
        if (step.userResponse) {
          initialHistory.push({ type: 'response', content: step.userResponse });
        }
      }

      // Add only the next uncompleted prompt
      if (lastCompletedIndex + 1 < lesson.steps.length) {
        const nextStep = lesson.steps[lastCompletedIndex + 1];
        initialHistory.push({ type: 'prompt', content: nextStep.content });
      }

      setChatHistory(initialHistory);

      // Set current step index to the first uncompleted step
      const firstIncompleteStepIndex = lesson.steps.findIndex(
        (step) => !step.userResponse
      );
      setCurrentStepIndex(
        firstIncompleteStepIndex >= 0
          ? firstIncompleteStepIndex
          : lesson.steps.length - 1
      );
    }
  }, [lesson]);

  // use effect for logging the user response
  useEffect(() => {
    logger.info('User response:', userResponse);
  }, [userResponse]);

  // Update the speech recognition setup to handle silence detection
  useEffect(() => {
    if (targetLanguage) {
      // Initialize speech recognition
      try {
        if (!('webkitSpeechRecognition' in window)) {
          throw new Error('Speech recognition not supported in this browser');
        }

        const SpeechRecognition = window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.lang = mapLanguageToCode(targetLanguage);
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;

        recognitionRef.current.onstart = () => {
          setIsListening(true);
        };

        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          // Update the last speech timestamp whenever we receive speech
          lastSpeechTimestampRef.current = Date.now();
          
          const result = event.results[event.results.length - 1];
          const transcript = result[0].transcript;
          
          // If we have debounce timer, clear it
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
          }
          
          // Set user response with the transcript
          setUserResponse(transcript);
        };

        recognitionRef.current.onerror = (event: Event) => {
          logger.error('Speech recognition error:', event);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
          
          // Clear the silence timer when recognition ends
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        };
      } catch (error) {
        logger.error('Error initializing speech recognition:', error);
      }
    }

    // Clean up function
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onstart = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
      }
      
      // Clear any remaining timers
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [targetLanguage]);

  // Add this useEffect to handle silence detection
  useEffect(() => {
    // Only set up silence timer if there's a response and we're listening
    logger.info('userResponse', userResponse);
    logger.info('isListening', isListening);
    if (userResponse && userResponse.trim() && isListening) {
      // Clear any existing silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      
      // Set up a new silence timer
      silenceTimerRef.current = setTimeout(() => {
        logger.log('Auto-submitting after silence detection!!!');
        const currentStep = lesson.steps[currentStepIndex] as LessonStep;
        handleSubmitStep(currentStep, userResponse);
      }, SILENCE_TIMEOUT_MS);
    }
    
    // Cleanup function
    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };
  }, [userResponse, isListening]);

  // Update the toggleListening function to handle silence timer
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      
      // Clear the silence timer when manually stopping
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.start();
        
        // Reset the last speech timestamp when starting
        lastSpeechTimestampRef.current = Date.now();
      }
    }
  };

  const handleSubmitStep = async (step: LessonStep, response: string) => {
    try {
      // setFeedback('Processing...');
      logger.info('Processing response:', response);

      // For instruction and summary steps, just acknowledge them without requiring user response
      if (step.type === 'instruction' || step.type === 'summary') {
        // Mark as seen/acknowledged
        await onStepComplete(step, 'Acknowledged');

        // Move to the next step
        const nextStepIndex = currentStepIndex + 1;

        logger.info('all steps ', lesson.steps);

        if (nextStepIndex < lesson.steps.length) {
          setCurrentStepIndex(nextStepIndex);
          const nextStep = lesson.steps[nextStepIndex];

          // Add acknowledgment and next prompt to chat history
          setChatHistory((prev) => [
            ...prev,
            { type: 'response', content: 'OK, got it!' },
            { type: 'prompt', content: nextStep.content },
          ]);

          setUserResponse('');
        } else {
          // If this was the last step, complete the lesson
          onComplete();
        }
        return;
      }

      // Original handling for other step types...
      const updatedStep = await onStepComplete(step, response);
      if (!updatedStep.correct) {
        setFeedback('');
        setUserResponse('');
        return;
      }

      // Use step.stepNumber instead of index for reliability
      const nextStep = lesson.steps.find(
        (s) => s.stepNumber === step.stepNumber + 1
      );


      if (nextStep) {
        setCurrentStepIndex((prev) => prev + 1);
        setUserResponse('');
        // Add next prompt immediately
        setChatHistory((prev) => [
          ...prev,
          { type: 'response', content: response },
          { type: 'prompt', content: nextStep.content },
        ]);
        startListening();
      } else {
        onComplete();
      }
    } catch (error) {
      setFeedback('Error processing response');
      logger.error('LessonChat: Error completing step', { error });
    }
  };

  const startListening = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
      logger.info('LessonChat: Start listening');
    } catch (error) {
      logger.error('LessonChat: Error starting listening', { error });
      logger.warn('LessonChat: Recognition already started');
    }
  };

  const pauseListening = () => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    logger.info('LessonChat: Paused listening');
  };

  // A wrapper to trigger submission from the input component.
  const handleSubmit = () => {
    const currentStep = lesson.steps[currentStepIndex] as LessonStep;
    handleSubmitStep(currentStep, userResponse);
  };

  const handleMockResponse = (forStep: boolean) => {
    const currentStep: LessonStep = lesson.steps[
      currentStepIndex
    ] as LessonStep;
    if (!currentStep) return;
    let expectedResponse;
    if (currentStep.expectedAnswer) {
      expectedResponse = currentStep.expectedAnswer!;
    } else {
      expectedResponse = 'OK, lets continue';
    }

    const response = forStep
      ? expectedResponse
      : 'This is a mock response different from the expected';
    setUserResponse(response);
    handleSubmitStep(currentStep, response);
  };

  // Update the handleUpdateResponse function to pass to ChatInput
  const handleUpdateResponse = (text: string) => {
    setUserResponse(text);
  };

  return (
    lesson && (
      <div className="flex flex-col h-full border rounded-[4px] bg-neutral-2 overflow-hidden">
        {/* Chat Header */}
        <div className="p-4 bg-neutral-12 text-white shrink-0 flex justify-between items-center">
          <button
            onClick={() =>
              router.push(isAssessment ? '/app/onboarding' : '/app/lessons')
            }
            className="flex items-center text-sm font-medium text-white hover:text-neutral-3 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {isAssessment ? 'Back to Assessment' : 'Back to Lessons'}
          </button>
          <h2 className="text-xl font-semibold flex items-center justify-center">
            {isAssessment
              ? 'Language Assessment'
              : `Lesson: ${'focusArea' in lesson ? lesson.focusArea : ''}`}
          </h2>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-neutral-3 h-1.5">
          <div
            className="bg-accent-6 h-1.5 transition-all duration-300"
            style={{
              width: `${((currentStepIndex + 1) / lesson.steps.length) * 100}%`,
            }}
          ></div>
        </div>

        {/* Chat Messages */}
        <div ref={chatMessagesRef} className="flex-1 overflow-y-auto min-h-0">
          <ChatMessages messages={chatHistory} />
        </div>

    

        <ChatInput
          userResponse={userResponse}
          isListening={isListening}
          feedback={feedback}
          onToggleListening={toggleListening}
          onSubmit={handleSubmit}
          disableSubmit={!userResponse || loading}
          onUpdateResponse={handleUpdateResponse}
        />

        {/* Mock buttons */}
        {process.env.NEXT_PUBLIC_MOCK_USER_RESPONSES === 'true' && (
          <div className="flex space-x-2 mt-4 p-4">
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
    )
  );
}

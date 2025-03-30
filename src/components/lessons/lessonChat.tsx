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
  realtimeTranscriptEnabled?: boolean; // Optional feature for assessment mode
}

export default function LessonChat({
  lesson,
  onComplete,
  onStepComplete,
  loading,
  targetLanguage,
  isAssessment = false,
  realtimeTranscriptEnabled = false,
}: LessonChatProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [userResponse, setUserResponse] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [realtimeTranscript, setRealtimeTranscript] = useState('');
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
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

  // Set up speech recognition
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window)) {
      setFeedback('Voice recognition is not supported in your browser');
      return;
    }

    const SpeechRecognition = window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();

    const recognition = recognitionRef.current;
    logger.log('targetLanguage', targetLanguage);
    const languageCode = mapLanguageToCode(targetLanguage);
    logger.log('languageCode', languageCode);
    recognition.lang = languageCode;
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => {
      setIsListening(true);
      setFeedback('Listening...');
      logger.info('LessonChat: Speech recognition started');

      // Reset silence timer for assessment mode
      if (realtimeTranscriptEnabled && silenceTimerRef.current) {
        resetSilenceTimer();
      }
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const speechEvent = event as SpeechRecognitionEvent;
      const transcript = Array.from(speechEvent.results)
        .map((result) => result[0])
        .map((result) => result.transcript)
        .join('');

      setUserResponse(transcript);

      // Debounce the word checking
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        const currentStep = lesson.steps[currentStepIndex];
        if (currentStep && transcript.trim().length > 0) {
          handleSubmitStep(currentStep, transcript);
        }
      }, 1000); // 1 second debounce

      // Set realtime transcript for assessment mode
      if (realtimeTranscriptEnabled) {
        setRealtimeTranscript(transcript);
        resetSilenceTimer();
      }

      logger.info('LessonChat: Recognized speech', { transcript });

      // For lessons, you might accept any non-empty answer or compare with an expected answer if available.
      const currentStep = lesson.steps[currentStepIndex];
      if (
        currentStep &&
        currentStep.type === 'prompt' &&
        transcript.trim().length > 3
      ) {
        handleSubmitStep(currentStep, transcript);
      }
    };

    recognition.onerror = (event: Event) => {
      setIsListening(false);
      setFeedback(`Error occurred: ${(event as ErrorEvent).error}`);
      logger.error('LessonChat: Speech recognition error', {
        error: (event as ErrorEvent).error,
      });
    };

    recognition.onend = () => {
      setIsListening(false);
      logger.info('LessonChat: Speech recognition ended');
    };

    return () => {
      if (recognition) {
        recognition.abort();
      }

      // Clear silence timer on unmount
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, [currentStepIndex, lesson, targetLanguage, realtimeTranscriptEnabled]);

  // Function to reset the silence timer (for assessment mode)
  const resetSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }

    silenceTimerRef.current = setTimeout(() => {
      if (isListening) {
        setRealtimeTranscript('');
        logger.info('Reset transcript due to 4 seconds of silence');
      }
    }, 4000);
  };


  const handleSubmitStep = async (step: LessonStep, response: string) => {
    try {
      setFeedback('Processing...');

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
      logger.warn('LessonChat: Recognition already started');
    }
  };

  const pauseListening = () => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    logger.info('LessonChat: Paused listening');
  };

  const toggleListening = () => {
    if (isListening) {
      pauseListening();
    } else {
      startListening();
    }
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

        {/* Assessment specific realtime transcript display */}
        {/* {realtimeTranscriptEnabled && (
          <div className="mb-4 min-h-[60px] p-3 border border-neutral-5 rounded-md mx-4 bg-neutral-2 text-foreground">
            {realtimeTranscript ||
              (isListening ? (
                <span className="text-accent-6 flex items-center">
                  <svg
                    className="animate-pulse w-4 h-4 mr-2"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                  </svg>
                  Listening...
                </span>
              ) : (
                <span className="text-neutral-8">Ready to speak...</span>
              ))}
          </div>
        )} */}

        {/* User Input Area */}

        <ChatInput
          userResponse={userResponse}
          isListening={isListening}
          feedback={feedback}
          onToggleListening={toggleListening}
          onSubmit={handleSubmit}
          disableSubmit={!userResponse || loading}
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

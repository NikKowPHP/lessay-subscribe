import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AssessmentLesson, AssessmentStep } from '@/models/AppAllModels.model';
import logger from '@/utils/logger';
import { mapLanguageToCode } from '@/utils/map-language-to-code.util';

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

interface AssessmentChatProps {
  lesson: AssessmentLesson;
  onComplete: () => void;
  loading: boolean;
  targetLanguage: string;
  onStepComplete: (step: AssessmentStep, userResponse: string) => Promise<void>;
}

export default function AssessmentChat({
  lesson,
  onComplete,
  loading,
  targetLanguage,
  onStepComplete,
}: AssessmentChatProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [userResponse, setUserResponse] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [assessmentComplete, setAssessmentComplete] = useState(false);
  const [chatHistory, setChatHistory] = useState<
    Array<{ type: 'prompt' | 'response'; content: string }>
  >([]);
  const [realtimeTranscript, setRealtimeTranscript] = useState('');
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const recognitionRef = useRef<any>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  const showMockButtons = useMemo(() => {
    return process.env.NEXT_PUBLIC_MOCK_USER_RESPONSES === 'true';
  }, []);

  // Get current step from the single lesson
  const currentStep = lesson?.steps[currentStepIndex];

  // Rehydrate the entire UI state
  useEffect(() => {
    if (lesson) {
      // Find the first incomplete step
      const firstIncompleteStepIndex = lesson.steps.findIndex(
        (step) => !step.correct && step.attempts < step.maxAttempts
      );
      const stepIndex = firstIncompleteStepIndex !== -1 ? firstIncompleteStepIndex : 0;
      setCurrentStepIndex(stepIndex);

      // Build chat history
      const history: Array<{ type: 'prompt' | 'response'; content: string }> = [];

      // Add all completed steps and the next incomplete one
      for (let i = 0; i <= stepIndex; i++) {
        const step = lesson.steps[i];
        if (step) {
          history.push({ type: 'prompt', content: step.content });

          if (step.userResponse) {
            history.push({ type: 'response', content: step.userResponse });
          }
        }
      }

      setChatHistory(history);

      // Start listening if on an unanswered step
      if (
        lesson.steps[stepIndex] &&
        !lesson.steps[stepIndex].userResponse &&
        recognitionRef.current
      ) {
        startListening();
      }
    }
  }, [lesson]);


  useEffect(() => {

    setupSpeechRecognition()

  }, [currentStepIndex, lesson, targetLanguage])

  // Function to reset the silence timer
  const resetSilenceTimer = () => {
    // Clear any existing timer
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    
    // Set new timer for 4 seconds (4000 ms)
    silenceTimerRef.current = setTimeout(() => {
      if (isListening) {
        setRealtimeTranscript('');
        logger.info('Reset transcript due to 4 seconds of silence');
      }
    }, 4000);
  };

  // Setup speech recognition
  const setupSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window)) {
      logger.error('Speech recognition not supported in this browser');
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = mapLanguageToCode(targetLanguage);
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      logger.info('Speech recognition started');
      setIsListening(true);
      resetSilenceTimer(); // Start the silence timer when recognition starts
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join('');
      
      setRealtimeTranscript(transcript); // Update realtime transcript
      setUserResponse(transcript);
      resetSilenceTimer(); // Reset the timer on new speech
    };

    recognition.onerror = (event) => {
      logger.error('Speech recognition error:', event);
    };

    recognition.onend = () => {
      logger.info('Speech recognition ended');
      setIsListening(false);
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current); // Clear timer when recognition ends
      }
    };

    recognitionRef.current = recognition;
  };

  // Clean up the silence timer on component unmount
  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, []);

  // Scroll to bottom when chat history changes
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // Check if response is correct (this can be enhanced with more sophisticated matching)
  const isResponseCorrect = (
    response: string,
    expectedAnswer: string | null
  ): boolean => {
    if (!expectedAnswer) return true;
    // Simple string comparison - this should be more sophisticated in production
    return response.toLowerCase().includes(expectedAnswer.toLowerCase());
  };

  const handleSubmit = async (
    step: AssessmentStep,
    response: string
  ) => {
    if (isListening) {
      pauseListening();
    }

    try {
      setFeedback('Processing...')
      if (step.type === 'instruction' || step.type === 'summary') {
        // Mark as seen/acknowledged
        await onStepComplete(step, "Acknowledged");
        
        // Move to the next step
        const nextStepIndex = currentStepIndex + 1;
        if (nextStepIndex < lesson.steps.length) {
          setCurrentStepIndex(nextStepIndex);
          const nextStep = lesson.steps[nextStepIndex];
          
          // Add acknowledgment and next prompt to chat history
          setChatHistory(prev => [
            ...prev, 
            { type: 'response', content: 'OK, got it!' },
            { type: 'prompt', content: nextStep.content }
          ]);
          
          setUserResponse('');
        } else {
          // If this was the last step, complete the lesson
          onComplete();
        }
        return;
      }
      // Add response to chat history
      setChatHistory((prev) => [
        ...prev,
        { type: 'response', content: response },
      ]);

      // Mark step as correct

      // Check if current lesson is complete or move to next step
      if (currentStepIndex < lesson.steps.length - 1) {
        // Move to next step
        const nextStepIndex = currentStepIndex + 1;
        setCurrentStepIndex(nextStepIndex);
        setUserResponse('');

        // Add next prompt to chat history
        setTimeout(() => {
          const nextStep = lesson.steps[nextStepIndex];
          if (nextStep) {
            setChatHistory((prev) => [
              ...prev,
              { type: 'prompt', content: nextStep.content },
            ]);
            startListening();
          }
        }, 1000);
      } else {
        // All steps complete
        setAssessmentComplete(true);
      }
    } catch (error) {
      setFeedback('Error processing response');
    }
  };

  const startListening = () => {
    if (!recognitionRef.current) return;

    try {
      recognitionRef.current.start();
    } catch (error) {
      // Already started error can occur when continuous is true
      console.log('Recognition already started');
    }
  };

  const pauseListening = () => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
  };

  const toggleListening = () => {
    if (isListening) {
      pauseListening();
    } else {
      startListening();
    }
  };

  const handleMockResponse = (matchesModel: boolean) => {
    if (!lesson || !currentStep) return;

    const response = matchesModel
      ? currentStep.expectedAnswer || 'Correct mock answer'
      : 'This is a mock response that does not match the expected answer';

    setUserResponse(response);

    if (matchesModel) {
      handleSubmit(currentStep, response);
    }
  };

  if (!lesson) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin mr-3 h-5 w-5 text-accent-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
        <span className="text-neutral-9">Loading assessment...</span>
      </div>
    );
  }

  if (assessmentComplete) {
    return (
      <div className="text-center animate-fade-in">
        <h2 className="text-2xl font-semibold text-foreground mb-4">
          Assessment Complete!
        </h2>
        <p className="text-neutral-8 mb-6">
          Thank you for completing the assessment. We&apos;ll prepare your
          personalized lessons.
        </p>
        <button
          onClick={onComplete}
          disabled={loading}
          className="py-2.5 px-4 bg-primary hover:bg-accent-7 text-neutral-1 rounded-md transition-colors 
                   focus:outline-none focus:ring-2 focus:ring-accent-8 focus:ring-offset-2 disabled:opacity-50
                   font-medium text-sm flex items-center justify-center mx-auto"
        >
          {loading ? (
            <span className="flex items-center">
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-neutral-1"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Processing...
            </span>
          ) : (
            'Continue to Lessons'
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-13rem)] border border-neutral-5 rounded-md bg-neutral-2 overflow-hidden shadow-sm animate-fade-in">
      {/* Chat Header */}
      <div className="p-4 bg-foreground text-neutral-1">
        <h2 className="text-lg font-semibold flex items-center justify-center">
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
          Language Assessment
          
          {/* Step progress indicator */}
          {currentStep && ` - Step ${currentStepIndex + 1}/${lesson.steps.length}`}
        </h2>
      </div>

      {/* Chat Messages */}
      <div
        ref={chatMessagesRef}
        className="flex-1 p-4 overflow-y-auto space-y-4 bg-neutral-1"
      >
        {chatHistory.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.type === 'prompt' ? 'justify-start' : 'justify-end'
            }`}
          >
            <div
              className={`max-w-[75%] p-3 rounded-lg ${
                message.type === 'prompt'
                  ? 'bg-neutral-3 text-foreground'
                  : 'bg-accent-6 text-neutral-1'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
      </div>

      {/* User Input Area */}
      <div className="border-t border-neutral-4 p-4 bg-neutral-1">
        {/* Real-time Transcription Display */}
        <div className="mb-4 min-h-[60px] p-3 border border-neutral-5 rounded-md bg-neutral-2 text-foreground">
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

        {feedback && (
          <div className="text-sm text-neutral-7 mb-3 px-1">{feedback}</div>
        )}

        {/* Mock Response Buttons */}
        {showMockButtons && (
          <div className="flex space-x-3 mb-4">
            <button
              type="button"
              onClick={() => handleMockResponse(true)}
              className="flex-1 py-2 px-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-neutral-1 bg-success hover:bg-success/90 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-success"
            >
              Mock Correct Response
            </button>
            <button
              type="button"
              onClick={() => handleMockResponse(false)}
              className="flex-1 py-2 px-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-neutral-1 bg-error hover:bg-error/90 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-error"
            >
              Mock Incorrect Response
            </button>
          </div>
        )}

        {/* Controls */}
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={toggleListening}
            disabled={loading || !currentStep}
            className={`flex-1 py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 flex items-center justify-center ${
              isListening
                ? 'bg-warning hover:bg-warning/90 text-neutral-12 focus:ring-warning'
                : 'bg-accent-6 hover:bg-accent-7 text-neutral-1 focus:ring-accent-6'
            }`}
          >
            {isListening ? (
              <>
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Pause Listening
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
                Start Listening
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() =>
              currentStep &&
              handleSubmit(currentStep, userResponse)
            }
            disabled={!userResponse || loading || !currentStep}
            className="flex-1 py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-neutral-1 bg-primary hover:bg-accent-7 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-8 disabled:opacity-50 flex items-center justify-center"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
            Skip & Continue
          </button>
        </div>
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
    </div>
  );
}

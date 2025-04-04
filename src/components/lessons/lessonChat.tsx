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
import { RecordingBlob } from '@/lib/interfaces/all-interfaces';
// TODO: play the expectedAudio when answer is correct

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
  onComplete: (recording: RecordingBlob | null) => void;
  onStepComplete: (
    step: LessonStep | AssessmentStep,
    userResponse: string
  ) => Promise<AssessmentStep | LessonStep>;
  loading: boolean;
  targetLanguage: string;
  isAssessment?: boolean; // Add this flag to differentiate between lesson and assessment
}
const isMockMode = process.env.NEXT_PUBLIC_MOCK_USER_RESPONSES === 'true';

logger.info('isMockMode', isMockMode);

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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [shouldPlayAudio, setShouldPlayAudio] = useState(true);
  const [audioQueue, setAudioQueue] = useState<string[]>([]);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [initialUserInteractionDone, setInitialUserInteractionDone] =
    useState(false);

  // recording state
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);
  const recordingPausedTimeRef = useRef<number>(0);
  const [fullSessionRecording, setFullSessionRecording] =
    useState<RecordingBlob | null>(null);
  const [lessonCompleted, setLessonCompleted] = useState(false);

  // Add state for recording playback
  const [recordingAudioURL, setRecordingAudioURL] = useState<string | null>(
    null
  );
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);
  const recordingAudioRef = useRef<HTMLAudioElement | null>(null);

  // Add state to track if lesson is complete but waiting for manual completion in mock mode
  const [lessonReadyToComplete, setLessonReadyToComplete] = useState(false);

  // Rehydrate chat history
  useEffect(() => {
    if (
      lesson &&
      lesson.steps &&
      Array.isArray(lesson.steps) &&
      chatHistory.length === 0
    ) {
      logger.info('all lesson data', lesson);
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

    // At the end of this effect, set shouldPlayAudio to true to play initial audio
    setShouldPlayAudio(true);
  }, [lesson]);

  // Audio playback
  useEffect(() => {
    const playNextInQueue = () => {
      if (audioQueue.length > 0 && !isPlayingAudio) {
        setIsPlayingAudio(true);
        const nextAudio = audioQueue[0];

        if (audioRef.current) {
          audioRef.current.src = nextAudio;
          audioRef.current
            .play()
            .then(() => {
              logger.info('Playing audio:', nextAudio);
            })
            .catch((error) => {
              logger.error('Failed to play audio:', error);
              // Move to next audio in queue if current fails
              setAudioQueue((prevQueue) => prevQueue.slice(1));
              setIsPlayingAudio(false);
            });
        }
      }
    };

    playNextInQueue();
  }, [audioQueue, isPlayingAudio]);

  // Audio playback
  useEffect(() => {
    logger.info('lesson.steps useEffect', lesson.steps);
    const handleAudioEnded = () => {
      // Remove the played audio from queue and reset playing state
      setAudioQueue((prevQueue) => prevQueue.slice(1));
      setIsPlayingAudio(false);

      logger.info('audioQueue', audioQueue);
      logger.info('initialUserInteractionDone', initialUserInteractionDone);
      logger.info('currentStepIndex', currentStepIndex);
      logger.info('lesson.steps', lesson.steps);

      // const currentStep = lesson.steps[currentStepIndex];
      // logger.info('currentStep type ', currentStep.type);
      // Auto-advance for certain step types when audio finishes
      if (
        initialUserInteractionDone &&
        !isPlayingAudio && // No more audio in queue
        lesson.steps
      ) {
        const currentStep = lesson.steps[currentStepIndex];
        logger.info('currentStep type 123 ', currentStep.type);
        // Auto-advance non-interactive steps when audio finishes
        if (
          currentStep.type === 'instruction' ||
          currentStep.type === 'summary' ||
          currentStep.type === 'feedback'
        ) {
          logger.info(
            `Auto-advancing ${currentStep.type} step after audio playback`
          );
          handleSubmitStep(currentStep, userResponse);
        }
      }
    };

    if (audioRef.current) {
      audioRef.current.addEventListener('ended', handleAudioEnded);
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('ended', handleAudioEnded);
      }
    };
  }, [audioQueue, currentStepIndex, initialUserInteractionDone, lesson.steps]);

  // Audio playback
  useEffect(() => {
    if (
      shouldPlayAudio &&
      lesson.steps &&
      lesson.steps[currentStepIndex] &&
      initialUserInteractionDone
    ) {
      const currentStep = lesson.steps[currentStepIndex];
      const newAudioQueue: string[] = [];

      // First play content audio for all step types
      if (currentStep.contentAudioUrl) {
        newAudioQueue.push(currentStep.contentAudioUrl);
      }

      // For practice steps, also queue the expected answer audio
      if (
        currentStep.type === 'practice' &&
        currentStep.expectedAnswerAudioUrl
      ) {
        newAudioQueue.push(currentStep.expectedAnswerAudioUrl);
      }

      if (newAudioQueue.length > 0) {
        setAudioQueue(newAudioQueue);
        logger.info('Queued audio files:', newAudioQueue);
      }

      // Reset the flag after queuing
      setShouldPlayAudio(false);
    }
  }, [
    currentStepIndex,
    lesson.steps,
    shouldPlayAudio,
    initialUserInteractionDone,
  ]);

  // Set up real time speech recognition
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
  useEffect(() => {
    const initializeRecorder = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          logger.error('Media devices API not supported in this browser');
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });

        const mimeType = MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

        mediaRecorderRef.current = new MediaRecorder(stream, {
          mimeType: mimeType,
        });

        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: mimeType,
          });

          // Calculate recording metrics
          const recordingDuration =
            Date.now() -
            recordingStartTimeRef.current -
            (recordingPausedTimeRef.current || 0);
          const recordingSize = audioBlob.size;

          // Create a new blob with the metadata
          const recordingWithMetadata = new Blob([audioBlob], {
            type: mimeType,
          }) as RecordingBlob;
          
          // Add metadata properties
          recordingWithMetadata.lastModified = Date.now();
          recordingWithMetadata.recordingTime = recordingDuration;
          recordingWithMetadata.recordingSize = recordingSize;

          logger.info('Recording completed with metadata', {
            size: recordingSize,
            duration: recordingDuration,
            lastModified: recordingWithMetadata.lastModified
          });

          // Set the full session recording, which will trigger the useEffect
          setFullSessionRecording(recordingWithMetadata);

          // Create URL for playback in mock mode
          if (isMockMode) {
            const url = URL.createObjectURL(audioBlob);
            setRecordingAudioURL(url);
          }
        };
      } catch (error) {
        logger.error('Error initializing media recorder:', error);
      }
    };
    // TODO: STOP RECORDING AFTER 10 SECONDS
    // TODO: initialize rerorder when user starts speaking

    initializeRecorder();

    return () => {
      // Clean up the recorder and stream on unmount
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== 'inactive'
      ) {
        mediaRecorderRef.current.stop();
      }

      // Clean up any object URLs we created
      if (recordingAudioURL) {
        URL.revokeObjectURL(recordingAudioURL);
      }
    };
  }, []);

  // Stop recording on component unmount
  useEffect(() => {
    return () => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== 'inactive'
      ) {
        mediaRecorderRef.current.stop();
        logger.info('Recording stopped on component unmount');
      }
    };
  }, []);

  // Start session recording function
  const startRecording = () => {
    try {
      if (!mediaRecorderRef.current) {
        logger.warn('Media recorder not initialized');
        return;
      }

      if (mediaRecorderRef.current.state === 'inactive') {
        recordingStartTimeRef.current = Date.now();
        mediaRecorderRef.current.start(1000); // Collect data every second
        setIsRecording(true);
        logger.info('Recording started');
      } else if (mediaRecorderRef.current.state === 'paused') {
        mediaRecorderRef.current.resume();
        recordingPausedTimeRef.current +=
          Date.now() - recordingPausedTimeRef.current;
        setIsRecording(true);
        logger.info('Recording resumed');
      }
    } catch (error) {
      logger.error('Error starting recording:', error);
    }
  };

  // Pause recording function
  const pauseRecording = () => {
    try {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === 'recording'
      ) {
        mediaRecorderRef.current.pause();
        recordingPausedTimeRef.current = Date.now();
        setIsRecording(false);
        logger.info('Recording paused');
      }
    } catch (error) {
      logger.error('Error pausing recording:', error);
    }
  };
  const stopRecordingCompletely = () => {
    try {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== 'inactive'
      ) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        const recordingTime =
          Date.now() -
          recordingStartTimeRef.current -
          recordingPausedTimeRef.current;
        logger.info('Recording stopped completely', {
          duration: recordingTime,
        });
      }
    } catch (error) {
      logger.error('Error stopping recording:', error);
    }
  };

  const handleSubmitStep = async (
    step: LessonStep | AssessmentStep,
    userInput: string
  ) => {
    try {
      // setFeedback('Processing...');
      logger.info('Processing response:', userInput);

      // For instruction and summary steps, just acknowledge them without requiring user response
      if (
        step.type === 'instruction' ||
        step.type === 'summary' ||
        step.type === 'feedback'
      ) {
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
          setShouldPlayAudio(true);
        } else {
          // If this was the last step, complete the lesson
          stopRecordingCompletely();
          setLessonCompleted(true);

          if (!isMockMode) {
            onComplete(fullSessionRecording);
          } else {
            setLessonReadyToComplete(true);
            stopRecordingCompletely();
          }
        }
        return;
      }

      // Original handling for other step types...
      const updatedStep = await onStepComplete(step, userInput);
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
          { type: 'response', content: userInput },
          { type: 'prompt', content: nextStep.content },
        ]);

        // Set flag to play audio for the new step (will only play if user interaction happened)
        setShouldPlayAudio(true);

        startListening();
      } else {
        stopRecordingCompletely();
        setLessonCompleted(true);

        // Check if we're in mock mode
        if (isMockMode) {
          // Set state to show completion button instead of auto-completing
          setLessonReadyToComplete(true);
          logger.info('Lesson ready to complete');
          setChatHistory((prev) => [
            ...prev,
            { type: 'response', content: userInput },
            {
              type: 'prompt',
              content:
                'Lesson complete! You can now listen to your recording or continue.',
            },
          ]);
        } else {
        }
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

  const toggleListening = () => {
    // Set the user interaction flag to true
    if (!initialUserInteractionDone) {
      setInitialUserInteractionDone(true);
      setShouldPlayAudio(true);
    }

    if (isListening) {
      pauseListening();
      pauseRecording();
    } else {
      startListening();
      startRecording();
    }
  };

  // A wrapper to trigger submission from the input component.
  const handleSubmit = () => {
    if (!initialUserInteractionDone) {
      setInitialUserInteractionDone(true);
    }

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

  // Add function to play/pause recording
  const toggleRecordingPlayback = () => {
    if (!recordingAudioRef.current || !recordingAudioURL) return;

    if (isPlayingRecording) {
      recordingAudioRef.current.pause();
      setIsPlayingRecording(false);
    } else {
      recordingAudioRef.current
        .play()
        .then(() => setIsPlayingRecording(true))
        .catch((error) => {
          logger.error('Error playing recording:', error);
          setIsPlayingRecording(false);
        });
    }
  };

  // Add effect to handle recording audio ended event
  useEffect(() => {
    const handleRecordingEnded = () => {
      setIsPlayingRecording(false);
    };

    if (recordingAudioRef.current) {
      recordingAudioRef.current.addEventListener('ended', handleRecordingEnded);
    }

    return () => {
      if (recordingAudioRef.current) {
        recordingAudioRef.current.removeEventListener(
          'ended',
          handleRecordingEnded
        );
      }
    };
  }, []);

  // Update the handleUpdateResponse function to pass to ChatInput
  const handleUpdateResponse = (text: string) => {
    setUserResponse(text);
  };

  // Add a new function to handle lesson completion
  const handleCompleteLesson = () => {
    
    // Reset the ready state
    setLessonReadyToComplete(false);
  };

  // Add this useEffect to trigger onComplete when recording is ready
  useEffect(() => {
    if (fullSessionRecording && lessonCompleted && !loading) {
      logger.info('Lesson completed with recording', {
        recordingSize: fullSessionRecording.size,
        recordingTime: (fullSessionRecording as any).recordingTime,
      });
      
      // Call onComplete with the recording
      onComplete(fullSessionRecording);
    }
  }, [fullSessionRecording, lessonCompleted, loading, onComplete]);

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
          <audio ref={audioRef} />
          <audio ref={recordingAudioRef} src={recordingAudioURL || ''} />
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
        {isMockMode && (
          <div className="flex flex-col space-y-2 mt-4 p-4">
            <div className="flex space-x-2">
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

            {/* Recording playback controls only show when there's a recording */}
            {recordingAudioURL && (
              <button
                type="button"
                onClick={toggleRecordingPlayback}
                className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 flex items-center justify-center"
              >
                {isPlayingRecording ? (
                  <>
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                    Pause Recording
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Play Recording
                  </>
                )}
              </button>
            )}

            {/* Complete lesson button - only show when lesson is completed but not yet finalized */}
            {lessonReadyToComplete && (
              <button
                type="button"
                onClick={handleCompleteLesson}
                className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-accent-6 hover:bg-accent-7"
              >
                Complete Lesson
              </button>
            )}
          </div>
        )}
      </div>
    )
  );
}

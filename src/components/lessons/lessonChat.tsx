import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { usePathname, useRouter } from 'next/navigation';
import { RecordingBlob } from '@/lib/interfaces/all-interfaces';
// TODO: play the expectedAudio when answer is correct

// Add this interface at the top of the file
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

export interface SpeechRecognition extends EventTarget {
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
  const manuallyStoppedRef = useRef(false); // Flag to track if the user manually stopped recording
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
  const pathname = usePathname();
  const showBackButton = pathname.includes('/lessons');
  const stopRecordingCompletely = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      try {
        mediaRecorderRef.current.stop(); // onstop handler will set state and process blob
        logger.info('Recording stopped completely triggered');
        // setIsRecording(false); // Let onstop handle this
      } catch (error) {
        logger.error('Error stopping recording completely:', error);
        setIsRecording(false); // Ensure state is correct on error
      }
    }
  }, []);

  // Start session recording function
  const startRecording = useCallback(() => {
    if (!mediaRecorderRef.current || isRecording) {
      logger.warn('Media recorder not initialized or already recording');
      return;
    }
    try {
      if (mediaRecorderRef.current.state === 'inactive') {
        recordingStartTimeRef.current = Date.now();
        recordingPausedTimeRef.current = 0; // Reset pause time on new start
        audioChunksRef.current = []; // Clear previous chunks
        mediaRecorderRef.current.start(1000); // Collect data every second
        setIsRecording(true);
        logger.info('Recording started');
      } else if (mediaRecorderRef.current.state === 'paused') {
        mediaRecorderRef.current.resume();
        // Adjust start time based on pause duration
        recordingStartTimeRef.current +=
          Date.now() - recordingPausedTimeRef.current;
        recordingPausedTimeRef.current = 0; // Reset pause time
        setIsRecording(true);
        logger.info('Recording resumed');
      }
    } catch (error) {
      logger.error('Error starting recording:', error);
      setIsRecording(false);
    }
  }, [isRecording]);

  // Pause recording function
  const pauseRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === 'recording'
    ) {
      try {
        mediaRecorderRef.current.pause();
        recordingPausedTimeRef.current = Date.now(); // Record pause time
        setIsRecording(false);
        logger.info('Recording paused');
      } catch (error) {
        logger.error('Error pausing recording:', error);
        setIsRecording(false); // Ensure state is correct on error
      }
    }
  }, []);

  const pauseListening = useCallback(() => {
    if (!recognitionRef.current || !isListening) return;
    try {
      recognitionRef.current.stop();
      logger.info('LessonChat: Paused listening triggered');
      // setIsListening(false); // onend handles this
    } catch (error) {
      logger.error('LessonChat: Error stopping listening', { error });
      // Ensure state is correct if stop fails unexpectedly
      setIsListening(false);
    }
  }, [isListening]);

  const handleSubmitStep = useCallback(
    async (step: LessonStep | AssessmentStep, userInput: string) => {
      try {
        logger.info(
          'handleSubmitStep called for step:',
          step.id,
          'Type:',
          step.type,
          'Input:',
          userInput
        );

        // Pause listening and recording *before* processing the response
        // This prevents capturing feedback audio or silence detection during processing
        if (isListening) {
          pauseListening();
        }
        if (isRecording) {
          pauseRecording();
        }

        // Handle instruction, summary, feedback steps (Auto-advance logic)
        if (
          step.type === 'instruction' ||
          step.type === 'summary' ||
          step.type === 'feedback'
        ) {
          logger.info(
            `Processing auto-advance for ${step.type} step: ${step.id}`
          );
          await onStepComplete(step, 'Acknowledged'); // Mark as seen

          const nextStepIndex = currentStepIndex + 1;
          logger.info(
            'Next step index after auto-advance:',
            nextStepIndex,
            'Total steps:',
            lesson.steps.length
          );

          if (nextStepIndex < lesson.steps.length) {
            const nextStep = lesson.steps[nextStepIndex];
            setCurrentStepIndex(nextStepIndex);

            setChatHistory((prev) => [
              ...prev,
              // Optional: Add acknowledgment message if desired
              // { type: 'response', content: 'OK, got it!' },
              { type: 'prompt', content: nextStep.content },
            ]);
            setUserResponse(''); // Clear input for the next step
            setShouldPlayAudio(true); // Queue audio for the next step

            // --- IMPORTANT ---
            // Do NOT automatically start listening/recording here.
            // The audio 'ended' listener for the *new* step's audio will handle that.
            logger.info(
              `Advanced to step ${nextStepIndex}. Audio queued. Waiting for audio end to potentially start listening.`
            );
          } else {
            // Last step was non-interactive, complete the lesson
            logger.info('Last step was non-interactive. Completing lesson.');
            stopRecordingCompletely(); // Stop recording fully
            setLessonCompleted(true);
            // Handle mock mode completion button display
            if (isMockMode) {
              setLessonReadyToComplete(true);
              setChatHistory((prev) => [
                ...prev,
                { type: 'prompt', content: 'Lesson complete! (Mock Mode)' },
              ]);
            }
            // Non-mock mode completion is handled by useEffect watching fullSessionRecording
          }
          return; // Exit early for non-interactive steps
        }

        // --- Handle interactive steps (practice, prompt, question, etc.) ---
        logger.info(
          `Processing interactive step: ${step.id}, User input: ${userInput}`
        );
        const updatedStep = await onStepComplete(step, userInput);
        logger.info('Step completion result:', updatedStep);

       
        setUserResponse(''); // Clear input field immediately after submission

        if (!updatedStep.correct) {
          setFeedback('Try again!'); // Provide feedback for incorrect response
          // Do NOT advance. Keep currentStepIndex the same.
          // Set flag to replay audio for the *current* step if needed,
          // or simply wait for user to try again (manual mic click or typing).
          // Let's assume user needs to manually retry for now.
          // setShouldPlayAudio(true); // Replay current step audio? Maybe too intrusive.
          logger.info(`Step ${step.id} incorrect. Waiting for user retry.`);
          // Re-enable listening/recording *if* needed for retry?
          // For now, let's require manual re-activation via button click.
          return; // Exit early if incorrect
        }
         // Add user response to chat history *before* checking correctness/advancing
        // This ensures the user sees their submitted response immediately.
        setChatHistory((prev) => [
          ...prev,
          { type: 'response', content: updatedStep.userResponse || userInput },
        ]);

        // --- Correct Response Handling ---
        setFeedback(''); // Clear feedback on correct

        // Check if this was a forced correct due to max attempts
        if (
          updatedStep.attempts >= updatedStep.maxAttempts &&
          updatedStep.correct
        ) {
          logger.info('Step completed via max attempts override');
          // Queue the expected answer audio if available
          const audioUrlToAdd = updatedStep.expectedAnswerAudioUrl;
          if (audioUrlToAdd) {
            setAudioQueue((prev) => [...prev, audioUrlToAdd]);
            logger.info('Queued expected answer audio after max attempts.');
          }
        }

        // Find the next step
        const nextStepIndex = currentStepIndex + 1; // Calculate based on current index

        if (nextStepIndex < lesson.steps.length) {
          const nextStep = lesson.steps[nextStepIndex];
          logger.info(
            `Advancing to next step: ${nextStep.id} (Index: ${nextStepIndex})`
          );
          setCurrentStepIndex(nextStepIndex); // Advance the step index

          // Add next prompt to chat history
          setChatHistory((prev) => [
            ...prev,
            { type: 'prompt', content: nextStep.content },
          ]);

          // Set flag to play audio for the new step
          setShouldPlayAudio(true);

          // --- IMPORTANT ---
          // Do NOT automatically start listening/recording here.
          // The audio 'ended' listener for the *new* step's audio will handle that.
          logger.info(
            `Advanced to step ${nextStepIndex}. Audio queued. Waiting for audio end to potentially start listening.`
          );
        } else {
          // Last step was interactive and correct, complete the lesson
          logger.info(
            'Last step was interactive and correct. Completing lesson.'
          );
          stopRecordingCompletely(); // Stop recording fully
          setLessonCompleted(true);

          // Handle mock mode completion button display
          if (isMockMode) {
            setLessonReadyToComplete(true);
            setChatHistory((prev) => [
              ...prev,
              { type: 'prompt', content: 'Lesson complete! (Mock Mode)' },
            ]);
            logger.info('Lesson ready to complete in mock mode.');
          }
          // Non-mock mode completion is handled by useEffect watching fullSessionRecording
        }
      } catch (error) {
        setFeedback('Error processing response');
        logger.error('LessonChat: Error in handleSubmitStep', { error });
        // Ensure listening/recording state is reset on error
        if (isListening) pauseListening();
        if (isRecording) pauseRecording(); // Use pause instead of stop completely on error? Maybe pause is better.
      }
    },
    [
      // Dependencies for handleSubmitStep
      currentStepIndex,
      lesson.steps,
      onStepComplete,
      isListening,
      isRecording,
      pauseListening,
      pauseRecording,
      stopRecordingCompletely,
      isMockMode,
      // Add other state setters used inside if they aren't stable refs/dispatchers
      setChatHistory,
      setUserResponse,
      setShouldPlayAudio,
      setFeedback,
      setLessonCompleted,
      setLessonReadyToComplete,
      setAudioQueue, // Needed for max attempts audio queueing
      setCurrentStepIndex,
    ]
  );

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;
    try {
      recognitionRef.current.start();
      logger.info('LessonChat: Start listening triggered');
      // setIsListening(true); // onstart handles this
    } catch (error) {
      logger.error('LessonChat: Error starting listening', { error });
      // It might already be started, log a warning
      if ((error as DOMException).name === 'InvalidStateError') {
        logger.warn('LessonChat: Recognition already started');
      } else {
        setIsListening(false); // Ensure state is correct if start fails unexpectedly
      }
    }
  }, [isListening]);

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
        if (step.userResponse && 
          step.type !== 'instruction' && 
          step.type !== 'summary' && 
          step.type !== 'feedback') {
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
    const handleAudioEnded = () => {
      const wasLastInQueue = audioQueue.length === 1; // Check *before* update

      // Remove the played audio from queue and reset playing state
      setAudioQueue((prevQueue) => prevQueue.slice(1));
      setIsPlayingAudio(false);

      logger.info(
        'Audio ended. Queue length was:',
        wasLastInQueue ? 1 : audioQueue.length,
        'Initial interaction done:',
        initialUserInteractionDone
      );

      if (initialUserInteractionDone && lesson.steps) {
        // --- NEW LOGIC: Auto-start listening/recording for the NEXT interactive step ---
        if (wasLastInQueue) {
          // Only check if the queue for the *current* step is now empty
          const nextStepIndex = currentStepIndex + 1;
          logger.info(
            'Checking next step for auto-start. Next index:',
            nextStepIndex
          );

          if (nextStepIndex < lesson.steps.length) {
            const nextStep = lesson.steps[nextStepIndex];
            logger.info('Next step type:', nextStep.type);

            // Check if the *next* step requires interaction
            if (
              nextStep.type !== 'instruction' &&
              nextStep.type !== 'summary' &&
              nextStep.type !== 'feedback'
            ) {
              logger.info(
                'Next step is interactive. Starting listening and recording automatically.'
              );
              // Start listening and recording if not already active
              if (!isListening) {
                startListening();
              }
              if (!isRecording) {
                startRecording();
              }
            } else {
              logger.info(
                'Next step is non-interactive. Not starting listening/recording automatically.'
              );
              // Optional: Explicitly pause if needed, though should happen naturally when step advances
              // if (isListening) pauseListening();
              // if (isRecording) pauseRecording();
            }
          } else {
            logger.info('No next step found (end of lesson).');
            // End of lesson, recording should be stopped by completion logic
          }
        }
        // --- END NEW LOGIC ---

        // --- ORIGINAL LOGIC: Auto-advance the *CURRENT* non-interactive step ---
        // This should run regardless of the *next* step's type, but only if the current step's audio queue is empty
        if (wasLastInQueue) {
          const currentStep = lesson.steps[currentStepIndex];
          logger.info(
            'Checking current step for auto-advance. Type:',
            currentStep.type
          );
          if (
            currentStep.type === 'instruction' ||
            currentStep.type === 'summary' ||
            currentStep.type === 'feedback'
          ) {
            logger.info(
              `Auto-advancing current ${currentStep.type} step after audio playback`
            );
            // Ensure handleSubmitStep is called correctly
            handleSubmitStep(currentStep, userResponse || 'Acknowledged'); // Pass current userResponse or default
          }
        }
        // --- END ORIGINAL LOGIC ---
      }
    };

    const audioElement = audioRef.current;
    if (audioElement) {
      audioElement.addEventListener('ended', handleAudioEnded);
      logger.info('Added audio ended listener');
    }

    return () => {
      if (audioElement) {
        audioElement.removeEventListener('ended', handleAudioEnded);
        logger.info('Removed audio ended listener');
      }
    };
  }, [
    // Dependencies needed for the logic within handleAudioEnded:
    audioQueue, // To check length *before* update
    currentStepIndex,
    initialUserInteractionDone,
    lesson.steps,
    isListening, // To check if already listening
    isRecording, // To check if already recording
    startListening, // Function ref
    startRecording, // Function ref
    handleSubmitStep, // Function ref for auto-advance
    userResponse, // Needed for handleSubmitStep
    // Removed pauseListening/pauseRecording as they aren't explicitly called here now
  ]);

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
    let isMounted = true;
    logger.info('Setting up speech recognition effect...');

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
          if (!isMounted) return;
          logger.info('Speech Recognition: Started');
          setIsListening(true);
          manuallyStoppedRef.current = false; // Ensure flag is reset on successful start
        };

        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          // Update the last speech timestamp whenever we receive speech
          lastSpeechTimestampRef.current = Date.now();

          const result = event.results[event.results.length - 1];
          const transcript = result[0].transcript;

          // If we have debounce timer, clear it
          if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

          // Set user response with the transcript
          setUserResponse(transcript);
        };

        recognitionRef.current.onerror = (
          event: SpeechRecognitionErrorEvent
        ) => {
          // Use specific event type
          if (!isMounted) return;
          // Only log the error here. Let onend handle state and restart.
          logger.error(
            'Speech recognition error event:',
            event.error,
            event.message
          );
          // Optionally provide user feedback for critical errors
          if (
            event.error !== 'no-speech' &&
            event.error !== 'audio-capture' &&
            event.error !== 'not-allowed'
          ) {
            setFeedback(
              `Recognition error: ${event.error}. Please check microphone permissions or network.`
            );
          }
          // NOTE: 'not-allowed' often means the user denied permission permanently. Restarting won't help.
        };

        recognitionRef.current.onend = () => {
          if (!isMounted) {
            logger.info('Speech Recognition: Ended after component unmounted.');
            return;
          }

          const wasManualStop = manuallyStoppedRef.current;
          const isLessonDone = lessonCompleted; // Capture state at the time of execution

          logger.info(
            `Speech Recognition: Ended. isListening=${isListening}, manualStop=${wasManualStop}, lessonCompleted=${isLessonDone}`
          );

          // Always update listening state when it ends
          setIsListening(false);

          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }

          // --- Automatic Restart Logic ---
          if (!wasManualStop && !isLessonDone) {
            logger.info('Conditions met for automatic restart check.');
            // Use a small timeout to prevent potential rapid restart loops
            // and allow the browser state to settle.
            const restartTimeout = setTimeout(() => {
              // Check ref and conditions *again* inside timeout, as state might change
              // and ensure component is still mounted
              if (
                isMounted &&
                recognitionRef.current &&
                !manuallyStoppedRef.current &&
                !lessonCompleted
              ) {
                logger.info(
                  'Inside timeout: Attempting to restart recognition...'
                );
                try {
                  recognitionRef.current.start();
                  // onstart will set isListening back to true if successful
                } catch (startError: any) {
                  // Log specific start errors (e.g., InvalidStateError if already started somehow)
                  logger.error(
                    'Error restarting recognition in onend timeout:',
                    startError.name,
                    startError.message
                  );
                  // Ensure state is correct if restart fails
                  if (isMounted) setIsListening(false);
                }
              } else {
                logger.warn('Inside timeout: Recognition restart aborted.', {
                  isMounted,
                  hasRef: !!recognitionRef.current,
                  isManualNow: manuallyStoppedRef.current, // Check ref value again
                  isLessonDoneNow: lessonCompleted, // Check state value again
                });
                // If it was aborted due to manual stop flag being set *during* the timeout, reset it.
                if (manuallyStoppedRef.current) {
                  manuallyStoppedRef.current = false;
                }
              }
            }, 150); // Slightly longer delay (150ms)

            // Store timeout ID for potential cleanup if needed, though unlikely here
            // restartTimerRef.current = restartTimeout;
          } else {
            logger.info(
              'Speech Recognition: End condition met (Manual Stop or Lesson Completed). Not restarting.'
            );
            // Reset the manual stop flag *only if* it was the reason for not restarting
            if (wasManualStop) {
              manuallyStoppedRef.current = false;
              logger.info('Reset manual stop flag.');
            }
          }
          // --- End Automatic Restart Logic ---
        };
      } catch (error) {
        logger.error('Error initializing speech recognition:', error);
      }
    }

    // Clean up function
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        manuallyStoppedRef.current = true;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onstart = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current = null;
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
  }, [targetLanguage, lessonCompleted]);

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
            lastModified: recordingWithMetadata.lastModified,
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

  const toggleListening = () => {
    // Set the user interaction flag to true on the first manual click
    if (!initialUserInteractionDone) {
      setInitialUserInteractionDone(true);
      // Trigger audio playback for the *current* step immediately after interaction
      setShouldPlayAudio(true);
      logger.info(
        'Initial user interaction detected. Enabling audio playback.'
      );
    }

    if (isListening) {
      logger.info('Manual pause triggered.');
      manuallyStoppedRef.current = true;
      pauseListening();
      pauseRecording(); // Also pause recording when manually pausing listening
    } else {
      logger.info('Manual start triggered.');
      manuallyStoppedRef.current = false;
      startListening();
      startRecording(); // Also start recording when manually starting listening
    }
  };

  // A wrapper to trigger submission from the input component.
  const handleSubmit = () => {
    if (!initialUserInteractionDone) {
      setInitialUserInteractionDone(true);
      // Optionally trigger audio here too if Enter is the first interaction
      // setShouldPlayAudio(true);
    }

    const currentStep = lesson.steps[currentStepIndex];
    if (currentStep && userResponse.trim()) {
      // Only submit if there's a response
      logger.info('Manual submit triggered (e.g., Enter key)');
      handleSubmitStep(currentStep, userResponse);
    } else {
      logger.warn(
        'Manual submit attempted with no response or no current step.'
      );
    }
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

  const handleSkip = () => {
    const currentStep = lesson.steps[currentStepIndex] as LessonStep;
    handleSubmitStep(currentStep, 'skip');
  };

  // Update the handleUpdateResponse function to pass to ChatInput
  const handleUpdateResponse = (text: string) => {
    setUserResponse(text);
  };

  // Add a new function to handle lesson completion
  const handleCompleteLesson = () => {
    // Reset the ready state
    setLessonReadyToComplete(false);
    // Call onComplete ONLY when the button is clicked in mock mode
    if (fullSessionRecording) {
      // Ensure recording is available
      onComplete(fullSessionRecording);
    } else {
      logger.warn(
        'Complete Lesson clicked in mock mode, but no recording available yet.'
      );
      // Optionally call onComplete with null or handle differently
      onComplete(null);
    }
  };

  // Add this useEffect to trigger onComplete when recording is ready
  useEffect(() => {
    if (fullSessionRecording && lessonCompleted && !loading && !isMockMode) {
      logger.info('Lesson completed with recording', {
        recordingSize: fullSessionRecording.size,
        recordingTime: (fullSessionRecording as any).recordingTime,
      });

      // Call onComplete with the recording
      onComplete(fullSessionRecording);
    }
  }, [fullSessionRecording, lessonCompleted, loading, onComplete, isMockMode]);

  return (
    lesson && (
      <div className="flex flex-col h-full border rounded-[4px] bg-neutral-2 overflow-hidden">
        {/* Chat Header */}
        <div
          className={`p-4 bg-neutral-12 text-white shrink-0 flex items-center ${
            isAssessment ? 'justify-center' : 'justify-between'
          }`}
        >
          {showBackButton && (
            <button
              onClick={() =>
                router.push(isAssessment ? '/app/onboarding' : '/app/lessons')
              }
              className="flex items-center text-sm font-medium text-white hover:text-neutral-3 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {isAssessment ? 'Back to Assessment' : 'Back to Lessons'}
            </button>
          )}
          <h2
            className={`text-xl font-semibold ${
              isAssessment ? 'mx-auto' : 'flex-1 text-left'
            }`}
          >
            {isAssessment
              ? 'Language Assessment'
              : `Lesson: ${'focusArea' in lesson ? lesson.focusArea : ''}`}
          </h2>
        </div>

        {/* Progress Bar */}
        <div
          className="w-full bg-neutral-3 h-1.5"
          role="progressbar" // Add role
          aria-valuemin={0} // Add aria-valuemin
          aria-valuemax={lesson.steps.length} // Add aria-valuemax
          aria-valuenow={currentStepIndex + 1} // Add aria-valuenow
          aria-label="Lesson Progress"
        >
          <div
            className="bg-accent-6 h-1.5 transition-all duration-300"
            style={{
              width: `${((currentStepIndex + 1) / lesson.steps.length) * 100}%`,
            }}
            data-testid="progress-bar-indicator"
          ></div>
        </div>

        {/* Chat Messages */}
        <div ref={chatMessagesRef} className="flex-1 overflow-y-auto min-h-0">
          <ChatMessages messages={chatHistory} />
          <audio ref={audioRef} />
          <audio ref={recordingAudioRef} src={recordingAudioURL || undefined} />
        </div>

        <ChatInput
          userResponse={userResponse}
          isListening={isListening}
          feedback={feedback}
          onToggleListening={toggleListening}
          onSubmit={handleSubmit}
          disableSubmit={loading}
          disableSkip={loading}
          onUpdateResponse={handleUpdateResponse}
          onSkip={handleSkip}
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

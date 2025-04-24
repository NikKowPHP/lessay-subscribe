// File: src/components/lessons/lessonChat.tsx
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
import { transcribeAudio } from '@/lib/server-actions/stt-actions'; // Import the STT Server Action
import { toast } from 'react-hot-toast'; // For user feedback

// --- RecordingBlob Interface ---
// (Interface remains the same)

interface LessonChatProps {
  lesson: LessonModel | AssessmentLesson;
  onComplete: (recording: RecordingBlob | null) => void;
  onStepComplete: (
    step: LessonStep | AssessmentStep,
    userResponse: string
  ) => Promise<AssessmentStep | LessonStep>;
  loading: boolean; // General loading state from parent
  targetLanguage: string;
  isAssessment?: boolean;
}

const isMockMode = process.env.NEXT_PUBLIC_MOCK_USER_RESPONSES === 'true';
logger.info('isMockMode', isMockMode);

export default function LessonChat({
  lesson,
  onComplete,
  onStepComplete,
  loading: parentLoading, // Rename to avoid conflict
  targetLanguage,
  isAssessment = false,
}: LessonChatProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [userResponse, setUserResponse] = useState('');
  const [feedback, setFeedback] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const router = useRouter();
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [shouldPlayAudio, setShouldPlayAudio] = useState(true);
  const [audioQueue, setAudioQueue] = useState<string[]>([]);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [initialUserInteractionDone, setInitialUserInteractionDone] =
    useState(false);

  // Recording state (kept)
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);
  const [fullSessionRecording, setFullSessionRecording] =
    useState<RecordingBlob | null>(null);
  const [lessonCompleted, setLessonCompleted] = useState(false);

  // New state for STT processing
  const [isProcessingSTT, setIsProcessingSTT] = useState(false);

  // Recording playback state (kept for mock mode)
  const [recordingAudioURL, setRecordingAudioURL] = useState<string | null>(
    null
  );
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);
  const recordingAudioRef = useRef<HTMLAudioElement | null>(null);

  const [lessonReadyToComplete, setLessonReadyToComplete] = useState(false);
  const pathname = usePathname();
  const showBackButton = pathname.includes('/lessons'); // Keep logic for back button display
  const streamRef = useRef<MediaStream | null>(null); // Keep track of the stream

  // Combine loading states
  const isLoading = parentLoading || isProcessingSTT;

  // --- MediaRecorder Logic (Mostly Kept) ---

  const stopRecordingCompletely = useCallback(async () => {
    logger.info('stopRecordingCompletely called');
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      return new Promise<void>((resolve, reject) => {
        (mediaRecorderRef.current as any)._resolveStopPromise = resolve;
        (mediaRecorderRef.current as any)._rejectStopPromise = reject;
        try {
          logger.info('Calling mediaRecorder.stop()');
          mediaRecorderRef.current.stop();
        } catch (error) {
          logger.error('Error calling mediaRecorder.stop():', error);
          setIsRecording(false);
          streamRef.current?.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          reject(error);
        }
      });
    } else {
       logger.warn('stopRecordingCompletely called but recorder not active.');
       return Promise.resolve();
    }
  }, []);

  const startRecording = useCallback(async () => {
    logger.info('Attempting to start recording...');
    if (isRecording) {
        logger.warn('startRecording called while already recording.');
        return;
    }
    if (isLoading) {
        logger.warn('startRecording called while loading/processing.');
        return;
    }

    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;

    try {
        // Reset states before starting
        setFullSessionRecording(null);
        // *** CORRECTED LINE ***
        setRecordingAudioURL(null); // Clear previous playback URL using correct setter
        // *********************
        audioChunksRef.current = [];

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Media devices API not supported.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: false
        });
        streamRef.current = stream;

        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
        logger.info(`Using mimeType: ${mimeType}`);

        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: mimeType });
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunksRef.current.push(event.data);
            }
        };

        mediaRecorderRef.current.onstop = async () => {
            logger.info('MediaRecorder onstop triggered.');
            setIsRecording(false);

            if (audioChunksRef.current.length === 0) {
                 logger.warn('onstop: No audio chunks recorded, likely stopped too quickly or no input.');
                 setIsProcessingSTT(false);
                 streamRef.current?.getTracks().forEach(track => track.stop());
                 streamRef.current = null;
                 if ((mediaRecorderRef.current as any)?._resolveStopPromise) {
                     (mediaRecorderRef.current as any)._resolveStopPromise();
                 }
                 return;
            }

            const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
            const recordingDuration = Date.now() - recordingStartTimeRef.current;
            logger.info(`Recording stopped. Duration: ${recordingDuration}ms, Size: ${audioBlob.size} bytes, Chunks: ${audioChunksRef.current.length}`);

            const filename = `recording-${Date.now()}.webm`;
            const recordingFile = new File([audioBlob], filename, { type: mimeType }) as RecordingBlob;
            recordingFile.recordingTime = recordingDuration;
            recordingFile.recordingSize = audioBlob.size;
            recordingFile.lastModified = Date.now();

            setFullSessionRecording(recordingFile);

            if (isMockMode) {
                const url = URL.createObjectURL(audioBlob);
                setRecordingAudioURL(url);
                logger.info('Mock mode: Created object URL for playback:', url);
            }

            if (!isMockMode) {
              setIsProcessingSTT(true); // Set processing state
              setFeedback('Processing speech...');
              setUserResponse(''); // Clear previous response visually
              const formData = new FormData();
              formData.append('audio', recordingFile, filename);
              formData.append('languageCode', mapLanguageToCode(targetLanguage));
              // Set sampleRate and encoding based on what MediaRecorder *actually* used
              const actualMimeType = mediaRecorderRef.current?.mimeType || mimeType; // Use recorder's mimeType if available
              const encoding = actualMimeType.includes('opus') ? 'WEBM_OPUS' : 'LINEAR16'; // Basic assumption
              const sampleRateHertz = actualMimeType.includes('opus') ? '48000' : '16000'; // Default sample rates assumption
              logger.info(`Determined STT params: encoding=${encoding}, sampleRateHertz=${sampleRateHertz} from mimeType=${actualMimeType}`);
              formData.append('sampleRateHertz', sampleRateHertz); // Pass determined sample rate
              formData.append('encoding', encoding); // Pass determined encoding

              try {
                  logger.info('Sending audio to STT server action...');
                  const result = await transcribeAudio(formData); // Receive response
                  logger.info('STT server action response:', result);

                  // --> Check for error in the response structure <--
                  if (result.error) throw new Error(result.error); // Handle backend error

                  // --> Handle successful response <--
                  if (result.transcript !== undefined) {
                      setUserResponse(result.transcript); // Update userResponse state
                      const currentStep = lesson.steps[currentStepIndex];
                      if (currentStep) {
                          logger.info('Submitting step automatically with STT transcript:', result.transcript);
                          // Trigger handleSubmitStep logic
                          await handleSubmitStep(currentStep, result.transcript);
                      } else {
                          logger.warn('No current step found after receiving STT transcript.');
                      }
                  } else {
                      // Handle case where STT returns success but no transcript
                      logger.warn('STT returned successfully but without a transcript.');
                      setFeedback('Could not understand speech.');
                  }
              } catch (sttError) { // --> Handle error response <--
                  logger.error('Error during STT processing:', sttError);
                  const errorMsg = sttError instanceof Error ? sttError.message : 'Speech processing failed.';
                  setFeedback(`Error: ${errorMsg}`); // Update feedback state
                  toast.error(`Speech recognition failed: ${errorMsg}`); // Show toast error
              } finally {
                  // --> Set processing state to false on success OR error <--
                  setIsProcessingSTT(false);
                  setFeedback(''); // Clear feedback message after handling
              }
          }

            streamRef.current?.getTracks().forEach(track => track.stop());
            streamRef.current = null;
            logger.info('Stream tracks stopped in onstop.');

            if ((mediaRecorderRef.current as any)?._resolveStopPromise) {
                (mediaRecorderRef.current as any)._resolveStopPromise();
            }
        };

        mediaRecorderRef.current.onerror = (event) => {
            logger.error('MediaRecorder error:', event);
            setIsRecording(false);
            setFeedback('Error during recording.');
            streamRef.current?.getTracks().forEach(track => track.stop());
            streamRef.current = null;
             if ((mediaRecorderRef.current as any)?._rejectStopPromise) {
                (mediaRecorderRef.current as any)._rejectStopPromise(new Error('MediaRecorder error'));
             }
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
        recordingStartTimeRef.current = Date.now();
        logger.info('Recording started successfully.');

    } catch (error) {
        logger.error('Error accessing microphone or starting recorder:', error);
        const errorMsg = error instanceof Error ? error.message : 'Unknown media error';
        setFeedback(`Error: ${errorMsg}`);
        toast.error(`Could not start recording: ${errorMsg}`);
        setIsRecording(false);
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
  }, [isRecording, isLoading, targetLanguage, lesson.steps, currentStepIndex]); // Dependencies


  const handleSubmitStep = useCallback(
    async (step: LessonStep | AssessmentStep, userInput: string) => {
      if (!step) {
          logger.error("handleSubmitStep called with undefined step.");
          return;
      }
      setIsProcessingSTT(true);
      setFeedback('Checking answer...');
      try {
        logger.info(
          'handleSubmitStep called for step:', step.id, 'Type:', step.type, 'Input:', userInput
        );

        if (
          step.type === 'instruction' ||
          step.type === 'summary' ||
          step.type === 'feedback'
        ) {
          logger.info( `Processing auto-advance for ${step.type} step: ${step.id}` );
          await onStepComplete(step, 'Acknowledged');

          const nextStepIndex = currentStepIndex + 1;
          logger.info('Next step index after auto-advance:', nextStepIndex, 'Total steps:', lesson.steps.length );

          if (nextStepIndex < lesson.steps.length) {
            const nextStep = lesson.steps[nextStepIndex];
            setCurrentStepIndex(nextStepIndex);

            setChatHistory((prev) => [
              ...prev,
              { type: 'response', content: 'OK, got it!' },
              { type: 'prompt', content: nextStep.content },
            ]);
            setUserResponse('');
            setShouldPlayAudio(true);

            logger.info(`Advanced to step ${nextStepIndex}. Audio queued.`);
          } else {
            logger.info('Last step was non-interactive. Attempting to complete lesson.');
            await stopRecordingCompletely();
            setLessonCompleted(true);

            if (isMockMode) {
              setLessonReadyToComplete(true);
              setChatHistory((prev) => [
                ...prev,
                { type: 'prompt', content: 'Lesson complete! (Mock Mode)' },
              ]);
              logger.info('Lesson ready to complete in mock mode.');
            }
          }
          setIsProcessingSTT(false);
          setFeedback('');
          return;
        }

        logger.info(`Processing interactive step: ${step.id}, User input from STT: ${userInput}`);
        const updatedStep = await onStepComplete(step, userInput);
        logger.info('Step completion result:', updatedStep);

        setChatHistory((prev) => [
            ...prev,
            { type: 'response', content: updatedStep.userResponse || userInput },
        ]);
        setUserResponse('');

        if (!updatedStep.correct) {
          setFeedback('Try again!');
          logger.info(`Step ${step.id} incorrect. Waiting for user retry.`);
          setIsProcessingSTT(false);
          return;
        }

        setFeedback('');

        if (
          updatedStep.attempts >= updatedStep.maxAttempts &&
          updatedStep.correct && step.type !== 'instruction' && step.type !== 'summary' && step.type !== 'feedback'
        ) {
          logger.info('Step completed via max attempts override');
          const audioUrlToAdd = updatedStep.expectedAnswerAudioUrl;
          if (audioUrlToAdd) {
            setAudioQueue((prev) => [...prev, audioUrlToAdd]);
            logger.info('Queued expected answer audio after max attempts.');
          }
        }

        const nextStepIndex = currentStepIndex + 1;

        if (nextStepIndex < lesson.steps.length) {
          const nextStep = lesson.steps[nextStepIndex];
          logger.info( `Advancing to next step: ${nextStep.id} (Index: ${nextStepIndex})` );
          setCurrentStepIndex(nextStepIndex);

          setChatHistory((prev) => [
            ...prev,
            { type: 'prompt', content: nextStep.content },
          ]);
          setShouldPlayAudio(true);

          logger.info( `Advanced to step ${nextStepIndex}. Audio queued.` );
        } else {
          logger.info( 'Last step was interactive and correct. Completing lesson.' );
          await stopRecordingCompletely();
          setLessonCompleted(true);

          if (isMockMode) {
            setLessonReadyToComplete(true);
            setChatHistory((prev) => [
              ...prev,
              { type: 'prompt', content: 'Lesson complete! (Mock Mode)' },
            ]);
            logger.info('Lesson ready to complete in mock mode.');
          }
        }
      } catch (error) {
        setFeedback('Error processing response');
        logger.error('LessonChat: Error in handleSubmitStep', { error });
      } finally {
         setIsProcessingSTT(false);
         setFeedback('');
      }
    },
    [
      currentStepIndex,
      lesson.steps,
      onStepComplete,
      stopRecordingCompletely,
      isMockMode,
      setChatHistory,
      setUserResponse,
      setShouldPlayAudio,
      setFeedback,
      setLessonCompleted,
      setLessonReadyToComplete,
      setAudioQueue,
      setCurrentStepIndex,
      setIsProcessingSTT
    ]
  );

  // --- Kept Rehydrate Chat History useEffect ---
  useEffect(() => {
    if (
      lesson &&
      lesson.steps &&
      Array.isArray(lesson.steps) &&
      chatHistory.length === 0
    ) {
      logger.info('Rehydrating chat history', { lessonId: lesson.id });
      const initialHistory: ChatMessage[] = [];
      let lastCompletedIndex = -1;
      lesson.steps.forEach((step, index) => {
         const wasCompleted = step.correct || (step.userResponse === 'Acknowledged' && (step.type === 'instruction' || step.type === 'summary' || step.type === 'feedback'));
        if (wasCompleted) lastCompletedIndex = index;
      });
      logger.info(`Last completed step index: ${lastCompletedIndex}`);
      for (let i = 0; i <= lastCompletedIndex; i++) {
        const step = lesson.steps[i];
        initialHistory.push({ type: 'prompt', content: step.content });
        if (step.userResponse && step.userResponse !== 'Acknowledged') {
          initialHistory.push({ type: 'response', content: step.userResponse });
        } else if (step.userResponse === 'Acknowledged') {
           initialHistory.push({ type: 'response', content: 'OK, got it!' });
        }
      }
      const firstIncompleteStepIndex = lastCompletedIndex + 1;
      if (firstIncompleteStepIndex < lesson.steps.length) {
        const nextStep = lesson.steps[firstIncompleteStepIndex];
        initialHistory.push({ type: 'prompt', content: nextStep.content });
         setCurrentStepIndex(firstIncompleteStepIndex);
         logger.info(`Setting current step index to first incomplete: ${firstIncompleteStepIndex}`);
      } else {
          setCurrentStepIndex(lesson.steps.length > 0 ? lesson.steps.length - 1 : 0);
          setLessonCompleted(true);
          logger.info(`All steps complete on rehydration. Setting index to last step: ${lesson.steps.length - 1}`);
      }
      setChatHistory(initialHistory);
      setShouldPlayAudio(true);
    }
  }, [lesson]);

  // --- Kept Audio Playback useEffects ---
  useEffect(() => {
    const playNextInQueue = () => {
      if (audioQueue.length > 0 && !isPlayingAudio) {
        setIsPlayingAudio(true);
        const nextAudio = audioQueue[0];
        if (audioRef.current) {
          audioRef.current.src = nextAudio;
          audioRef.current.play().then(() => {
            logger.info('Playing audio:', nextAudio);
          }).catch((error) => {
            logger.error('Failed to play audio:', error);
            setAudioQueue((prev) => prev.slice(1));
            setIsPlayingAudio(false);
          });
        }
      }
    };
    playNextInQueue();
  }, [audioQueue, isPlayingAudio]);

  useEffect(() => {
    const handleAudioEnded = () => {
      const wasLastInQueue = audioQueue.length === 1;
      setAudioQueue((prev) => prev.slice(1));
      setIsPlayingAudio(false);
      logger.info('Audio ended.', { wasLastInQueue, initialUserInteractionDone });
      if (initialUserInteractionDone && lesson.steps && wasLastInQueue) {
        const currentStep = lesson.steps[currentStepIndex];
        if (currentStep.type === 'instruction' || currentStep.type === 'summary' || currentStep.type === 'feedback') {
          logger.info(`Auto-advancing current ${currentStep.type} step after audio.`);
          setTimeout(() => handleSubmitStep(currentStep, 'Acknowledged'), 100);
        }
      }
    };
    const audioElement = audioRef.current;
    if (audioElement) audioElement.addEventListener('ended', handleAudioEnded);
    return () => { if (audioElement) audioElement.removeEventListener('ended', handleAudioEnded); };
  }, [audioQueue, currentStepIndex, initialUserInteractionDone, lesson.steps, handleSubmitStep]);

  useEffect(() => {
    if (shouldPlayAudio && lesson.steps && lesson.steps[currentStepIndex] && initialUserInteractionDone) {
      const currentStep = lesson.steps[currentStepIndex];
      const newQueue: string[] = [];
      if (currentStep.contentAudioUrl) newQueue.push(currentStep.contentAudioUrl);
      if (currentStep.type === 'practice' && currentStep.expectedAnswerAudioUrl) newQueue.push(currentStep.expectedAnswerAudioUrl);
      if (newQueue.length > 0) setAudioQueue(newQueue);
      setShouldPlayAudio(false);
    }
  }, [currentStepIndex, lesson.steps, shouldPlayAudio, initialUserInteractionDone]);



  // Helper for recorder initialization
  const initializeRecorder = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);

      recorder.onstop = async () => {
          logger.info('MediaRecorder onstop triggered.');
          setIsRecording(false);

          if (audioChunksRef.current.length === 0) {
               logger.warn('onstop: No audio chunks recorded.');
               setIsProcessingSTT(false);
               streamRef.current?.getTracks().forEach(track => track.stop()); streamRef.current = null;
               if ((recorder as any)?._resolveStopPromise) (recorder as any)._resolveStopPromise();
               return;
          }

          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          const recordingDuration = Date.now() - recordingStartTimeRef.current;
          const filename = `recording-${Date.now()}.webm`;
          const recordingFile = new File([audioBlob], filename, { type: mimeType }) as RecordingBlob;
          recordingFile.recordingTime = recordingDuration;
          recordingFile.recordingSize = audioBlob.size;
          recordingFile.lastModified = Date.now();

          setFullSessionRecording(recordingFile);

          if (isMockMode) {
              const url = URL.createObjectURL(audioBlob);
              setRecordingAudioURL(url);
          } else {
              setIsProcessingSTT(true);
              setFeedback('Processing speech...');
              setUserResponse('');
              const formData = new FormData();
              formData.append('audio', recordingFile, filename);
              formData.append('languageCode', mapLanguageToCode(targetLanguage));
              formData.append('sampleRateHertz', '48000');
              formData.append('encoding', 'WEBM_OPUS');

              try {
                  const result = await transcribeAudio(formData);
                  if (result.error) throw new Error(result.error);
                  if (result.transcript !== undefined) {
                      setUserResponse(result.transcript);
                      const currentStep = lesson.steps[currentStepIndex];
                      if (currentStep) await handleSubmitStep(currentStep, result.transcript);
                  } else { setFeedback('Could not understand speech.'); }
              } catch (err) {
                  logger.error('STT Error:', err);
                  const msg = err instanceof Error ? err.message : 'STT failed';
                  setFeedback(`Error: ${msg}`); toast.error(`Recognition failed: ${msg}`);
              } finally {
                  setIsProcessingSTT(false); setFeedback('');
              }
          }
           streamRef.current?.getTracks().forEach(track => track.stop()); streamRef.current = null;
           if ((recorder as any)?._resolveStopPromise) (recorder as any)._resolveStopPromise();
      };
      recorder.onerror = (e) => { logger.error('MediaRecorder error:', e);setIsRecording(false); setFeedback('Recording error.'); streamRef.current?.getTracks().forEach(track => track.stop()); streamRef.current = null; if ((recorder as any)?._rejectStopPromise) (recorder as any)._rejectStopPromise(new Error('MediaRecorder error')); };

    } catch (err) { logger.error('Mic/recorder init error:', err); const msg = err instanceof Error ? err.message : 'Media error'; setFeedback(`Error: ${msg}`); toast.error(`Recording init failed: ${msg}`); setIsRecording(false); streamRef.current?.getTracks().forEach(track => track.stop()); streamRef.current = null; }
  }, [targetLanguage, currentStepIndex, lesson.steps, handleSubmitStep]); // Dependencies

  // --- Modified Control Functions ---
  const handleMicButtonClick = () => {
    if (!initialUserInteractionDone) {
      setInitialUserInteractionDone(true);
      setShouldPlayAudio(true);
      logger.info('Initial user interaction detected. Enabling audio playback.');
    }
    if (isRecording) {
      logger.info('Manual stop recording triggered.');
      stopRecordingCompletely();
    } else {
      logger.info('Manual start recording triggered.');
      startRecording();
    }
  };

  // --- Kept Mock Response / Skip / Playback / Completion Logic ---
   const handleMockResponse = (forStep: boolean) => {
    const currentStep = lesson.steps[currentStepIndex] as LessonStep;
    if (!currentStep) return;
    const expected = currentStep.expectedAnswer || 'Acknowledged';
    const response = forStep ? expected : 'Mock incorrect response';
    setUserResponse(response);
    handleSubmitStep(currentStep, response);
  };

  const toggleRecordingPlayback = () => {
    if (!recordingAudioRef.current || !recordingAudioURL) return;
    if (isPlayingRecording) {
      recordingAudioRef.current.pause();
      setIsPlayingRecording(false);
    } else {
      recordingAudioRef.current.play().then(() => setIsPlayingRecording(true))
        .catch((error) => { logger.error('Error playing recording:', error); setIsPlayingRecording(false); });
    }
  };



    // --- Kept MediaRecorder Initialization useEffect ---
    useEffect(() => {
      initializeRecorder();
      return () => { stopRecordingCompletely(); };
    }, [initializeRecorder, stopRecordingCompletely]);
  

  useEffect(() => {
    const endedHandler = () => setIsPlayingRecording(false);
    const audioEl = recordingAudioRef.current;
    if (audioEl) audioEl.addEventListener('ended', endedHandler);
    return () => { if (audioEl) audioEl.removeEventListener('ended', endedHandler); };
  }, []);

  const handleSkip = async () => {
      const currentStep = lesson.steps[currentStepIndex];
      if (!currentStep) return;
      logger.info(`Skipping step ${currentStep.id}`);
      await handleSubmitStep(currentStep, currentStep.expectedAnswer ?? 'Acknowledged');
  };

  const handleUpdateResponse = (text: string) => { setUserResponse(text); };
  const handleCompleteLesson = () => { setLessonReadyToComplete(false); onComplete(fullSessionRecording); };

  // --- Kept useEffect for final onComplete call ---
  useEffect(() => {
    if (fullSessionRecording && lessonCompleted && !isLoading && !isMockMode) {
      logger.info('Lesson completed with recording, calling onComplete', {
        recordingSize: fullSessionRecording.recordingSize,
        recordingTime: fullSessionRecording.recordingTime,
      });
      onComplete(fullSessionRecording);
    }
  }, [fullSessionRecording, lessonCompleted, isLoading, onComplete, isMockMode]);

  return (
    lesson && (
      <div className="flex flex-col h-full border rounded-[4px] bg-neutral-2 overflow-hidden">
         {/* Header */}
         <div className={`p-4 bg-neutral-12 text-white shrink-0 flex items-center ${ isAssessment ? 'justify-center' : 'justify-between' }`} >
          {showBackButton && ( <button onClick={() => router.push(isAssessment ? '/app/onboarding' : '/app/lessons')} className="flex items-center text-sm font-medium text-white hover:text-neutral-3 transition-colors" > <ArrowLeft className="w-4 h-4 mr-2" /> {isAssessment ? 'Back to Assessment' : 'Back to Lessons'} </button> )}
          <h2 className={`text-xl font-semibold ${ isAssessment ? 'mx-auto' : 'flex-1 text-left' }`} > {isAssessment ? 'Language Assessment' : `Lesson: ${'focusArea' in lesson ? lesson.focusArea : ''}`} </h2>
        </div>
        {/* Progress Bar */}
        <div className="w-full bg-neutral-3 h-1.5" role="progressbar" aria-valuemin={0} aria-valuemax={lesson.steps.length} aria-valuenow={currentStepIndex + 1} aria-label="Lesson Progress">
          <div className="bg-accent-6 h-1.5 transition-all duration-300" style={{ width: `${((currentStepIndex + 1) / lesson.steps.length) * 100}%` }} data-testid="progress-bar-indicator"></div>
        </div>
        {/* Chat Messages */}
        <div ref={chatMessagesRef} className="flex-1 overflow-y-auto min-h-0">
          <ChatMessages messages={chatHistory} />
          <audio ref={audioRef} />
          <audio ref={recordingAudioRef} src={recordingAudioURL || undefined} />
        </div>
        {/* Chat Input Area */}
        <ChatInput
          userResponse={userResponse}
          isListening={isRecording} // Button visual state tied to recording
          feedback={feedback}
          onToggleListening={handleMicButtonClick} // Controls recording start/stop
          onSubmit={() => { /* Submission triggered by STT */ }}
          disableSubmit={isLoading}
          disableSkip={isLoading}
          onUpdateResponse={handleUpdateResponse}
          onSkip={handleSkip}
        />
        {/* Mock Buttons */}
        {isMockMode && (
          <div className="flex flex-col space-y-2 mt-4 p-4">
            <div className="flex space-x-2">
              <button type="button" onClick={() => handleMockResponse(true)} className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700" > Mock Correct Response </button>
              <button type="button" onClick={() => handleMockResponse(false)} className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700" > Mock Incorrect Response </button>
            </div>
            {recordingAudioURL && (
              <button type="button" onClick={toggleRecordingPlayback} className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 flex items-center justify-center" >
                {isPlayingRecording ? ( <><svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24" ><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg> Pause Recording</> ) : ( <><svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24" ><path d="M8 5v14l11-7z" /></svg> Play Recording</> )}
              </button>
            )}
            {lessonReadyToComplete && ( <button type="button" onClick={handleCompleteLesson} className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-accent-6 hover:bg-accent-7" > Complete Lesson </button> )}
          </div>
        )}
      </div>
    )
  );
}
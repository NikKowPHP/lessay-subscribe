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
import { transcribeAudio } from '@/lib/server-actions/stt-actions';

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
  const [feedback, setFeedback] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const router = useRouter();
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [shouldPlayAudio, setShouldPlayAudio] = useState(true);
  const [audioQueue, setAudioQueue] = useState<string[]>([]);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [initialUserInteractionDone, setInitialUserInteractionDone] =
    useState(false);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // For STT server call
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  // const recordingStartTimeRef = useRef<number>(0); // Keep if needed for full session recording metrics

  const [fullSessionRecording, setFullSessionRecording] =
    useState<RecordingBlob | null>(null); // For potential full session recording if re-enabled
  const [lessonCompleted, setLessonCompleted] = useState(false);

  const [recordingAudioURL, setRecordingAudioURL] = useState<string | null>(null); // For mock playback
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);
  const recordingAudioRef = useRef<HTMLAudioElement | null>(null);
  const [lessonReadyToComplete, setLessonReadyToComplete] = useState(false);
  const pathname = usePathname();
  const showBackButton = pathname.includes('/lessons');

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

        if (
          step.type === 'instruction' ||
          step.type === 'summary' ||
          step.type === 'feedback'
        ) {
          await onStepComplete(step, 'Acknowledged');
          const nextStepIndex = currentStepIndex + 1;
          if (nextStepIndex < lesson.steps.length) {
            const nextStep = lesson.steps[nextStepIndex];
            setCurrentStepIndex(nextStepIndex);
            setChatHistory((prev) => [
              ...prev,
              { type: 'prompt', content: nextStep.content },
            ]);
            setUserResponse('');
            setShouldPlayAudio(true);
          } else {
            setLessonCompleted(true);
            if (isMockMode) {
              setLessonReadyToComplete(true);
              setChatHistory((prev) => [
                ...prev,
                { type: 'prompt', content: 'Lesson complete! (Mock Mode)' },
              ]);
            }
          }
          return;
        }

        const updatedStep = await onStepComplete(step, userInput);
        setUserResponse(''); // Clear input field after submission (or after STT result)

        if (!updatedStep.correct) {
          setFeedback('Try again!');
          return;
        }
        
        setChatHistory((prev) => [
          ...prev,
          { type: 'response', content: updatedStep.userResponse || userInput },
        ]);
        setFeedback('');

        if (
          updatedStep.attempts >= updatedStep.maxAttempts &&
          updatedStep.correct
        ) {
          const audioUrlToAdd = updatedStep.expectedAnswerAudioUrl;
          if (audioUrlToAdd) {
            setAudioQueue((prev) => [...prev, audioUrlToAdd]);
          }
        }

        const nextStepIndex = currentStepIndex + 1;
        if (nextStepIndex < lesson.steps.length) {
          const nextStep = lesson.steps[nextStepIndex];
          setCurrentStepIndex(nextStepIndex);
          setChatHistory((prev) => [
            ...prev,
            { type: 'prompt', content: nextStep.content },
          ]);
          setShouldPlayAudio(true);
        } else {
          setLessonCompleted(true);
          if (isMockMode) {
            setLessonReadyToComplete(true);
            setChatHistory((prev) => [
              ...prev,
              { type: 'prompt', content: 'Lesson complete! (Mock Mode)' },
            ]);
          }
        }
      } catch (error) {
        setFeedback('Error processing response');
        logger.error('LessonChat: Error in handleSubmitStep', { error });
        setIsProcessing(false); // Ensure processing is false on error
      }
    },
    [
      currentStepIndex,
      lesson.steps,
      onStepComplete,
      isMockMode,
      setChatHistory,
      setUserResponse,
      setShouldPlayAudio,
      setFeedback,
      setLessonCompleted,
      setLessonReadyToComplete,
      setAudioQueue,
      setCurrentStepIndex,
    ]
  );
  
  const sendAudioToServer = useCallback(async (audioBlob: Blob) => {
    if (!lesson.steps[currentStepIndex]) {
      logger.error('sendAudioToServer: No current step found.');
      setFeedback('Error: Could not find current step.');
      setIsProcessing(false);
      return;
    }
    if (!targetLanguage) {
      logger.error('sendAudioToServer: Target language not set.');
      setFeedback('Error: Target language not configured.');
      setIsProcessing(false);
      return;
    }

    logger.info('Sending audio to server for STT...');
    setIsProcessing(true);
    setFeedback(''); 
    // setUserResponse(''); // Clear previous user response before new STT - might be disorienting

    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.webm'); 
    const languageCode = mapLanguageToCode(targetLanguage);
    formData.append('languageCode', languageCode);
    // These should match what the backend stt-action expects and what MediaRecorder produces
    formData.append('sampleRateHertz', '48000'); 
    formData.append('encoding', 'WEBM_OPUS'); 

    try {
      const result = await transcribeAudio(formData);
      setIsProcessing(false);

      if (result.error) {
        logger.error('STT Error from server:', result.error);
        setFeedback(`Speech-to-text error: ${result.error}`);
      } else if (typeof result.transcript === 'string') {
        logger.info('Transcript received:', result.transcript);
        setUserResponse(result.transcript); 
        if (result.transcript.trim()) {
            const currentStep = lesson.steps[currentStepIndex];
            handleSubmitStep(currentStep, result.transcript);
        } else {
            setFeedback('No speech detected or transcript was empty. Please try again.');
        }
      } else {
        logger.warn('Unexpected STT result:', result);
        setFeedback('Received an unexpected response from speech-to-text service.');
      }
    } catch (error) {
      setIsProcessing(false);
      logger.error('Failed to send audio to server:', error);
      setFeedback('Failed to send audio for transcription. Please try again.');
    }
  }, [currentStepIndex, lesson.steps, targetLanguage, handleSubmitStep, mapLanguageToCode]);

  const initializeRecorder = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      logger.error('Media devices API not supported.');
      setFeedback('Audio recording is not supported in this browser.');
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        logger.warn(`${mimeType} not supported, trying audio/webm`);
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          logger.warn(`${mimeType} not supported, trying default`);
          mimeType = ''; // Let browser pick
        }
      }
      
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
      logger.info(`MediaRecorder initialized with ${mediaRecorderRef.current.mimeType}`);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        logger.info('MediaRecorder stopped, processing audio data.');
        setIsRecording(false); // Update UI immediately

        if (audioChunksRef.current.length === 0) {
            logger.warn('No audio chunks recorded.');
            setFeedback('No audio was recorded. Please try again.');
            return;
        }
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorderRef.current?.mimeType || 'audio/webm',
        });
        audioChunksRef.current = []; 
        
        if (isMockMode) {
            const url = URL.createObjectURL(audioBlob);
            setRecordingAudioURL(url); 
        }
        sendAudioToServer(audioBlob);
      };
      return true;
    } catch (error) {
      logger.error('Error initializing media recorder:', error);
      setFeedback('Could not initialize microphone. Please check permissions and refresh.');
      setIsRecording(false);
      return false;
    }
  }, [sendAudioToServer, isMockMode]);

  const startRecordingInternal = useCallback(async () => {
    if (isRecording || isProcessing) return; // Don't start if already recording or processing
    setUserResponse(''); 
    setFeedback('');    

    if (!mediaRecorderRef.current) {
      const initialized = await initializeRecorder();
      if (!initialized || !mediaRecorderRef.current) {
        logger.error('Failed to initialize recorder, cannot start recording.');
        return;
      }
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
      try {
        mediaRecorderRef.current.start();
        setIsRecording(true);
        logger.info('Recording started.');
      } catch (error) {
        logger.error('Error starting MediaRecorder:', error);
        setFeedback('Failed to start recording.');
        setIsRecording(false);
      }
    }
  }, [isRecording, isProcessing, initializeRecorder]);

  const stopRecordingInternal = useCallback(() => {
    if (!isRecording || !mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      return;
    }
    try {
      mediaRecorderRef.current.stop(); 
      // onstop will set isRecording to false and call sendAudioToServer
      logger.info('Recording stopping...');
    } catch (error) {
      logger.error('Error stopping MediaRecorder:', error);
      setFeedback('Error stopping recording.');
      setIsRecording(false); 
    }
  }, [isRecording]);

  const toggleRecording = useCallback(() => {
    if (!initialUserInteractionDone) {
      setInitialUserInteractionDone(true);
      setShouldPlayAudio(true); 
      logger.info('Initial user interaction detected. Enabling audio playback.');
    }

    if (isRecording) {
      stopRecordingInternal();
    } else {
      startRecordingInternal();
    }
  }, [isRecording, initialUserInteractionDone, startRecordingInternal, stopRecordingInternal]);


  useEffect(() => {
    if (
      lesson &&
      lesson.steps &&
      Array.isArray(lesson.steps) &&
      chatHistory.length === 0
    ) {
      const initialHistory: ChatMessage[] = [];
      let lastCompletedIndex = -1;
      lesson.steps.forEach((step, index) => {
        if (step.userResponse) {
          lastCompletedIndex = index;
        }
      });
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
      if (lastCompletedIndex + 1 < lesson.steps.length) {
        const nextStep = lesson.steps[lastCompletedIndex + 1];
        initialHistory.push({ type: 'prompt', content: nextStep.content });
      }
      setChatHistory(initialHistory);
      const firstIncompleteStepIndex = lesson.steps.findIndex(
        (step) => !step.userResponse
      );
      setCurrentStepIndex(
        firstIncompleteStepIndex >= 0
          ? firstIncompleteStepIndex
          : lesson.steps.length - 1
      );
    }
    setShouldPlayAudio(true);
  }, [lesson]);

  useEffect(() => {
    const playNextInQueue = () => {
      if (audioQueue.length > 0 && !isPlayingAudio) {
        setIsPlayingAudio(true);
        const nextAudio = audioQueue[0];
        if (audioRef.current) {
          audioRef.current.src = nextAudio;
          audioRef.current.play().catch((error) => {
            logger.error('Failed to play audio:', error);
            setAudioQueue((prevQueue) => prevQueue.slice(1));
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
      setAudioQueue((prevQueue) => prevQueue.slice(1));
      setIsPlayingAudio(false);

      if (initialUserInteractionDone && lesson.steps && wasLastInQueue) {
        const currentStep = lesson.steps[currentStepIndex];
        if (
          currentStep.type === 'instruction' ||
          currentStep.type === 'summary' ||
          currentStep.type === 'feedback'
        ) {
          handleSubmitStep(currentStep, userResponse || 'Acknowledged');
        }
      }
    };
    const audioElement = audioRef.current;
    if (audioElement) {
      audioElement.addEventListener('ended', handleAudioEnded);
    }
    return () => {
      if (audioElement) {
        audioElement.removeEventListener('ended', handleAudioEnded);
      }
    };
  }, [
    audioQueue,
    currentStepIndex,
    initialUserInteractionDone,
    lesson.steps,
    handleSubmitStep,
    userResponse,
  ]);

  useEffect(() => {
    if (
      shouldPlayAudio &&
      lesson.steps &&
      lesson.steps[currentStepIndex] &&
      initialUserInteractionDone
    ) {
      const currentStep = lesson.steps[currentStepIndex];
      const newAudioQueue: string[] = [];
      if (currentStep.contentAudioUrl) {
        newAudioQueue.push(currentStep.contentAudioUrl);
      }
      if (
        currentStep.type === 'practice' &&
        currentStep.expectedAnswerAudioUrl
      ) {
        newAudioQueue.push(currentStep.expectedAnswerAudioUrl);
      }
      if (newAudioQueue.length > 0) {
        setAudioQueue(newAudioQueue);
      }
      setShouldPlayAudio(false);
    }
  }, [
    currentStepIndex,
    lesson.steps,
    shouldPlayAudio,
    initialUserInteractionDone,
  ]);
  
  // Cleanup MediaRecorder stream on unmount
   useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        logger.info('MediaRecorder stream tracks stopped on unmount.');
      }
      if (recordingAudioURL) {
        URL.revokeObjectURL(recordingAudioURL);
      }
    };
  }, [recordingAudioURL]);

  const handleSubmit = () => {
    if (!initialUserInteractionDone) {
      setInitialUserInteractionDone(true);
    }
    const currentStep = lesson.steps[currentStepIndex];
    if (currentStep && userResponse.trim()) {
      handleSubmitStep(currentStep, userResponse);
    } else {
      logger.warn('Manual submit attempted with no response or no current step.');
    }
  };

  const handleMockResponse = (forStep: boolean) => {
    const currentStep: LessonStep = lesson.steps[currentStepIndex] as LessonStep;
    if (!currentStep) return;
    let expectedResponse = currentStep.expectedAnswer || 'OK, lets continue';
    const response = forStep ? expectedResponse : 'This is a mock response different from the expected';
    setUserResponse(response);
    handleSubmitStep(currentStep, response);
  };

  const toggleRecordingPlayback = () => {
    if (!recordingAudioRef.current || !recordingAudioURL) return;
    if (isPlayingRecording) {
      recordingAudioRef.current.pause();
    } else {
      recordingAudioRef.current.play().catch(e => logger.error("Error playing recording", e));
    }
    setIsPlayingRecording(!isPlayingRecording);
  };

  const handleSkip = () => {
    const currentStep = lesson.steps[currentStepIndex] as LessonStep;
    handleSubmitStep(currentStep, 'skip');
  };

  const handleUpdateResponse = (text: string) => {
    setUserResponse(text);
  };

  const handleCompleteLesson = () => {
    setLessonReadyToComplete(false);
    onComplete(fullSessionRecording || null); // Pass null if no full session recording
  };

  useEffect(() => {
    if (!loading && !isMockMode && lessonCompleted) {
      onComplete(fullSessionRecording || null);
    }
  }, [lessonCompleted, loading, onComplete, isMockMode, fullSessionRecording]);

  return (
    lesson && (
      <div className="flex flex-col h-full border rounded-[4px] bg-neutral-2 overflow-hidden">
        <div
          className={`p-4 bg-neutral-12 text-white shrink-0 flex items-center ${
            isAssessment ? 'justify-center' : 'justify-between'
          }`}
        >
          {showBackButton && (
            <button
              onClick={() => router.push(isAssessment ? '/app/onboarding' : '/app/lessons')}
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
            {isAssessment ? 'Language Assessment' : `Lesson: ${'focusArea' in lesson ? lesson.focusArea : ''}`}
          </h2>
        </div>

        <div
          className="w-full bg-neutral-3 h-1.5"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={lesson.steps.length}
          aria-valuenow={currentStepIndex + 1}
          aria-label="Lesson Progress"
        >
          <div
            className="bg-accent-6 h-1.5 transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / lesson.steps.length) * 100}%` }}
            data-testid="progress-bar-indicator"
          ></div>
        </div>

        <div ref={chatMessagesRef} className="flex-1 overflow-y-auto min-h-0">
          <ChatMessages messages={chatHistory} />
          <audio ref={audioRef} />
          <audio ref={recordingAudioRef} src={recordingAudioURL || undefined} />
        </div>

        <ChatInput
          userResponse={userResponse}
          isListening={isRecording} 
          isProcessing={isProcessing} 
          feedback={feedback}
          onToggleListening={toggleRecording} 
          onSubmit={handleSubmit} 
          disableSubmit={loading || isProcessing || isRecording} 
          disableSkip={loading || isProcessing || isRecording}
          onUpdateResponse={handleUpdateResponse}
          onSkip={handleSkip}
        />

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
            {recordingAudioURL && (
              <button
                type="button"
                onClick={toggleRecordingPlayback}
                className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 flex items-center justify-center"
              >
                {isPlayingRecording ? 'Pause Mock Recording' : 'Play Mock Recording'}
              </button>
            )}
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

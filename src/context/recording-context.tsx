// File: /src/context/recording-context.tsx
'use client';
import { createContext, useContext, ReactNode, useState, useRef, useEffect } from 'react';
import { useError } from '@/hooks/useError';
import { useSubscription } from './subscription-context';
import { AIResponse, DetailedAIResponse } from '@/models/AiResponse.model';
import React from 'react';

import posthog from 'posthog-js';
import logger from '@/utils/logger';


type RecordingContextType = {
  isRecording: boolean;
  setIsRecording: (isRecording: boolean) => void;
  audioURL: string | null;
  setAudioURL: (audioURL: string | null) => void;
  isProcessed: boolean;
  isProcessing: boolean;
  setIsProcessing: (isProcessing: boolean) => void;
  setIsProcessed: (isProcessed: boolean) => void;
  aiResponse: AIResponse | null;
  setAiResponse: (aiResponse: AIResponse | null) => void;
  detailedAiResponse: DetailedAIResponse | null;
  setDetailedAiResponse: (detailedAiResponse: DetailedAIResponse | null) => void;
  maxRecordingAttempts: number;
  recordingAttempts: number;
  setRecordingAttempts: (recordingAttempts: number) => void;
  isDeepAnalysis: boolean;
  setIsDeepAnalysis: (isDeepAnalysis: boolean) => void;
  startRecording: () => void;
  stopRecording: () => void;
  resetRecording: () => void;
  posthogCapture: (event: string) => void;
};

const MAX_RECORDING_TIME_MS = 600000; // 10 minutes
const ATTEMPTS_RESET_TIME_MS = 3600000; // 1 hour

const RecordingContext = createContext<RecordingContextType | null>(null);

export const RecordingProvider = ({ children }: { children: ReactNode }) => {

const { showError } = useError();
  const { isSubscribed, isSubscribedBannerShowed, setIsSubscribedBannerShowed } = useSubscription();

  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(isRecording);
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [isProcessed, setIsProcessed] = useState(false);
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  const [detailedAiResponse, setDetailedAiResponse] = useState<DetailedAIResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDeepAnalysis, setIsDeepAnalysis] = useState(false);
  const [maxRecordingAttempts, setMaxRecordingAttempts] = useState(2);
  const [recordingAttempts, setRecordingAttempts] = useState<number>(() => {
    if (typeof window === 'undefined') return 0; // SSR
    const storedAttempts = localStorage.getItem('recordingAttempts');
    const storedTimestamp = localStorage.getItem('attemptsTimestamp');

    if (storedAttempts && storedTimestamp) {
      const attempts = parseInt(storedAttempts, 10);
      const timestamp = parseInt(storedTimestamp, 10);
      const now = Date.now();

      if (now - timestamp < ATTEMPTS_RESET_TIME_MS) {
        return attempts;
      }
    }
    return 0;
  });

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const recordingTimerInterval = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null); // Ref to hold the stream

  const isDeepAnalysisRef = useRef(isDeepAnalysis);
  useEffect(() => {
    isDeepAnalysisRef.current = isDeepAnalysis;
  }, [isDeepAnalysis]);

  const updateIsDeepAnalysis = (value: boolean) => {
    setIsDeepAnalysis(value);
    isDeepAnalysisRef.current = value;
  };

  useEffect(() => {
    if (typeof window === 'undefined') return; // SSR
    localStorage.setItem('recordingAttempts', recordingAttempts.toString());
    if (recordingAttempts === 0) {
      localStorage.setItem('attemptsTimestamp', Date.now().toString());
    }
  }, [recordingAttempts]);

  useEffect(() => {
    if (isSubscribed) {
      setMaxRecordingAttempts(1000);
      if (!isSubscribedBannerShowed) {
        showError(
          'You are subscribed to the waitlist. You can now record unlimited times.',
          'success'
        );
        setIsSubscribedBannerShowed(true);
      }
    }
  }, [isSubscribed, isSubscribedBannerShowed, showError, setIsSubscribedBannerShowed]); // Added dependencies

  // Cleanup stream on component unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);


  const posthogCapture = (event: string) => {
    if (process.env.NEXT_PUBLIC_ENVIRONMENT === 'production') {
      posthog?.capture(event);
    }
  };

  const handleSend = async (
    audioFile: File,
    recTime: number,
    recSize: number,
    deepAnalysis: boolean
  ) => {
    if (!audioFile || !recTime || !recSize) {
      showError('No audio recorded. Please try again.', 'warning');
      return;
    }

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('recordingTime', recTime.toString());
      formData.append('recordingSize', recSize.toString());
      if (deepAnalysis) {
        formData.append('isDeepAnalysis', 'true');
      }

      const response = await fetch('/api/recording', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const data = await response.json();
      console.log('API Response:', data);

      if (deepAnalysis) {
        const detailedResponse = data.aiResponse as DetailedAIResponse;
        setDetailedAiResponse(detailedResponse);
        console.log('Detailed AI Response:', detailedResponse);
      } else {
        const standardResponse = data.aiResponse as AIResponse;
        setAiResponse(standardResponse);
        console.log('Standard AI Response:', standardResponse);
      }
      // Set isProcessed to true only on successful processing
      setIsProcessed(true);

    } catch (error) {
      logger.error('Error sending recording:', error);
      showError('Failed to process recording. Please try again.', 'error');
      // Do not set isProcessed to true on error
    } finally {
      setIsProcessing(false); // This remains in finally
    }
  };


  const startRecording = async () => {
    const isDev = process.env.NEXT_PUBLIC_ENVIRONMENT === 'development';
    logger.log('startRecording', isDev, recordingAttempts, maxRecordingAttempts);

    if ((recordingAttempts >= maxRecordingAttempts) && !isDev) {
      showError(
        `You have reached the maximum number of recording attempts (${maxRecordingAttempts}) in the last hour. Subscribe to our waitlist to get unlimited analyses.`,
        'warning'
      );
      return;
    }

    // Stop any existing stream before starting a new one
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    // Clear previous timer if any
    if (recordingTimerInterval.current) {
      clearInterval(recordingTimerInterval.current);
      recordingTimerInterval.current = null;
    }


    try {
      // Reset states before starting
      setIsProcessed(false);
      setAiResponse(null);
      setDetailedAiResponse(null);
      setAudioURL(null);
      audioChunks.current = []; // Clear previous audio chunks

      // Check if mediaDevices API is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Media devices API not supported in this browser');
      }

      logger.log('startRecording', isDev, recordingAttempts, maxRecordingAttempts);
      // Check if any audio input devices are available
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioDevices = devices.filter(
        (device) => device.kind === 'audioinput'
      );

      if (audioDevices.length === 0) {
        throw new Error('No audio input devices found');
      }

      // Request microphone permission with constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      streamRef.current = stream; // Store the stream

      // Only proceed if we got the stream successfully
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType: mimeType,
      });

      // --- Assign handlers directly ---
      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) { // Ensure blob is not empty
           audioChunks.current.push(event.data);
        }
      };

      mediaRecorder.current.onstop = async () => {
          logger.log('onstop triggered'); // Add logging
          if (audioChunks.current.length === 0) {
             logger.warn('No audio chunks recorded.');
             setIsProcessing(false); // Ensure processing state is reset if no data
             return; // Don't proceed if no data
          }

          const audioBlob = new Blob(audioChunks.current, { type: mimeType });
          const url = URL.createObjectURL(audioBlob);
          setAudioURL(url);
          logger.log('audioURL set:', url);

          const endTime = Date.now();
          const timeDiff = endTime - startTimeRef.current;
          const blobSize = audioBlob.size;

          // Create File object for upload
          const audioFile = new File([audioBlob], 'recording.aac', {
            type: 'audio/aac-adts', // Adjust if needed, though often server-side handles conversion
          });

          // Call handleSend which now also sets isProcessed on success
          await handleSend(audioFile, timeDiff, blobSize, isDeepAnalysisRef.current);

          // No need to set isProcessed here anymore
          // Stop stream tracks associated with this recording
          streamRef.current?.getTracks().forEach((track) => track.stop());
          streamRef.current = null; // Clear the ref after stopping
      };
      // --- End handler assignment ---

      // Start recording
      mediaRecorder.current.start();
      setIsRecording(true);
      isRecordingRef.current = true; // Sync ref state
      startTimeRef.current = Date.now();

      // Increment recording attempts
      setRecordingAttempts((prevAttempts) => prevAttempts + 1);

      // Set up timer to stop recording after MAX_RECORDING_TIME_MS
      recordingTimerInterval.current = setInterval(() => {
        if (isRecordingRef.current) { // Use ref for checking inside interval
          const elapsedTime = Date.now() - startTimeRef.current;
          if (elapsedTime >= MAX_RECORDING_TIME_MS) {
            logger.log('Max recording time reached, stopping.');
            stopRecording(); // stopRecording will trigger onstop
            showError(
              `Maximum recording time reached (${MAX_RECORDING_TIME_MS / 60000} minutes). Recording stopped.`,
              'warning'
            );
            // Interval cleared in stopRecording
          }
        } else {
           // Clear interval if recording is stopped externally
           if (recordingTimerInterval.current) {
             clearInterval(recordingTimerInterval.current);
             recordingTimerInterval.current = null;
           }
        }
      }, 1000); // Check every 1 second

    } catch (error: unknown) {
      setIsRecording(false);
      isRecordingRef.current = false; // Sync ref state on error
      logger.error('Error starting recording:', error);
      // Clear timer on error
      if (recordingTimerInterval.current) {
        clearInterval(recordingTimerInterval.current);
        recordingTimerInterval.current = null;
      }
      // Stop stream tracks on error
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;

      // Handle specific errors
      if (error instanceof Error) {
        switch (error.name) {
          case 'NotAllowedError':
            showError(
              'Microphone access denied. Please allow microphone access and try again.',
              'error'
            );
            break;
          case 'NotFoundError':
            showError(
              'No microphone found. Please connect a microphone and try again.',
              'error'
            );
            break;
          case 'NotReadableError':
            showError(
              'Microphone is already in use. Please close other applications using the microphone.',
              'error'
            );
            break;
          default:
            if (
              error.message ===
              'Media devices API not supported in this browser'
            ) {
              showError(
                'Your browser does not support audio recording. Please try a modern browser like Chrome or Firefox.',
                'error'
              );
            } else if (error.message === 'No audio input devices found') {
              showError(
                'No microphone detected. Please connect a microphone and try again.',
                'error'
              );
            } else {
              showError(
                `Could not start recording: ${error.message}`, // Include error message
                'error'
              );
            }
        }
      } else {
         showError('An unknown error occurred while starting recording.', 'error');
      }
    }
  };

  const stopRecording = () => {
    logger.log('stopRecording called. Current state:', mediaRecorder.current?.state);
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.stop(); // This will trigger the 'onstop' event handler asynchronously
      setIsRecording(false);
      isRecordingRef.current = false; // Sync ref state
      // Clear interval timer
      if (recordingTimerInterval.current) {
        clearInterval(recordingTimerInterval.current);
        recordingTimerInterval.current = null;
      }
      // Note: Stream tracks are stopped in the 'onstop' handler now
      posthogCapture('stop_recording_clicked');
    } else {
        logger.warn('stopRecording called but recorder not in recording state.');
        // Ensure stream is stopped even if recorder state is unexpected
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        // Reset recording state just in case
        setIsRecording(false);
        isRecordingRef.current = false;
    }
  };


  const resetRecording = () => {
    setAudioURL(null);
    setAiResponse(null);
    setDetailedAiResponse(null);
    setIsProcessed(false);
    setIsProcessing(false); // Also reset processing state
    // Stop any active recording/stream if reset is called unexpectedly
    if (isRecordingRef.current) {
        stopRecording();
    } else {
        // Ensure stream is stopped if reset is called while not recording
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
    // Clear audio chunks
    audioChunks.current = [];
  };

  const value: RecordingContextType = {
    isRecording,
    setIsRecording,
    audioURL,
    setAudioURL,
    isProcessed,
    setIsProcessed,
    aiResponse,
    setAiResponse,
    detailedAiResponse,
    setDetailedAiResponse,
    isProcessing,
    setIsProcessing,
    maxRecordingAttempts,
    recordingAttempts,
    isDeepAnalysis,
    setIsDeepAnalysis: updateIsDeepAnalysis,
    startRecording,
    stopRecording,
    resetRecording,
    posthogCapture,
    setRecordingAttempts
  };

  return (
    <RecordingContext.Provider value={value}>
      {children}
    </RecordingContext.Provider>
  );
};

export const useRecordingContext = () => {
  const context = useContext(RecordingContext);
  if (!context) {
    throw new Error('useRecordingContext must be used within a RecordingProvider');
  }
  return context;
};
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
  }, [isSubscribed]);

  const posthogCapture = (event: string) => {
    if (process.env.NEXT_PUBLIC_ENVIRONMENT === 'production') {
      posthog?.capture(event);
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

    try {
      // Reset states before starting
      setIsProcessed(false);
      setAiResponse(null);
      setDetailedAiResponse(null);
      setAudioURL(null);

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

      // Only proceed if we got the stream successfully
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType: mimeType,
      });

      audioChunks.current = [];
      startTimeRef.current = Date.now();

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };


      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: mimeType });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        logger.log('audioURL', url);

        const endTime = Date.now();
        const timeDiff = endTime - startTimeRef.current;
        const blobSize = audioBlob.size;

        // Create File object for upload
        const audioFile = new File([audioBlob], 'recording.aac', {
          type: 'audio/aac-adts',
        });

        await handleSend(audioFile, timeDiff, blobSize, isDeepAnalysisRef.current);
        setIsProcessed(true);

        stream.getTracks().forEach((track) => track.stop());
      };

      // Start recording only after all handlers are set
      mediaRecorder.current.start();
      setIsRecording(true);
      isRecordingRef.current = true;
      startTimeRef.current = Date.now();

      // Increment recording attempts
      setRecordingAttempts((prevAttempts) => prevAttempts + 1);

      // Set up timer to stop recording after MAX_RECORDING_TIME_MS
      recordingTimerInterval.current = setInterval(() => {
        if (isRecordingRef.current) {
          // Check if still recording to avoid issues if stopped quickly
          const elapsedTime = Date.now() - startTimeRef.current;
          if (elapsedTime >= MAX_RECORDING_TIME_MS) {
            stopRecording();
            showError(
              'Maximum recording time reached (1 minute). Recording stopped.',
              'warning'
            );
            clearInterval(recordingTimerInterval.current!); // Clear interval after stopping
            recordingTimerInterval.current = null;
          }
        } else {
          clearInterval(recordingTimerInterval.current!); // Clear interval if recording is manually stopped
          recordingTimerInterval.current = null;
        }
      }, 1000); // Check every 1 second
    } catch (error: unknown) {
      setIsRecording(false);
      logger.error('Error starting recording:', error);
      clearInterval(recordingTimerInterval.current!); // Clear interval in case of error
      recordingTimerInterval.current = null;

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
                'Could not start recording. Please check your microphone connection.',
                'error'
              );
            }
        }
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.stop();
      setIsRecording(false);
      isRecordingRef.current = false;
      clearInterval(recordingTimerInterval.current!); // Clear interval when manually stopped
      recordingTimerInterval.current = null;
      posthogCapture('stop_recording_clicked');
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
    } catch (error) {
      logger.error('Error sending recording:', error);
      showError('Failed to process recording. Please try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetRecording = () => {
    setAudioURL(null);
    setAiResponse(null);
    setDetailedAiResponse(null);
    setIsProcessed(false);
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
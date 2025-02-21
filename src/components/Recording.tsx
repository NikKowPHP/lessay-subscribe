'use client';

import { AIResponse, DetailedAIResponse  } from '@/models/aiResponse.model';
import logger from '@/utils/logger';
import { useState, useRef, useEffect } from 'react';
import { useError } from '@/hooks/useError';
import { useSubscription } from '@/context/SubscriptionContext';

const MAX_RECORDING_TIME_MS = 60000; // 1 minute

const ATTEMPTS_RESET_TIME_MS = 3600000; // 1 hour

export default function Recording() {
  const {
    isSubscribed,
    isSubscribedBannerShowed,
    setIsSubscribedBannerShowed,
  } = useSubscription();
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const [isProcessed, setIsProcessed] = useState(false);
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  const [detailedAiResponse, setDetailedAiResponse] = useState<DetailedAIResponse | null>(null);
  const startTimeRef = useRef<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const recordingTimerInterval = useRef<NodeJS.Timeout | null>(null); // Ref to hold timer interval ID

  const [maxRecordingAttempts, setMaxRecordingAttempts] =
    useState<number>(1000);
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

  const [isDeepAnalysis, setIsDeepAnalysis] = useState<boolean>(false); // New state variable

  const { showError } = useError();

  useEffect(() => {
    if (typeof window === 'undefined') return; // SSR
    localStorage.setItem('recordingAttempts', recordingAttempts.toString());
    if (recordingAttempts === 0) {
      localStorage.setItem('attemptsTimestamp', Date.now().toString());
    }
  }, [recordingAttempts]);

  useEffect(() => {
    console.log('isSubscribed', isSubscribed);
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

  const startRecording = async () => {
    if (recordingAttempts >= maxRecordingAttempts) {
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

        const endTime = Date.now();
        const timeDiff = endTime - startTimeRef.current;
        const blobSize = audioBlob.size;

        // Create File object for upload
        const audioFile = new File([audioBlob], 'recording.aac', {
          type: 'audio/aac-adts',
        });

        await handleSend(audioFile, timeDiff, blobSize);
        setIsProcessed(true);

        stream.getTracks().forEach((track) => track.stop());
      };

      // Start recording only after all handlers are set
      mediaRecorder.current.start();
      setIsRecording(true);
      startTimeRef.current = Date.now();

      // Increment recording attempts
      setRecordingAttempts((prevAttempts) => prevAttempts + 1);

      // Set up timer to stop recording after MAX_RECORDING_TIME_MS
      recordingTimerInterval.current = setInterval(() => {
        if (isRecording) {
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
      clearInterval(recordingTimerInterval.current!); // Clear interval when manually stopped
      recordingTimerInterval.current = null;
    }
  };

  // Updated handleSend to use File instead of base64
  const handleSend = async (
    audioFile: File,
    recTime: number,
    recSize: number
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
      if (isDeepAnalysis) {
        formData.append('isDeepAnalysis', 'true');
      }

   

       const response = await fetch('/api/recording', {
          method: 'POST',
          body: formData,
        });
      

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const data = await response.json() ;

      let aiResponse;
      if (isDeepAnalysis) {
        aiResponse = data.aiResponse as DetailedAIResponse;
        setDetailedAiResponse(aiResponse);
      } else {
        aiResponse = data.aiResponse as AIResponse;
        setAiResponse(aiResponse);
      }
    } catch (error) {
      logger.error('Error sending recording:', error);
      showError('Failed to process recording. Please try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Smooth scroll to subscription/waitlist section
  const scrollToWaitlist = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset the recording state to allow a new recording.
  const resetRecording = () => {
    setAudioURL(null);
    setAiResponse(null);
    setIsProcessed(false);
  };

  // Helper function to get button text and action
  const getButtonConfig = () => {
    if (isProcessing) {
      return {
        text: 'Processing...',
        action: () => {},
        disabled: true,
        className: 'opacity-50 cursor-not-allowed',
      };
    }
    if (isRecording) {
      return {
        text: (
          <span className="flex items-center">
            <span className="animate-pulse mr-2 text-red-500">●</span> Stop
            Recording
          </span>
        ),
        action: stopRecording,
        disabled: false,
        className:
          'bg-black text-white dark:bg-white dark:text-black hover:opacity-90',
      };
    }
    if (isProcessed) {
      return {
        text: 'Record Again',
        action: resetRecording,
        disabled: false,
        className:
          'hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black',
      };
    }
    return {
      text: 'Start Recording',
      action: startRecording,
      disabled: false,
      className:
        'hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black',
    };
  };

  return (
    <section
      aria-label="Voice Recording and Accent Analysis"
      className="w-full max-w-4xl bg-white/80 dark:bg-black/80 backdrop-blur-sm p-6 rounded-xl border border-black/[.08] dark:border-white/[.145]"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'HowTo',
            name: 'Analyze Your Accent with AI',
            description:
              'Get instant AI-powered feedback on your pronunciation, fluency, and accent characteristics in any language',
            estimatedCost: {
              '@type': 'MonetaryAmount',
              currency: 'USD',
              value: '0',
            },
            tool: [
              {
                '@type': 'HowToTool',
                name: 'Microphone',
              },
            ],
            step: [
              {
                '@type': 'HowToStep',
                name: 'Allow Microphone Access',
                text: 'Grant microphone permissions when prompted to enable voice recording',
                url: 'https://yourdomain.com#recording',
              },
              {
                '@type': 'HowToStep',
                name: 'Start Recording',
                text: 'Click the start button and speak clearly in any language',
                url: 'https://yourdomain.com#recording',
              },
              {
                '@type': 'HowToStep',
                name: 'Complete Recording',
                text: 'Click stop when finished to submit your recording',
                url: 'https://yourdomain.com#recording',
              },
              {
                '@type': 'HowToStep',
                name: 'Get Analysis',
                text: 'Receive detailed AI analysis of your pronunciation and accent characteristics',
                url: 'https://yourdomain.com#analysis',
              },
            ],
            totalTime: 'PT2M',
          }),
        }}
      />
      <article itemScope itemType="https://schema.org/HowTo">
        <header className="text-center mb-8">
          <h1 itemProp="name" className="text-2xl font-semibold mb-3">
            Speak & Uncover Your Accent
          </h1>
          <div itemProp="description" className="space-y-2">
            <p className="text-lg text-gray-700 dark:text-gray-300">
              Record your voice in any language and reveal the subtle impact of
              your native tongue.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              We will provide detailed insights into how your background shapes
              your pronunciation, rhythm, and overall speaking style.
            </p>
          </div>
        </header>

        <div className="flex flex-col items-center space-y-6">
          {/* Single Recording Control Button */}
          <div className="flex items-center gap-4">
            {(() => {
              const { text, action, disabled, className } = getButtonConfig();
              return (
                <button
                  onClick={action}
                  disabled={disabled}
                  className={`
                  px-6 py-2 rounded-full font-medium transition-all duration-200
                  border border-black dark:border-white
                  text-black dark:text-white
                  ${className}
                `}
                >
                  {text}
                </button>
              );
            })()}

            <button
              onClick={() => setIsDeepAnalysis(!isDeepAnalysis)}
              className={`
                px-6 py-2 rounded-full font-medium transition-all duration-200
                ${isDeepAnalysis ? 'bg-blue-500 text-white' : 'border border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white'}
                
              `}
            >
              Deep Analysis
            </button>
          </div>

          {/* New button for Deep Analysis */}

          {/* Conditional message for Deep Analysis */}
          {isDeepAnalysis && (
            <div className="mt-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Please provide a minimum 1 minute of recording for deep
                analysis.
              </p>
            </div>
          )}

          {/* Audio Player */}
          {audioURL && (
            <div className="w-full max-w-md">
              <audio src={audioURL} controls className="w-full" />
            </div>
          )}

          {/* Loading Animation */}
          {isProcessing && (
            <div className="flex flex-col items-center space-y-4 my-8">
              <div className="relative w-16 h-16">
                <div className="absolute top-0 left-0 w-full h-full">
                  <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 border-solid rounded-full animate-spin border-t-blue-600 dark:border-t-blue-400"></div>
                </div>
                <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
                  <div className="w-8 h-8 bg-white dark:bg-black rounded-full"></div>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 animate-pulse">
                Analyzing your accent...
              </p>
            </div>
          )}

          {/* AI Response */}
          {!isProcessing && aiResponse && (
            <div className="w-full mt-8 space-y-6">
              {/* Language Identification & Native Language */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Language Detection Card */}
                <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {aiResponse.language_identification}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Speaking Language
                    </p>
                  </div>
                  {/* <div className="text-right">
                    <span className="text-lg font-medium text-green-600 dark:text-green-400">
                      {aiResponse.confidence_level}
                    </span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Confidence</p>
                  </div> */}
                </div>

                {/* Native Language Card */}
                <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {aiResponse.user_native_language_guess}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Native Language
                    </p>
                  </div>
                  <div className="flex items-center">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      Detected
                    </span>
                  </div>
                </div>
              </div>

              {/* Native Language Influence */}
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <h3 className="font-semibold mb-2">
                  Native Language Influence
                </h3>
                <p className="text-gray-700 dark:text-gray-300">
                  {aiResponse.native_language_influence_analysis}
                </p>
              </div>

              {/* Phonological Assessment */}
              <div className="space-y-4">
                <h3 className="font-semibold">Pronunciation Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {aiResponse.language_specific_phonological_assessment.map(
                    (assessment, index) => (
                      <div
                        key={index}
                        className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
                      >
                        <div className="flex justify-between mb-2">
                          <span className="font-medium">
                            {assessment.phoneme}
                          </span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            in &quot;{assessment.example}&quot;
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                          {assessment.analysis}
                        </p>
                        <div className="flex justify-between text-sm">
                          <span>Target: {assessment.IPA_target}</span>
                          <span>Observed: {assessment.IPA_observed}</span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* CEFR Level */}
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <h3 className="font-semibold mb-2">Proficiency Level</h3>
                <p className="text-gray-700 dark:text-gray-300">
                  {aiResponse.CEFR_aligned_proficiency_indicators}
                </p>
              </div>

              {/* Learning Suggestions */}
              <div className="space-y-4">
                <h3 className="font-semibold">Improvement Suggestions</h3>
                <ul className="space-y-2">
                  {aiResponse.personalized_learning_pathway_suggestions.map(
                    (suggestion, index) => (
                      <li key={index} className="flex items-start">
                        <span className="mr-2 text-green-500">•</span>
                        <span className="text-gray-700 dark:text-gray-300">
                          {suggestion}
                        </span>
                      </li>
                    )
                  )}
                </ul>
              </div>

              {/* Enhanced Call to Action */}
              <div className="p-6 bg-gradient-to-r from-black/5 to-black/10 dark:from-white/5 dark:to-white/10 rounded-lg">
                <div className="max-w-2xl mx-auto text-center space-y-4">
                  <h3 className="text-xl font-semibold">
                    Ready to Improve Your Pronunciation And Accent?
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    Join our waitlist to start speaking like a native.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <button
                      onClick={scrollToWaitlist}
                      className="px-6 py-2 rounded-lg font-medium transition-all duration-200 
                               bg-black text-white dark:bg-white dark:text-black 
                               hover:opacity-90 hover:scale-105"
                    >
                      Join Waitlist
                    </button>
                    <button
                      onClick={resetRecording}
                      className="px-6 py-2 rounded-lg font-medium transition-all duration-200 
                               border border-black/10 dark:border-white/10
                               hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      Try Another Recording
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
                    ✨ Get early access and special perks when we launch!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Detailed Accent Analysis Section */}
          {!isProcessing && detailedAiResponse && (
            <div className="mt-8 space-y-6">
              <h2 className="text-xl font-semibold mb-4">Detailed Accent Analysis</h2>
              
              {/* Primary Analysis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Accent Classification */}
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <h3 className="font-semibold mb-3">Accent Classification</h3>
                  <div className="space-y-2">
                    <p className="flex justify-between">
                      <span>Primary Accent:</span>
                      <span className="font-medium">
                        {detailedAiResponse.primary_analysis.accent_classification.primary_accent}
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span>Confidence:</span>
                      <span className="text-green-600">
                        {detailedAiResponse.primary_analysis.accent_classification.confidence_level}%
                      </span>
                    </p>
                    <div className="mt-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Regional Influences:</p>
                      <div className="flex flex-wrap gap-2">
                        {detailedAiResponse.primary_analysis.accent_classification.regional_influences.map(
                          (influence, index) => (
                            <span key={index} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm">
                              {influence}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Native Language Assessment */}
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <h3 className="font-semibold mb-3">Native Language Assessment</h3>
                  <div className="space-y-2">
                    <p className="flex justify-between">
                      <span>Probable L1:</span>
                      <span className="font-medium">
                        {detailedAiResponse.primary_analysis.native_language_assessment.probable_l1}
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span>Confidence:</span>
                      <span className="text-green-600">
                        {detailedAiResponse.primary_analysis.native_language_assessment.confidence_level}%
                      </span>
                    </p>
                    <div className="mt-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Supporting Features:</p>
                      <ul className="list-disc list-inside text-sm">
                        {detailedAiResponse.primary_analysis.native_language_assessment.supporting_features.map(
                          (feature, index) => (
                            <li key={index}>{feature}</li>
                          )
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Phonetic Analysis */}
              <div className="space-y-4">
                <h3 className="font-semibold">Detailed Phonetic Analysis</h3>
                
                {/* Vowel Production */}
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <h4 className="font-medium mb-3">Vowel Production</h4>
                  <div className="space-y-3">
                    {detailedAiResponse.phonetic_analysis.vowel_production.map(
                      (vowel, index) => (
                        <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-2 last:border-0">
                          <div className="flex justify-between mb-1">
                            <span className="font-medium">{vowel.phoneme}</span>
                            <span className="text-sm text-gray-600">at {vowel.timestamp}s</span>
                          </div>
                          <p className="text-sm mb-1">Example: "{vowel.example_word}"</p>
                          <div className="flex flex-col sm:flex-row gap-2 justify-between text-sm">
                            <span className="font-bold">Target: {vowel.target_realization}</span>
                            <span className="font-bold">Observed: {vowel.observed_realization}</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{vowel.analysis}</p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Prosodic Features */}
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <h4 className="font-medium mb-3">Prosodic Features</h4>
                <div className="space-y-4">
                  <div>
                    <h5 className="text-sm font-medium mb-2">Rhythm Patterns</h5>
                    <p className="text-sm">
                      {detailedAiResponse.prosodic_features.rhythm_patterns.description}
                    </p>
                    <div className="mt-2">
                      {detailedAiResponse.prosodic_features.rhythm_patterns.notable_features.map(
                        (feature, index) => (
                          <span key={index} className="inline-block mr-2 mb-2 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-sm">
                            {feature}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Improvement Plan */}
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <h4 className="font-medium mb-3">Personalized Improvement Plan</h4>
                <div className="space-y-4">
                  {detailedAiResponse.improvement_plan.priority_areas.map(
                    (area, index) => (
                      <div key={index} className="border-l-4 border-blue-500 pl-4">
                        <h5 className="font-medium">{area.focus}</h5>
                        <div className="flex items-center gap-2 my-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            area.importance === 'high'
                              ? 'bg-red-100 text-red-800'
                              : area.importance === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {area.importance} priority
                          </span>
                          <span className="text-sm text-gray-600">{area.expected_timeline}</span>
                        </div>
                        <ul className="list-disc list-inside text-sm">
                          {area.exercises.map((exercise, i) => (
                            <li key={i}>{exercise}</li>
                          ))}
                        </ul>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <h3 className="font-semibold mb-3">Analysis Summary</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Key Strengths</h4>
                    <ul className="list-disc list-inside">
                      {detailedAiResponse.summary.key_strengths.map(
                        (strength, index) => (
                          <li key={index} className="text-sm text-gray-700 dark:text-gray-300">{strength}</li>
                        )
                      )}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">Primary Challenges</h4>
                    <ul className="list-disc list-inside">
                      {detailedAiResponse.summary.primary_challenges.map(
                        (challenge, index) => (
                          <li key={index} className="text-sm text-gray-700 dark:text-gray-300">{challenge}</li>
                        )
                      )}
                    </ul>
                  </div>
                  <p className="text-sm italic mt-4">
                    {detailedAiResponse.summary.overall_assessment}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </article>
    </section>
  );
}

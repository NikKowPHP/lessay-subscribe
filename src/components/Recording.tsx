"use client";

import { AIResponse, AIResponseModel } from '@/models/aiResponse.model';
import { useState, useRef } from 'react';

export default function Recording() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const [isProcessed, setIsProcessed] = useState(false);
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const startTimeRef = useRef<number>(0);
  const [recordingSize, setRecordingSize] = useState<number>(0);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      startTimeRef.current = Date.now();

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);

        const endTime = Date.now();
        const timeDiff = endTime - startTimeRef.current;
        setRecordingTime(timeDiff);
        setRecordingSize(audioBlob.size);

        await handleSend();
        setIsProcessed(true);
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      setIsProcessed(false);
      setAiResponse(null);
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  const handleSend = async () => {
    if (!audioURL) {
      console.error("No audio to send.");
      return;
    }

    try {
      const response = await fetch('/api/recording', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioURL: audioURL,
          recordingTime: recordingTime,
          recordingSize: recordingSize,
        }),
      });
     
      if (!response.ok) {
        console.error("Error sending recording:", response.status);
        return;
      }

      const data = await response.json();
      console.log("Response:", data);

      // Assume data.aiResponse contains an array. 
      // Transform the received JSON into our model using fromJson:
      const transformedResponse = AIResponseModel.fromJson(data.aiResponse[0]);
      setAiResponse(transformedResponse);
      
    } catch (error) {
      console.error("Error sending recording:", error);
    }
  };

  return (
    <div className="w-full max-w-4xl bg-white/80 dark:bg-black/80 backdrop-blur-sm p-6 rounded-xl border border-black/[.08] dark:border-white/[.145]">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold mb-2">Try Our AI Analysis</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Record yourself speaking in any language and get instant feedback
        </p>
      </div>

      <div className="flex flex-col items-center space-y-6">
        {/* Recording Controls */}
        <div className="flex space-x-4">
          <button
            onClick={startRecording}
            disabled={isRecording}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium py-2 px-6 rounded-lg disabled:opacity-50 transition-all duration-200 shadow-sm"
          >
            {isRecording ? (
              <span className="flex items-center">
                <span className="animate-pulse mr-2">●</span> Recording...
              </span>
            ) : (
              "Start Recording"
            )}
          </button>
          <button
            onClick={stopRecording}
            disabled={!isRecording}
            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium py-2 px-6 rounded-lg disabled:opacity-50 transition-all duration-200 shadow-sm"
          >
            Stop Recording
          </button>
        </div>

        {/* Audio Player */}
        {audioURL && (
          <div className="w-full max-w-md">
            <audio src={audioURL} controls className="w-full" />
            <div className="flex justify-center mt-4">
              <button
                onClick={handleSend}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium py-2 px-6 rounded-lg transition-all duration-200 shadow-sm"
              >
                Analyze Recording
              </button>
            </div>
          </div>
        )}

        {/* AI Response */}
        {aiResponse && (
          <div className="w-full mt-8 space-y-6">
            {/* Language Identification & Confidence */}
            <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <div>
                <h3 className="font-semibold text-lg">{aiResponse.language_identification}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Detected Language</p>
              </div>
              <div className="text-right">
                <span className="text-lg font-medium text-green-600 dark:text-green-400">
                  {aiResponse.confidence_level}
                </span>
                <p className="text-sm text-gray-600 dark:text-gray-400">Confidence</p>
              </div>
            </div>

            {/* Native Language Influence */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <h3 className="font-semibold mb-2">Native Language Influence</h3>
              <p className="text-gray-700 dark:text-gray-300">{aiResponse.native_language_influence_analysis}</p>
            </div>

            {/* Phonological Assessment */}
            <div className="space-y-4">
              <h3 className="font-semibold">Pronunciation Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {aiResponse.language_specific_phonological_assessment.map((assessment, index) => (
                  <div key={index} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">{assessment.phoneme}</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        in "{assessment.example}"
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{assessment.analysis}</p>
                    <div className="flex justify-between text-sm">
                      <span>Target: {assessment.IPA_target}</span>
                      <span>Observed: {assessment.IPA_observed}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CEFR Level */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <h3 className="font-semibold mb-2">Proficiency Level</h3>
              <p className="text-gray-700 dark:text-gray-300">{aiResponse.CEFR_aligned_proficiency_indicators}</p>
            </div>

            {/* Learning Suggestions */}
            <div className="space-y-4">
              <h3 className="font-semibold">Improvement Suggestions</h3>
              <ul className="space-y-2">
                {aiResponse.personalized_learning_pathway_suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2 text-green-500">•</span>
                    <span className="text-gray-700 dark:text-gray-300">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Call to Action */}
            <div className="p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg text-center">
              <p className="text-gray-700 dark:text-gray-300 mb-4">{aiResponse.call_to_action}</p>
              <button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium py-2 px-6 rounded-lg transition-all duration-200 shadow-sm">
                Join Waitlist
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
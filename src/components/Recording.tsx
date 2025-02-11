"use client";

import { useState, useRef } from 'react';

export default function Recording() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const [isProcessed, setIsProcessed] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);

        // Process the recording and get AI response (placeholder)
        // Replace this with your actual AI service integration
        setIsProcessed(true);
        setAiResponse("This is a sample AI response.");
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
    // Send the audio to the server for processing
    // Implement your logic here
    console.log("Sending audio for processing...");
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 border rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Recording</h2>
      <div className="flex space-x-4">
        <button
          onClick={startRecording}
          disabled={isRecording}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          {isRecording ? "Recording..." : "Start Recording"}
        </button>
        <button
          onClick={stopRecording}
          disabled={!isRecording}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          Stop Recording
        </button>
      </div>
      {audioURL && (
        <div className="mt-4">
          <audio src={audioURL} controls />
          <div className="flex space-x-4 mt-2">
            <button
              onClick={handleSend}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            >
              Send
            </button>
          </div>
        </div>
      )}
      {aiResponse && (
        <div className="mt-4 p-4 border rounded-lg">
          <h3 className="text-lg font-semibold mb-2">AI Response:</h3>
          <p>{aiResponse}</p>
        </div>
      )}
    </div>
  );
}
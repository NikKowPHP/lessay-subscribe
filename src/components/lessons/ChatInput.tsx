import React from 'react';

interface ChatInputProps {
  userResponse: string;
  isListening: boolean; // This will represent isRecording from the parent
  isProcessing?: boolean; // New prop for server STT loading state
  feedback: string;
  onToggleListening: () => void; // This will be onToggleRecording
  onSubmit: () => void;
  disableSubmit: boolean;
  onSkip: () => void;
  disableSkip: boolean;
  onUpdateResponse?: (text: string) => void;
}

const ChatInput = React.memo(function ChatInput({
  userResponse,
  isListening, // Represents isRecording
  isProcessing,
  feedback,
  onToggleListening, // Will be onToggleRecording
  onSubmit,
  disableSubmit,
  disableSkip,
  onUpdateResponse,
  onSkip
}: ChatInputProps) {
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (onUpdateResponse) {
      onUpdateResponse(e.target.value);
    }
  };

  return (
    <div className="border-t p-4 bg-white shrink-0">
      <div className="mb-4 min-h-[60px] p-2 border rounded-[4px] bg-neutral-2">
        {onUpdateResponse ? (
          <textarea 
            value={userResponse}
            onChange={handleTextChange}
            className="w-full h-full min-h-[60px] bg-transparent resize-none focus:outline-none"
            data-testid="text-input" 
            placeholder={isProcessing ? 'Processing...' : isListening ? 'Recording...' : 'Type or use microphone'}
          />
        ) : (
          <div>{userResponse || (isProcessing ? 'Processing...' : isListening ? 'Recording...' : 'Ready to record')}</div>
        )}
      </div>
      {feedback && (
        <div className="text-sm text-neutral-11 mb-2">{feedback}</div>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onToggleListening}
          disabled={disableSubmit || isProcessing} // Disable if parent says so OR if processing
          className={`flex-1 py-2 px-4 border border-transparent rounded-[4px] shadow-sm text-sm font-medium text-white ${
            isProcessing
              ? 'bg-neutral-5 hover:bg-neutral-6' // Style for processing
              : isListening
              ? 'bg-red-600 hover:bg-red-700' // Style for "Stop Recording"
              : 'bg-accent-7 hover:bg-accent-8' // Style for "Start Recording"
          } ${(disableSubmit || isProcessing) ? 'opacity-50 cursor-not-allowed' : ''
          } focus:outline-none focus:ring-2 focus:ring-accent-8`}
        >
          {isProcessing ? 'Processing...' : isListening ? 'Stop Recording' : 'Start Recording'}
        </button>
        <button
          type="button"
          onClick={onSkip}
          disabled={disableSkip}
          className="flex-1 py-2 px-4 border border-transparent rounded-[4px] shadow-sm text-sm font-medium text-white bg-neutral-12 hover:bg-neutral-11 focus:outline-none focus:ring-2 focus:ring-neutral-11 disabled:opacity-50"
        >
          Skip & Continue
        </button>
      </div>
    </div>
  );
});

export default ChatInput;

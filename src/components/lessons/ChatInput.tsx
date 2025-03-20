import React from 'react';

interface ChatInputProps {
  userResponse: string;
  isListening: boolean;
  feedback: string;
  onToggleListening: () => void;
  onSubmit: () => void;
  disableSubmit: boolean;
}

const ChatInput = React.memo(function ChatInput({
  userResponse,
  isListening,
  feedback,
  onToggleListening,
  onSubmit,
  disableSubmit
}: ChatInputProps) {
  return (
    <div className="border-t p-4 bg-white shrink-0">
      <div className="mb-4 min-h-[60px] p-2 border rounded-[4px] bg-neutral-2">
        {userResponse || (isListening ? 'Listening...' : 'Ready to listen')}
      </div>
      {feedback && (
        <div className="text-sm text-neutral-11 mb-2">{feedback}</div>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onToggleListening}
          className={`flex-1 py-2 px-4 border border-transparent rounded-[4px] shadow-sm text-sm font-medium text-white ${
            isListening ? 'bg-accent-9 hover:bg-accent-10' : 'bg-accent-7 hover:bg-accent-8'
          } focus:outline-none focus:ring-2 focus:ring-accent-8`}
        >
          {isListening ? 'Pause Listening' : 'Start Listening'}
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={disableSubmit}
          className="flex-1 py-2 px-4 border border-transparent rounded-[4px] shadow-sm text-sm font-medium text-white bg-neutral-12 hover:bg-neutral-11 focus:outline-none focus:ring-2 focus:ring-neutral-11 disabled:opacity-50"
        >
          Skip & Continue
        </button>
      </div>
    </div>
  );
});

export default ChatInput;
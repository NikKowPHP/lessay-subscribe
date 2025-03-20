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
      <div className="mb-4 min-h-[60px] p-2 border rounded-md bg-gray-50">
        {userResponse || (isListening ? 'Listening...' : 'Ready to listen')}
      </div>
      {feedback && (
        <div className="text-sm text-gray-500 mb-2">{feedback}</div>
      )}
      <div className="flex space-x-4">
        <button
          type="button"
          onClick={onToggleListening}
          className={`flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            isListening ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
          } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary`}
        >
          {isListening ? 'Pause Listening' : 'Start Listening'}
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={disableSubmit}
          className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
        >
          Skip & Continue
        </button>
      </div>
    </div>
  );
});

export default ChatInput;
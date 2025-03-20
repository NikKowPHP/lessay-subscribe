import React from 'react';

export interface ChatMessage {
  type: 'prompt' | 'response';
  content: string;
}

interface ChatMessagesProps {
  messages: ChatMessage[];
}

const ChatMessages = React.memo(function ChatMessages({ messages }: ChatMessagesProps) {
  return (
    <div className="h-full p-4 space-y-4 overflow-y-auto">
      {messages.map((msg, index) => (
        <div key={index} className={`flex ${msg.type === 'prompt' ? 'justify-start' : 'justify-end'}`}>
          <div className={`max-w-[75%] p-3 rounded-lg ${msg.type === 'prompt' ? 'bg-gray-200 text-gray-800' : 'bg-blue-600 text-white'}`}>
            {msg.content}
          </div>
        </div>
      ))}
    </div>
  );
});

export default ChatMessages;
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
          <div className={`max-w-[75%] p-3 rounded-[4px] shadow-sm ${
            msg.type === 'prompt' 
              ? 'bg-neutral-1 text-neutral-12' 
              : 'bg-accent-9 text-white'
          }`}>
            {msg.content}
          </div>
        </div>
      ))}
    </div>
  );
});

export default ChatMessages;
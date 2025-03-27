import logger from '@/utils/logger';
import React, { useEffect, useRef } from 'react';

export interface ChatMessage {
  type: 'prompt' | 'response';
  content: string;
}

interface ChatMessagesProps {
  messages: ChatMessage[];
}

const ChatMessages = React.memo(function ChatMessages({ messages }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    logger.info('ChatMessages: Attempting to scroll to bottom');
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
      logger.info('ChatMessages: Scrolled to bottom', {
        scrollTop: containerRef.current.scrollTop,
        scrollHeight: containerRef.current.scrollHeight
      });
    }
  }, [messages]);

  return (
    <div ref={containerRef} className="h-full p-4 space-y-4 overflow-y-auto">
      {messages.map((msg, index) => {
        const isSpecialMessage = 
          msg.type === 'prompt' && 
          (msg.content.includes('Instruction:') || msg.content.includes('Summary:'));
        
        return (
          <div key={index} className={`flex ${msg.type === 'prompt' ? 'justify-start' : 'justify-end'}`}>
            <div className={`
              max-w-[75%] p-3 rounded shadow-sm
              ${
                isSpecialMessage 
                  ? 'bg-accent-1 border-l-4 border-accent-6 text-neutral-12' 
                  : msg.type === 'prompt' 
                    ? 'bg-neutral-1 text-neutral-12' 
                    : 'bg-accent-9 text-white'
              }
            `}>
              {isSpecialMessage && (
                <div className="text-xs font-semibold text-accent-6 mb-1 uppercase">
                  {msg.content.includes('Instruction:') ? 'Instruction' : 'Summary'}
                </div>
              )}
              <div>{isSpecialMessage ? msg.content.replace('Instruction:', '').replace('Summary:', '') : msg.content}</div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
});

export default ChatMessages;
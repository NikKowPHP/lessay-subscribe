'use client';

import { useEffect, useRef, useState } from 'react';
import logger from '@/utils/logger';
import { ipaToSpeechMap } from '@/utils/phonemeMapper';

interface PhonemePlayerProps {
  ipa: string;
  language?: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}


const PhonemePlayer: React.FC<PhonemePlayerProps> = ({ 
  ipa, 
  language = 'en-US',
  label = 'Play',
  size = 'md'
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  
  useEffect(() => {
    // Initialize speech synthesis
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }
    
    // Cleanup
    return () => {
      if (synthRef.current && synthRef.current.speaking) {
        synthRef.current.cancel();
      }
    };
  }, []);
  
  const playPhoneme = () => {
    if (!synthRef.current) {
      logger.error("Speech synthesis not available");
      return;
    }
    
    // If already speaking, cancel it
    if (synthRef.current.speaking) {
      synthRef.current.cancel();
    }
    
    setIsPlaying(true);
    
    // Try to find a mapping for the IPA symbol
    let textToSpeak = ipa;
    let langToUse = language;
    
    // Remove brackets if present
    const cleanIpa = ipa.replace(/[\[\]\/]/g, '');
    
    // Check if we have a mapping for this IPA symbol
    if (ipaToSpeechMap[cleanIpa]) {
      textToSpeak = ipaToSpeechMap[cleanIpa].text;
      langToUse = ipaToSpeechMap[cleanIpa].lang;
    }
    
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = langToUse;
    utterance.rate = 0.8; // Slightly slower rate for clarity
    
    utterance.onend = () => {
      setIsPlaying(false);
    };
    
    utterance.onerror = (event) => {
      logger.error("Speech synthesis error", event);
      setIsPlaying(false);
    };
    
    synthRef.current.speak(utterance);
  };

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
  };
  
  return (
    <button
      onClick={playPhoneme}
      disabled={isPlaying}
      aria-label={`Play ${ipa} pronunciation`}
      className={`
        ${sizeClasses[size]} 
        rounded-full 
        flex items-center justify-center
        bg-blue-100 hover:bg-blue-200 
        dark:bg-blue-900 dark:hover:bg-blue-800
        text-blue-600 dark:text-blue-300
        focus:outline-none focus:ring-2 focus:ring-blue-500
        transition-colors
        ${isPlaying ? 'opacity-60' : ''}
      `}
    >
      {isPlaying ? (
        <span className="animate-pulse">◼</span>
      ) : (
        <span>▶</span>
      )}
    </button>
  );
};

export default PhonemePlayer;
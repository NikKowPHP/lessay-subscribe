'use client';

import { useRef, useState } from 'react';
import logger from '@/utils/logger';
import { fetchPollyAudio } from '@/utils/phoneme-audio.handler.util';
import { cacheAudio, getCachedAudio, getCacheKey } from '@/utils/phoneme-audio.cacher.util';

interface PhonemePlayerProps {
  ipa: string;
  language?: string;
  size?: 'sm' | 'md' | 'lg';
}


const PhonemePlayer: React.FC<PhonemePlayerProps> = ({ 
  ipa, 
  language = 'en-US',
  size = 'md'
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);


  const playPhoneme = async () => {
    if (isPlaying || isLoading) return;
    
    setIsLoading(true);
    
    try {

      const cleanIpa = ipa.replace(/[\[\]\/]/g, '');
      const cachedAudio = getCachedAudio(cleanIpa, language);

      let audioUrl: string;
      
      if (cachedAudio) {
        audioUrl = `data:audio/mpeg;base64,${cachedAudio}`;
      } else {
        audioUrl = await fetchPollyAudio(ipa, language);
        await cacheAudio(cleanIpa, language, audioUrl);
      }

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.addEventListener('play', () => {
        setIsPlaying(true);
        setIsLoading(false);
      });

      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        audioRef.current = null;
      });

      audio.addEventListener('error', () => {
        setIsPlaying(false);
        setIsLoading(false);
        audioRef.current = null;
        logger.error("Audio playback failed");
      });

      await audio.play();
    } catch (error) {
      setIsLoading(false);
      logger.error("Playback error:", error);
    }
  };

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
  };
  
  return (
    <button
      onClick={playPhoneme}
      disabled={isLoading || isPlaying}
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
        ${(isLoading || isPlaying) ? 'opacity-60' : ''}
      `}
    >
      {isLoading ? (
        <span className="animate-spin">⏳</span>
      ) : isPlaying ? (
        <span className="animate-pulse">◼</span>
      ) : (
        <span>▶</span>
      )}
    </button>
  );
};

export default PhonemePlayer;
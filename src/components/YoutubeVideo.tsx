'use client'
import React, { useEffect, useRef } from 'react';

interface YouTubeVideoProps {
  videoId: string;
  pageLoaded: boolean;
}

const YouTubeVideo: React.FC<YouTubeVideoProps> = ({ videoId, pageLoaded }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
   
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && iframeRef.current) {
            // Autoplay the video when the iframe is in view
            iframeRef.current.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`;
          } else if (iframeRef.current) {
            // Stop the video when the iframe is out of view
            iframeRef.current.src = `https://www.youtube.com/embed/${videoId}`;
          }
        });
      },
      {
        root: null, // Use the viewport as the root
        threshold: 0.5, // Trigger when 50% of the video is visible
      }
    );

    if (iframeRef.current) {
      observer.observe(iframeRef.current);
    }

    return () => {
      if (iframeRef.current) {
        observer.unobserve(iframeRef.current);
      }
    };
  }, [videoId, pageLoaded]);

  return (
    <div className="relative w-full max-w-4xl border border-red-500 rounded-xl">
      <div className="relative pt-[56.25%]">

      
      <iframe
        ref={iframeRef}
        className="absolute top-0 left-0 w-full h-full rounded-xl"
        src={`https://www.youtube.com/embed/${videoId}`}
        title="YouTube video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        />
        </div>
    </div>
  );
};

export default YouTubeVideo;

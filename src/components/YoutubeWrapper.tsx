'use client'
import { useEffect, useState } from 'react'
import YouTubeVideo from './YoutubeVideo'

const YouTubeVideoWrapper = ({ videoId }: { videoId: string }) => {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return <div className="animate-pulse h-40 bg-gray-200 rounded-xl" />
  }

  return <YouTubeVideo videoId={videoId} pageLoaded={isClient} />
}

export default YouTubeVideoWrapper
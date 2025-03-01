import logger from "./logger";


export const getCacheKey = (cleanIpa: string, lang: string) => 
  `audio-${cleanIpa}-${lang}`.replace(/[^a-zA-Z0-9-]/g, '_');

export const getCachedAudio = (cleanIpa: string, lang: string) => {
  const key = getCacheKey(cleanIpa, lang);
  const cached = localStorage.getItem(key);
  if (!cached) return null;
  
  try {
    const { timestamp, data } = JSON.parse(cached);
    // Cache valid for 7 days
    if (Date.now() - timestamp > 604800000) return null;
    return data;
  } catch (error) {
    logger.error('Cache parse error:', error);
    return null;
  }
};

export const cacheAudio = async (cleanIpa: string, lang: string, audioUrl: string) => {
  try {
    const key = getCacheKey(cleanIpa, lang);
    const audioBlob = await fetch(audioUrl).then(res => res.blob());
    const reader = new FileReader();
    
    reader.onloadend = () => {
      const base64data = reader.result;
      if (typeof base64data === 'string') {
        localStorage.setItem(
          key,
          JSON.stringify({
            timestamp: Date.now(),
            data: base64data.split(',')[1] // Store only the data part
          })
        );
      }
    };
    
    reader.readAsDataURL(audioBlob);
  } catch (error) {
    logger.error('Caching failed:', error);
  }
};
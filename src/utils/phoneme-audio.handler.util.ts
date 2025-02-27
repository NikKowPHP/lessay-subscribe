import logger from "./logger";


export const fetchPollyAudio = async (ipa: string, language: string) => {
  try {
    const request = createRequestBody(ipa, language);
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) throw new Error('Failed to fetch audio');
    
    const audioBlob = await response.blob();
    debugger
    return URL.createObjectURL(audioBlob);
  } catch (error) {
    logger.error('Polly audio fetch error:', error);
    throw error;
  }
};


const createRequestBody = (ipa: string, language: string) => {
  const text = `<speak><phoneme alphabet="ipa" ph="${ipa}">${ipa}</phoneme></speak>`;
  return {
    text: text,
    language: language,
  };
};
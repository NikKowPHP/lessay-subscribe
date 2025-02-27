export const getTtsVoiceId = (language: string) => {
  // Map language codes to preferred Polly voices
  const voiceMap: Record<string, string> = {
    'en-US': 'Joanna',
    'en-GB': 'Amy',
    'fr-FR': 'Céline',
    'de-DE': 'Vicki',
    'es-ES': 'Lucia',
    'ar-SA': 'Zeina'
  };
  return voiceMap[language] || 'Joanna';
};
// Neural voices only - Updated 2024-03-01
// Full list: https://docs.aws.amazon.com/polly/latest/dg/voicelist.html
export const getTtsVoiceId = (language: string) => {
  const neuralVoices: Record<string, string> = {
    // Arabic
    'ar-AE': 'Hala',        // Female - Modern Standard Arabic
    'ar-SA': 'Zeina',       // Female - Modern Standard Arabic
    
    // Chinese
    'cmn-CN': 'Zhiyu',      // Female - Mandarin
    'yue-CN': 'Hiujin',     // Female - Cantonese
    
    // Dutch
    'nl-NL': 'Laura',       // Female - Dutch
    
    // English
    'en-AU': 'Olivia',      // Female - Australian English
    'en-GB': 'Amy',         // Female - British English
    'en-IN': 'Kajal',       // Female - Indian English
    'en-US': 'Joanna',      // Female - US English
    
    // French
    'fr-CA': 'Léa',         // Female - Canadian French
    'fr-FR': 'Céline',      // Female - French
    
    // German
    'de-DE': 'Vicki',       // Female - German
    
    // Hebrew
    'he-IL': 'Hagit',       // Female - Hebrew
    
    // Hindi
    'hi-IN': 'Kajal',       // Female - Hindi
    
    // Italian
    'it-IT': 'Bianca',      // Female - Italian
    
    // Japanese
    'ja-JP': 'Takumi',      // Male - Japanese
    
    // Korean
    'ko-KR': 'Seoyeon',     // Female - Korean
    
    // Norwegian
    'nb-NO': 'Ida',         // Female - Norwegian
    
    // Polish
    'pl-PL': 'Ola',         // Female - Polish
    
    // Portuguese
    'pt-BR': 'Camila',      // Female - Brazilian Portuguese
    'pt-PT': 'Inês',        // Female - European Portuguese
    
    // Romanian
    'ro-RO': 'Carmen',      // Female - Romanian
    
    // Russian
    'ru-RU': 'Tatyana',     // Female - Russian
    
    // Spanish
    'es-ES': 'Lucia',       // Female - European Spanish
    'es-MX': 'Mia',         // Female - Mexican Spanish
    'es-US': 'Lupe',        // Female - US Spanish
    
    // Swedish
    'sv-SE': 'Elin',        // Female - Swedish
    
    // Turkish
    'tr-TR': 'Filiz',       // Female - Turkish
    
    // Welsh
    'cy-GB': 'Gwyneth',     // Female - Welsh
  };

  return neuralVoices[language] || 'Joanna'; // Fallback to Joanna (en-US)
};
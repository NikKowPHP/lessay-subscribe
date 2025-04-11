export const mapLanguageToGoogleBasicVoice = (language: string): string => {
  const languageMap: Record<string, string> = {
   // European languages
   german: 'de-DE-Wavenet-F',
   french: 'fr-FR-Wavenet-A',
   spanish: 'es-ES-Wavenet-C',
   italian: 'it-IT-Wavenet-A',
   portuguese: 'pt-BR-Wavenet-A',
   dutch: 'nl-NL-Wavenet-B',
   polish: 'pl-PL-Wavenet-A',
   swedish: 'sv-SE-Wavenet-A',
   danish: 'da-DK-Wavenet-A',
   norwegian: 'nb-NO-Wavenet-E',
   finnish: 'fi-FI-Wavenet-A',
   czech: 'cs-CZ-Wavenet-A',
   slovak: 'sk-SK-Wavenet-A',
   hungarian: 'hu-HU-Wavenet-A',
   romanian: 'ro-RO-Wavenet-A',
   greek: 'el-GR-Wavenet-A',
   english: 'en-US-Chirp3-HD-Aoede',

   // Asian languages
   japanese: 'ja-JP-Wavenet-B',
   korean: 'ko-KR-Wavenet-A',
   chinese: 'cmn-CN-Wavenet-A', // Mandarin
   vietnamese: 'vi-VN-Wavenet-A',
   thai: 'th-TH-Wavenet-C',
   indonesian: 'id-ID-Wavenet-A',
   malay: 'ms-MY-Wavenet-A',
   hindi: 'hi-IN-Wavenet-A',
   tamil: 'ta-IN-Wavenet-A',
   bengali: 'bn-IN-Wavenet-A',

   // Middle Eastern languages
   arabic: 'ar-XA-Wavenet-B',
   turkish: 'tr-TR-Wavenet-A',
   hebrew: 'he-IL-Wavenet-A',
   persian: 'fa-IR-Wavenet-A',

   // Other languages
   russian: 'ru-RU-Wavenet-D',
   ukrainian: 'uk-UA-Wavenet-A',
   filipino: 'fil-PH-Wavenet-A',
   swahili: 'sw-KE-Wavenet-A',
  };

  // Convert to lowercase and remove any whitespace
  const normalizedLanguage = language.toLowerCase().trim();
  
  // Return the mapped code or default to English
  return languageMap[normalizedLanguage] || 'en-US-Chirp3-HD-F';
};
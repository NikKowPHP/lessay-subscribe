export const mapLanguageToGoogleHDVoice = (language: string): string => {
  const languageMap: Record<string, string> = {
   // European languages
   german: 'de-DE-Chirp3-HD-Aoede',
   french: 'fr-FR-Chirp3-HD-Aoede',
   spanish: 'es-ES-Chirp3-HD-Aoede',
   italian: 'it-IT-Chirp3-HD-Aoede',
   portuguese: 'pt-BR-Chirp3-HD-Aoede',
   dutch: 'nl-NL-Chirp3-HD-Aoede',
   polish: 'pl-PL-Chirp3-HD-Aoede',
   swedish: 'sv-SE-Chirp3-HD-Aoede',
   danish: 'da-DK-Chirp3-HD-Aoede',
   norwegian: 'nb-NO-Chirp3-HD-Aoede',
   finnish: 'fi-FI-Chirp3-HD-Aoede',
   czech: 'cs-CZ-Chirp3-HD-Aoede',
   slovak: 'sk-SK-Chirp3-HD-Aoede',
   hungarian: 'hu-HU-Chirp3-HD-Aoede',
   romanian: 'ro-RO-Chirp3-HD-Aoede',
   greek: 'el-GR-Chirp3-HD-Aoede',
   english: 'en-US-Chirp3-HD-Aoede',
   // Asian languages
   japanese: 'ja-JP-Chirp3-HD-Aoede',
   korean: 'ko-KR-Chirp3-HD-Aoede',
   chinese: 'cmn-CN-Chirp3-HD-Aoede', // Mandarin
   vietnamese: 'vi-VN-Chirp3-HD-Aoede',
   thai: 'th-TH-Chirp3-HD-Aoede',
   indonesian: 'id-ID-Chirp3-HD-Aoede',
   malay: 'ms-MY-Chirp3-HD-Aoede',
   hindi: 'hi-IN-Chirp3-HD-Aoede',
   tamil: 'ta-IN-Chirp3-HD-Aoede',
   bengali: 'bn-IN-Chirp3-HD-Aoede',

   // Middle Eastern languages
   arabic: 'ar-XA-Chirp3-HD-Aoede',
   turkish: 'tr-TR-Chirp3-HD-Aoede',
   hebrew: 'he-IL-Chirp3-HD-Aoede',
   persian: 'fa-IR-Chirp3-HD-Aoede',

   // Other languages
   russian: 'ru-RU-Chirp3-HD-Aoede',
   ukrainian: 'uk-UA-Chirp3-HD-Aoede',
   filipino: 'fil-PH-Chirp3-HD-Aoede',
   swahili: 'sw-KE-Chirp3-HD-Aoede',
  };

  // Convert to lowercase and remove any whitespace
  const normalizedLanguage = language.toLowerCase().trim();
  
  // Return the mapped code or default to English
  return languageMap[normalizedLanguage] || 'en-US-Chirp3-HD-Aoede';
};
export const mapLanguageToCode = (language: string): string => {
  const languageMap: Record<string, string> = {
    'german': 'de-DE',
    'english': 'en-US',
    'french': 'fr-FR',
    'spanish': 'es-ES',
    'italian': 'it-IT',
    'chinese': 'zh-CN',
    'japanese': 'ja-JP',
    'korean': 'ko-KR',
    // Add more mappings as needed
  };

  // Convert to lowercase and remove any whitespace
  const normalizedLanguage = language.toLowerCase().trim();
  
  // Return the mapped code or default to English
  return languageMap[normalizedLanguage] || 'en-US';
};
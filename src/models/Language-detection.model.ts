

interface LanguageDetectionResponse {
  language: string;
  confidence: number;
  possible_alternatives: string[];
  language_family: string;
}

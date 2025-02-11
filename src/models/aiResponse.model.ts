export interface PhonemeAnalysis {
  phoneme: string;
  example: string;
  analysis: string;
  IPA_target: string;
  IPA_observed: string;
}

export interface SuprasegmentalFeatureAnalysis {
  feature: string;
  observation: string;
}

export interface AIResponse {
  language_identification: string;
  confidence_level: string;
  user_native_language_guess: string;
  native_language_influence_analysis: string;
  'language-specific_phonological_assessment': PhonemeAnalysis[];
  suprasegmental_features_analysis: SuprasegmentalFeatureAnalysis[];
  'cross-linguistic_influence_note': string;
  CEFR_aligned_proficiency_indicators: string;
  personalized_learning_pathway_suggestions: string[];
  call_to_action: string;
}

export class AIResponseModel {
  static fromJson(json: any): AIResponse {
    try {
      console.log('Parsing JSON:', JSON.stringify(json, null, 2));

      const response: AIResponse = {
        language_identification: json.language_identification || 'Unknown',
        confidence_level: json.confidence_level || '0%',
        user_native_language_guess: json.user_native_language_guess || 'Unknown',
        native_language_influence_analysis: json.native_language_influence_analysis || 'N/A',
        'language-specific_phonological_assessment': 
          Array.isArray(json['language-specific_phonological_assessment']) 
            ? json['language-specific_phonological_assessment'] 
            : [],
        suprasegmental_features_analysis: 
          Array.isArray(json.suprasegmental_features_analysis)
            ? json.suprasegmental_features_analysis
            : [],
        'cross-linguistic_influence_note': json['cross-linguistic_influence_note'] || 'N/A',
        CEFR_aligned_proficiency_indicators: json.CEFR_aligned_proficiency_indicators || 'N/A',
        personalized_learning_pathway_suggestions: 
          Array.isArray(json.personalized_learning_pathway_suggestions)
            ? json.personalized_learning_pathway_suggestions
            : [],
        call_to_action: json.call_to_action || 'Please provide a clear speech sample for analysis.'
      };

      return response;
    } catch (error) {
      console.error("Error parsing AI response:", error);
      console.error("Received JSON:", json);
      return {
        language_identification: "Error processing response",
        confidence_level: "0%",
        user_native_language_guess: "Unknown",
        native_language_influence_analysis: "An error occurred while processing the analysis",
        'language-specific_phonological_assessment': [],
        suprasegmental_features_analysis: [],
        'cross-linguistic_influence_note': "N/A",
        CEFR_aligned_proficiency_indicators: "N/A",
        personalized_learning_pathway_suggestions: [
          "Please try again with a clear speech sample"
        ],
        call_to_action: "An error occurred. Please try again with a clear speech sample."
      };
    }
  }
}

export const mockResponse = [
  {
    "language_identification": "German",
    "confidence_level": "99.9%",
    "user_native_language_guess": "Russian",
    "native_language_influence_analysis": "The speaker's native language appears to be from the Slavic language family, most likely Russian or a closely related language. This is evident in several aspects of their German pronunciation and prosody, which will be detailed below.",
    "language-specific_phonological_assessment": [
      {
        "phoneme": "/r/",
        "example": "andere",
        "analysis": "The German uvular fricative /r/ (as in 'andere') is often realized as an alveolar trill [r] or tap [ɾ], typical of Slavic languages, instead of the German standard pronunciation. The target sound is produced in the back of the mouth, while the speaker's production is further forward.",
        "IPA_target": "ʁ",
        "IPA_observed": "r ~ ɾ"
      },
      {
        "phoneme": "/x/",
        "example": "gemacht",
        "analysis": "The voiceless velar fricative /x/ (as in 'gemacht') is sometimes lenited (weakened), approaching a breathy [h] sound, or having a slight fronting, indicating a potential influence from the speaker's native phonological inventory.",
        "IPA_target": "x",
        "IPA_observed": "x ~ h"
      },
      {
        "phoneme": "vowel length",
        "example": "viele",
        "analysis": "German has a phonemic distinction between long and short vowels. The speaker sometimes shortens long vowels, as heard in 'viele', or lengthens short ones. This affects comprehensibility as vowel length can distinguish word meaning in German (e.g., 'Statt' /ʃtat/ (city) vs. 'Staat' /ʃtaːt/ (state)).",
        "IPA_target": "iː",
        "IPA_observed": "i"
      }
    ],
    "suprasegmental_features_analysis": [
      {
        "feature": "Rhythm",
        "observation": "German is considered a stress-timed language, whereas many Slavic languages are syllable-timed. The speaker exhibits a tendency towards syllable-timing, giving each syllable roughly equal prominence, resulting in a less 'natural' German rhythm. The rhythm also sounds slightly hesitant due to frequent pauses and fillers."
      },
      {
        "feature": "Intonation",
        "observation": "The speaker's intonation patterns often deviate from standard German. Sentence-final intonation sometimes rises where a fall would be expected in declarative sentences in German, possibly reflecting the intonation patterns of their native language."
      }
    ],
    "cross-linguistic_influence_note": "The devoicing of final obstruents (consonants like /b/, /d/, /ɡ/) is a common feature in many Slavic languages, and while the speaker does a fair job maintaining voiced final obstruents in German (which doesn't have final obstruent devoicing), the general Slavic influence is noticeable in the subtle ways described above. The rhythm and vowel length differences are particularly strong indicators.",
    "CEFR_aligned_proficiency_indicators": "Based on the sample, the speaker demonstrates characteristics consistent with the B1-B2 range of the Common European Framework of Reference for Languages (CEFR). They can communicate on familiar topics, but pronunciation and fluency issues sometimes impede clear understanding.",
    "personalized_learning_pathway_suggestions": [
      "Focus on mastering the German uvular fricative /r/, practicing minimal pairs to distinguish it from alveolar realizations.",
      "Practice vowel length distinctions using minimal pairs and listening exercises.",
      "Work on German sentence stress and intonation patterns, focusing on the stress-timed rhythm.",
      "Engage in shadowing exercises with native German speakers to internalize the rhythm and melody of the language."
    ],
    "call_to_action": "Sign up for our waitlist today! You've made a good start in learning German. Our platform offers comprehensive, language-specific modules designed to refine your pronunciation, focusing on those key differences between German and Slavic phonology. We'll help you achieve a more natural and fluent German accent with personalized exercises and expert feedback. We have special modules for speakers with Slavic L1 to develop their German."
  }
]

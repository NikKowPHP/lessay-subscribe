import logger from "@/utils/logger";

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
  language_specific_phonological_assessment: PhonemeAnalysis[];
  suprasegmental_features_analysis: SuprasegmentalFeatureAnalysis[];
  cross_linguistic_influence_note: string;
  CEFR_aligned_proficiency_indicators: string;
  personalized_learning_pathway_suggestions: string[];
  call_to_action: string;
}

// Define a new interface for the detailed deep analysis response
export interface DetailedAIResponse {
  primary_analysis: {
    identified_language: string;
    confidence_score: number;
    accent_classification: {
      primary_accent: string;
      regional_influences: string[];
      confidence_level: number;
    };
    native_language_assessment: {
      probable_l1: string;
      confidence_level: number;
      supporting_features: string[];
    };
  };
  phonetic_analysis: {
    vowel_production: Array<{
      phoneme: string;
      target_realization: string;
      observed_realization: string;
      example_word: string;
      timestamp: number;
      analysis: string;
    }>;
    consonant_production: Array<{
      phoneme: string;
      target_realization: string;
      observed_realization: string;
      example_word: string;
      timestamp: number;
      analysis: string;
    }>;
  };
  prosodic_features: {
    rhythm_patterns: {
      description: string;
      notable_features: string[];
      impact_on_intelligibility: string;
    };
    stress_patterns: {
      word_level: string[];
      sentence_level: string[];
      deviations: string[];
    };
    intonation: {
      patterns: string[];
      notable_features: string[];
      l1_influence: string;
    };
  };
  diagnostic_markers: Array<{
    feature: string;
    description: string;
    impact: string;
    frequency: "rare" | "occasional" | "frequent";
  }>;
  proficiency_assessment: {
    cefr_level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
    intelligibility_score: number;
    fluency_rating: number;
    accent_strength: number;
    detailed_evaluation: string;
  };
  improvement_plan: {
    priority_areas: Array<{
      focus: string;
      importance: "high" | "medium" | "low";
      exercises: string[];
      expected_timeline: string;
    }>;
    recommended_resources: string[];
    practice_strategies: string[];
  };
  summary: {
    key_strengths: string[];
    primary_challenges: string[];
    overall_assessment: string;
  };
}



export const mockResponse = [
  {
    language_identification: "German",
    confidence_level: "99.9%",
    user_native_language_guess: "Russian",
    native_language_influence_analysis: "The speaker's native language appears to be of Slavic origin.",
    "language-specific_phonological_assessment": [
      {
        phoneme: "/r/",
        example: "andere",
        analysis: "The speaker uses an alveolar trill instead of the standard uvular fricative.",
        IPA_target: "ʁ",
        IPA_observed: "[r]"
      }
    ],
    suprasegmental_features_analysis: [],
    "cross-linguistic_influence_note": "N/A",
    CEFR_aligned_proficiency_indicators: "B1-B2",
    personalized_learning_pathway_suggestions: [
      "Practice minimal pairs for /r/ articulation."
    ],
    call_to_action: "Please provide a clear speech sample for analysis.",
    detailed_accent_analysis: {
      primary_analysis: {
        identified_language: "German",
        confidence_score: 99,
        accent_classification: {
          primary_accent: "Central European",
          regional_influences: ["Slavic"],
          confidence_level: 95
        },
        native_language_assessment: {
          probable_l1: "Russian",
          confidence_level: 90,
          supporting_features: ["trilled /r/ substitution"]
        }
      },
      phonetic_analysis: {
        vowel_production: [
          {
            phoneme: "iː",
            target_realization: "iː",
            observed_realization: "ɪ",
            example_word: "viele",
            timestamp: 12,
            analysis: "Shortened vowel duration detected."
          }
        ],
        consonant_production: [
          {
            phoneme: "ʁ",
            target_realization: "ʁ",
            observed_realization: "r",
            example_word: "anders",
            timestamp: 5,
            analysis: "Region-specific variant."
          }
        ]
      },
      prosodic_features: {
        rhythm_patterns: {
          description: "Stress-timed rhythm typical of German.",
          notable_features: ["irregular stress patterns"],
          impact_on_intelligibility: "Mild reduction in clarity."
        },
        stress_patterns: {
          word_level: ["unstressed in multi-syllabic words"],
          sentence_level: ["inconsistent stress distribution"],
          deviations: ["overgeneralized stress default"]
        },
        intonation: {
          patterns: ["falling intonation at sentence end"],
          notable_features: ["rising pitch mid-sentence"],
          l1_influence: "Subtle Slavic interference"
        }
      },
      diagnostic_markers: [
        {
          feature: "Vowel reduction",
          description: "Inconsistent vowel length and quality.",
          impact: "Affects clarity",
          frequency: "frequent"
        }
      ],
      proficiency_assessment: {
        cefr_level: "B1",
        intelligibility_score: 85,
        fluency_rating: 80,
        accent_strength: 75,
        detailed_evaluation: "Overall, the speaker demonstrates non-native features with room for improvement."
      },
      improvement_plan: {
        priority_areas: [
          {
            focus: "Vowel duration",
            importance: "high",
            exercises: ["minimal pairs", "prosody training"],
            expected_timeline: "4-6 weeks"
          }
        ],
        recommended_resources: ["Accent reduction workshops"],
        practice_strategies: ["shadowing native speakers"]
      },
      summary: {
        key_strengths: ["Good intonation control"],
        primary_challenges: ["Vowel reduction", "Consonant substitution"],
        overall_assessment: "Encouraging, with focused areas for improvement."
      }
    }
  }
];

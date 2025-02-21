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



export const mockResponse = 
  {
    language_identification: "German",
    confidence_level: "99.9%",
    user_native_language_guess: "Russian",
    native_language_influence_analysis: "The speaker's native language appears to be of Slavic origin.",
    language_specific_phonological_assessment: [
      {
        phoneme: "/r/",
        example: "andere",
        analysis: "The speaker uses an alveolar trill instead of the standard uvular fricative.",
        IPA_target: "ʁ",
        IPA_observed: "[r]"
      }
    ],
    suprasegmental_features_analysis: [],
    cross_linguistic_influence_note: "N/A",
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
  };


export const mockDetailedResponse = {
  primary_analysis: {
    identified_language: "English",
    confidence_score: 98,
    accent_classification: {
      primary_accent: "Non-Native English",
      regional_influences: [],
      confidence_level: 85,
    },
    native_language_assessment: {
      probable_l1: "Eastern European Language (likely Polish or Russian)",
      confidence_level: 75,
      supporting_features: [
        "Devoicing of voiced consonants in certain contexts",
        "Monophthongization of certain diphthongs",
        "Possible dentalization of alveolar consonants",
      ],
    },
  },
  phonetic_analysis: {
    vowel_production: [
      {
        phoneme: "/æ/",
        target_realization: "/æ/ (as in 'cat')",
        observed_realization: "/ɛ/ (closer to 'bet')",
        example_word: "platform",
        timestamp: 0.9,
        analysis:
          "The speaker tends to raise and front the /æ/ vowel, resulting in a sound closer to /ɛ/. This is a common feature in speakers whose native languages have a different vowel inventory.",
      },
      {
        phoneme: "/ʌ/",
        target_realization: "/ʌ/ (as in 'cut')",
        observed_realization: "/a/ (more open and back)",
        example_word: "understanding",
        timestamp: 25.2,
        analysis:
          "The /ʌ/ vowel is often produced as a more open /a/ sound, influenced by vowel systems where these distinctions are less pronounced.",
      },
      {
        phoneme: "/ɪ/",
        target_realization: "/ɪ/ (as in 'bit')",
        observed_realization: "/i/ (closer to 'beet')",
        example_word: "rigid",
        timestamp: 0.18,
        analysis:
          "Tendency to raise /ɪ/ towards /i/, reducing the distinction between these two vowels. This is also common for native speakers of some European languages",
      },
    ],
    consonant_production: [
      {
        phoneme: "/θ/",
        target_realization: "/θ/ (as in 'think')",
        observed_realization: "/t/ or /s/",
        example_word: "through",
        timestamp: 4.4,
        analysis:
          "The dental fricative /θ/ is often replaced with /t/, a common substitution influenced by the phonological systems of many languages that do not have this sound.",
      },
      {
        phoneme: "/ð/",
        target_realization: "/ð/ (as in 'this')",
        observed_realization: "/d/ or /z/",
        example_word: "this",
        timestamp: 9.1,
        analysis:
          "Similar to /θ/, the /ð/ sound is frequently replaced with /d/ due to the absence of this voiced dental fricative in many languages. Sometimes realized as /z/.",
      },
      {
        phoneme: "/v/",
        target_realization: "/v/ (as in 'very')",
        observed_realization: "/w/",
        example_word: "various",
        timestamp: 29.1,
        analysis:
          "The /v/ is sometimes realized as /w/, indicating influence from languages with a similar but distinct sound. Common in some dialects of Slavic languages.",
      },
    ],
  },
  prosodic_features: {
    rhythm_patterns: {
      description:
        "The speaker exhibits a tendency towards syllable-timed rhythm rather than the stress-timed rhythm characteristic of native English speech.",
      notable_features: [
        "More equal duration of syllables",
        "Less reduction of unstressed syllables",
        "Pauses occurring more frequently at syllable or word boundaries rather than within phrases",
      ],
      impact_on_intelligibility:
        "This can slightly reduce intelligibility for native English speakers, who are accustomed to hearing variations in syllable duration based on stress.",
    },
    stress_patterns: {
      word_level: [
        "Occasional misplacement of stress within words (e.g., stressing the first syllable of 'exercises' instead of the second)",
      ],
      sentence_level: [
        "Less emphasis on content words compared to function words, leading to a somewhat monotone delivery",
      ],
      deviations: [
        "Inconsistent stress placement affects the natural flow of speech and can occasionally obscure meaning.",
      ],
    },
    intonation: {
      patterns: [
        "Limited pitch range compared to native English speakers",
        "Less variation in intonation contours, resulting in a flatter overall prosody",
      ],
      notable_features: [
        "Tendency to use rising intonation even at the end of declarative sentences",
      ],
      l1_influence:
        "The relatively flat intonation and terminal rises may be influenced by the intonational patterns of the speaker's native language.",
    },
  },
  diagnostic_markers: [
    {
      feature: "Substitution of /θ/ and /ð/",
      description: "Replacing dental fricatives with alveolar stops or fricatives.",
      impact:
        "Can occasionally lead to misinterpretation (e.g., 'think' sounding like 'tink').",
      frequency: "Frequent",
    },
    {
      feature: "Vowel raising/fronting",
      description: "Raising and fronting of low vowels, particularly /æ/ and /ʌ/.",
      impact: "Affects the perceived quality of words, making the accent noticeable.",
      frequency: "Occasional",
    },
    {
      feature: "Syllable-timed rhythm",
      description: "Equalizing syllable durations.",
      impact:
        "Reduces the natural emphasis and flow of English speech, potentially affecting ease of comprehension.",
      frequency: "Frequent",
    },
  ],
  proficiency_assessment: {
    cefr_level: "B2",
    intelligibility_score: 80,
    fluency_rating: 75,
    accent_strength: 65,
    detailed_evaluation:
      "The speaker demonstrates good overall proficiency in English, capable of expressing complex ideas clearly. Intelligibility is generally high, though the non-native accent is noticeable and can occasionally require listeners to pay closer attention. Fluency is slightly impacted by occasional pauses and self-corrections.",
  },
  improvement_plan: {
    priority_areas: [
      {
        focus: "Dental Fricatives (/θ/ and /ð/)",
        importance: "High",
        exercises: [
          "Minimal pair drills (e.g., 'thin' vs. 'tin', 'this' vs. 'dis')",
          "Tongue placement exercises using a mirror",
          "Reading aloud with conscious attention to these sounds",
        ],
        expected_timeline: "6-8 weeks",
      },
      {
        focus: "Vowel Quality (especially /æ/ and /ʌ/)",
        importance: "Medium",
        exercises: [
          "Listening to native speakers and imitating their vowel sounds",
          "Using visual aids (e.g., vowel charts) to understand tongue placement",
          "Recording and comparing own pronunciation with native speakers",
        ],
        expected_timeline: "4-6 weeks",
      },
      {
        focus: "Prosody and Rhythm",
        importance: "Medium",
        exercises: [
          "Shadowing native speakers (imitating their intonation and rhythm)",
          "Practicing sentence stress and reduction of unstressed syllables",
          "Marking stressed syllables in written text and practicing aloud",
        ],
        expected_timeline: "8-10 weeks",
      },
    ],
    recommended_resources: [
      "Online pronunciation courses (e.g., Rachel's English)",
      "Interactive phonetic apps (e.g., Sounds Right)",
      "Recordings of native English speakers (podcasts, audiobooks)",
    ],
    practice_strategies: [
      "Consistent daily practice (15-30 minutes)",
      "Focusing on one specific sound or prosodic feature at a time",
      "Seeking feedback from native English speakers",
      "Using a recording device to monitor progress",
    ],
  },
  summary: {
    key_strengths: [
      "Good vocabulary and grammar",
      "Clear articulation of most sounds",
      "Ability to express complex ideas",
    ],
    primary_challenges: [
      "Inconsistent pronunciation of specific sounds (/θ/, /ð/, /æ/, /ʌ/)",
      "Slightly monotone prosody and syllable-timed rhythm",
      "Occasional misplacement of word stress",
    ],
    overall_assessment:
      "The speaker is a proficient English user with a noticeable non-native accent. Targeted practice on specific sounds and prosodic features can significantly improve their intelligibility and communication effectiveness.",
  },
};
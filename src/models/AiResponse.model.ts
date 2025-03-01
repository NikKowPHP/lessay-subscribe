import { YoutubeVideo } from "./YoutubeVideo.model";

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
  language_analyzed: string;
  analyzed_language_code: string;
  accent_identification: {
    accent_type: string;
    specific_accent: string;
    confidence_level: string;
    accent_strength: string;
  },
  speaker_background: {
    probable_native_language: string;
    probable_region: string;
    confidence: string;
    supporting_evidence: string[];
  },
  language_specific_phonological_assessment: [
    {
      phoneme: string;
      example: string;
      analysis: string;
      IPA_target: string;
      IPA_observed: string;
    }
  ],
  suprasegmental_features_analysis: {
    feature: string;
    observation: string;
    comparison: string;
  }[];
  diagnostic_accent_markers: {
    feature: string;
    description: string;
    association: string;
  }[];
  proficiency_assessment: {
    intelligibility: string;
    fluency: string;
    CEFR_level: string;
  };
  improvement_suggestions: {
    focus_area: string;
    importance: "High" | "Medium" | "Low";
    exercises: string[];
    youtube_search_prompt: string;
    youtubeVideos?: YoutubeVideo[];
  }[];
}




// Define a new interface for the detailed deep analysis response
export interface DetailedAIResponse {
  accent_analysis: {
    language_analyzed: string; 
    analyzed_language_code: string;
    accent_classification: {
      accent_type: string;
      specific_accent: string;
      confidence_level: number;
      accent_strength: string;
    };
    speaker_background: {
      probable_native_language: string;
      probable_region: string;
      confidence_level: number;
      supporting_evidence: string[];
    };
  };
  phonetic_analysis: {
    vowel_production: Array<{
      phoneme: string;
      standard_realization: string;
      observed_realization: string;
      example_word: string;
      timestamp: number;
      analysis: string;
      accent_marker: boolean;
    }>;
    consonant_production: Array<{
      phoneme: string;
      standard_realization: string;
      observed_realization: string;
      example_word: string;
      timestamp: number;
      analysis: string;
      accent_marker: boolean;
    }>;
  };
  prosodic_features: {
    rhythm_patterns: {
      description: string;
      standard_pattern: string;
      observed_pattern: string;
      accent_association: string;
    };
    stress_patterns: {
      word_level: {
        description: string;
        accent_association: string;
      };
      sentence_level: {
        description: string;
        accent_association: string;
      };
    };
    intonation: {
      patterns: string[];
      accent_association: string;
    };
  };
  diagnostic_accent_markers: Array<{
    feature: string;
    description: string;
    example: string;
    timestamp: number;
    accent_association: string;
    frequency: string;
  }>;
  proficiency_assessment: {
    intelligibility_score: number;
    fluency_rating: number;
    comprehensibility: number;
    CEFR_pronunciation_level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
    accent_impact_assessment: string;
  };
  improvement_plan: {
    priority_areas: Array<{
      focus: string;
      importance: "High" | "Medium" | "Low";
      exercises: string[];
      expected_timeline: string;
      youtube_search_prompt: string;
      youtubeVideos?: YoutubeVideo[];
    }>;
    recommended_resources: string[];
    practice_strategies: string[];
  };
  linguistic_background_insights: {
    probable_l1_transfer_effects: string[];
    cultural_speech_patterns: string[];
    multilingual_influences: string[];
  };
}



export const mockResponse = {
  language_analyzed: "German",
  analyzed_language_code: "de-DE",
  accent_identification: {
    accent_type: "Non-native accent",
    specific_accent: "Slavic-influenced German",
    confidence_level: "95%",
    accent_strength: "Moderate",
  },
  speaker_background: {
    probable_native_language: "Russian",
    probable_region: "Eastern Europe",
    confidence: "90%",
    supporting_evidence: ["trilled /r/ substitution"],
  },
  language_specific_phonological_assessment: [
    {
      phoneme: "/r/",
      example: "andere",
      analysis: "The speaker uses an alveolar trill instead of the standard uvular fricative.",
      IPA_target: "ʁ",
      IPA_observed: "[r]",
    },
  ],
  suprasegmental_features_analysis: [
    {
      feature: "Rhythm/Intonation/Stress",
      observation: "Slightly syllable-timed rhythm with less variation in intonation.",
      comparison: "Deviates from the stress-timed rhythm of standard German.",
    },
  ],
  diagnostic_accent_markers: [
    {
      feature: "Alveolar trill for /r/",
      description: "Use of [r] instead of the uvular fricative [ʁ].",
      association: "Common in Slavic languages.",
    },
  ],
  proficiency_assessment: {
    intelligibility: "80%",
    fluency: "75%",
    CEFR_level: "B1",
  },
  improvement_suggestions: [
    {
      focus_area: "Pronunciation of /r/",
      importance: "High",
      exercises: ["Practice uvular fricative [ʁ] using minimal pairs."],
    },
  ],
};

export const mockDetailedResponse = {
  accent_analysis: {
    language_analyzed: "English",
    analyzed_language_code: "en-US",
    accent_classification: {
      accent_type: "Non-native accent",
      specific_accent: "Eastern European-influenced English",
      confidence_level: 90,
      accent_strength: "Moderate",
    },
    speaker_background: {
      probable_native_language: "Polish",
      probable_region: "Eastern Europe",
      confidence_level: 85,
      supporting_evidence: [
        "Devoicing of voiced consonants in certain contexts",
        "Monophthongization of certain diphthongs",
      ],
    },
  },
  phonetic_analysis: {
    vowel_production: [
      {
        phoneme: "/æ/",
        standard_realization: "/æ/ (as in 'cat')",
        observed_realization: "/ɛ/ (closer to 'bet')",
        example_word: "platform",
        timestamp: 0.9,
        analysis:
          "The speaker tends to raise and front the /æ/ vowel, resulting in a sound closer to /ɛ/. This is a common feature in speakers whose native languages have a different vowel inventory.",
        accent_marker: true,
      },
      {
        phoneme: "/ʌ/",
        standard_realization: "/ʌ/ (as in 'cut')",
        observed_realization: "/a/ (more open and back)",
        example_word: "understanding",
        timestamp: 25.2,
        analysis:
          "The /ʌ/ vowel is often produced as a more open /a/ sound, influenced by vowel systems where these distinctions are less pronounced.",
        accent_marker: true,
     
      },
      {
        phoneme: "/ɪ/",
        standard_realization: "/ɪ/ (as in 'bit')",
        observed_realization: "/i/ (closer to 'beet')",
        example_word: "rigid",
        timestamp: 0.18,
        analysis:
          "Tendency to raise /ɪ/ towards /i/, reducing the distinction between these two vowels. This is also common for native speakers of some European languages",
        accent_marker: true,
      },
    ],
    consonant_production: [
      {
        phoneme: "/θ/",
        standard_realization: "/θ/ (as in 'think')",
        observed_realization: "/t/ or /s/",
        example_word: "through",
        timestamp: 4.4,
        analysis:
          "The dental fricative /θ/ is often replaced with /t/, a common substitution influenced by the phonological systems of many languages that do not have this sound.",
        accent_marker: true,

      },
      {
        phoneme: "/ð/",
        standard_realization: "/ð/ (as in 'this')",
        observed_realization: "/d/ or /z/",
        example_word: "this",
        timestamp: 9.1,
        analysis:
          "Similar to /θ/, the /ð/ sound is frequently replaced with /d/ due to the absence of this voiced dental fricative in many languages. Sometimes realized as /z/.",
        accent_marker: true,
      },
      {
        phoneme: "/v/",
        standard_realization: "/v/ (as in 'very')",
        observed_realization: "/w/",
        example_word: "various",
        timestamp: 29.1,
        analysis:
          "The /v/ is sometimes realized as /w/, indicating influence from languages with a similar but distinct sound. Common in some dialects of Slavic languages.",
        accent_marker: true,
      },
    ],
  },
  prosodic_features: {
    rhythm_patterns: {
      description:
        "The speaker exhibits a tendency towards syllable-timed rhythm rather than the stress-timed rhythm characteristic of native English speech.",
      standard_pattern: "Stress-timed rhythm",
      observed_pattern: "Syllable-timed rhythm",
      accent_association: "Eastern European languages",
    },
    stress_patterns: {
      word_level: {
        description: "Occasional misplacement of stress within words",
        accent_association: "L1 interference",
      },
      sentence_level: {
        description: "Less emphasis on content words compared to function words",
        accent_association: "Monotone delivery",
      },
    },
    intonation: {
      patterns: ["Limited pitch range compared to native English speakers"],
      accent_association: "Eastern European languages",
    },
  },
  diagnostic_accent_markers: [
    {
      feature: "Substitution of /θ/ and /ð/",
      description: "Replacing dental fricatives with alveolar stops or fricatives.",
      example: "'think' sounding like 'tink'",
      timestamp: 4.4,
      accent_association: "Common in many languages",
      frequency: "Frequent",
    },
    {
      feature: "Vowel raising/fronting",
      description: "Raising and fronting of low vowels, particularly /æ/ and /ʌ/.",
      example: "'cat' sounding like 'ket'",
      timestamp: 0.9,
      accent_association: "Eastern European languages",
      frequency: "Occasional",
    },
    {
      feature: "Syllable-timed rhythm",
      description: "Equalizing syllable durations.",
      example: "Speech sounds more monotone",
      timestamp: 29.1,
      accent_association: "Slavic languages",
      frequency: "Frequent",
    },
  ],
  proficiency_assessment: {
    intelligibility_score: 80,
    fluency_rating: 75,
    comprehensibility: 85,
    CEFR_pronunciation_level: "B2",
    accent_impact_assessment:
      "The speaker demonstrates good overall proficiency in English, but the non-native accent is noticeable and can occasionally require listeners to pay closer attention.",
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
        youtube_search_prompt: "/θ/ and /ð/ English pronunciation",
        youtubeVideos: [],
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
        youtube_search_prompt: "/æ/ and /ʌ/ English pronunciation",
        youtubeVideos: [],
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
        youtube_search_prompt: " Prosody and Rhythm English pronunciation",
        youtubeVideos: [],
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
  linguistic_background_insights: {
    probable_l1_transfer_effects: [
      "Devoicing of voiced consonants",
      "Monophthongization of diphthongs",
    ],
    cultural_speech_patterns: ["Direct communication style"],
    multilingual_influences: [],
  },
};
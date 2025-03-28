// Mock Audio Metrics Data - based on the response format from messageGenerator.ts
export const mockAudioMetrics: Record<string, unknown> = {
  // Top-level metrics (0-100 scale)
  pronunciationScore: 78.5,
  fluencyScore: 82.3,
  grammarScore: 75.0, 
  vocabularyScore: 80.2,
  overallPerformance: 79.0,
  
  // CEFR level and trajectory
  proficiencyLevel: "B1",
  learningTrajectory: "accelerating",
  
  // Detailed pronunciation assessment
  pronunciationAssessment: {
    overall_score: 78.5,
    native_language_influence: {
      level: "moderate",
      specific_features: [
        "vowel substitution in stressed syllables",
        "consonant simplification in word-final positions",
        "retroflex consonant pronunciation"
      ]
    },
    phoneme_analysis: [
      {
        phoneme: "ð",
        target_realization: "ð",
        user_realization: "d",
        accuracy: 65,
        examples: ["the", "other", "them"]
      },
      {
        phoneme: "æ",
        target_realization: "æ",
        user_realization: "ɛ",
        accuracy: 70,
        examples: ["cat", "that", "map"]
      },
      {
        phoneme: "ɹ",
        target_realization: "ɹ",
        user_realization: "ɾ",
        accuracy: 75,
        examples: ["red", "around", "very"]
      }
    ],
    problematic_sounds: ["ð", "æ", "ŋ", "θ"],
    strengths: [
      "consistent production of diphthongs",
      "accurate stress patterns in multi-syllable words",
      "good control of plosive consonants"
    ],
    areas_for_improvement: [
      "dental fricatives (th sounds)",
      "vowel distinction in minimal pairs",
      "nasal consonant clarity"
    ]
  },
  
  // Detailed fluency assessment
  fluencyAssessment: {
    overall_score: 82.3,
    speech_rate: {
      words_per_minute: 105,
      evaluation: "appropriate"
    },
    hesitation_patterns: {
      frequency: "occasional",
      average_pause_duration: 0.8,
      typical_contexts: [
        "before complex grammatical structures",
        "when searching for specific vocabulary",
        "after being asked a new question"
      ]
    },
    rhythm_and_intonation: {
      naturalness: 76,
      sentence_stress_accuracy: 82,
      intonation_pattern_accuracy: 78
    }
  },
  
  // Detailed grammar assessment
  grammarAssessment: {
    overall_score: 75.0,
    error_patterns: [
      {
        category: "verb tense",
        description: "inconsistent use of past tense forms",
        examples: ["yesterday I go to the store", "she didn't went"],
        frequency: "occasional",
        severity: "moderate"
      },
      {
        category: "article usage",
        description: "omission of definite articles",
        examples: ["I went to store", "he is best student"],
        frequency: "frequent",
        severity: "minor"
      },
      {
        category: "subject-verb agreement",
        description: "third person singular present tense errors",
        examples: ["she play piano", "it make sense"],
        frequency: "occasional",
        severity: "moderate"
      }
    ],
    grammar_rules_to_review: [
      {
        rule: "past tense irregular verbs",
        priority: "high",
        examples: ["go/went", "buy/bought", "think/thought"]
      },
      {
        rule: "definite article usage",
        priority: "medium",
        examples: ["the hospital", "the university", "the best"]
      },
      {
        rule: "subject-verb agreement",
        priority: "high",
        examples: ["she plays", "he works", "it costs"]
      }
    ],
    grammar_strengths: [
      "consistent word order in statements",
      "accurate use of common prepositions",
      "good command of present simple tense"
    ]
  },
  
  // Detailed vocabulary assessment
  vocabularyAssessment: {
    overall_score: 80.2,
    range: "adequate",
    appropriateness: 85,
    precision: 78,
    areas_for_expansion: [
      {
        topic: "emotions and feelings",
        suggested_vocabulary: ["frustrated", "anxious", "relieved", "delighted", "concerned"]
      },
      {
        topic: "academic discussion",
        suggested_vocabulary: ["analyze", "evaluate", "consider", "perspective", "assertion"]
      },
      {
        topic: "daily routines",
        suggested_vocabulary: ["commute", "manage", "schedule", "appointment", "organize"]
      }
    ]
  },
  
  // Exercise completion assessment
  exerciseCompletion: {
    overall_score: 81.5,
    exercises_analyzed: [
      {
        prompt: "Describe your typical morning routine.",
        expected_answer: "Free response focusing on daily activities using present simple.",
        user_response: "I wake up at 7, then I eating breakfast and go to work by bus.",
        accuracy: 85,
        error_analysis: "One verb tense error (eating instead of eat)"
      },
      {
        prompt: "What did you do last weekend?",
        expected_answer: "Free response using past tense verbs.",
        user_response: "Last weekend I went to the park and play football with friends.",
        accuracy: 80,
        error_analysis: "Mixed tense usage (went vs play)"
      },
      {
        prompt: "How would you improve public transportation in your city?",
        expected_answer: "Conditional/hypothetical structures with modal verbs.",
        user_response: "I think we need more buses and the trains should be more frequent.",
        accuracy: 90,
        error_analysis: "Good modal verb usage, clear structure"
      }
    ],
    comprehension_level: "good"
  },
  
  // Learning recommendations
  suggestedTopics: [
    "Past Tense Narratives",
    "Describing Emotions and Feelings",
    "Daily Routines and Habits",
    "Making Comparisons"
  ],
  grammarFocusAreas: [
    "Past Tense Forms",
    "Articles (a/an/the)",
    "Subject-Verb Agreement"
  ],
  vocabularyDomains: [
    "Emotional Expression",
    "Academic Discussion",
    "Work and Daily Life"
  ],
  nextSkillTargets: [
    "Proper use of articles in complex phrases",
    "Past simple vs present perfect distinction",
    "Expansion of descriptive vocabulary"
  ],
  
  // Learning style observations
  preferredPatterns: [
    "visual learning with examples",
    "interactive practice over theory",
    "responds well to error correction"
  ],
  effectiveApproaches: [
    "conversational practice with feedback",
    "pattern recognition exercises",
    "situational role-playing"
  ],
  
  // Metadata
  audioRecordingUrl: "https://api.example.com/recordings/lesson123.mp3",
  recordingDuration: 325.5 // seconds
};
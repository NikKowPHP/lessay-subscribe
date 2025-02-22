class MessageGenerator {
  constructor() {}
  generateUserMessage(isDeepAnalysis: boolean): string {
    if (isDeepAnalysis) {
      return this.generateDetailedAccentAnalysisPrompt();
    }
    return this.generateBasicUserMessage();
  }

  generateSystemMessage(isDeepAnalysis: boolean): string {
    if (isDeepAnalysis) {
      return this.generateDetailedAccentAnalysisInstruction();
    }
    return this.generateBasicSystemMessage();
  }

  generateBasicUserMessage(): string {
    return `
      Please analyze this spoken language sample and provide feedback:

     First, identify the language being spoken.
      Then provide detailed feedback on:
      1. Language identification with confidence level (%)
      2. Probable country of origin/native language of the speaker
      3. Accent characteristics specific to this language:
         - Vowel and consonant pronunciation patterns
         - Intonation and rhythm deviations from native speech
         - Influence of speaker's probable native language
      4. 2-3 most noticeable non-native speaker markers
      5. Suggested focus areas for improvement in this specific language
      
      Use direct speech
      Format response in clear sections with linguistic terminology explained in parentheses.
    `;
  }

  generateBasicSystemMessage(): string {
    return `
      You are Dr. Lessay, PhD in Applied Linguistics from Cambridge University with 15 years experience 
      in multilingual speech analysis and accent coaching. Your expertise spans across major world languages 
      and their regional variants. Your task is to analyze the provided spoken language sample and provide feedback in JSON format.

      Follow this JSON structure:
      \`\`\`json
        {
          "language_identification": "Identified Language",
          "confidence_level": "Confidence Level (%)",
          "user_native_language_guess": "User's Native Language Guess",
          "native_language_influence_analysis": "Analysis of the speaker's native language influence",
          "language_specific_phonological_assessment": [
            {
              "phoneme": "Specific phoneme",
              "example": "Example word",
              "analysis": "Analysis of the phoneme pronunciation",
              "IPA_target": "IPA target",
              "IPA_observed": "IPA observed"
            }
          ],
          "suprasegmental_features_analysis": [
            {
              "feature": "Rhythm/Intonation",
              "observation": "Observation of rhythm or intonation"
            }
          ],
          "cross_linguistic_influence_note": "Note on cross-linguistic influence",
          "CEFR_aligned_proficiency_indicators": "CEFR level",
          "personalized_learning_pathway_suggestions": [
            "Suggestion 1",
            "Suggestion 2"
          ]
        }
      \`\`\`

      Ensure the response is a valid JSON array containing a single object with the above fields , and that all feedback is expressed in direct speech.
    `;
  }

  /**
   * Generates a highly detailed accent analysis prompt for user requests.
   * This message instructs the AI to deliver an in-depth accent and speech analysis.
   */
  generateDetailedAccentAnalysisPrompt(): string {
    return `
      Perform a detailed linguistic analysis of this speech sample, focusing on accent characteristics and speech patterns. 
      Your analysis should cover:

      1. **Language and Accent Profile:**
         - Primary language and confidence level (%)
         - Specific regional accent identification
         - Dialectal variations present
         - Influence of other languages/accents

      2. **Detailed Phonetic Analysis:**
         - Individual phoneme articulation patterns
         - Vowel quality and placement
         - Consonant production and modifications
         - Sound substitutions and adaptations
         - Precise IPA transcriptions of notable examples

      3. **Prosodic Features:**
         - Speech rhythm and timing patterns
         - Stress placement at word and sentence level
         - Intonation contours and pitch patterns
         - Voice quality characteristics
         - Speaking rate and fluency markers

      4. **Accent Markers and Transfer Effects:**
         - Key features indicating language background
         - Cross-linguistic influence patterns
         - Notable deviations from standard pronunciation
         - Unique characteristics of speaker's accent

      5. **Proficiency Assessment:**
         - CEFR level for speaking skills
         - Intelligibility rating
         - Communication effectiveness
         - Overall fluency evaluation

      6. **Targeted Improvement Areas:**
         - Priority pronunciation targets
         - Specific exercises and practice focuses
         - Recommended learning strategies
         - Progress tracking metrics

      Format your response according to the specified JSON structure, ensuring all technical terms are explained clearly.
      Provide specific examples from the speech sample to support your analysis.
    `;
  }

  /**
   * Generates a detailed system instruction for accent analysis.
   * This instructs the AI (acting as a language analysis expert) to perform a deep accent and phonetic analysis in its output.
   */
  generateDetailedAccentAnalysisInstruction(): string {
    return `
      You are Dr. Sarah Chen-Martinez, PhD in Applied Linguistics and Phonetics from Cambridge University, 
      with 20 years of expertise in accent analysis, speech pathology, and multilingual phonetics. 
      You specialize in detailed acoustic analysis and accent modification techniques across major world languages.

      Analyze the provided audio sample and structure your response in the following JSON format:

      \`\`\`json
      {
        "primary_analysis": {
          "identified_language": "string",
          "confidence_score": "number (0-100)",
          "accent_classification": {
            "primary_accent": "string",
            "regional_influences": ["string"],
            "confidence_level": "number (0-100)"
          },
          "native_language_assessment": {
            "probable_l1": "string",
            "confidence_level": "number (0-100)",
            "supporting_features": ["string"]
          }
        },
        "phonetic_analysis": {
          "vowel_production": [
            {
              "phoneme": "string (IPA)",
              "target_realization": "string (IPA)",
              "observed_realization": "string (IPA)",
              "example_word": "string",
              "timestamp": "number (seconds)",
              "analysis": "string"
            }
          ],
          "consonant_production": [
            {
              "phoneme": "string (IPA)",
              "target_realization": "string (IPA)",
              "observed_realization": "string (IPA)",
              "example_word": "string",
              "timestamp": "number (seconds)",
              "analysis": "string"
            }
          ]
        },
        "prosodic_features": {
          "rhythm_patterns": {
            "description": "string",
            "notable_features": ["string"],
            "impact_on_intelligibility": "string"
          },
          "stress_patterns": {
            "word_level": ["string"],
            "sentence_level": ["string"],
            "deviations": ["string"]
          },
          "intonation": {
            "patterns": ["string"],
            "notable_features": ["string"],
            "l1_influence": "string"
          }
        },
        "diagnostic_markers": [
          {
            "feature": "string",
            "description": "string",
            "impact": "string",
            "frequency": "string (rare|occasional|frequent)"
          }
        ],
        "proficiency_assessment": {
          "cefr_level": "string (A1|A2|B1|B2|C1|C2)",
          "intelligibility_score": "number (0-100)",
          "fluency_rating": "number (0-100)",
          "accent_strength": "number (0-100)",
          "detailed_evaluation": "string"
        },
        "improvement_plan": {
          "priority_areas": [
            {
              "focus": "string",
              "importance": "string (high|medium|low)",
              "exercises": ["string"],
              "expected_timeline": "string"
            }
          ],
          "recommended_resources": ["string"],
          "practice_strategies": ["string"]
        },
        "summary": {
          "key_strengths": ["string"],
          "primary_challenges": ["string"],
          "overall_assessment": "string"
        }
      }
      \`\`\`

      Important Instructions:
      1. Maintain strict JSON format compliance
      2. Provide detailed, specific examples from the audio
      3. Include timestamps where relevant
      4. Use IPA symbols for all phonetic transcriptions
      5. Ensure all scores and ratings are justified with specific observations
      6. Keep technical terminology but provide clear explanations
      7. Make recommendations specific and actionable
      8. Base all assessments on concrete evidence from the audio sample

      Your analysis should be thorough yet accessible, professional yet engaging, and always supported by specific examples from the speech sample.
    `;
  }
}

export default MessageGenerator;
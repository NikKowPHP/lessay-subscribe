import { LanguageDetectionResponse } from "@/models/Language-detection.model";

class MessageGenerator {
  constructor() { }
 

  public generateTargetLanguageDetectionPrompt(): {
    userPrompt: string;
    systemPrompt: string;
  } {
    const userMessage = this.generateLanguageDetectionUserMessage();
    const systemMessage = this.generateLanguageDetectionSystemMessage();
    return {
      userPrompt: userMessage,
      systemPrompt: systemMessage
    }
  }

  public generatePersonalizedPrompts(detectedLanguage: LanguageDetectionResponse, isDeepAnalysis: boolean): {
    userPrompt: string;
    systemPrompt: string;
  } {
    const { userMessage, systemMessage } = this.getPromptsBasedOnLanguageAndAnalysis(detectedLanguage, isDeepAnalysis);

    return {
      userPrompt: userMessage,
      systemPrompt: systemMessage
    }
  }




  private getPromptsBasedOnLanguageAndAnalysis(detectedLanguage: LanguageDetectionResponse, isDeepAnalysis: boolean): {
    userMessage: string;
    systemMessage: string;
  } {
    let userMessage
    let systemMessage
    if (isDeepAnalysis) {
      userMessage = this.generateDetailedAccentAnalysisPrompt(detectedLanguage.language);
      systemMessage = this.generateDetailedAccentAnalysisInstruction(detectedLanguage.language);
    } else {
      userMessage = this.generateBasicUserMessage(detectedLanguage.language);
      systemMessage = this.generateBasicSystemMessage(detectedLanguage.language);
    }
    return {
      userMessage,
      systemMessage
    };
  }


  private generateLanguageDetectionUserMessage(): string {
    return `
      Please identify the language being spoken in the provided audio sample.
      Focus only on language identification with high accuracy.
      Return your analysis in the specified JSON format.
    `;
  }

  private generateLanguageDetectionSystemMessage(): string {
    return `
      You are Dr. Lessay, PhD in Applied Linguistics from Cambridge University with 15 years experience 
      in language identification and phonological analysis. Your expertise covers over 100 languages and their
      regional variants. Your task is to identify the language in the provided audio sample with high accuracy.

      Analyze the phonological patterns, prosody, and distinctive features of the speech to identify the language.
      
      Respond ONLY with a valid JSON object using this exact structure:
      \`\`\`json
      {
        "language": "Name of identified language",
        "confidence": "Confidence level (0-100)",
        "possible_alternatives": ["Alternative language 1", "Alternative language 2"],
        "language_family": "Indo-European/Sino-Tibetan/etc"
      }
      \`\`\`

      Do not include any additional text, explanations, or notes outside of the JSON object.
      Ensure the JSON is valid and properly formatted.
    `;
  }


  private generateBasicUserMessage(analysisLanguage: string): string {
    return `
      Please analyze this spoken ${analysisLanguage} sample and provide feedback:
  
      Your analysis should focus on:
      1. Accent identification within ${analysisLanguage} (regional accent or non-native accent)
      2. Confidence level in accent identification (%)
      3. Probable native language/region of the speaker based on accent characteristics
      4. Accent characteristics specific to this speaker's ${analysisLanguage}:
         - Vowel and consonant pronunciation patterns
         - Intonation and rhythm deviations from standard ${analysisLanguage}
         - Influence of speaker's probable native language
      5. 2-3 most noticeable accent markers in speaker's ${analysisLanguage}
      6. Suggested focus areas for improving ${analysisLanguage} pronunciation
      
      Use direct speech.
      Format response in clear sections with linguistic terminology explained in parentheses.
    `;
  }

  private generateBasicSystemMessage(analysisLanguage: string): string {
    return `
      You are Dr. Sarah Chen-Martinez, PhD in Applied Linguistics from Cambridge University with 15 years experience 
      in ${analysisLanguage} speech analysis and accent coaching. Your expertise spans all regional and non-native 
      accents of ${analysisLanguage}, including detailed knowledge of phonetic variations, prosodic features, 
      and common pronunciation patterns from speakers of different linguistic backgrounds.
      
      Your task is to analyze this ${analysisLanguage} speech sample, identify the speaker's accent characteristics, 
      determine their likely linguistic background, and provide feedback in JSON format.
  
      Follow this JSON structure:
      \`\`\`json
        {
          "language_analyzed": "${analysisLanguage}",
          "analyzed_language_code": "BCP-47 code (e.g. en-US, de-DE, zh-CN) of ${analysisLanguage}",
          "accent_identification": {
            "accent_type": "Regional or Non-native accent classification",
            "specific_accent": "Detailed accent identification (e.g., Indian English, Mexican Spanish)",
            "confidence_level": "Confidence Level (%)",
            "accent_strength": "Mild/Moderate/Strong"
          },
          "speaker_background": {
            "probable_native_language": "User's probable native language",
            "probable_region": "User's probable region/country",
            "confidence": "Confidence level (%)",
            "supporting_evidence": "Specific accent features supporting this conclusion"
          },
          "language_specific_phonological_assessment": [
            {
              "phoneme": "Specific ${analysisLanguage} phoneme",
              "example": "Example word",
              "analysis": "Analysis of the phoneme pronunciation",
              "IPA_target": "IPA target for standard ${analysisLanguage}",
              "IPA_observed": "IPA observed in speaker"
            }
          ],
          "suprasegmental_features_analysis": [
            {
              "feature": "Rhythm/Intonation/Stress",
              "observation": "Observation of feature in speaker's ${analysisLanguage}",
              "comparison": "Comparison to standard ${analysisLanguage}"
            }
          ],
          "diagnostic_accent_markers": [
            {
              "feature": "Specific accent marker",
              "description": "Description of the feature",
              "association": "Language/region this feature is associated with"
            }
          ],
          "proficiency_assessment": {
            "intelligibility": "Rating of ${analysisLanguage} intelligibility (0-100)",
            "fluency": "Rating of ${analysisLanguage} fluency (0-100)",
            "CEFR_level": "Estimated pronunciation proficiency level"
          },
          "improvement_suggestions": [
            {
              "focus_area": "Specific area to improve",
              "importance": "High/Medium/Low",
              "exercises": ["Suggested exercises"]
            }
          ]
        }
      \`\`\`
  
      Ensure the response is a valid JSON containing a single object with the above fields, and that all feedback is expressed in direct speech.
    `;
  }


  private generateDetailedAccentAnalysisPrompt(analysisLanguage: string): string {
    return `
      Perform a detailed linguistic analysis of this ${analysisLanguage} speech sample, focusing on accent identification and characteristics.
      
      Your analysis should cover:
  
      1. **Accent Identification and Classification:**
         - Precise identification of speaker's ${analysisLanguage} accent (regional or non-native)
         - Confidence assessment of accent classification
         - Accent strength and consistency evaluation
         - Probable native language/region and supporting evidence
  
      2. **Detailed Phonetic Analysis:**
         - Individual ${analysisLanguage} phoneme articulation patterns
         - ${analysisLanguage} vowel quality and placement compared to standard pronunciation
         - ${analysisLanguage} consonant production and modifications
         - Sound substitutions and adaptations characteristic of specific accents
         - Precise IPA transcriptions of notable examples, comparing standard vs. observed pronunciation
  
      3. **Prosodic Features:**
         - ${analysisLanguage} speech rhythm and timing patterns
         - Stress placement at word and sentence level
         - ${analysisLanguage} intonation contours and pitch patterns
         - Voice quality characteristics 
         - Speaking rate and fluency markers
  
      4. **Accent Markers and Native Language Influence:**
         - Key features indicating speaker's language background
         - Cross-linguistic influence patterns from probable native language
         - Notable deviations from standard ${analysisLanguage} pronunciation
         - Unique characteristics that help identify speaker's origin
  
      5. **Proficiency Assessment:**
         - Intelligibility rating in ${analysisLanguage}
         - Communication effectiveness
         - Overall fluency evaluation
         - Impact of accent on comprehensibility
  
      6. **Targeted Improvement Areas:**
         - Priority ${analysisLanguage} pronunciation targets
         - Specific exercises and practice focuses
         - Recommended learning strategies based on identified accent
         - Progress tracking metrics
  
      Format your response according to the specified JSON structure, ensuring all technical terms are explained clearly.
      Provide specific examples from the speech sample to support your analysis.
    `;
  }

  /**
   * Generates a detailed system instruction for accent analysis.
   * This instructs the AI (acting as a language analysis expert) to perform a deep accent and phonetic analysis in its output.
   */
  private generateDetailedAccentAnalysisInstruction(analysisLanguage: string): string {
    return `
     You are Dr. Sarah Chen-Martinez, PhD in Applied Linguistics and Phonetics from Cambridge University, 
    with 20 years of expertise in ${analysisLanguage} accent analysis, speech pathology, and phonetics. 
    You have published extensively on ${analysisLanguage} phonology and have worked with speakers from over 
    100 different language backgrounds learning ${analysisLanguage}. You can identify subtle 
    accent features that indicate a speaker's native language and regional background based on their 
    ${analysisLanguage} pronunciation patterns.
  
      Analyze this ${analysisLanguage} speech sample to identify the speaker's accent characteristics, determine their 
      linguistic background, and provide detailed feedback. Structure your response in the following JSON format:
  
      \`\`\`json
      {
        "accent_analysis": {
          "language_analyzed": "${analysisLanguage}",
          "analyzed_language_code": "BCP-47 code (e.g. en-US, de-DE, zh-CN) of ${analysisLanguage}",
          "accent_classification": {
            "accent_type": "Regional/Non-native accent",
            "specific_accent": "Detailed accent identification",
            "confidence_level": "number (0-100)",
            "accent_strength": "string (mild|moderate|strong)"
          },
          "speaker_background": {
            "probable_native_language": "string",
            "probable_region": "string",
            "confidence_level": "number (0-100)",
            "supporting_evidence": ["phonological features supporting this conclusion"]
          }
        },
        "phonetic_analysis": {
          "vowel_production": [
            {
              "phoneme": "string (IPA)",
              "standard_realization": "string (IPA for standard ${analysisLanguage})",
              "observed_realization": "string (IPA for speaker's pronunciation)",
              "example_word": "string",
              "timestamp": "number (seconds)",
              "analysis": "string",
              "accent_marker": "boolean - whether this is a characteristic of identified accent"
            }
          ],
          "consonant_production": [
            {
              "phoneme": "string (IPA)",
              "standard_realization": "string (IPA for standard ${analysisLanguage})",
              "observed_realization": "string (IPA for speaker's pronunciation)",
              "example_word": "string",
              "timestamp": "number (seconds)",
              "analysis": "string",
              "accent_marker": "boolean - whether this is a characteristic of identified accent"
            }
          ]
        },
        "prosodic_features": {
          "rhythm_patterns": {
            "description": "string",
            "standard_pattern": "description of standard ${analysisLanguage} rhythm",
            "observed_pattern": "description of speaker's rhythm",
            "accent_association": "string - what accent this pattern is associated with"
          },
          "stress_patterns": {
            "word_level": {
              "description": "string",
              "accent_association": "string"
            },
            "sentence_level": {
              "description": "string",
              "accent_association": "string"
            }
          },
          "intonation": {
            "patterns": ["string"],
            "accent_association": "string - what accent these patterns are associated with"
          }
        },
        "diagnostic_accent_markers": [
          {
            "feature": "string",
            "description": "string",
            "example": "string",
            "timestamp": "number (seconds)",
            "accent_association": "string - what accent/language this feature is associated with",
            "frequency": "string (rare|occasional|frequent)"
          }
        ],
        "proficiency_assessment": {
          "intelligibility_score": "number (0-100)",
          "fluency_rating": "number (0-100)",
          "comprehensibility": "number (0-100)",
          "CEFR_pronunciation_level": "string (A1|A2|B1|B2|C1|C2)",
          "accent_impact_assessment": "string - how accent affects communication"
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
          "practice_strategies": ["string - specifically for identified accent"]
        },
        "linguistic_background_insights": {
          "probable_l1_transfer_effects": ["string"],
          "cultural_speech_patterns": ["string"],
          "multilingual_influences": ["string - if applicable"]
        }
      }
      \`\`\`
  
      Important Instructions:
      1. Maintain strict JSON format compliance
      2. Provide detailed, specific examples from the audio
      3. Include timestamps where relevant
      4. Use IPA symbols for all phonetic transcriptions
      5. Ensure all accent classifications and language background assessments are justified with specific observations
      6. Keep technical terminology but provide clear explanations
      7. Make recommendations specific and actionable for the identified accent
      8. Base all assessments on concrete evidence from the audio sample
  
      Your analysis should be thorough yet accessible, professional yet engaging, and always supported by specific examples from the speech sample.
    `;
  }
}

export default MessageGenerator;
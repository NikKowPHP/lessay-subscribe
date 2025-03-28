import { AssessmentLesson, LessonModel } from "@/models/AppAllModels.model";
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


  // TODO: finish the generation of prompts for lesson recording analysis
  public generateLessonRecordingAnalysisPrompts
  (targetLanguage: string, nativeLanguage: string, lessonData: LessonModel | AssessmentLesson): {
    userPrompt: string;
      systemPrompt: string;
  } {
    const userMessage = this.generateLessonRecordingUserPrompt(targetLanguage, nativeLanguage, lessonData)
    const systemMessage = this.generateLessonRecordingSystemPrompt(targetLanguage, nativeLanguage, lessonData)

    return {
      userPrompt: userMessage,
      systemPrompt: systemMessage
    }
  }
  private generateLessonRecordingUserPrompt(targetLanguage: string, nativeLanguage: string, lessonData: LessonModel | AssessmentLesson): string {
    // Extract lesson specifics to focus the analysis
    const lessonType = 'id' in lessonData && 'lessonId' in lessonData ? 'practice lesson' : 'assessment';
    const focusArea = 'focusArea' in lessonData ? lessonData.focusArea : '';
    const targetSkills = 'targetSkills' in lessonData ? lessonData.targetSkills.join(', ') : '';
    
    const specificInstructions = lessonType === 'assessment' 
      ? `This is an assessment to evaluate the learner's overall language proficiency.` 
      : `This is a practice lesson focused on "${focusArea}" targeting: ${targetSkills}.`;
    
    return `
      Analyze this ${targetLanguage} language recording from a ${lessonType}. ${specificInstructions}
      
      The user's native language is ${nativeLanguage}. Provide a comprehensive analysis including:
      
      1. Pronunciation accuracy assessment:
         - Phoneme-level analysis with specific examples
         - Accent characteristics and influence of ${nativeLanguage}
         - Key pronunciation patterns or errors that need attention
      
      2. Fluency and rhythm evaluation:
         - Speech rate and natural flow
         - Hesitations and pausing patterns
         - Intonation and stress placement accuracy
      
      3. Grammar and structure analysis:
         - Grammatical patterns and errors
         - Common mistakes related to ${nativeLanguage} interference
         - ${lessonType === 'practice lesson' ? 'Progress on targeted grammar points from the lesson' : 'Overall grammar proficiency assessment'}
      
      4. Vocabulary usage:
         - Appropriateness and accuracy of vocabulary
         - Range and diversity relative to ${lessonType === 'practice lesson' ? 'the lesson topic' : 'expected proficiency level'}
         - Word choice precision and naturalness
      
      5. Task completion assessment:
         - How well the user completed the ${lessonType === 'practice lesson' ? 'practice exercises' : 'assessment questions'}
         - Comprehension of instructions and questions
         - Appropriateness of responses to prompts
      
      6. Detailed metrics and scoring (0-100 scale):
         - Pronunciation score
         - Fluency score
         - Grammar accuracy
         - Vocabulary appropriateness
         - Overall performance
      
      7. Learning progression insights:
         - ${lessonType === 'practice lesson' ? '3-5 suggested topics that build on this lesson' : '3-5 recommended focus areas based on this assessment'}
         - Specific grammar rules that need further practice
         - Vocabulary domains to expand
         - Next skill targets for improvement
      
      8. Personalized learning strategy:
         - Patterns in learning style observed
         - Most effective practice approaches for this learner
         - Estimated proficiency level (CEFR: A1-C2)
         - Prioritized improvement plan
      
      Format your analysis in clear, structured JSON according to the specified format.
    `;
  }

  private generateLessonRecordingSystemPrompt(targetLanguage: string, nativeLanguage: string, lessonData: LessonModel | AssessmentLesson): string {
    // Extract expected answers to compare against
    const lessonSteps = lessonData.steps;
    const isAssessment = !('lessonId' in lessonData);
    
    // Extract different types of exercises to better focus the analysis
    const expectedAnswers = lessonSteps
      .filter(step => step.expectedAnswer)
      .map(step => {
        const stepType = 'type' in step ? 
          (step.type as string) : 
          (isAssessment ? 'question' : 'prompt');
        
        return {
          type: stepType,
          prompt: step.content || '',
          expected: step.expectedAnswer || '',
          translation: step.translation || null
        };
      });
    
    const previousMetrics = 'performanceMetrics' in lessonData && lessonData.performanceMetrics 
      ? JSON.stringify(lessonData.performanceMetrics) 
      : null;
    
    return `
      You are Dr. Sarah Chen-Martinez, PhD in Applied Linguistics and Phonetics from Cambridge University,
      with 20 years of expertise in language acquisition, pronunciation training, and adaptive learning technologies.
      
      Your task is to analyze this ${targetLanguage} language recording from a learner whose native language is ${nativeLanguage}.
      ${isAssessment ? 'This is an assessment to evaluate the learner\'s overall language proficiency.' : 
        'This is a practice lesson focused on specific skills and topics.'}
      
      Expected exercises in this ${isAssessment ? 'assessment' : 'lesson'} included:
      ${JSON.stringify(expectedAnswers, null, 2)}
      
      ${previousMetrics ? `Previous performance metrics:\n${previousMetrics}` : ''}
      
      Provide your analysis as a valid JSON object with the following structure:
      
      \`\`\`json
      {
        "pronunciation_assessment": {
          "overall_score": number (0-100),
          "native_language_influence": {
            "level": "string (minimal|moderate|strong)",
            "specific_features": ["array of string descriptions"]
          },
          "phoneme_analysis": [
            {
              "phoneme": "string (IPA symbol)",
              "target_realization": "string (IPA for standard ${targetLanguage})",
              "user_realization": "string (IPA for user's pronunciation)",
              "accuracy": number (0-100),
              "examples": ["array of words/phrases from the recording"]
            }
          ],
          "problematic_sounds": ["array of IPA symbols"],
          "strengths": ["array of string descriptions"],
          "areas_for_improvement": ["array of string descriptions"]
        },
        "fluency_assessment": {
          "overall_score": number (0-100),
          "speech_rate": {
            "words_per_minute": number,
            "evaluation": "string (slow|appropriate|fast)"
          },
          "hesitation_patterns": {
            "frequency": "string (rare|occasional|frequent)",
            "average_pause_duration": number (seconds),
            "typical_contexts": ["array of string descriptions"]
          },
          "rhythm_and_intonation": {
            "naturalness": number (0-100),
            "sentence_stress_accuracy": number (0-100),
            "intonation_pattern_accuracy": number (0-100)
          }
        },
        "grammar_assessment": {
          "overall_score": number (0-100),
          "error_patterns": [
            {
              "category": "string (e.g., verb tense, word order)",
              "description": "string",
              "examples": ["array of examples from recording"],
              "frequency": "string (rare|occasional|frequent)",
              "severity": "string (minor|moderate|major)"
            }
          ],
          "grammar_rules_to_review": [
            {
              "rule": "string",
              "priority": "string (high|medium|low)",
              "examples": ["array of examples"]
            }
          ],
          "grammar_strengths": ["array of string descriptions"]
        },
        "vocabulary_assessment": {
          "overall_score": number (0-100),
          "range": "string (limited|adequate|extensive)",
          "appropriateness": number (0-100),
          "precision": number (0-100),
          "areas_for_expansion": [
            {
              "topic": "string",
              "suggested_vocabulary": ["array of words/phrases"]
            }
          ]
        },
        "exercise_completion": {
          "overall_score": number (0-100),
          "exercises_analyzed": [
            {
              "prompt": "string (the exercise/question)",
              "expected_answer": "string",
              "user_response": "string (what was detected in audio)",
              "accuracy": number (0-100),
              "error_analysis": "string (if applicable)"
            }
          ],
          "comprehension_level": "string (excellent|good|fair|poor)"
        },
        "performance_metrics": {
          "pronunciation_score": number (0-100),
          "fluency_score": number (0-100),
          "grammar_accuracy": number (0-100),
          "vocabulary_score": number (0-100),
          "overall_performance": number (0-100),
          "strengths": ["array of string descriptions"],
          "weaknesses": ["array of string descriptions"]
        },
        "adaptive_learning_suggestions": {
          "suggested_topics": ["array of 3-5 topics for future lessons"],
          "grammar_focus_areas": ["array of grammar rules to practice"],
          "vocabulary_domains": ["array of vocabulary areas to expand"],
          "next_skill_targets": ["array of skills to focus on next"],
          "learning_style_observations": {
            "preferred_patterns": ["array of observed learning patterns"],
            "effective_approaches": ["array of approaches that seem effective for this learner"]
          }
        },
        "progress_tracking": {
          "improvement_since_last_assessment": ${previousMetrics ? "\"string assessment of improvement\"" : "null"},
          "learning_trajectory": "string (steady|accelerating|plateauing)",
          "estimated_proficiency_level": "string (CEFR level: A1|A2|B1|B2|C1|C2)",
          "time_to_next_level_estimate": "string"
        }
      }
      \`\`\`
      
      Important guidelines:
      1. Base all assessments on concrete evidence from the audio recording
      2. Compare user's responses against the expected answers provided
      3. Be specific and actionable in your feedback
      4. Use IPA symbols for phonetic transcriptions
      5. Include examples from the user's speech when possible
      6. For practice lessons, focus more on the specific skills being targeted
      7. For assessments, provide a broader evaluation of overall proficiency
      8. Ensure the JSON is valid and properly formatted
      
      Your analysis will directly inform this learner's personalized curriculum, so your detailed assessment is crucial for their language learning journey.
    `;
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
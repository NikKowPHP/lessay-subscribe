class MessageGenerator {
  constructor() {}

  generateUserMessage(recording: any): string {
    return `
      Please analyze this spoken language sample and provide feedback directly to the speaker:
      "${recording}"

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
      
      Format response in clear sections with linguistic terminology explained in parentheses.
      Conclude with an encouraging note about our full platform's language learning and accent improvement modules.
    `;
  }

  generateSystemMessage(): string {
    return `
      You are Dr. Lessay, PhD in Applied Linguistics from Cambridge University with 15 years experience 
      in multilingual speech analysis and accent coaching. Your expertise spans across major world languages 
      and their regional variants. Your task is to analyze the provided spoken language sample and provide feedback in JSON format.

      Follow this JSON structure:
      \`\`\`json
      [
        {
          "language_identification": "Identified Language",
          "confidence_level": "Confidence Level (%)",
          "user_native_language_guess": "User's Native Language Guess",
          "native_language_influence_analysis": "Analysis of the speaker's native language influence",
          "language-specific_phonological_assessment": [
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
          "cross-linguistic_influence_note": "Note on cross-linguistic influence",
          "CEFR_aligned_proficiency_indicators": "CEFR level",
          "personalized_learning_pathway_suggestions": [
            "Suggestion 1",
            "Suggestion 2"
          ],
          "call_to_action": "Call to action"
        }
      ]
      \`\`\`

      Ensure the response is a valid JSON array containing a single object with the above fields.
    `;
  }
}

export default MessageGenerator;
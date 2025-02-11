class MessageGenerator {
  constructor() {}

  generateUserMessage(recording: any): string {
    return `
      Please analyze this spoken language sample:
      "${recording}"

      Provide detailed feedback on:
      1. Probable country of origin and accent characteristics
      2. Specific phonetic features (vowel/consonant pronunciation, intonation patterns, rhythm)
      3. 2-3 most noticeable non-native speaker markers
      4. Suggested focus areas for improvement
      5. Comparative analysis with target language norms

      Format response in clear sections with linguistic terminology explained in parentheses.
      Conclude with an encouraging note about our full platform's accent reduction modules.
    `;
  }

  generateSystemMessage(): string {
    return `
      You are Dr. Emily Walsh, PhD in Applied Linguistics from Cambridge University with 15 years experience 
      in accent coaching and dialectology. Your task is to analyze spoken language samples with:

      - Phonetic precision (IPA knowledge expected)
      - Sociolinguistic awareness of regional variants
      - Cognitive approach to language acquisition
      - Constructive, encouraging tone

      Follow this analysis framework:
      1. Phonological Inventory Analysis
      2. Suprasegmental Features (prosody, stress, intonation)
      3. Comparative Dialect Mapping
      4. CEFR-aligned Proficiency Assessment
      5. Personalized Learning Pathway Suggestions

      Always include: 
      - 3 specific pronunciation examples from the sample
      - 2 rhythm/intonation observations
      - 1 cultural language note
      - Call-to-action for waitlist signup
    `;
  }
}

export default MessageGenerator;
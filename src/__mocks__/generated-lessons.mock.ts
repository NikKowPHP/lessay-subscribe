import { ILessonGeneratorService } from "@/lib/interfaces/all-interfaces"

export const MockLessonGeneratorService: ILessonGeneratorService = {
  generateLesson: async (topic: string, targetLanguage: string, difficultyLevel: string) => {
    return {
       data: {
        focusArea: 'Everyday Conversation',
        targetSkills: ['Greetings', 'Small Talk'],
        sequence: [
          {
            step: 1,
            type: 'prompt',
            content: 'To start, say "ready to start"',
            translation: 'Um zu beginnen, sagen Sie "bereit zu starten"'
          },
          {
            step: 2,
            type: 'new_word',
            content: 'Guten Tag',
            translation: 'Good day'
          },
          {
            step: 3,
            type: 'practice',
            content: 'Guten Tag'
          },
          {
            step: 4,
            type: 'new_word',
            content: 'Wie geht es Ihnen?',
            translation: 'How are you?'
          },
          {
            step: 5,
            type: 'model_answer',
            content: 'Gut, danke'
          },
          {
            step: 6,
            type: 'prompt',
            content: 'How do you say "Good day, how are you?"'
          },
          {
            step: 7,
            type: 'prompt',
            content: 'How do you say "I am fine, thank you"'
          },
          {
            step: 8,
            type: 'prompt',
            content: 'How do you say "Good day, how are you? I am fine, thank you"'
          },
          {
            step: 9,
            type: 'model_answer',
            content: 'Excellent! You have completed the lesson.'
          }
        ],
        performance_metrics: {
          accuracy: 100,
          pronunciation_score: 85,
          error_patterns: []
        }
      }
    }
  }
}
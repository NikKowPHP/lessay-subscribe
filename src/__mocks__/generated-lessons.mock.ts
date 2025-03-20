import { ILessonGeneratorService } from "@/lib/interfaces/all-interfaces"

export const MockLessonGeneratorService: ILessonGeneratorService = {
  generateLesson: async (topic: string, targetLanguage: string, difficultyLevel: string) => {
    // Different steps based on topic
    const lessonTemplates: Record<string, any> = {
      'Airport Navigation': {
        focusArea: 'Travel',
        targetSkills: ['Vocabulary', 'Asking for Directions'],
        steps: [
          {
            stepNumber: 1,
            type: 'prompt',
            content: 'To start, say "ready to start"',
            translation: 'Um zu beginnen, sagen Sie "bereit zu starten"'
          },
          {
            stepNumber: 2,
            type: 'new_word',
            content: 'der Flughafen',
            translation: 'the airport'
          },
          {
            stepNumber: 3,
            type: 'practice',
            content: 'der Flughafen'
          },
          {
            stepNumber: 4,
            type: 'prompt',
            content: 'How do you ask "Where is the gate?"'
          },
          {
            stepNumber: 5,
            type: 'model_answer',
            content: 'Wo ist das Gate?',
            translation: 'Where is the gate?'
          }
        ]
      },
      'Hotel Booking': {
        focusArea: 'Travel Accommodation',
        targetSkills: ['Booking', 'Requests'],
        steps: [
          {
            stepNumber: 1,
            type: 'prompt',
            content: 'To start, say "ready to start"',
            translation: 'Um zu beginnen, sagen Sie "bereit zu starten"'
          },
          {
            stepNumber: 2,
            type: 'new_word',
            content: 'das Hotel',
            translation: 'the hotel'
          },
          {
            stepNumber: 3,
            type: 'practice',
            content: 'das Hotel'
          },
          {
            stepNumber: 4,
            type: 'prompt',
            content: 'How do you say "I have a reservation"'
          },
          {
            stepNumber: 5,
            type: 'model_answer',
            content: 'Ich habe eine Reservierung',
            translation: 'I have a reservation'
          }
        ]
      },
      'Daily Greetings': {
        focusArea: 'Everyday Conversation',
        targetSkills: ['Greetings', 'Small Talk'],
        steps: [
          {
            stepNumber: 1,
            type: 'prompt',
            content: 'To start, say "ready to start"',
            translation: 'Um zu beginnen, sagen Sie "bereit zu starten"'
          },
          {
            stepNumber: 2,
            type: 'new_word',
            content: 'Guten Tag',
            translation: 'Good day'
          },
          {
            stepNumber: 3,
            type: 'practice',
            content: 'Guten Tag'
          },
          {
            stepNumber: 4,
            type: 'new_word',
            content: 'Wie geht es Ihnen?',
            translation: 'How are you?'
          },
          {
            stepNumber: 5,
            type: 'model_answer',
            content: 'Gut, danke',
            translation: 'Good, thank you'
          }
        ]
      }
    };

    // Default to a generic lesson if topic not found
    const lessonData = lessonTemplates[topic] || {
      focusArea: 'General Conversation',
      targetSkills: ['Vocabulary', 'Basic Phrases'],
      steps: [
        {
          stepNumber: 1,
          type: 'prompt',
          content: 'To start, say "ready to start"',
          translation: `To start, say "ready to start" `
        },
        {
          stepNumber: 2,
          type: 'new_word',
          content: 'Hello',
          translation: 'Hello'
        },
        {
          stepNumber: 3,
          type: 'practice',
          content: 'Hello'
        }
      ]
    };

    // Log the generated lesson data
    console.log('Generated lesson data:', { topic, targetLanguage, difficultyLevel, lessonData });

    // Return the lesson data wrapped in an object with a 'data' property
    return { data: [lessonData] };
  }
};
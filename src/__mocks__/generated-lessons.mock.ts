export const MockLessonGeneratorService = {
  generateLesson: async (topic: string) => {
    // Different sequences based on topic
    const lessonTemplates: Record<string, any> = {
      'Airport Navigation': {
        focusArea: 'Travel',
        targetSkills: ['Vocabulary', 'Asking for Directions'],
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
            content: 'der Flughafen',
            translation: 'the airport'
          },
          {
            step: 3,
            type: 'practice',
            content: 'der Flughafen'
          },
          {
            step: 4,
            type: 'prompt',
            content: 'How do you ask "Where is the gate?"'
          },
          {
            step: 5,
            type: 'model_answer',
            content: 'Wo ist das Gate?',
            translation: 'Where is the gate?'
          }
        ]
      },
      'Hotel Booking': {
        focusArea: 'Travel Accommodation',
        targetSkills: ['Booking', 'Requests'],
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
            content: 'das Hotel',
            translation: 'the hotel'
          },
          {
            step: 3,
            type: 'practice',
            content: 'das Hotel'
          },
          {
            step: 4,
            type: 'prompt',
            content: 'How do you say "I have a reservation"'
          },
          {
            step: 5,
            type: 'model_answer',
            content: 'Ich habe eine Reservierung',
            translation: 'I have a reservation'
          }
        ]
      },
      'Daily Greetings': {
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
      sequence: [
        {
          step: 1,
          type: 'prompt',
          content: 'To start, say "ready to start"',
          translation: `To start, say "ready to start" `
        },
        {
          step: 2,
          type: 'new_word',
          content: 'Hello',
          translation: 'Hello'
        },
        {
          step: 3,
          type: 'practice',
          content: 'Hello'
        }
      ]
    };

    // Return the lesson data wrapped in an array
    return [lessonData];
  }
};
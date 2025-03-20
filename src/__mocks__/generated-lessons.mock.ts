import { ILessonGeneratorService } from "@/lib/interfaces/all-interfaces"

// Helper function outside the object
function getRandomTopic(lessons: Record<string, any>): string {
  const topics = Object.keys(lessons);
  const randomIndex = Math.floor(Math.random() * topics.length);
  return topics[randomIndex];
}

export const MockLessonGeneratorService = {
  generateLesson: async function(topic: string, targetLanguage: string, difficultyLevel: string) {
    // Combined list of all lessons (initial + advanced)
    const allLessonTemplates: Record<string, any> = {
      // Initial lessons
      'Vocabulary Building': {
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
      // Advanced lessons
      'Pronunciation Practice': {
        focusArea: 'Pronunciation Improvement',
        targetSkills: ['Sound Recognition', 'Accent Reduction'],
        steps: [
          {
            stepNumber: 1,
            type: 'prompt',
            content: 'To start, say "ready to practice pronunciation"',
            translation: 'Um zu beginnen, sagen Sie "bereit für die Ausspracheübung"'
          },
          {
            stepNumber: 2,
            type: 'new_word',
            content: 'die Aussprache',
            translation: 'the pronunciation'
          },
          {
            stepNumber: 3,
            type: 'practice',
            content: 'die Aussprache'
          },
          {
            stepNumber: 4,
            type: 'new_word',
            content: 'schwierig',
            translation: 'difficult'
          },
          {
            stepNumber: 5,
            type: 'model_answer',
            content: 'Die Aussprache ist manchmal schwierig',
            translation: 'The pronunciation is sometimes difficult'
          }
        ]
      },
      'Grammar Rules': {
        focusArea: 'Grammar Fundamentals',
        targetSkills: ['Sentence Structure', 'Verb Conjugation'],
        steps: [
          {
            stepNumber: 1,
            type: 'prompt',
            content: 'To start, say "I am ready to learn grammar"',
            translation: 'Um zu beginnen, sagen Sie "Ich bin bereit, Grammatik zu lernen"'
          },
          {
            stepNumber: 2,
            type: 'new_word',
            content: 'die Grammatik',
            translation: 'the grammar'
          },
          {
            stepNumber: 3,
            type: 'practice',
            content: 'die Grammatik'
          },
          {
            stepNumber: 4,
            type: 'prompt',
            content: 'How do you say "I learn grammar"?'
          },
          {
            stepNumber: 5,
            type: 'model_answer',
            content: 'Ich lerne Grammatik',
            translation: 'I learn grammar'
          }
        ]
      }
    };

    // If topic is not specified, pick a random one
    const selectedTopic = topic || getRandomTopic(allLessonTemplates);
    
    // Get lesson data for the selected topic
    const lessonData = allLessonTemplates[selectedTopic] || {
      focusArea: 'General Conversation',
      targetSkills: ['Vocabulary', 'Basic Phrases'],
      steps: [
        {
          stepNumber: 1,
          type: 'prompt',
          content: 'To start, say "ready to start"',
          translation: `To start, say "ready to start"`
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
    console.log('Generated lesson data:', { 
      topic: selectedTopic, 
      targetLanguage, 
      difficultyLevel, 
      lessonData 
    });

    // Return the lesson data wrapped in an object with a 'data' property
    return { data: [lessonData] };
  },

  // Helper method to get a random topic
  getRandomTopic(lessons: Record<string, any>): string {
    const topics = Object.keys(lessons);
    const randomIndex = Math.floor(Math.random() * topics.length);
    return topics[randomIndex];
  }
}
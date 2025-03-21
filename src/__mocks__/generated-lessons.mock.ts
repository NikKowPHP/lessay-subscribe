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
            type: 'instruction',
            content: 'Welcome to the Travel Vocabulary lesson! In this lesson, you\'ll learn essential words and phrases for navigating airports and asking for directions.',
            contentAudioUrl: '/audio-test.mp3',
            translation: 'Willkommen zur Reisevokabular-Lektion! In dieser Lektion lernen Sie wichtige Wörter und Sätze, um sich auf Flughäfen zurechtzufinden und nach dem Weg zu fragen.'
          },
          {
            stepNumber: 2,
            type: 'prompt',
            content: 'To start, say "ready to start"',
            contentAudioUrl: '/audio-test.mp3',
            translation: 'Um zu beginnen, sagen Sie "bereit zu starten"'
          },
          {
            stepNumber: 3,
            type: 'new_word',
            content: 'der Flughafen',
            contentAudioUrl: '/audio-test.mp3',
            expectedAnswerAudioUrl: '/audio-test.mp3',
            translation: 'the airport',
            expectedAnswer: 'der Flughafen'
          },
          {
            stepNumber: 4,
            type: 'practice',
            content: 'der Flughafen',
            contentAudioUrl: '/audio-test.mp3',
            expectedAnswerAudioUrl: '/audio-test.mp3',
            expectedAnswer: 'der Flughafen'
          },
          {
            stepNumber: 5,
            type: 'prompt',
            content: 'How do you ask "Where is the gate?"',
            contentAudioUrl: '/audio-test.mp3',
            translation: 'Wie fragt man "Wo ist das Gate?"'
          },
          {
            stepNumber: 6,
            type: 'model_answer',
            content: 'Wo ist das Gate?',
            contentAudioUrl: '/audio-test.mp3',
            expectedAnswerAudioUrl: '/audio-test.mp3',
            translation: 'Where is the gate?',
            expectedAnswer: 'Wo ist das Gate?'
          },
          {
            stepNumber: 7,
            type: 'summary',
            content: 'Great job! You\'ve completed the Travel Vocabulary lesson. You\'ve learned how to ask for directions and use key airport terminology in German.',
            contentAudioUrl: '/audio-test.mp3',
            translation: 'Gut gemacht! Sie haben die Reisevokabular-Lektion abgeschlossen. Sie haben gelernt, wie man nach dem Weg fragt und wichtige Flughafenterminologie auf Deutsch verwendet.'
          }
        ]
      },
      'Hotel Booking': {
        focusArea: 'Travel Accommodation',
        targetSkills: ['Booking', 'Requests'],
        steps: [
          {
            stepNumber: 1,
            type: 'instruction',
            content: 'Welcome to the Hotel Booking lesson! In this lesson, you\'ll learn essential phrases for making hotel reservations and requesting services.',
            contentAudioUrl: '/audio-test.mp3',
            translation: 'Willkommen zur Hotelbuchungslektion! In dieser Lektion lernen Sie wichtige Sätze für Hotelbuchungen und das Anfordern von Dienstleistungen.'
          },
          {
            stepNumber: 2,
            type: 'prompt',
            content: 'To start, say "ready to start"',
            contentAudioUrl: '/audio-test.mp3',
            translation: 'Um zu beginnen, sagen Sie "bereit zu starten"'
          },
          {
            stepNumber: 3,
            type: 'new_word',
            content: 'das Hotel',
            contentAudioUrl: '/audio-test.mp3',
            expectedAnswerAudioUrl: '/audio-test.mp3',
            translation: 'the hotel',
            expectedAnswer: 'das Hotel'
          },
          {
            stepNumber: 4,
            type: 'practice',
            content: 'das Hotel',
            contentAudioUrl: '/audio-test.mp3',
            expectedAnswerAudioUrl: '/audio-test.mp3',
            expectedAnswer: 'das Hotel'
          },
          {
            stepNumber: 5,
            type: 'prompt',
            content: 'How do you say "I have a reservation"',
            contentAudioUrl: '/audio-test.mp3',
            translation: 'Wie sagt man "Ich habe eine Reservierung"'
          },
          {
            stepNumber: 6,
            type: 'model_answer',
            content: 'Ich habe eine Reservierung',
            contentAudioUrl: '/audio-test.mp3',
            expectedAnswerAudioUrl: '/audio-test.mp3',
            translation: 'I have a reservation',
            expectedAnswer: 'Ich habe eine Reservierung'
          },
          {
            stepNumber: 7,
            type: 'summary',
            content: 'Well done! You\'ve completed the Hotel Booking lesson. You can now make hotel reservations and request services in German with confidence.',
            contentAudioUrl: '/audio-test.mp3',
            translation: 'Gut gemacht! Sie haben die Hotelbuchungslektion abgeschlossen. Sie können jetzt selbstbewusst Hotelbuchungen vornehmen und Dienstleistungen auf Deutsch anfordern.'
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
            type: 'instruction',
            content: 'Welcome to the Pronunciation Practice lesson! In this lesson, you\'ll work on perfecting your German pronunciation and reducing your accent.',
            contentAudioUrl: '/audio-test.mp3',
            translation: 'Willkommen zur Ausspracheübungslektion! In dieser Lektion werden Sie an der Verbesserung Ihrer deutschen Aussprache arbeiten und Ihren Akzent reduzieren.'
          },
          {
            stepNumber: 2,
            type: 'prompt',
            content: 'To start, say "ready to practice pronunciation"',
            contentAudioUrl: '/audio-test.mp3',
            translation: 'Um zu beginnen, sagen Sie "bereit für die Ausspracheübung"'
          },
          {
            stepNumber: 3,
            type: 'new_word',
            content: 'die Aussprache',
            contentAudioUrl: '/audio-test.mp3',
            expectedAnswerAudioUrl: '/audio-test.mp3',
            translation: 'the pronunciation',
            expectedAnswer: 'die Aussprache'
          },
          {
            stepNumber: 4,
            type: 'practice',
            content: 'die Aussprache',
            contentAudioUrl: '/audio-test.mp3',
            expectedAnswerAudioUrl: '/audio-test.mp3',
            expectedAnswer: 'die Aussprache'
          },
          {
            stepNumber: 5,
            type: 'new_word',
            content: 'schwierig',
            contentAudioUrl: '/audio-test.mp3',
            expectedAnswerAudioUrl: '/audio-test.mp3',
            translation: 'difficult',
            expectedAnswer: 'schwierig'
          },
          {
            stepNumber: 6,
            type: 'model_answer',
            content: 'Die Aussprache ist manchmal schwierig',
            contentAudioUrl: '/audio-test.mp3',
            expectedAnswerAudioUrl: '/audio-test.mp3',
            translation: 'The pronunciation is sometimes difficult',
            expectedAnswer: 'Die Aussprache ist manchmal schwierig'
          },
          {
            stepNumber: 7,
            type: 'summary',
            content: 'Excellent work! You\'ve completed the Pronunciation Practice lesson. Your German pronunciation has improved, and you\'re on your way to speaking more naturally.',
            contentAudioUrl: '/audio-test.mp3',
            translation: 'Ausgezeichnete Arbeit! Sie haben die Ausspracheübungslektion abgeschlossen. Ihre deutsche Aussprache hat sich verbessert und Sie sind auf dem Weg, natürlicher zu sprechen.'
          }
        ]
      },
      'Grammar Rules': {
        focusArea: 'Grammar Fundamentals',
        targetSkills: ['Sentence Structure', 'Verb Conjugation'],
        steps: [
          {
            stepNumber: 1,
            type: 'instruction',
            content: 'Welcome to the Grammar Fundamentals lesson! In this lesson, you\'ll learn basic German sentence structure and verb conjugation patterns.',
            contentAudioUrl: '/audio-test.mp3',
            translation: 'Willkommen zur Lektion über Grammatik-Grundlagen! In dieser Lektion lernen Sie die grundlegende deutsche Satzstruktur und Verbkonjugationsmuster.'
          },
          {
            stepNumber: 2,
            type: 'prompt',
            content: 'To start, say "I am ready to learn grammar"',
            contentAudioUrl: '/audio-test.mp3',
            translation: 'Um zu beginnen, sagen Sie "Ich bin bereit, Grammatik zu lernen"'
          },
          {
            stepNumber: 3,
            type: 'new_word',
            content: 'die Grammatik',
            contentAudioUrl: '/audio-test.mp3',
            expectedAnswerAudioUrl: '/audio-test.mp3',
            translation: 'the grammar',
            expectedAnswer: 'die Grammatik'
          },
          {
            stepNumber: 4,
            type: 'practice',
            content: 'die Grammatik',
            contentAudioUrl: '/audio-test.mp3',
            expectedAnswerAudioUrl: '/audio-test.mp3',
            expectedAnswer: 'die Grammatik'
          },
          {
            stepNumber: 5,
            type: 'prompt',
            content: 'How do you say "I learn grammar"?',
            contentAudioUrl: '/audio-test.mp3',
            translation: 'Wie sagt man "Ich lerne Grammatik"?'
          },
          {
            stepNumber: 6,
            type: 'model_answer',
            content: 'Ich lerne Grammatik',
            contentAudioUrl: '/audio-test.mp3',
            expectedAnswerAudioUrl: '/audio-test.mp3',
            translation: 'I learn grammar',
            expectedAnswer: 'Ich lerne Grammatik'
          },
          {
            stepNumber: 7,
            type: 'summary',
            content: 'Congratulations! You\'ve completed the Grammar Fundamentals lesson. You now understand basic German sentence structures and can form simple sentences with proper verb conjugation.',
            contentAudioUrl: '/audio-test.mp3',
            translation: 'Herzlichen Glückwunsch! Sie haben die Lektion zu den Grammatik-Grundlagen abgeschlossen. Sie verstehen jetzt die grundlegenden deutschen Satzstrukturen und können einfache Sätze mit korrekter Verbkonjugation bilden.'
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
          type: 'instruction',
          content: 'Welcome to the General Conversation lesson! In this lesson, you\'ll learn basic phrases for everyday conversations in your target language.',
          contentAudioUrl: '/audio-test.mp3',
          translation: 'Willkommen zur Lektion über allgemeine Konversation! In dieser Lektion lernen Sie grundlegende Sätze für alltägliche Gespräche in Ihrer Zielsprache.'
        },
        {
          stepNumber: 2,
          type: 'prompt',
          content: 'To start, say "ready to start"',
          contentAudioUrl: '/audio-test.mp3',
          translation: `To start, say "ready to start"`
        },
        {
          stepNumber: 3,
          type: 'new_word',
          content: 'Hello',
          contentAudioUrl: '/audio-test.mp3',
          expectedAnswerAudioUrl: '/audio-test.mp3',
          translation: 'Hello',
          expectedAnswer: 'Hello'
        },
        {
          stepNumber: 4,
          type: 'practice',
          content: 'Hello',
          contentAudioUrl: '/audio-test.mp3',
          expectedAnswerAudioUrl: '/audio-test.mp3',
          expectedAnswer: 'Hello'
        },
        {
          stepNumber: 5,
          type: 'summary',
          content: 'Great job! You\'ve completed the General Conversation lesson. You can now use basic phrases for everyday interactions.',
          contentAudioUrl: '/audio-test.mp3',
          translation: 'Gut gemacht! Sie haben die Lektion zur allgemeinen Konversation abgeschlossen. Sie können jetzt grundlegende Sätze für alltägliche Interaktionen verwenden.'
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
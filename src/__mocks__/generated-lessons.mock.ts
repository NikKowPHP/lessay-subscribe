import { ILessonGeneratorService } from "@/lib/interfaces/all-interfaces"
import logger from "@/utils/logger";
import { LessonStepType } from "@prisma/client"

// Helper function outside the object
function getRandomTopic(lessons: Record<string, any>): string {
  const topics = Object.keys(lessons);
  const randomIndex = Math.floor(Math.random() * topics.length);
  return topics[randomIndex];
}

export const MockLessonGeneratorService = {

  generateAudioForStep: async function(
    content: string,
    language: string = "English"
  ) {
    logger.info(`Generating audio for step and language: ${content} ${language}`);
    return "/audio-test.mp3";
  },
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
            type: LessonStepType.instruction,
            content: 'Welcome to the Travel Vocabulary lesson! In this lesson, you\'ll learn essential words and phrases for navigating airports and asking for directions.',
            // // contentAudioUrl: '/audio-test.mp3',
            translation: 'Willkommen zur Reisevokabular-Lektion! In dieser Lektion lernen Sie wichtige Wörter und Sätze, um sich auf Flughäfen zurechtzufinden und nach dem Weg zu fragen.'
          },
          {
            stepNumber: 2,
            type: LessonStepType.prompt,
            content: 'How to say "where is" in German?',
            translation: 'wo ist',
            expectedAnswer: 'wo ist'
          },
          {
            stepNumber: 3,
            type: LessonStepType.model_answer,
            content: 'Great job!',
            translation: 'Gut gemacht!'
          },
          {
            stepNumber: 4,
            type: LessonStepType.prompt,
            content: 'How to say "the airport" in German?',
            expectedAnswer: 'der Flughafen'
          },
          {
            stepNumber: 5,
            type: LessonStepType.model_answer,
            content: 'Excellent pronunciation! Now, let\'s learn how to ask for directions.',
            translation: 'Ausgezeichnete Aussprache! Lassen Sie uns nun lernen, wie man nach dem Weg fragt.'
          },
          {
            stepNumber: 6,
            type: LessonStepType.prompt,
            content: 'How do you ask "Where is the airport?" in German?',
            expectedAnswer: 'wo ist der Flughafen',
            translation: 'Wie fragt man "Wo ist der Flughafen?" auf Deutsch?'
          },
          {
            stepNumber: 7,
            type: LessonStepType.model_answer,
            content: 'Lets add some more words to our vocabulary',
            // // contentAudioUrl: '/audio-test.mp3',
            translation: ''
          },
          {
            stepNumber: 8,
            type: LessonStepType.new_word,
            content: 'Das Gate',
            // // contentAudioUrl: '/audio-test.mp3',
            translation: 'das Gate'
          },
          {
            stepNumber: 9,
            type: LessonStepType.summary,
            content: 'Great job! You\'ve completed the Travel Vocabulary lesson. You\'ve learned how to ask for directions and use key airport terminology in German.',
            // // contentAudioUrl: '/audio-test.mp3',
            translation: 'Gut gemacht! Sie haben die Reisevokabular-Lektion abgeschlossen. Sie haben gelernt, wie man nach dem Weg fragt und wichtige Flughafenterminologie auf Deutsch verwendet.'
          }
        ]
      },
      
      // Example of another template - Hotel Booking with proper model_answer usage
      'Hotel Booking': {
        focusArea: 'Travel Accommodation',
        targetSkills: ['Booking', 'Requests'],
        steps: [
          {
            stepNumber: 1,
            type: LessonStepType.instruction,
            content: 'Welcome to the Hotel Booking lesson! In this lesson, you\'ll learn essential phrases for making hotel reservations and requesting services.',
            translation: 'Willkommen zur Hotelbuchungslektion! In dieser Lektion lernen Sie wichtige Sätze für Hotelbuchungen und das Anfordern von Dienstleistungen.'
          },
          {
            stepNumber: 2,
            type: LessonStepType.new_word,
            content: 'das Hotel',
            translation: 'the hotel',
            expectedAnswer: 'das Hotel'
          },
          {
            stepNumber: 3,
            type: LessonStepType.model_answer,
            content: 'Very good! "das Hotel" is "the hotel" in German. Now let\'s practice this word.',
            // // contentAudioUrl: '/audio-test.mp3',
            translation: 'Sehr gut! "das Hotel" ist "the hotel" auf Deutsch. Lassen Sie uns jetzt dieses Wort üben.'
          },
          {
            stepNumber: 4,
            type: LessonStepType.practice,
            content: 'Repeat the word for hotel: das Hotel',
            // // contentAudioUrl: '/audio-test.mp3',
            // // expectedAnswerAudioUrl: '/audio-test.mp3',
            expectedAnswer: 'das Hotel'
          },
          {
            stepNumber: 5,
            type: LessonStepType.model_answer,
            content: 'Well done! Now, let\'s learn how to make a reservation.',
            // // contentAudioUrl: '/audio-test.mp3',
            translation: 'Gut gemacht! Jetzt lernen wir, wie man eine Reservierung macht.'
          },
          {
            stepNumber: 6,
            type: LessonStepType.prompt,
            content: 'How do you say "I have a reservation" in German?',
            // // contentAudioUrl: '/audio-test.mp3',
            translation: 'Wie sagt man "Ich habe eine Reservierung" auf Deutsch?'
          },
          {
            stepNumber: 7,
            type: LessonStepType.model_answer,
            content: 'To say "I have a reservation" in German, you say "Ich habe eine Reservierung"',
            // // contentAudioUrl: '/audio-test.mp3',
            translation: 'Um "I have a reservation" auf Deutsch zu sagen, sagt man "Ich habe eine Reservierung"'
          },
          {
            stepNumber: 8,
            type: LessonStepType.summary,
            content: 'Great job! You\'ve completed the Hotel Booking lesson. You can now make reservations and request services in German hotels.',
            // // contentAudioUrl: '/audio-test.mp3',
            translation: 'Gut gemacht! Sie haben die Hotel-Buchungslektion abgeschlossen. Sie können jetzt Reservierungen vornehmen und Dienstleistungen in deutschen Hotels anfordern.'
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
            type: LessonStepType.instruction,
            content: 'Welcome to the Pronunciation Practice lesson! In this lesson, you\'ll work on perfecting your German pronunciation and reducing your accent.',
            // // contentAudioUrl: '/audio-test.mp3',
            translation: 'Willkommen zur Ausspracheübungslektion! In dieser Lektion werden Sie an der Verbesserung Ihrer deutschen Aussprache arbeiten und Ihren Akzent reduzieren.'
          },
          {
            stepNumber: 2,
            type: LessonStepType.prompt,
            content: 'To start, say "ready to practice pronunciation"',
            // // contentAudioUrl: '/audio-test.mp3',
            translation: 'Um zu beginnen, sagen Sie "bereit für die Ausspracheübung"'
          },
          {
            stepNumber: 3,
            type: LessonStepType.new_word,
            content: 'die Aussprache',
            // // contentAudioUrl: '/audio-test.mp3',
            // // expectedAnswerAudioUrl: '/audio-test.mp3',
            translation: 'the pronunciation',
            expectedAnswer: 'die Aussprache'
          },
          {
            stepNumber: 4,
            type: LessonStepType.practice,
            content: 'die Aussprache',
            // contentAudioUrl: '/audio-test.mp3',
            // // expectedAnswerAudioUrl: '/audio-test.mp3',
            expectedAnswer: 'die Aussprache'
          },
          {
            stepNumber: 5,
            type: LessonStepType.new_word,
            content: 'schwierig',
            // // contentAudioUrl: '/audio-test.mp3',
            // // expectedAnswerAudioUrl: '/audio-test.mp3',
            translation: 'difficult',
            expectedAnswer: 'schwierig'
          },
          {
            stepNumber: 6,
            type: LessonStepType.model_answer,
            content: 'Die Aussprache ist manchmal schwierig',
            // contentAudioUrl: '/audio-test.mp3',
            // expectedAnswerAudioUrl: '/audio-test.mp3',
            translation: 'The pronunciation is sometimes difficult',
            expectedAnswer: 'Die Aussprache ist manchmal schwierig'
          },
          {
            stepNumber: 7,
            type: LessonStepType.summary,
            content: 'Excellent work! You\'ve completed the Pronunciation Practice lesson. Your German pronunciation has improved, and you\'re on your way to speaking more naturally.',
            // contentAudioUrl: '/audio-test.mp3',
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
            type: LessonStepType.instruction,
            content: 'Welcome to the Grammar Fundamentals lesson! In this lesson, you\'ll learn basic German sentence structure and verb conjugation patterns.',
            // contentAudioUrl: '/audio-test.mp3',
            translation: 'Willkommen zur Lektion über Grammatik-Grundlagen! In dieser Lektion lernen Sie die grundlegende deutsche Satzstruktur und Verbkonjugationsmuster.'
          },
          {
            stepNumber: 2,
            type: LessonStepType.prompt,
            content: 'To start, say "I am ready to learn grammar"',
            // contentAudioUrl: '/audio-test.mp3',
            translation: 'Um zu beginnen, sagen Sie "Ich bin bereit, Grammatik zu lernen"'
          },
          {
            stepNumber: 3,
            type: LessonStepType.new_word,
            content: 'die Grammatik',
            // contentAudioUrl: '/audio-test.mp3',
            // expectedAnswerAudioUrl: '/audio-test.mp3',
            translation: 'the grammar',
            expectedAnswer: 'die Grammatik'
          },
          {
            stepNumber: 4,
            type: LessonStepType.practice,
            content: 'die Grammatik',
            // contentAudioUrl: '/audio-test.mp3',
            // expectedAnswerAudioUrl: '/audio-test.mp3',
            expectedAnswer: 'die Grammatik'
          },
          {
            stepNumber: 5,
            type: LessonStepType.prompt,
            content: 'How do you say "I learn grammar"?',
            // contentAudioUrl: '/audio-test.mp3',
            translation: 'Wie sagt man "Ich lerne Grammatik"?'
          },
          {
            stepNumber: 6,
            type: LessonStepType.model_answer,
            content: 'Ich lerne Grammatik',
            // contentAudioUrl: '/audio-test.mp3',
            // expectedAnswerAudioUrl: '/audio-test.mp3',
            translation: 'I learn grammar',
            expectedAnswer: 'Ich lerne Grammatik'
          },
          {
            stepNumber: 7,
            type: LessonStepType.summary,
            content: 'Congratulations! You\'ve completed the Grammar Fundamentals lesson. You now understand basic German sentence structures and can form simple sentences with proper verb conjugation.',
            // contentAudioUrl: '/audio-test.mp3',
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
          type: LessonStepType.instruction,
          content: 'Welcome to the General Conversation lesson! In this lesson, you\'ll learn basic phrases for everyday conversations in your target language.',
          translation: 'Willkommen zur Lektion über allgemeine Konversation! In dieser Lektion lernen Sie grundlegende Sätze für alltägliche Gespräche in Ihrer Zielsprache.'
        },
        {
          stepNumber: 2,
          type: LessonStepType.new_word,
          content: 'Hallo',
          translation: 'Hello',
          expectedAnswer: 'Hello'
        },
        {
          stepNumber: 3,
          type: LessonStepType.model_answer,
          content: 'Excellent! Now let\'s practice saying "Hello".',
          translation: 'Ausgezeichnet! Jetzt üben wir, "Hello" zu sagen.'
        },
        {
          stepNumber: 4,
          type: LessonStepType.practice,
          content: 'Repeat: Hello',
          expectedAnswer: 'Hello'
        },
        {
          stepNumber: 5,
          type: LessonStepType.model_answer,
          content: 'Perfect pronunciation! You\'re making great progress.',
          translation: 'Perfekte Aussprache! Sie machen große Fortschritte.'
        },
        {
          stepNumber: 6,
          type: LessonStepType.summary,
          content: 'Great job! You\'ve completed the General Conversation lesson. You can now use basic phrases for everyday interactions.',
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
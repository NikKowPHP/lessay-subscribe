import { ILearningProgressRepository, LearningProgressRepository } from '@/repositories/learning-progress.repository';
import { LearningProgressModel, LessonModel, AssessmentLesson, TopicProgressModel, WordProgressModel, AudioMetrics } from '@/models/AppAllModels.model';
import logger from '@/utils/logger';
import { MasteryLevel, ProficiencyLevel, LearningTrajectory } from '@prisma/client';

export default class LearningProgressService {
  private progressRepository: ILearningProgressRepository;

  // TODO: Inject services needed for context if required (e.g., UserService for profile data)
  constructor(progressRepository: ILearningProgressRepository) {
    this.progressRepository = progressRepository;
  }

  async getLearningProgress(userId: string): Promise<LearningProgressModel | null> {
    return this.progressRepository.getLearningProgress(userId);
  }

  async getLearningProgressWithDetails(userId: string): Promise<LearningProgressModel | null> {
    return this.progressRepository.getLearningProgressWithDetails(userId);
  }

  /**
   * Updates the user's learning progress after completing a lesson.
   */
  async updateProgressAfterLesson(userId: string, lesson: LessonModel): Promise<void> {
    logger.info('Updating learning progress after lesson', { userId, lessonId: lesson.id });
    try {
      let progress = await this.progressRepository.getLearningProgress(userId);
      if (!progress) {
        progress = await this.progressRepository.upsertLearningProgress(userId, {
          userId: userId, // Ensure userId is passed on creation
          estimatedProficiencyLevel: ProficiencyLevel.beginner, // Default or derive from onboarding
          learningTrajectory: LearningTrajectory.steady,
          strengths: [],
          weaknesses: [],
        });
      }

      const learningProgressId = progress.id;
      const now = new Date();

      // 1. Update Topic Progress
      const topicName = lesson.focusArea; // Assuming focusArea is the primary topic
      if (topicName) {
        await this.updateTopicProgress(learningProgressId, topicName, lesson.id, null, lesson.performanceMetrics, lesson.audioMetrics);
      }
      // Also consider targetSkills as potential topics
      for (const skill of lesson.targetSkills) {
         await this.updateTopicProgress(learningProgressId, skill, lesson.id, null, lesson.performanceMetrics, lesson.audioMetrics);
      }


      // 2. Update Word Progress (Iterate through lesson steps)
      for (const step of lesson.steps) {
        if (step.type === 'new_word' || step.type === 'practice') {
          // Extract word (assuming content or expectedAnswer holds the word)
          const word = step.expectedAnswer || step.content; // Adjust logic as needed
          const translation = step.translation;
          if (word) {
            await this.updateWordProgress(learningProgressId, word, translation, step.id, null, step.correct, step.attempts > 0);
          }
        }
        // Potentially extract words from 'prompt' content too using NLP (more advanced)
      }

      // 3. Recalculate Overall Progress (Simplified example)
      // TODO: Implement more sophisticated calculation logic, potentially using AI
      const updatedOverall = this.calculateOverallProgress(progress, lesson.performanceMetrics, lesson.audioMetrics);

      // 4. Save updated overall progress
      await this.progressRepository.upsertLearningProgress(userId, {
        ...updatedOverall,
        lastLessonCompletedAt: now,
        updatedAt: now, // Ensure updatedAt is set
      });

      logger.info('Successfully updated learning progress after lesson', { userId, lessonId: lesson.id });

    } catch (error) {
      logger.error('Error updating learning progress after lesson:', { userId, lessonId: lesson.id, error });
      // Decide if this error should propagate or just be logged
    }
  }

  /**
   * Updates the user's learning progress after completing an assessment.
   */
  async updateProgressAfterAssessment(userId: string, assessment: AssessmentLesson): Promise<void> {
     logger.info('Updating learning progress after assessment', { userId, assessmentId: assessment.id });
      try {
        let progress = await this.progressRepository.getLearningProgress(userId);
        if (!progress) {
          progress = await this.progressRepository.upsertLearningProgress(userId, {
            userId: userId,
            estimatedProficiencyLevel: ProficiencyLevel.beginner, // Or derive from assessment
            learningTrajectory: LearningTrajectory.steady,
            strengths: [],
            weaknesses: [],
          });
        }

        const learningProgressId = progress.id;
        const now = new Date();

        // 1. Update Topic Progress (using proposedTopics)
        for (const topicName of assessment.proposedTopics) {
           await this.updateTopicProgress(learningProgressId, topicName, null, assessment.id, assessment.metrics, assessment.audioMetrics);
        }
        // Potentially analyze steps for topics if proposedTopics is empty

        // 2. Update Word Progress (Iterate through assessment steps)
         for (const step of assessment.steps) {
           if (step.type === 'question') {
             const word = step.expectedAnswer; // Assuming expectedAnswer is relevant
             const translation = step.translation;
             if (word) {
                await this.updateWordProgress(learningProgressId, word, translation, null, step.id, step.correct, step.attempts > 0);
             }
             // Could also analyze step.content for words
           }
         }

        // 3. Recalculate Overall Progress
        // TODO: Implement more sophisticated calculation logic
        const updatedOverall = this.calculateOverallProgress(progress, assessment.metrics, assessment.audioMetrics);

         // 4. Save updated overall progress
         await this.progressRepository.upsertLearningProgress(userId, {
           ...updatedOverall,
           lastAssessmentCompletedAt: now,
           updatedAt: now, // Ensure updatedAt is set
         });

         logger.info('Successfully updated learning progress after assessment', { userId, assessmentId: assessment.id });

      } catch (error) {
        logger.error('Error updating learning progress after assessment:', { userId, assessmentId: assessment.id, error });
      }
  }

  // --- Helper Methods ---

  private async updateTopicProgress(
    learningProgressId: string,
    topicName: string,
    lessonId: string | null,
    assessmentId: string | null,
    metrics: any, // Lesson or Assessment metrics
    audioMetrics?: AudioMetrics | null
  ): Promise<void> {
    if (!topicName) return;

    const existingTopic = await this.progressRepository.getTopicProgress(learningProgressId, topicName);
    const now = new Date();
    let score = existingTopic?.score || 0;
    let masteryLevel = existingTopic?.masteryLevel || MasteryLevel.NotStarted;

    // Basic logic: Improve score/mastery on completion/good performance
    // TODO: Refine this logic based on actual metrics content
    const lessonScore = metrics?.overallScore ?? (metrics?.accuracy ?? 0); // Example score extraction
    const audioScore = audioMetrics?.overallPerformance ?? lessonScore; // Prefer audio score if available

    if (lessonId || assessmentId) { // If studied in this session
      masteryLevel = this.advanceMastery(masteryLevel, audioScore >= 70); // Advance if score is good
      score = (score + audioScore) / 2; // Simple averaging
    }

    const updateData: Partial<TopicProgressModel> & { topicName: string } = {
        topicName,
        masteryLevel,
        score: Math.round(score),
        lastStudiedAt: now,
        relatedLessonIds: existingTopic?.relatedLessonIds || [],
        relatedAssessmentIds: existingTopic?.relatedAssessmentIds || [],
        updatedAt: now,
    };

    if (lessonId && !updateData.relatedLessonIds.includes(lessonId)) {
        updateData.relatedLessonIds.push(lessonId);
    }
    if (assessmentId && !updateData.relatedAssessmentIds.includes(assessmentId)) {
        updateData.relatedAssessmentIds.push(assessmentId);
    }

    await this.progressRepository.upsertTopicProgress(learningProgressId, updateData);
  }

  private async updateWordProgress(
    learningProgressId: string,
    word: string,
    translation: string | null | undefined,
    lessonStepId: string | null,
    assessmentStepId: string | null,
    wasCorrect: boolean,
    wasAttempted: boolean
  ): Promise<void> {
    if (!word || !wasAttempted) return; // Only track attempted words

    const existingWord = await this.progressRepository.getWordProgress(learningProgressId, word);
    const now = new Date();

    let timesCorrect = existingWord?.timesCorrect || 0;
    let timesIncorrect = existingWord?.timesIncorrect || 0;
    let masteryLevel = existingWord?.masteryLevel || MasteryLevel.Seen;

    if (wasCorrect) {
      timesCorrect++;
      masteryLevel = this.advanceMastery(masteryLevel, true);
    } else {
      timesIncorrect++;
      masteryLevel = this.regressMastery(masteryLevel); // Regress slightly on incorrect
    }

     const updateData: Partial<WordProgressModel> & { word: string } = {
        word,
        translation: translation ?? existingWord?.translation,
        masteryLevel,
        timesCorrect,
        timesIncorrect,
        lastReviewedAt: now,
        relatedLessonStepIds: existingWord?.relatedLessonStepIds || [],
        relatedAssessmentStepIds: existingWord?.relatedAssessmentStepIds || [],
        updatedAt: now,
    };

     if (lessonStepId && !updateData.relatedLessonStepIds.includes(lessonStepId)) {
        updateData.relatedLessonStepIds.push(lessonStepId);
    }
    if (assessmentStepId && !updateData.relatedAssessmentStepIds.includes(assessmentStepId)) {
        updateData.relatedAssessmentStepIds.push(assessmentStepId);
    }

     // Set firstSeenAt only if it's a new word
     const createData = { ...updateData, firstSeenAt: now };

    await this.progressRepository.upsertWordProgress(
        learningProgressId,
        existingWord ? updateData : createData // Use updateData for update, createData for create
    );
  }

  private calculateOverallProgress(
      currentProgress: LearningProgressModel,
      metrics: any, // Lesson or Assessment metrics
      audioMetrics?: AudioMetrics | null
  ): Partial<LearningProgressModel> {
      // Simplified Example: Average score, update proficiency based on audio metrics
      // TODO: Implement sophisticated logic using historical data, AI analysis of strengths/weaknesses

      const newOverallScore = audioMetrics?.overallPerformance ?? metrics?.overallScore ?? metrics?.accuracy ?? currentProgress.overallScore ?? 0;
      const currentOverallScore = currentProgress.overallScore || 0;

      // Simple averaging - weight new score more
      const calculatedScore = (currentOverallScore * 0.3) + (newOverallScore * 0.7);

      let estimatedProficiencyLevel = currentProgress.estimatedProficiencyLevel;
      let learningTrajectory = currentProgress.learningTrajectory;

      // Update proficiency based on AudioMetrics CEFR level if available
      if (audioMetrics?.proficiencyLevel) {
          const audioProficiency = this.mapCefrToProficiency(audioMetrics.proficiencyLevel);
          if (audioProficiency && this.proficiencyLevelToInt(audioProficiency) > this.proficiencyLevelToInt(estimatedProficiencyLevel)) {
              estimatedProficiencyLevel = audioProficiency; // Update if higher
          }
      }

      // Update trajectory based on score change and audio trajectory
      if (audioMetrics?.learningTrajectory) {
          learningTrajectory = audioMetrics.learningTrajectory;
      } else if (calculatedScore > currentOverallScore + 5) {
          learningTrajectory = LearningTrajectory.accelerating;
      } else if (calculatedScore < currentOverallScore - 5) {
          learningTrajectory = LearningTrajectory.plateauing; // Or needs attention
      } else {
          learningTrajectory = LearningTrajectory.steady;
      }

      // Update strengths/weaknesses (simple example: add from metrics)
      const strengths = new Set([...currentProgress.strengths, ...(metrics?.strengths || []), ...(audioMetrics?.grammarAssessment?.grammar_strengths || [])]);
      const weaknesses = new Set([...currentProgress.weaknesses, ...(metrics?.weaknesses || []), ...(audioMetrics?.pronunciationAssessment?.areas_for_improvement || [])]);

      return {
          overallScore: Math.round(calculatedScore),
          estimatedProficiencyLevel,
          learningTrajectory,
          strengths: Array.from(strengths).slice(-10), // Limit size
          weaknesses: Array.from(weaknesses).slice(-10), // Limit size
      };
  }

  // --- Mastery Level Logic ---
   private advanceMastery(currentLevel: MasteryLevel, correct: boolean): MasteryLevel {
    if (!correct) return currentLevel; // Only advance if correct

    switch (currentLevel) {
      case MasteryLevel.NotStarted: return MasteryLevel.Seen;
      case MasteryLevel.Seen:       return MasteryLevel.Learning;
      case MasteryLevel.Learning:   return MasteryLevel.Practiced;
      case MasteryLevel.Practiced:  return MasteryLevel.Known;
      case MasteryLevel.Known:      return MasteryLevel.Mastered;
      case MasteryLevel.Mastered:   return MasteryLevel.Mastered; // Stays mastered
      default:                      return currentLevel;
    }
  }

  private regressMastery(currentLevel: MasteryLevel): MasteryLevel {
     switch (currentLevel) {
      // Don't regress too harshly initially
      case MasteryLevel.NotStarted: return MasteryLevel.NotStarted;
      case MasteryLevel.Seen:       return MasteryLevel.Seen;
      // Regress if learning or practiced
      case MasteryLevel.Learning:   return MasteryLevel.Seen;
      case MasteryLevel.Practiced:  return MasteryLevel.Learning;
      case MasteryLevel.Known:      return MasteryLevel.Practiced;
      case MasteryLevel.Mastered:   return MasteryLevel.Known; // Drop from mastered if incorrect
      default:                      return currentLevel;
    }
  }

  // --- Proficiency Level Mapping ---
  private mapCefrToProficiency(cefr: string): ProficiencyLevel | null {
      cefr = cefr.toUpperCase();
      if (cefr.startsWith('A1') || cefr.startsWith('A2')) return ProficiencyLevel.beginner;
      if (cefr.startsWith('B1') || cefr.startsWith('B2')) return ProficiencyLevel.intermediate;
      if (cefr.startsWith('C1') || cefr.startsWith('C2')) return ProficiencyLevel.advanced;
      return null;
  }

  private proficiencyLevelToInt(level: ProficiencyLevel): number {
      switch(level) {
          case ProficiencyLevel.beginner: return 1;
          case ProficiencyLevel.intermediate: return 2;
          case ProficiencyLevel.advanced: return 3;
          default: return 0;
      }
  }
}
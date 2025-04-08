'use server';

import { LearningProgressRepository } from '@/repositories/learning-progress.repository';
import LearningProgressService from '@/services/learning-progress.service';
import { LearningProgressModel, WordProgressModel } from '@/models/AppAllModels.model';
import logger from '@/utils/logger';
import { MasteryLevel } from '@prisma/client';

// Helper function to instantiate the service
function createLearningProgressService() {
  const repository = new LearningProgressRepository();
  // Inject other dependencies if needed
  return new LearningProgressService(repository);
}

/**
 * Gets the overall learning progress summary for a user.
 */
export async function getLearningProgressAction(userId: string): Promise<LearningProgressModel | null> {
  if (!userId) {
    logger.error('getLearningProgressAction called without userId');
    return null;
  }
  try {
    const progressService = createLearningProgressService();
    // Decide whether to get details or just summary based on use case
    // return await progressService.getLearningProgress(userId);
    return await progressService.getLearningProgressWithDetails(userId); // Example: get details
  } catch (error) {
    logger.error('Error in getLearningProgressAction:', { userId, error });
    return null; // Return null on error to the client
  }
}

/**
 * Gets words the user needs to practice (e.g., Seen, Learning, Practiced levels).
 */
export async function getPracticeWordsAction(userId: string): Promise<WordProgressModel[]> {
   if (!userId) {
     logger.error('getPracticeWordsAction called without userId');
     return [];
   }
   try {
     const progressService = createLearningProgressService();
     const progress = await progressService.getLearningProgress(userId);
     if (!progress) return [];

     const repo = new LearningProgressRepository(); // Or get from service if exposed
     return await repo.getWordsByMastery(progress.id, [
       MasteryLevel.Seen,
       MasteryLevel.Learning,
       MasteryLevel.Practiced,
       MasteryLevel.Known, // Include known for occasional review
     ]);
   } catch (error) {
     logger.error('Error in getPracticeWordsAction:', { userId, error });
     return [];
   }
}

// Add other actions as needed, e.g., getTopicProgressAction, getWordProgressAction
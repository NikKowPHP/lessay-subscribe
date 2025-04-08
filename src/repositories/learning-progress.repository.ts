import { IAuthService } from '@/services/auth.service';
import logger from '@/utils/logger';
import { LearningProgressModel, TopicProgressModel, WordProgressModel } from '@/models/AppAllModels.model';
import prisma from '@/lib/prisma';
import { LearningProgress, MasteryLevel, Prisma, ProficiencyLevel, TopicProgress, WordProgress } from '@prisma/client';

// Define the interface matching Prisma models but using TS models
export interface ILearningProgressRepository {
  getLearningProgress(userId: string): Promise<LearningProgressModel | null>;
  getLearningProgressWithDetails(userId: string): Promise<LearningProgressModel | null>; // Includes topics/words
  upsertLearningProgress(userId: string, data: Prisma.LearningProgressUncheckedCreateInput | Prisma.LearningProgressUpdateInput): Promise<LearningProgressModel>;
  upsertTopicProgress(learningProgressId: string, topicData: Prisma.TopicProgressUncheckedCreateInput | Prisma.TopicProgressUpdateInput): Promise<TopicProgressModel>;
  upsertWordProgress(learningProgressId: string, wordData: Prisma.WordProgressUncheckedCreateInput | Prisma.WordProgressUpdateInput): Promise<WordProgressModel>;
  getTopicProgress(learningProgressId: string, topicName: string): Promise<TopicProgressModel | null>;
  getWordProgress(learningProgressId: string, word: string): Promise<WordProgressModel | null>;
  getWordsByMastery(learningProgressId: string, masteryLevels: MasteryLevel[]): Promise<WordProgressModel[]>;
}

export class LearningProgressRepository implements ILearningProgressRepository {

  constructor() {
    // Constructor can be empty or take Prisma client if not using global instance
  }

  async getLearningProgress(userId: string): Promise<LearningProgressModel | null> {
    try {
      const progress = await prisma.learningProgress.findUnique({
        where: { userId },
      });
      return progress as LearningProgressModel | null; // Cast needed if types differ slightly
    } catch (error) {
      logger.error('Error fetching learning progress:', { userId, error });
      throw error;
    }
  }

  async getLearningProgressWithDetails(userId: string): Promise<LearningProgressModel | null> {
    try {
      const progress = await prisma.learningProgress.findUnique({
        where: { userId },
        include: {
          topics: { orderBy: { updatedAt: 'desc' }, take: 20 }, // Limit included items
          words: { orderBy: { updatedAt: 'desc' }, take: 50 }, // Limit included items
        },
      });
      return progress as LearningProgressModel | null;
    } catch (error) {
      logger.error('Error fetching learning progress with details:', { userId, error });
      throw error;
    }
  }


  async upsertLearningProgress(userId: string, data: Prisma.LearningProgressUncheckedCreateInput | Prisma.LearningProgressUpdateInput): Promise<LearningProgressModel> {
    try {
      const progress = await prisma.learningProgress.upsert({
        where: { userId },
        update: data as Prisma.LearningProgressUpdateInput,
        create: {
          ...data,
          user: { connect: { id: userId } }  // Use relation instead of direct userId
        } as unknown as Prisma.LearningProgressCreateInput  // Double assertion needed
      });
      return progress as LearningProgressModel;
    } catch (error) {
      logger.error('Error upserting learning progress:', { userId, data, error });
      throw error;
    }
  }

  async upsertTopicProgress(learningProgressId: string, topicData: Prisma.TopicProgressUncheckedCreateInput | Prisma.TopicProgressUpdateInput): Promise<TopicProgressModel> {
    const topicName = (topicData as any).topicName;
    if (!topicName) {
      throw new Error('topicName is required for upserting TopicProgress');
    }
    try {
      const { learningProgressId: _, ...cleanData } = topicData as any; // Exclude learningProgressId from spread
      const topicProgress = await prisma.topicProgress.upsert({
        where: { learningProgressId_topicName: { learningProgressId, topicName } },
        update: topicData as Prisma.TopicProgressUpdateInput,
        create: {
          ...cleanData,
          learningProgress: { connect: { id: learningProgressId } } // Use relation instead of direct ID
        } as unknown as Prisma.TopicProgressCreateInput
      });
      return topicProgress as TopicProgressModel;
    } catch (error) {
      logger.error('Error upserting topic progress:', { learningProgressId, topicData, error });
      throw error;
    }
  }

   async upsertWordProgress(learningProgressId: string, wordData: Prisma.WordProgressUncheckedCreateInput | Prisma.WordProgressUpdateInput): Promise<WordProgressModel> {
    const word = (wordData as any).word;
    if (!word) {
      throw new Error('word is required for upserting WordProgress');
    }
    try {
      const { learningProgressId: _, ...cleanData } = wordData as any; // Exclude learningProgressId from spread
      const wordProgress = await prisma.wordProgress.upsert({
        where: { learningProgressId_word: { learningProgressId, word } },
        update: wordData as Prisma.WordProgressUpdateInput,
        create: {
          ...cleanData,
          learningProgress: { connect: { id: learningProgressId } } // Use relation instead of direct ID
        } as unknown as Prisma.WordProgressCreateInput
      });
      return wordProgress as WordProgressModel;
    } catch (error) {
      logger.error('Error upserting word progress:', { learningProgressId, wordData, error });
      throw error;
    }
  }

  async getTopicProgress(learningProgressId: string, topicName: string): Promise<TopicProgressModel | null> {
     try {
       const topicProgress = await prisma.topicProgress.findUnique({
         where: { learningProgressId_topicName: { learningProgressId, topicName } },
       });
       return topicProgress as TopicProgressModel | null;
     } catch (error) {
       logger.error('Error fetching topic progress:', { learningProgressId, topicName, error });
       throw error;
     }
   }

   async getWordProgress(learningProgressId: string, word: string): Promise<WordProgressModel | null> {
     try {
       const wordProgress = await prisma.wordProgress.findUnique({
         where: { learningProgressId_word: { learningProgressId, word } },
       });
       return wordProgress as WordProgressModel | null;
     } catch (error) {
       logger.error('Error fetching word progress:', { learningProgressId, word, error });
       throw error;
     }
   }

   async getWordsByMastery(learningProgressId: string, masteryLevels: MasteryLevel[]): Promise<WordProgressModel[]> {
      try {
        const words = await prisma.wordProgress.findMany({
          where: {
            learningProgressId,
            masteryLevel: { in: masteryLevels },
          },
          orderBy: { lastReviewedAt: 'asc' }, // Prioritize words not reviewed recently
          take: 100, // Limit results
        });
        return words as WordProgressModel[];
      } catch (error) {
        logger.error('Error fetching words by mastery:', { learningProgressId, masteryLevels, error });
        throw error;
      }
    }
}
import { IUserRepository } from '@/repositories/user.repository'
import { UserProfileModel } from '@/models/AppAllModels.model'
import logger from '@/utils/logger'

export default class UserService {
  private userRepository: IUserRepository

  constructor(userRepository: IUserRepository) {
    this.userRepository = userRepository
  }

  async getUserProfile(userId: string): Promise<UserProfileModel | null> {
    logger.debug(`UserService: Getting profile for user ${userId}`);
    try {
      const profile = await this.userRepository.getUserProfile(userId);
      logger.debug(`UserService: Got profile for user ${userId}`, { profileFound: !!profile });
      return profile;
    } catch (error) {
      logger.error(`Error in UserService.getUserProfile for user ${userId}:`, error);
      // Re-throw to allow controller/action to handle specific error types if needed
      throw error;
    }
  }


  async createUserProfile(profile: Partial<UserProfileModel>): Promise<UserProfileModel> {
    try {
      return await this.userRepository.createUserProfile(profile)
    } catch (error) {
      logger.error('Error in UserService.createUserProfile:', error)
      throw error
    }
  }

  async updateUserProfile(userId: string, profile: Partial<UserProfileModel>): Promise<UserProfileModel> {
    try {
      return await this.userRepository.updateUserProfile(userId, profile)
    } catch (error) {
      logger.error('Error in UserService.updateUserProfile:', error)
      throw error
    }
  }


  /**
  * Deletes a user's profile and all associated data.
  * @param userId The ID of the user whose profile should be deleted.
  */
  async deleteUserProfile(userId: string): Promise<void> {
    logger.info(`UserService: Attempting to delete profile and auth user for ${userId}`);
    try {
      // The repository method now handles both DB and Auth deletion
      await this.userRepository.deleteUserProfile(userId);
      logger.info(`UserService: Successfully completed deletion process for user ${userId}`);
    } catch (error) {
      logger.error(`Error in UserService.deleteUserProfile for user ${userId}:`, error);
      // Re-throw the error so the calling layer (e.g., server action) knows it failed
      throw error;
    }
  }
}

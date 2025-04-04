import { IUserRepository } from '@/repositories/user.repository'
import { UserProfileModel } from '@/models/AppAllModels.model'
import logger from '@/utils/logger'

export default class UserService {
  private userRepository: IUserRepository

  constructor(userRepository: IUserRepository) {
    this.userRepository = userRepository
  }

  async getUserProfile(userId: string): Promise<UserProfileModel | null> {
    try {
      return await this.userRepository.getUserProfile(userId)
    } catch (error) {
      logger.error('Error in UserService.getUserProfile:', error)
      throw error
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
}
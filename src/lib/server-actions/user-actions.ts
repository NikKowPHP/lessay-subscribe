'use server';

import UserService from '@/services/user.service';
import { UserRepository } from '@/repositories/user.repository';
import { getAuthServiceBasedOnEnvironment } from '@/services/supabase-auth.service';
import { UserProfileModel } from '@/models/AppAllModels.model';
import logger from '@/utils/logger';

// Create a factory function for user service
function createUserService() {
  const repository = new UserRepository(getAuthServiceBasedOnEnvironment());
  return new UserService(repository);
}

export async function getUserProfileAction(userId: string): Promise<UserProfileModel | null> {
  try {
    const userService = createUserService();
    return await userService.getUserProfile(userId);
  } catch (error) {
    logger.error('Error in getUserProfileAction:', error);
    return null;
  }
}

export async function createUserProfileAction(profile: Partial<UserProfileModel>): Promise<UserProfileModel | null> {
  try {
    const userService = createUserService();
    return await userService.createUserProfile(profile);
  } catch (error) {
    logger.error('Error in createUserProfileAction:', error);
    throw error;
  }
}

export async function updateUserProfileAction(userId: string, profile: Partial<UserProfileModel>): Promise<UserProfileModel | null> {
  try {
    const userService = createUserService();
    return await userService.updateUserProfile(userId, profile);
  } catch (error) {
    logger.error('Error in updateUserProfileAction:', error);
    throw error;
  }
}

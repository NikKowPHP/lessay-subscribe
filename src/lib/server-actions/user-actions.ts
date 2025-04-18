'use server';

import { withServerErrorHandling, Result } from './_withErrorHandling'
import UserService from '@/services/user.service';
import { UserRepository } from '@/repositories/user.repository';
import { UserProfileModel } from '@/models/AppAllModels.model';
import logger from '@/utils/logger';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { Prisma } from '@prisma/client';

function createUserService() {
  const repository = new UserRepository();
  return new UserService(repository);
}

async function getCurrentUserId(): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.user?.id) {
    throw new Error('Authentication required.');
  }
  return session.user.id;
}

// GET PROFILE
export async function getUserProfileAction(userId: string): Promise<Result<UserProfileModel | null>> {
  return withServerErrorHandling(async () => {
    const currentUserId = await getCurrentUserId();
    if (userId !== currentUserId) throw new Error('Unauthorized');
    const svc = createUserService();
    return await svc.getUserProfile(userId);
  })
}

// CREATE PROFILE
export async function createUserProfileAction(profile: Partial<UserProfileModel>): Promise<Result<UserProfileModel>> {
  return withServerErrorHandling(async () => {
    const svc = createUserService();
    try {
      return await svc.createUserProfile(profile as any);
    } catch (error: any) {
      // On unique‐constraint error, return existing
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        logger.warn('Duplicate email, fetching existing profile');
        return (await getUserProfileAction(profile.userId!)).data!
      }
      throw error;
    }
  })
}

// UPDATE PROFILE
export async function updateUserProfileAction(userId: string, profile: Partial<UserProfileModel>): Promise<Result<UserProfileModel>> {
  return withServerErrorHandling(async () => {
    const currentUserId = await getCurrentUserId();
    if (userId !== currentUserId) throw new Error('Unauthorized');
    const svc = createUserService();
    return await svc.updateUserProfile(userId, profile);
  })
}

// DELETE PROFILE
export async function deleteUserProfileAction(): Promise<Result<null>> {
  return withServerErrorHandling(async () => {
    const userId = await getCurrentUserId();
    const svc = createUserService();
    await svc.deleteUserProfile(userId);
    // revalidate pages if you like
    revalidatePath('/');
    revalidatePath('/app');
    return null;
  })
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { useUserProfile } from '@/context/user-profile-context'
import { deleteUserProfileAction } from '@/lib/server-actions/user-actions'
import logger from '@/utils/logger'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { getLearningProgressAction } from '@/lib/server-actions/learning_progress-actions'
import { ProficiencyLevel } from '@prisma/client'
import { LearningProgressModel } from '@/models/AppAllModels.model'

export default function ProfilePage() {
  const router = useRouter()
  const { user, logout, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading, error: profileError } = useUserProfile()
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [learningProgress, setLearningProgress] = useState<LearningProgressModel | null>(null)
  const [progressLoading, setProgressLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user) {
      setDeleteError("You must be logged in to delete your account.");
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);
    logger.warn(`User ${user.id} confirmed account deletion.`);

    try {
      await deleteUserProfileAction();
      logout();
      router.push('/app/login');
    } catch (error) {
      logger.error(`Unexpected error during account deletion for user ${user.id}:`, error);
      setDeleteError('An unexpected error occurred. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  } 
 const handleLogout = async () => {
   setIsLoggingOut(true);
   try {
     await logout();
     // Auth context listener should handle redirect to /app/login
     // router.push('/app/login'); // Explicit push is likely redundant
   } catch (error) {
     logger.error('Logout failed on profile page:', error);
     // Error should be handled by AuthContext's toast
   } finally {
     setIsLoggingOut(false);
   }
 }

  useEffect(() => {
    const fetchProgress = async () => {
      if (user?.id) {
        try {
          const progress = await getLearningProgressAction(user.id)
          setLearningProgress(progress)
        } catch (error) {
          logger.error('Error loading learning progress:', error)
        } finally {
          setProgressLoading(false)
        }
      }
    }
    fetchProgress()
  }, [user?.id])

  // Helper to calculate proficiency progress
  const getProficiencyProgress = (level: ProficiencyLevel) => {
    switch(level) {
      case ProficiencyLevel.beginner: return 33
      case ProficiencyLevel.intermediate: return 66
      case ProficiencyLevel.advanced: return 100
      default: return 0
    }
  }

  if (profileLoading) {
    return <div className="p-4">Loading profile...</div>
  }

  if (profileError) {
    return <div className="p-4 text-red-600">Error loading profile: {profileError}</div>
  }

  if (!profile) {
    // This might happen briefly or if there's an issue creating the profile initially
    return <div className="p-4">Profile not found.</div>
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">User Profile</h1>
        <Button
          variant="outline"
          onClick={() => router.push('/app/lessons')}
        >
          Back to Lessons
        </Button>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Account Information</h2>
        <div className="space-y-2">
          <p><strong>Email:</strong> {profile.email}</p>
          <p><strong>Name:</strong> {profile.name || 'Not set'}</p>
          {/* Add other profile details here if needed */}
          <p><strong>User ID:</strong> {profile.userId}</p>
          <p><strong>Joined:</strong> {new Date(profile.createdAt).toLocaleDateString()}</p>
        </div>

      {/* --- Add Logout Button Section --- */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Account Actions</h2>
        <Button
          variant="outline"
          onClick={handleLogout}
          disabled={authLoading || isLoggingOut} // Disable while auth is loading or logging out
        >
          {isLoggingOut ? 'Logging out...' : 'Logout'}
        </Button>
      </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Learning Progress</h2>
        {progressLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        ) : learningProgress ? (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">Proficiency Level</span>
                <span className="text-sm text-gray-500">
                  {learningProgress.estimatedProficiencyLevel}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 rounded-full h-2.5" 
                  style={{ width: `${getProficiencyProgress(learningProgress.estimatedProficiencyLevel)}%` }}
                ></div>
              </div>
            </div>

            {learningProgress.overallScore !== null && (
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Overall Score</span>
                  <span className="text-sm text-gray-500">
                    {learningProgress.overallScore}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-green-600 rounded-full h-2.5" 
                    style={{ width: `${learningProgress.overallScore}%` }}
                  ></div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold mb-2 text-blue-800">Strengths</h3>
                {learningProgress.strengths?.length > 0 ? (
                  <ul className="list-disc pl-4 space-y-1">
                    {learningProgress.strengths.map((strength: string, index: number) => (
                      <li key={index} className="text-sm text-blue-700">{strength}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No strengths recorded yet</p>
                )}
              </div>

              <div className="p-4 bg-orange-50 rounded-lg">
                <h3 className="font-semibold mb-2 text-orange-800">Areas to Improve</h3>
                {learningProgress.weaknesses?.length > 0 ? (
                  <ul className="list-disc pl-4 space-y-1">
                    {learningProgress.weaknesses.map((weakness: string, index: number) => (
                      <li key={index} className="text-sm text-orange-700">{weakness}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No weaknesses recorded yet</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">No learning progress data available</p>
        )}
      </div>

      <div className="bg-red-50 border border-red-200 shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-red-800 mb-4">Danger Zone</h2>
        <p className="text-red-700 mb-4">
          Deleting your account is permanent and cannot be undone. All your learning progress,
          lesson history, and personal data associated with this account will be permanently removed.
        </p>

        {deleteError && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded">
            {deleteError}
          </div>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete My Account'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your
                account and remove all your data from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700" // Style confirmation button
              >
                {isDeleting ? 'Deleting...' : 'Yes, delete my account'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </div>
  )
}

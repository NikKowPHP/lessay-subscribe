

'use client'

import { useState } from 'react'
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

export default function ProfilePage() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const { profile, loading: profileLoading, error: profileError } = useUserProfile()
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleDeleteAccount = async () => {
    if (!user) {
      setDeleteError("You must be logged in to delete your account.");
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);
    logger.warn(`User ${user.id} confirmed account deletion.`);

    try {
      const result = await deleteUserProfileAction();

      if (result.success) {
        logger.warn(`Account deletion successful for user ${user.id}. Logging out.`);
        // Logout should ideally clear context and redirect via onAuthStateChange
        await logout();
        // Explicit redirect as a fallback or if auth state change is slow
        router.push('/app/login?message=Account+deleted+successfully');
      } else {
        logger.error(`Account deletion failed for user ${user.id}: ${result.error}`);
        setDeleteError(result.error || 'Failed to delete account. Please try again.');
      }
    } catch (error) {
      logger.error(`Unexpected error during account deletion for user ${user.id}:`, error);
      setDeleteError('An unexpected error occurred. Please try again.');
    } finally {
      setIsDeleting(false);
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
      <h1 className="text-2xl font-bold mb-6">User Profile</h1>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Account Information</h2>
        <div className="space-y-2">
          <p><strong>Email:</strong> {profile.email}</p>
          <p><strong>Name:</strong> {profile.name || 'Not set'}</p>
          {/* Add other profile details here if needed */}
          <p><strong>User ID:</strong> {profile.userId}</p>
          <p><strong>Joined:</strong> {new Date(profile.createdAt).toLocaleDateString()}</p>
        </div>
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

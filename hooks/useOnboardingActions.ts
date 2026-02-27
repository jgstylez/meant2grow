import { useCallback } from 'react';
import { safeIngest } from '../utils/analyticsIngest';
import { User, Goal, Role } from '../types';
import { MentorOnboardingData, MenteeOnboardingData } from '../types/onboarding';
import { getErrorMessage } from '../utils/errors';
import { createGoal, updateUser } from '../services/database';

export const useOnboardingActions = (
    addToast: (msg: string, type?: 'success' | 'error' | 'info') => void,
    getOnboardingComplete: () => Record<string, boolean>,
    setOnboardingComplete: (val: Record<string, boolean>) => void,
    setCurrentPage: (page: string) => void
) => {
    const handleMentorOnboardingComplete = useCallback(async (formData: any, currentUser: User, organizationId: string) => {
        // #region agent log
        safeIngest({location:'useOnboardingActions.ts:handleMentorOnboardingComplete',message:'Inner mentor complete entered',data:{userId:currentUser?.id,organizationId},timestamp:Date.now(),hypothesisId:'H3'});
        // #endregion
        try {
            // Parse maxMentees - handle both string and number, and "4+" case
            let maxMenteesValue: number | undefined = undefined;
            if (formData.maxMentees) {
                if (typeof formData.maxMentees === 'string') {
                    if (formData.maxMentees === '4+') {
                        maxMenteesValue = 4;
                    } else {
                        maxMenteesValue = parseInt(formData.maxMentees, 10);
                    }
                } else if (typeof formData.maxMentees === 'number') {
                    maxMenteesValue = formData.maxMentees;
                }
            }

            const userUpdates: Partial<User> = {
                name: formData.name || currentUser.name,
                email: formData.email || currentUser.email,
                avatar: formData.avatar || currentUser.avatar,
                title: formData.jobTitle || formData.title,
                company: formData.company,
                bio: formData.bio,
                skills: formData.skills,
                linkedinUrl: formData.linkedinUrl,
                phoneNumber: formData.phoneNumber,
                maxMentees: maxMenteesValue,
                acceptingNewMentees: true, // Default to accepting new mentees after onboarding
                profileData: formData.customFieldData,
                onboardingCompleted: true,
                onboardingCompletedAt: new Date().toISOString(),
            };

            // Filter out undefined values - Firebase doesn't allow them
            const cleanUpdates = Object.fromEntries(
                Object.entries(userUpdates).filter(([_, value]) => value !== undefined)
            ) as Partial<User>;

            await updateUser(currentUser.id, cleanUpdates);

            const onboardingComplete = getOnboardingComplete();
            setOnboardingComplete({ ...onboardingComplete, [currentUser.id]: true });

            addToast('Welcome! Your profile is now live.', 'success');
            setCurrentPage('dashboard');
            // #region agent log
            safeIngest({location:'useOnboardingActions.ts:handleMentorOnboardingComplete',message:'Mentor complete success path',data:{userId:currentUser.id},timestamp:Date.now(),hypothesisId:'H4_H5'});
            // #endregion
        } catch (error: unknown) {
            // #region agent log
            safeIngest({location:'useOnboardingActions.ts:handleMentorOnboardingComplete',message:'Mentor complete catch',data:{error:String(error)},timestamp:Date.now(),hypothesisId:'H4'});
            // #endregion
            console.error('Error completing mentor onboarding:', error);
            addToast(getErrorMessage(error) || 'Failed to save onboarding data', 'error');
        }
    }, [addToast, getOnboardingComplete, setOnboardingComplete, setCurrentPage]);

    const handleMenteeOnboardingComplete = useCallback(async (formData: any, currentUser: User, organizationId: string) => {
        // #region agent log
        safeIngest({location:'useOnboardingActions.ts:handleMenteeOnboardingComplete',message:'Inner mentee complete entered',data:{userId:currentUser?.id,organizationId},timestamp:Date.now(),hypothesisId:'H3'});
        // #endregion
        try {
            const goalTitles: string[] = [];
            // Handle both formats: careerGoals (array of strings) or goals (array of objects with title and targetDate)
            let goalsToProcess: Array<{ title: string; targetDate?: string }> = [];
            
            if (formData.careerGoals && Array.isArray(formData.careerGoals)) {
                // Legacy format: array of strings
                goalsToProcess = formData.careerGoals.map((g: string) => ({ title: g }));
            } else if (formData.goals && Array.isArray(formData.goals)) {
                // New format: array of objects with title and targetDate
                goalsToProcess = formData.goals;
            }
            
            if (goalsToProcess.length > 0) {
                for (const goal of goalsToProcess) {
                    const newGoal: Omit<Goal, 'id'> = {
                        userId: currentUser.id,
                        organizationId: organizationId,
                        title: goal.title,
                        description: `Personal goal: ${goal.title}`,
                        progress: 0,
                        status: 'Not Started',
                        dueDate: goal.targetDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    };
                    await createGoal(newGoal);
                    goalTitles.push(goal.title);
                }
            }

            const userUpdates: Partial<User> = {
                name: formData.name || currentUser.name,
                email: formData.email || currentUser.email,
                avatar: formData.avatar || currentUser.avatar,
                title: formData.jobTitle || formData.title,
                company: formData.company,
                bio: formData.bio,
                experience: formData.experience,
                skills: formData.skillsToImprove || formData.areas,
                goals: goalTitles,
                linkedinUrl: formData.linkedinUrl,
                phoneNumber: formData.phoneNumber,
                profileData: formData.customFieldData,
                onboardingCompleted: true,
                onboardingCompletedAt: new Date().toISOString(),
            };

            // Filter out undefined values - Firebase doesn't allow them
            const cleanUpdates = Object.fromEntries(
                Object.entries(userUpdates).filter(([_, value]) => value !== undefined)
            ) as Partial<User>;

            await updateUser(currentUser.id, cleanUpdates);

            const onboardingComplete = getOnboardingComplete();
            setOnboardingComplete({ ...onboardingComplete, [currentUser.id]: true });

            addToast('Welcome! Start exploring mentors.', 'success');
            setCurrentPage('dashboard');
            // #region agent log
            safeIngest({location:'useOnboardingActions.ts:handleMenteeOnboardingComplete',message:'Mentee complete success path',data:{userId:currentUser.id},timestamp:Date.now(),hypothesisId:'H4_H5'});
            // #endregion
        } catch (error: unknown) {
            // #region agent log
            safeIngest({location:'useOnboardingActions.ts:handleMenteeOnboardingComplete',message:'Mentee complete catch',data:{error:String(error)},timestamp:Date.now(),hypothesisId:'H4'});
            // #endregion
            console.error('Error completing mentee onboarding:', error);
            addToast(getErrorMessage(error) || 'Failed to save onboarding data', 'error');
        }
    }, [addToast, getOnboardingComplete, setOnboardingComplete, setCurrentPage]);

    return { handleMentorOnboardingComplete, handleMenteeOnboardingComplete };
};

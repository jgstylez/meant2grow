
import { useCallback } from 'react';
import { User, Goal } from '../types';
import { getErrorMessage } from '../utils/errors';
import { createGoal, updateGoal, deleteGoal, createNotification } from '../services/database';

export const useGoalActions = (
    addToast: (msg: string, type?: 'success' | 'error' | 'info') => void,
    organizationId: string | null,
    currentUser: User | null,
    goals: Goal[]
) => {
    const handleAddGoal = useCallback(async (g: Omit<Goal, 'id'>) => {
        try {
            if (!organizationId) throw new Error('Organization ID is required');
            await createGoal({ ...g, organizationId });
            addToast('New goal created', 'success');
        } catch (error: unknown) {
            console.error('Error creating goal:', error);
            addToast(getErrorMessage(error) || 'Failed to create goal', 'error');
        }
    }, [addToast, organizationId]);

    const handleUpdateGoal = useCallback(async (id: string, progress: number, status: string) => {
        try {
            await updateGoal(id, { progress, status: status as Goal['status'] });

            if (status === 'Completed') {
                addToast('Goal marked as complete!', 'success');
                const goal = goals.find(g => g.id === id);
                if (goal && organizationId && currentUser) {
                    createNotification({
                        organizationId,
                        userId: currentUser.id,
                        type: 'goal',
                        title: 'Goal Completed! 🎉',
                        body: `Congratulations! You've completed "${goal.title}"`,
                        isRead: false,
                        timestamp: new Date().toISOString(),
                    }).catch(err => console.error('Error creating goal completion notification:', err));
                }
            }
        } catch (error: unknown) {
            console.error('Error updating goal:', error);
            addToast(getErrorMessage(error) || 'Failed to update goal', 'error');
        }
    }, [addToast, goals, organizationId, currentUser]);

    const handleDeleteGoal = useCallback(async (goalId: string) => {
        try {
            await deleteGoal(goalId);
            addToast('Goal deleted', 'success');
        } catch (error: unknown) {
            console.error('Error deleting goal:', error);
            addToast(getErrorMessage(error) || 'Failed to delete goal', 'error');
        }
    }, [addToast]);

    return { handleAddGoal, handleUpdateGoal, handleDeleteGoal };
};

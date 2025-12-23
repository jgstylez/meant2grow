
import { useCallback } from 'react';
import { DiscussionGuide } from '../types';
import { getErrorMessage } from '../utils/errors';
import { createDiscussionGuide, updateDiscussionGuide, deleteDiscussionGuide } from '../services/database';

export const useGuideActions = (addToast: (msg: string, type?: 'success' | 'error' | 'info') => void) => {
    const handleAddDiscussionGuide = useCallback(async (guide: Omit<DiscussionGuide, 'id' | 'createdAt'>) => {
        try {
            await createDiscussionGuide(guide);
            addToast('Discussion guide created', 'success');
        } catch (error: unknown) {
            console.error('Error:', error);
            addToast(getErrorMessage(error), 'error');
        }
    }, [addToast]);

    const handleUpdateDiscussionGuide = useCallback(async (id: string, updates: Partial<DiscussionGuide>) => {
        try {
            await updateDiscussionGuide(id, updates);
            addToast('Discussion guide updated', 'success');
        } catch (error: unknown) {
            console.error('Error updating guide:', error);
            addToast(getErrorMessage(error) || 'Failed to update guide', 'error');
        }
    }, [addToast]);

    const handleDeleteDiscussionGuide = useCallback(async (id: string) => {
        try {
            await deleteDiscussionGuide(id);
            addToast('Discussion guide removed', 'info');
        } catch (error: unknown) {
            console.error('Error deleting guide:', error);
            addToast(getErrorMessage(error) || 'Failed to delete guide', 'error');
        }
    }, [addToast]);

    return { handleAddDiscussionGuide, handleUpdateDiscussionGuide, handleDeleteDiscussionGuide };
};

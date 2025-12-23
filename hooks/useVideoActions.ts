
import { useCallback } from 'react';
import { TrainingVideo } from '../types';
import { getErrorMessage } from '../utils/errors';
import { createTrainingVideo, updateTrainingVideo, deleteTrainingVideo } from '../services/database';

export const useVideoActions = (addToast: (msg: string, type?: 'success' | 'error' | 'info') => void) => {
    const handleAddTrainingVideo = useCallback(async (video: Omit<TrainingVideo, 'id' | 'createdAt'>) => {
        try {
            await createTrainingVideo(video);
            addToast('Training video added', 'success');
        } catch (error: unknown) {
            console.error('Error adding video:', error);
            addToast(getErrorMessage(error) || 'Failed to add video', 'error');
        }
    }, [addToast]);

    const handleUpdateTrainingVideo = useCallback(async (id: string, updates: Partial<TrainingVideo>) => {
        try {
            await updateTrainingVideo(id, updates);
            addToast('Training video updated', 'success');
        } catch (error: unknown) {
            console.error('Error updating video:', error);
            addToast(getErrorMessage(error) || 'Failed to update video', 'error');
        }
    }, [addToast]);

    const handleDeleteTrainingVideo = useCallback(async (id: string) => {
        try {
            await deleteTrainingVideo(id);
            addToast('Training video removed', 'info');
        } catch (error: unknown) {
            console.error('Error deleting video:', error);
            addToast(getErrorMessage(error) || 'Failed to delete video', 'error');
        }
    }, [addToast]);

    return { handleAddTrainingVideo, handleUpdateTrainingVideo, handleDeleteTrainingVideo };
};

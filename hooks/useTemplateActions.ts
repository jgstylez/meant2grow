
import { useCallback } from 'react';
import { CareerTemplate } from '../types';
import { getErrorMessage } from '../utils/errors';
import { createCareerTemplate, updateCareerTemplate, deleteCareerTemplate } from '../services/database';

export const useTemplateActions = (addToast: (msg: string, type?: 'success' | 'error' | 'info') => void) => {
    const handleAddCareerTemplate = useCallback(async (template: Omit<CareerTemplate, 'id' | 'createdAt'>) => {
        try {
            await createCareerTemplate(template);
            addToast('Document saved', 'success');
        } catch (error: unknown) {
            console.error('Error creating document:', error);
            addToast(getErrorMessage(error) || 'Failed to save document', 'error');
        }
    }, [addToast]);

    const handleUpdateCareerTemplate = useCallback(async (id: string, updates: Partial<CareerTemplate>) => {
        try {
            await updateCareerTemplate(id, updates);
            addToast('Document updated', 'success');
        } catch (error: unknown) {
            console.error('Error updating document:', error);
            addToast(getErrorMessage(error) || 'Failed to update document', 'error');
        }
    }, [addToast]);

    const handleDeleteCareerTemplate = useCallback(async (id: string) => {
        try {
            await deleteCareerTemplate(id);
            addToast('Document removed', 'info');
        } catch (error: unknown) {
            console.error('Error deleting document:', error);
            addToast(getErrorMessage(error) || 'Failed to delete document', 'error');
        }
    }, [addToast]);

    return { handleAddCareerTemplate, handleUpdateCareerTemplate, handleDeleteCareerTemplate };
};

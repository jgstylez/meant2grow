
import { useCallback } from 'react';
import { CareerTemplate } from '../types';
import { getErrorMessage } from '../utils/errors';
import { createCareerTemplate, updateCareerTemplate, deleteCareerTemplate } from '../services/database';

export const useTemplateActions = (addToast: (msg: string, type?: 'success' | 'error' | 'info') => void) => {
    const handleAddCareerTemplate = useCallback(async (template: Omit<CareerTemplate, 'id' | 'createdAt'>) => {
        try {
            await createCareerTemplate(template);
            addToast('Career template created', 'success');
        } catch (error: unknown) {
            console.error('Error creating template:', error);
            addToast(getErrorMessage(error) || 'Failed to create template', 'error');
        }
    }, [addToast]);

    const handleUpdateCareerTemplate = useCallback(async (id: string, updates: Partial<CareerTemplate>) => {
        try {
            await updateCareerTemplate(id, updates);
            addToast('Career template updated', 'success');
        } catch (error: unknown) {
            console.error('Error updating template:', error);
            addToast(getErrorMessage(error) || 'Failed to update template', 'error');
        }
    }, [addToast]);

    const handleDeleteCareerTemplate = useCallback(async (id: string) => {
        try {
            await deleteCareerTemplate(id);
            addToast('Career template removed', 'info');
        } catch (error: unknown) {
            console.error('Error deleting template:', error);
            addToast(getErrorMessage(error) || 'Failed to delete template', 'error');
        }
    }, [addToast]);

    return { handleAddCareerTemplate, handleUpdateCareerTemplate, handleDeleteCareerTemplate };
};


import { useCallback } from 'react';
import { BlogPost } from '../types';
import { getErrorMessage } from '../utils/errors';
import { createBlogPost, updateBlogPost, deleteBlogPost } from '../services/database';

export const useBlogActions = (addToast: (msg: string, type?: 'success' | 'error' | 'info') => void) => {
    const handleAddBlogPost = useCallback(async (post: Omit<BlogPost, 'id' | 'createdAt'>) => {
        try {
            await createBlogPost(post);
            addToast('Blog post created successfully', 'success');
        } catch (error: unknown) {
            console.error('Error adding blog post:', error);
            addToast(getErrorMessage(error) || 'Failed to add blog post', 'error');
        }
    }, [addToast]);

    const handleUpdateBlogPost = useCallback(async (id: string, updates: Partial<BlogPost>) => {
        try {
            await updateBlogPost(id, updates);
            addToast('Blog post updated', 'success');
        } catch (error: unknown) {
            console.error('Error updating blog post:', error);
            addToast(getErrorMessage(error) || 'Failed to update blog post', 'error');
        }
    }, [addToast]);

    const handleDeleteBlogPost = useCallback(async (id: string) => {
        try {
            await deleteBlogPost(id);
            addToast('Blog post deleted', 'info');
        } catch (error: unknown) {
            console.error('Error deleting blog post:', error);
            addToast(getErrorMessage(error) || 'Failed to delete blog post', 'error');
        }
    }, [addToast]);

    return { handleAddBlogPost, handleUpdateBlogPost, handleDeleteBlogPost };
};

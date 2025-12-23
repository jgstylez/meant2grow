
import React, { useState } from 'react';
import { Plus, Save, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { BlogPost } from '../../types';
import { CARD_CLASS, INPUT_CLASS, BUTTON_PRIMARY } from '../../styles/common';

interface ManageBlogProps {
    blogPosts: BlogPost[];
    onAdd: (post: Omit<BlogPost, 'id' | 'createdAt'>) => void;
    onUpdate: (id: string, updates: Partial<BlogPost>) => void;
    onDelete: (id: string) => void;
}

export const ManageBlog: React.FC<ManageBlogProps> = ({
    blogPosts,
    onAdd,
    onUpdate,
    onDelete
}) => {
    const [newBlogPost, setNewBlogPost] = useState<Partial<BlogPost>>({
        title: '',
        category: 'Skills',
        imageUrl: '',
        excerpt: '',
        published: false
    });
    const [editingBlogPost, setEditingBlogPost] = useState<BlogPost | null>(null);

    const handleSaveBlogPost = async () => {
        if (!newBlogPost.title || !newBlogPost.imageUrl) return;

        const postData = {
            title: newBlogPost.title!,
            category: newBlogPost.category || 'Skills',
            imageUrl: newBlogPost.imageUrl!,
            excerpt: newBlogPost.excerpt || '',
            published: newBlogPost.published || false
        };

        if (editingBlogPost) {
            await onUpdate(editingBlogPost.id, postData);
        } else {
            await onAdd(postData);
        }

        handleCancelEdit();
    };

    const handleEditBlogPost = (post: BlogPost) => {
        setEditingBlogPost(post);
        setNewBlogPost({
            title: post.title,
            category: post.category,
            imageUrl: post.imageUrl,
            excerpt: post.excerpt,
            published: post.published
        });
    };

    const handleCancelEdit = () => {
        setEditingBlogPost(null);
        setNewBlogPost({
            title: '',
            category: 'Skills',
            imageUrl: '',
            excerpt: '',
            published: false
        });
    };

    return (
        <div className="space-y-6">
            <div className={CARD_CLASS}>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                    <Plus className="w-5 h-5 mr-2 text-emerald-600" />
                    {editingBlogPost ? 'Edit Blog Post' : 'Add New Blog Post'}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="col-span-2">
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Title</label>
                        <input
                            className={INPUT_CLASS}
                            placeholder="e.g. The Art of Active Listening"
                            value={newBlogPost.title}
                            onChange={e => setNewBlogPost({ ...newBlogPost, title: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                        <select
                            className={INPUT_CLASS}
                            value={newBlogPost.category}
                            onChange={e => setNewBlogPost({ ...newBlogPost, category: e.target.value })}
                        >
                            <option>Skills</option>
                            <option>Trends</option>
                            <option>Growth</option>
                            <option>Enterprise</option>
                            <option>Wellness</option>
                            <option>Data</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                        <div className="flex items-center gap-2 mt-2">
                            <button
                                onClick={() => setNewBlogPost({ ...newBlogPost, published: !newBlogPost.published })}
                                className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${newBlogPost.published
                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                    }`}
                            >
                                {newBlogPost.published ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
                                {newBlogPost.published ? 'Published' : 'Draft'}
                            </button>
                        </div>
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Image URL</label>
                        <input
                            className={INPUT_CLASS}
                            placeholder="https://images.unsplash.com/..."
                            value={newBlogPost.imageUrl}
                            onChange={e => setNewBlogPost({ ...newBlogPost, imageUrl: e.target.value })}
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Excerpt</label>
                        <textarea
                            className={INPUT_CLASS}
                            rows={3}
                            placeholder="Brief summary that will appear on the blog listing..."
                            value={newBlogPost.excerpt}
                            onChange={e => setNewBlogPost({ ...newBlogPost, excerpt: e.target.value })}
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    {editingBlogPost && (
                        <button
                            onClick={handleCancelEdit}
                            className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        onClick={handleSaveBlogPost}
                        disabled={!newBlogPost.title || !newBlogPost.imageUrl}
                        className={BUTTON_PRIMARY}
                    >
                        <Save className="w-4 h-4 mr-2" /> {editingBlogPost ? 'Update Post' : 'Publish Post'}
                    </button>
                </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-4">Current Blog Posts</h3>
                {blogPosts.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">No blog posts added yet.</p>
                ) : (
                    <div className="space-y-3">
                        {blogPosts.map((post) => (
                            <div key={post.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 flex items-start gap-4">
                                <div className="w-24 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-slate-200 dark:bg-slate-700">
                                    <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = `https://via.placeholder.com/96x64/10b981/ffffff?text=${encodeURIComponent(post.title.substring(0, 10))}`;
                                    }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">{post.title}</h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{post.excerpt || 'No excerpt'}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded">{post.category}</span>
                                                {post.published ? (
                                                    <span className="text-xs px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded flex items-center gap-1">
                                                        <Eye className="w-3 h-3" /> Published
                                                    </span>
                                                ) : (
                                                    <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded flex items-center gap-1">
                                                        <EyeOff className="w-3 h-3" /> Draft
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button
                                                onClick={() => handleEditBlogPost(post)}
                                                className="p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                                                title="Edit"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => onDelete(post.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

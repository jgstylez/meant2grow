
import React, { useRef, useState } from 'react';
import { Plus, Save, Edit, Trash2, Eye, EyeOff, Upload, Link2, Loader2 } from 'lucide-react';
import { BlogPost } from '../../types';
import { CARD_CLASS, INPUT_CLASS, BUTTON_PRIMARY } from '../../styles/common';
import { uploadFile } from '../../services/storage';
import { extensionForOptimizedBlob, optimizeImageForWeb } from '../../utils/optimizeImageForWeb';

interface ManageBlogProps {
  blogPosts: BlogPost[];
  onAdd: (post: Omit<BlogPost, 'id' | 'createdAt'>) => void;
  onUpdate: (id: string, updates: Partial<BlogPost>) => void;
  onDelete: (id: string) => void;
}

export const ManageBlog: React.FC<ManageBlogProps> = ({ blogPosts, onAdd, onUpdate, onDelete }) => {
  const [newBlogPost, setNewBlogPost] = useState<Partial<BlogPost>>({
    title: '',
    category: 'Skills',
    imageUrl: '',
    excerpt: '',
    published: false,
  });
  const [editingBlogPost, setEditingBlogPost] = useState<BlogPost | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveBlogPost = async () => {
    if (!newBlogPost.title || !newBlogPost.imageUrl?.trim()) return;

    const postData = {
      title: newBlogPost.title!,
      category: newBlogPost.category || 'Skills',
      imageUrl: newBlogPost.imageUrl!.trim(),
      excerpt: newBlogPost.excerpt || '',
      published: newBlogPost.published || false,
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
    setImageError(null);
    setNewBlogPost({
      title: post.title,
      category: post.category,
      imageUrl: post.imageUrl,
      excerpt: post.excerpt,
      published: post.published,
    });
  };

  const handleCancelEdit = () => {
    setEditingBlogPost(null);
    setImageError(null);
    setNewBlogPost({
      title: '',
      category: 'Skills',
      imageUrl: '',
      excerpt: '',
      published: false,
    });
  };

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) {
      setImageError('Choose an image file (PNG, JPEG, WebP, or GIF).');
      return;
    }

    setImageBusy(true);
    setImageError(null);
    try {
      const optimized = await optimizeImageForWeb(file);
      const ext = extensionForOptimizedBlob(optimized);
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const path = `blogImages/${id}.${ext}`;
      const url = await uploadFile(optimized, path);
      setNewBlogPost((prev) => ({ ...prev, imageUrl: url }));
    } catch (err) {
      console.error('Blog cover upload failed:', err);
      setImageError(
        err instanceof Error ? err.message : 'Could not process or upload the image. Try another file or paste a URL.'
      );
    } finally {
      setImageBusy(false);
    }
  };

  const hasImage = !!newBlogPost.imageUrl?.trim();

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
              onChange={(e) => setNewBlogPost({ ...newBlogPost, title: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
            <select
              className={INPUT_CLASS}
              value={newBlogPost.category}
              onChange={(e) => setNewBlogPost({ ...newBlogPost, category: e.target.value })}
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
                type="button"
                onClick={() => setNewBlogPost({ ...newBlogPost, published: !newBlogPost.published })}
                className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  newBlogPost.published
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
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
              Cover image
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Paste an image URL, or upload a file — we resize (max ~1600px) and compress for faster loading.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              <button
                type="button"
                disabled={imageBusy}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/35 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {imageBusy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {imageBusy ? 'Optimizing & uploading…' : 'Upload image'}
              </button>
              <div className="flex-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 px-1">
                <Link2 className="w-3.5 h-3.5 shrink-0" />
                <span>or enter a URL below</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleImageFile}
              />
            </div>
            <input
              className={INPUT_CLASS}
              placeholder="https://images.unsplash.com/..."
              value={newBlogPost.imageUrl}
              onChange={(e) => {
                setImageError(null);
                setNewBlogPost({ ...newBlogPost, imageUrl: e.target.value });
              }}
            />
            {imageError && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-2" role="alert">
                {imageError}
              </p>
            )}
            {hasImage && !imageBusy && (
              <div className="mt-3 flex items-start gap-3">
                <div className="w-28 h-20 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0">
                  <img
                    src={newBlogPost.imageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={() => setImageError('Preview failed — check the URL or try uploading again.')}
                  />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                  Preview uses the URL above (your uploaded file is stored in Firebase and shown here as a link).
                </p>
              </div>
            )}
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Excerpt</label>
            <textarea
              className={INPUT_CLASS}
              rows={3}
              placeholder="Brief summary that will appear on the blog listing..."
              value={newBlogPost.excerpt}
              onChange={(e) => setNewBlogPost({ ...newBlogPost, excerpt: e.target.value })}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          {editingBlogPost && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleSaveBlogPost}
            disabled={!newBlogPost.title || !newBlogPost.imageUrl?.trim() || imageBusy}
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
              <div
                key={post.id}
                className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 flex items-start gap-4"
              >
                <div className="w-24 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-slate-200 dark:bg-slate-700">
                  <img
                    src={post.imageUrl}
                    alt={post.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `https://via.placeholder.com/96x64/10b981/ffffff?text=${encodeURIComponent(
                        post.title.substring(0, 10)
                      )}`;
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">
                        {post.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {post.excerpt || 'No excerpt'}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded">
                          {post.category}
                        </span>
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
                        type="button"
                        onClick={() => handleEditBlogPost(post)}
                        className="p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
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

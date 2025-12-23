
import React, { useState } from 'react';
import { Plus, Save, Edit, Trash2 } from 'lucide-react';
import { TrainingVideo } from '../../types';
import { CARD_CLASS, INPUT_CLASS, BUTTON_PRIMARY } from '../../styles/common';

interface ManageVideosProps {
    trainingVideos: TrainingVideo[];
    onAdd: (video: Omit<TrainingVideo, 'id' | 'createdAt'>) => void;
    onUpdate: (id: string, updates: Partial<TrainingVideo>) => void;
    onDelete: (id: string) => void;
    canManagePlatform: boolean;
    userOrganizationId?: string;
}

export const ManageVideos: React.FC<ManageVideosProps> = ({
    trainingVideos,
    onAdd,
    onUpdate,
    onDelete,
    canManagePlatform,
    userOrganizationId
}) => {
    const [newVideo, setNewVideo] = useState<Partial<TrainingVideo>>({
        title: '',
        duration: '',
        description: '',
        thumbnail: '',
        videoUrl: '',
        isPlatform: false
    });
    const [editingVideo, setEditingVideo] = useState<TrainingVideo | null>(null);

    const [urlError, setUrlError] = useState<string | null>(null);

    const validateVideoUrl = (url: string): boolean => {
        if (!url) return true; // Optional field
        const patterns = [
            /youtube\.com/, /youtu\.be/,
            /vimeo\.com/,
            /wistia\.(com|net)/,
            /theblacktube\.com/, /blacktube\.com/
        ];
        return patterns.some(pattern => pattern.test(url.toLowerCase()));
    };

    const handleSaveVideo = async () => {
        if (!newVideo.title || !newVideo.duration || !newVideo.description || !newVideo.thumbnail) return;

        if (newVideo.videoUrl && !validateVideoUrl(newVideo.videoUrl)) {
            setUrlError("Invalid video provider. Please use YouTube, Vimeo, Wistia, or The BlackTube.");
            return;
        }
        setUrlError(null);

        const finalVideoData: Omit<TrainingVideo, 'id' | 'createdAt'> = {
            title: newVideo.title!,
            duration: newVideo.duration!,
            description: newVideo.description!,
            thumbnail: newVideo.thumbnail!,
            videoUrl: newVideo.videoUrl,
            transcript: newVideo.transcript,
            isPlatform: canManagePlatform && (newVideo.isPlatform || false),
            organizationId: (canManagePlatform && newVideo.isPlatform) ? undefined : userOrganizationId
        };

        if (editingVideo) {
            await onUpdate(editingVideo.id, finalVideoData);
        } else {
            await onAdd(finalVideoData);
        }

        handleCancelEdit();
    };

    const handleCancelEdit = () => {
        setEditingVideo(null);
        setNewVideo({
            title: '',
            duration: '',
            description: '',
            thumbnail: '',
            videoUrl: '',
            isPlatform: false
        });
    };

    const handleEdit = (video: TrainingVideo) => {
        setEditingVideo(video);
        setNewVideo({ ...video });
    };

    return (
        <div className="space-y-6">
            <div className={CARD_CLASS}>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                    <Plus className="w-5 h-5 mr-2 text-amber-600" />
                    {editingVideo ? 'Edit Video' : 'Add New Training Video'}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="col-span-2">
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Title</label>
                        <input
                            className={INPUT_CLASS}
                            placeholder="e.g. The Art of Active Listening"
                            value={newVideo.title}
                            onChange={e => setNewVideo({ ...newVideo, title: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Duration</label>
                        <input
                            className={INPUT_CLASS}
                            placeholder="e.g. 12:45"
                            value={newVideo.duration}
                            onChange={e => setNewVideo({ ...newVideo, duration: e.target.value })}
                        />
                    </div>
                    {canManagePlatform && (
                        <div>
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Scope</label>
                            <select
                                className={INPUT_CLASS}
                                value={newVideo.isPlatform ? 'platform' : 'organization'}
                                onChange={e => setNewVideo({ ...newVideo, isPlatform: e.target.value === 'platform' })}
                            >
                                <option value="organization">Our Organization Only</option>
                                <option value="platform">Platform Wide (All Orgs)</option>
                            </select>
                        </div>
                    )}
                    <div className="col-span-2">
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Thumbnail URL</label>
                        <input
                            className={INPUT_CLASS}
                            placeholder="https://images.unsplash.com/..."
                            value={newVideo.thumbnail}
                            onChange={e => setNewVideo({ ...newVideo, thumbnail: e.target.value })}
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Video URL (optional)</label>
                        <input
                            className={`${INPUT_CLASS} ${urlError ? 'border-red-500 focus:ring-red-500' : ''}`}
                            placeholder="https://youtube.com/..."
                            value={newVideo.videoUrl}
                            onChange={e => {
                                setNewVideo({ ...newVideo, videoUrl: e.target.value });
                                if (urlError) setUrlError(null);
                            }}
                        />
                        {urlError && <p className="text-[10px] text-red-500 mt-1">{urlError}</p>}
                        <p className="text-[10px] text-slate-400 mt-1 italic">Supported: YouTube, Vimeo, Wistia, The BlackTube</p>
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                        <textarea
                            className={INPUT_CLASS}
                            rows={3}
                            placeholder="Brief description..."
                            value={newVideo.description}
                            onChange={e => setNewVideo({ ...newVideo, description: e.target.value })}
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    {editingVideo && (
                        <button
                            onClick={handleCancelEdit}
                            className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        onClick={handleSaveVideo}
                        disabled={!newVideo.title || !newVideo.duration || !newVideo.description || !newVideo.thumbnail}
                        className={BUTTON_PRIMARY}
                    >
                        <Save className="w-4 h-4 mr-2" /> {editingVideo ? 'Update Video' : 'Create Video'}
                    </button>
                </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-4">Current Videos</h3>
                {trainingVideos.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">No videos added yet.</p>
                ) : (
                    <div className="space-y-3">
                        {trainingVideos.map((video) => (
                            <div key={video.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 flex items-start gap-4">
                                <div className="w-24 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-slate-200 dark:bg-slate-700">
                                    <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">{video.title}</h4>
                                        {video.isPlatform ? (
                                            <span className="text-[10px] uppercase font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">Platform Focused</span>
                                        ) : (
                                            <span className="text-[10px] uppercase font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">Our Organization</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{video.description}</p>
                                    <p className="text-xs text-slate-400 mt-1">{video.duration}</p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <button
                                        onClick={() => handleEdit(video)}
                                        className="p-2 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                                        title="Edit"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => { if (confirm('Are you sure you want to delete this video?')) onDelete(video.id); }}
                                        className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};


import React, { useEffect, useState } from 'react';
import { Plus, Save, Edit, Trash2 } from 'lucide-react';
import { TrainingVideo } from '../../types';
import { CARD_CLASS, INPUT_CLASS, BUTTON_PRIMARY } from '../../styles/common';
import {
    extractStartTimeFromVideoUrl,
    isSupportedTrainingVideoUrl,
    resolveThumbnailFromVideoUrl,
    TRAINING_VIDEO_THUMB_PLACEHOLDER,
} from '../../utils/trainingVideoFromUrl';

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
    });
    const [editingVideo, setEditingVideo] = useState<TrainingVideo | null>(null);

    const [urlError, setUrlError] = useState<string | null>(null);

    useEffect(() => {
        const url = (newVideo.videoUrl || '').trim();
        if (!url || !isSupportedTrainingVideoUrl(url)) {
            return;
        }
        let cancelled = false;
        (async () => {
            const thumb = await resolveThumbnailFromVideoUrl(url);
            if (cancelled) return;
            setNewVideo(prev => ({
                ...prev,
                thumbnail: thumb || TRAINING_VIDEO_THUMB_PLACEHOLDER,
            }));
        })();
        return () => { cancelled = true; };
    }, [newVideo.videoUrl]);

    const handleSaveVideo = async () => {
        const url = (newVideo.videoUrl || '').trim();
        if (!newVideo.title?.trim() || !newVideo.description?.trim() || !url) return;

        if (!isSupportedTrainingVideoUrl(url)) {
            setUrlError("Invalid video provider. Please use YouTube, Vimeo, Wistia, or The BlackTube.");
            return;
        }
        setUrlError(null);

        const startFromUrl = extractStartTimeFromVideoUrl(url);
        const thumb =
            (newVideo.thumbnail || '').trim() ||
            (await resolveThumbnailFromVideoUrl(url)) ||
            TRAINING_VIDEO_THUMB_PLACEHOLDER;

        const finalVideoData: Omit<TrainingVideo, 'id' | 'createdAt'> = {
            title: newVideo.title!.trim(),
            duration: startFromUrl ?? '',
            description: newVideo.description!.trim(),
            thumbnail: thumb,
            videoUrl: url,
            transcript: newVideo.transcript,
            isPlatform: canManagePlatform,
            organizationId: canManagePlatform ? undefined : userOrganizationId,
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
        });
    };

    const handleEdit = (video: TrainingVideo) => {
        setEditingVideo(video);
        setNewVideo({
            ...video,
            videoUrl: video.videoUrl ?? '',
            duration: video.duration ?? '',
            thumbnail: video.thumbnail ?? '',
        });
    };

    const urlTrimmed = (newVideo.videoUrl || '').trim();
    const startPreview = urlTrimmed ? extractStartTimeFromVideoUrl(urlTrimmed) : null;
    const thumbPreview = (newVideo.thumbnail || '').trim();

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
                    <div className="col-span-2">
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Video URL</label>
                        <input
                            className={`${INPUT_CLASS} ${urlError ? 'border-red-500 focus:ring-red-500' : ''}`}
                            placeholder="https://youtube.com/..."
                            value={newVideo.videoUrl}
                            onChange={e => {
                                const url = e.target.value;
                                const trimmed = url.trim();
                                const start = trimmed ? extractStartTimeFromVideoUrl(trimmed) : null;
                                setNewVideo(prev => ({
                                    ...prev,
                                    videoUrl: url,
                                    duration: start ?? '',
                                    thumbnail: trimmed ? prev.thumbnail : '',
                                }));
                                if (urlError) setUrlError(null);
                            }}
                        />
                        {urlError && <p className="text-[10px] text-red-500 mt-1">{urlError}</p>}
                        <p className="text-[10px] text-slate-400 mt-1 italic">Supported: YouTube, Vimeo, Wistia, The BlackTube. Thumbnail and start time (YouTube <code className="text-slate-500 dark:text-slate-400">t=</code> / <code className="text-slate-500 dark:text-slate-400">start=</code>) come from the host.</p>
                        {urlTrimmed && isSupportedTrainingVideoUrl(urlTrimmed) && (
                            <div className="mt-3 flex flex-col sm:flex-row sm:items-start gap-3">
                                <div className="w-full sm:w-40 aspect-video rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 flex-shrink-0 border border-slate-200 dark:border-slate-600">
                                    {thumbPreview ? (
                                        <img src={thumbPreview} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500 px-2 text-center">Loading preview…</div>
                                    )}
                                </div>
                                <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                                    {startPreview ? (
                                        <p><span className="font-medium text-slate-700 dark:text-slate-300">Starts at</span> {startPreview} (from link)</p>
                                    ) : (
                                        <p className="text-slate-500 dark:text-slate-500">No start time in this link (optional on YouTube).</p>
                                    )}
                                </div>
                            </div>
                        )}
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
                        disabled={!newVideo.title?.trim() || !newVideo.description?.trim() || !urlTrimmed}
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
                                    {video.duration ? (
                                        <p className="text-xs text-slate-400 mt-1">Starts at {video.duration}</p>
                                    ) : null}
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

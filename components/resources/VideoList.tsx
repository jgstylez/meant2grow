
import React from 'react';
import { PlayCircle } from 'lucide-react';
import { TrainingVideo } from '../../types';

interface VideoListProps {
    videos: TrainingVideo[];
    onSelect: (video: TrainingVideo) => void;
}

export const VideoList: React.FC<VideoListProps> = ({ videos, onSelect }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
                <div
                    key={video.id}
                    onClick={() => onSelect(video)}
                    className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all group cursor-pointer relative"
                >
                    <div className="absolute top-2 right-2 flex gap-2 z-10">
                        {video.isPlatform ? (
                            <span className="text-[10px] uppercase font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">Platform Focused</span>
                        ) : (
                            <span className="text-[10px] uppercase font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">Our Organization</span>
                        )}
                    </div>
                    <div className="relative h-48 bg-slate-200 dark:bg-slate-800">
                        <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                            <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                <PlayCircle className="w-6 h-6 text-amber-600 fill-current" />
                            </div>
                        </div>
                        <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded font-mono">
                            {video.duration}
                        </span>
                    </div>
                    <div className="p-5">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-2">{video.title}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{video.description}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

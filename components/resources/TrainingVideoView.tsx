
import React from 'react';
import { Play } from 'lucide-react';
import { TrainingVideo } from '../../types';
import { CARD_CLASS } from '../../styles/common';
import { BackButton } from './BackButton';

interface TrainingVideoViewProps {
    video: TrainingVideo;
    allVideos: TrainingVideo[];
    onBack: () => void;
    onSelectVideo: (video: TrainingVideo) => void;
}

export const TrainingVideoView: React.FC<TrainingVideoViewProps> = ({
    video,
    allVideos,
    onBack,
    onSelectVideo
}) => {
    return (
        <div className="animate-in fade-in slide-in-from-right-4">
            <BackButton onClick={onBack} />
            <div className="max-w-5xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-black rounded-xl overflow-hidden shadow-lg aspect-video relative group">
                            <img src={video.thumbnail} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <button className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                                    <Play className="w-8 h-8 text-white fill-current ml-1" />
                                </button>
                            </div>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{video.title}</h1>
                            <p className="text-slate-600 dark:text-slate-400">{video.description}</p>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className={CARD_CLASS}>
                            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Up Next</h3>
                            <div className="space-y-4">
                                {allVideos.filter(v => v.id !== video.id).slice(0, 3).map((v, i) => (
                                    <div key={v.id || i} onClick={() => onSelectVideo(v)} className="flex gap-3 cursor-pointer group">
                                        <div className="w-24 h-16 bg-slate-200 rounded-lg overflow-hidden flex-shrink-0 relative">
                                            <img src={v.thumbnail} className="w-full h-full object-cover" alt="" />
                                            <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1 rounded">{v.duration}</div>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800 dark:text-white group-hover:text-emerald-600 line-clamp-2">{v.title}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

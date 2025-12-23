
import React from 'react';
import { PlayCircle } from 'lucide-react';
import { DiscussionGuide } from '../../types';

interface GuideListProps {
    guides: DiscussionGuide[];
    onSelect: (guide: DiscussionGuide) => void;
}

export const GuideList: React.FC<GuideListProps> = ({ guides, onSelect }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {guides.map((guide) => (
                <div
                    key={guide.id}
                    onClick={() => onSelect(guide)}
                    className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer group relative"
                >
                    <div className="absolute top-2 right-2 flex gap-2">
                        {guide.isPlatform ? (
                            <span className="text-[10px] uppercase font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">Platform Focused</span>
                        ) : (
                            <span className="text-[10px] uppercase font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">Our Organization</span>
                        )}
                    </div>
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded flex items-center">
                            <PlayCircle className="w-3 h-3 mr-1" /> {guide.readTime}
                        </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {guide.title}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{guide.description}</p>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 w-0 group-hover:w-full transition-all duration-700 ease-out"></div>
                    </div>
                </div>
            ))}
        </div>
    );
};

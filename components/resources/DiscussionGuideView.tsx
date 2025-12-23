
import React from 'react';
import { Clock, Share2, Printer } from 'lucide-react';
import { DiscussionGuide } from '../../types';
import { BackButton } from './BackButton';

interface DiscussionGuideViewProps {
    guide: DiscussionGuide;
    onBack: () => void;
}

export const DiscussionGuideView: React.FC<DiscussionGuideViewProps> = ({ guide, onBack }) => {
    return (
        <div className="animate-in fade-in slide-in-from-right-4">
            <BackButton onClick={onBack} />
            <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="h-48 bg-gradient-to-r from-blue-500 to-indigo-600 relative">
                    <div className="absolute inset-0 bg-black/10"></div>
                    <div className="absolute bottom-0 left-0 p-8 text-white">
                        <span className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold uppercase tracking-wider mb-2 inline-block">Guide</span>
                        <h1 className="text-3xl font-bold mb-2">{guide.title}</h1>
                        <div className="flex items-center gap-4 text-sm opacity-90">
                            <span className="flex items-center"><Clock className="w-4 h-4 mr-1" /> {guide.readTime}</span>
                            <span>•</span>
                            <span>{guide.date}</span>
                        </div>
                    </div>
                </div>
                <div className="p-8 md:p-12">
                    <div className="flex items-center justify-between mb-8 pb-8 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold">
                                {guide.author.charAt(0)}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{guide.author}</p>
                                <p className="text-xs text-slate-500">Program Contributor</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><Share2 className="w-5 h-5" /></button>
                            <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><Printer className="w-5 h-5" /></button>
                        </div>
                    </div>

                    {/* Content Render */}
                    <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
                        <div dangerouslySetInnerHTML={{ __html: guide.content }} />
                    </div>
                </div>
            </div>
        </div>
    );
};

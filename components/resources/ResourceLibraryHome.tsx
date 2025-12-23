
import React from 'react';
import { Plus, BookOpen, File, Book, PlayCircle, ArrowRight } from 'lucide-react';
import { Role, User } from '../../types';

interface ResourceLibraryHomeProps {
    user: User;
    onViewChange: (view: 'home' | 'recommended' | 'templates' | 'guides' | 'videos' | 'manage') => void;
}

export const ResourceLibraryHome: React.FC<ResourceLibraryHomeProps> = ({ user, onViewChange }) => {
    const isPlatformAdmin = user.role === Role.PLATFORM_ADMIN;
    const isOrgAdmin = user.role === Role.ADMIN;
    const canManage = isOrgAdmin || isPlatformAdmin;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
            <header className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Resource Library</h1>
                    <p className="text-slate-500 dark:text-slate-400">Curated tools, templates, and reading to support your professional journey.</p>
                </div>
                {canManage && (
                    <button
                        onClick={() => onViewChange('manage')}
                        className="bg-slate-900 dark:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Manage Library
                    </button>
                )}
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div
                    onClick={() => onViewChange('recommended')}
                    className="group bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-6 text-white cursor-pointer shadow-md hover:shadow-xl hover:-translate-y-1 transition-all relative overflow-hidden"
                >
                    <div className="relative z-10">
                        <BookOpen className="w-8 h-8 mb-4 text-indigo-100" />
                        <h3 className="font-bold text-lg mb-2">Recommended Reading</h3>
                        <p className="text-xs text-indigo-100 mb-4 opacity-90">AI-curated articles & books tailored to your role.</p>
                        <span className="inline-flex items-center text-xs font-bold bg-white/20 px-3 py-1 rounded-full group-hover:bg-white/30 transition-colors">
                            View Recommendations <ArrowRight className="w-3 h-3 ml-1" />
                        </span>
                    </div>
                    <BookOpen className="absolute -bottom-4 -right-4 w-32 h-32 text-white opacity-10 rotate-12 group-hover:rotate-6 transition-transform" />
                </div>

                <div
                    onClick={() => onViewChange('templates')}
                    className="group bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 cursor-pointer shadow-sm hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all"
                >
                    <File className="w-8 h-8 mb-4 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 p-1.5 rounded-lg" />
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-2">Career Templates</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Goal setting worksheets, IDP forms, and evaluation templates.</p>
                    <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold group-hover:underline">Browse Templates</span>
                </div>

                <div
                    onClick={() => onViewChange('guides')}
                    className="group bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 cursor-pointer shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all"
                >
                    <Book className="w-8 h-8 mb-4 text-blue-600 bg-blue-50 dark:bg-blue-900/30 p-1.5 rounded-lg" />
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-2">Discussion Guides</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Conversation starters for effective mentorship meetings.</p>
                    <span className="text-blue-600 dark:text-blue-400 text-xs font-semibold group-hover:underline">View Guides</span>
                </div>

                <div
                    onClick={() => onViewChange('videos')}
                    className="group bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 cursor-pointer shadow-sm hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700 transition-all"
                >
                    <PlayCircle className="w-8 h-8 mb-4 text-amber-600 bg-amber-50 dark:bg-amber-900/30 p-1.5 rounded-lg" />
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-2">Training Videos</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Webinars on leadership and career development.</p>
                    <span className="text-amber-600 dark:text-amber-400 text-xs font-semibold group-hover:underline">Watch Now</span>
                </div>
            </div>
        </div>
    );
};

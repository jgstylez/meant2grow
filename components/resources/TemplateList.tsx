
import React from 'react';
import { File, ArrowRight } from 'lucide-react';
import { CareerTemplate } from '../../types';

interface TemplateListProps {
    templates: CareerTemplate[];
    onSelect: (template: CareerTemplate) => void;
}

export const TemplateList: React.FC<TemplateListProps> = ({ templates, onSelect }) => {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {templates.map((template) => (
                    <div
                        key={template.id}
                        onClick={() => onSelect(template)}
                        className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors cursor-pointer group relative"
                    >
                        <div className="absolute top-2 right-2 flex gap-2">
                            {template.isPlatform ? (
                                <span className="text-[10px] uppercase font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">Platform Focused</span>
                            ) : (
                                <span className="text-[10px] uppercase font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">Our Organization</span>
                            )}
                        </div>
                        <div className="flex items-start space-x-4 mb-4 sm:mb-0">
                            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 transition-colors">
                                <File className="w-6 h-6 text-slate-500 group-hover:text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400">{template.title}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">{template.description}</p>
                                <div className="flex items-center mt-2 space-x-3 text-xs text-slate-400">
                                    <span className="uppercase font-semibold">{template.type}</span>
                                    <span>•</span>
                                    <span>{template.size}</span>
                                </div>
                            </div>
                        </div>
                        <button className="flex items-center px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:bg-white dark:group-hover:bg-slate-800 shadow-sm transition-all">
                            View Details <ArrowRight className="w-4 h-4 ml-2" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};


import React, { useState } from 'react';
import { Plus, Save } from 'lucide-react';
import { Resource } from '../../types';
import { CARD_CLASS, INPUT_CLASS, BUTTON_PRIMARY } from '../../styles/common';

interface ManageRecommendedProps {
    customResources: Resource[];
    onAddResource: (resource: any) => void;
}

export const ManageRecommended: React.FC<ManageRecommendedProps> = ({
    customResources,
    onAddResource
}) => {
    const [newRes, setNewRes] = useState<Partial<Resource>>({
        type: 'Article',
        title: '',
        url: '',
        description: ''
    });

    const handleSaveResource = () => {
        if (newRes.title && newRes.url) {
            onAddResource({
                title: newRes.title,
                url: newRes.url,
                description: newRes.description || '',
                type: newRes.type as any
            });
            setNewRes({ type: 'Article', title: '', url: '', description: '' });
        }
    };

    return (
        <div className="space-y-6">
            <div className={CARD_CLASS}>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                    <Plus className="w-5 h-5 mr-2 text-emerald-600" /> Add New Recommended Reading
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Title</label>
                        <input
                            className={INPUT_CLASS}
                            placeholder="e.g. Effective Leadership Strategies"
                            value={newRes.title}
                            onChange={e => setNewRes({ ...newRes, title: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Resource Type</label>
                        <select
                            className={INPUT_CLASS}
                            value={newRes.type}
                            onChange={e => setNewRes({ ...newRes, type: e.target.value as any })}
                        >
                            <option>Article</option>
                            <option>Book</option>
                            <option>Video</option>
                            <option>Course</option>
                        </select>
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">URL</label>
                        <input
                            className={INPUT_CLASS}
                            placeholder="https://..."
                            value={newRes.url}
                            onChange={e => setNewRes({ ...newRes, url: e.target.value })}
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                        <textarea
                            className={INPUT_CLASS}
                            rows={3}
                            placeholder="Brief summary..."
                            value={newRes.description}
                            onChange={e => setNewRes({ ...newRes, description: e.target.value })}
                        />
                    </div>
                </div>
                <div className="flex justify-end">
                    <button
                        onClick={handleSaveResource}
                        disabled={!newRes.title || !newRes.url}
                        className={BUTTON_PRIMARY}
                    >
                        <Save className="w-4 h-4 mr-2" /> Publish Resource
                    </button>
                </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-4">Current Custom Resources</h3>
                {customResources.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">No custom resources added yet.</p>
                ) : (
                    <div className="space-y-3">
                        {customResources.map((r, idx) => (
                            <div key={idx} className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{r.title}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{r.type} • {r.url}</p>
                                </div>
                                <div className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs rounded-full font-medium">Active</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

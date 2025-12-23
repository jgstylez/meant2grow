
import React, { useState } from 'react';
import { Plus, Save, Edit, Trash2 } from 'lucide-react';
import { DiscussionGuide } from '../../types';
import { CARD_CLASS, INPUT_CLASS, BUTTON_PRIMARY } from '../../styles/common';
import RichTextEditor from '../RichTextEditor';

interface ManageGuidesProps {
    discussionGuides: DiscussionGuide[];
    onAdd: (guide: Omit<DiscussionGuide, 'id' | 'createdAt'>) => void;
    onUpdate: (id: string, updates: Partial<DiscussionGuide>) => void;
    onDelete: (id: string) => void;
    canManagePlatform: boolean;
    userOrganizationId?: string;
    userName: string;
}

export const ManageGuides: React.FC<ManageGuidesProps> = ({
    discussionGuides,
    onAdd,
    onUpdate,
    onDelete,
    canManagePlatform,
    userOrganizationId,
    userName
}) => {
    const [newGuide, setNewGuide] = useState<Partial<DiscussionGuide>>({
        title: '',
        readTime: '',
        description: '',
        content: '',
        author: userName,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        isPlatform: false
    });
    const [editingGuide, setEditingGuide] = useState<DiscussionGuide | null>(null);

    const handleSaveGuide = async () => {
        if (!newGuide.title || !newGuide.readTime || !newGuide.description) return;

        const guideData: Omit<DiscussionGuide, 'id' | 'createdAt'> = {
            title: newGuide.title!,
            readTime: newGuide.readTime!,
            description: newGuide.description!,
            content: newGuide.content || '',
            author: newGuide.author || userName,
            date: newGuide.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            isPlatform: canManagePlatform && (newGuide.isPlatform || false),
            organizationId: (canManagePlatform && newGuide.isPlatform) ? undefined : userOrganizationId
        };

        if (editingGuide) {
            await onUpdate(editingGuide.id, guideData);
        } else {
            await onAdd(guideData);
        }

        handleCancelEdit();
    };

    const handleCancelEdit = () => {
        setEditingGuide(null);
        setNewGuide({
            title: '',
            readTime: '',
            description: '',
            content: '',
            author: userName,
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            isPlatform: false
        });
    };

    return (
        <div className="space-y-6">
            <div className={CARD_CLASS}>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                    <Plus className="w-5 h-5 mr-2 text-blue-600" />
                    {editingGuide ? 'Edit Discussion Guide' : 'Add New Discussion Guide'}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="col-span-2">
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Title</label>
                        <input
                            className={INPUT_CLASS}
                            placeholder="e.g. The First Meeting Checklist"
                            value={newGuide.title}
                            onChange={e => setNewGuide({ ...newGuide, title: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Read Time</label>
                        <input
                            className={INPUT_CLASS}
                            placeholder="e.g. 5 min read"
                            value={newGuide.readTime}
                            onChange={e => setNewGuide({ ...newGuide, readTime: e.target.value })}
                        />
                    </div>
                    {canManagePlatform && (
                        <div>
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Scope</label>
                            <select
                                className={INPUT_CLASS}
                                value={newGuide.isPlatform ? 'platform' : 'organization'}
                                onChange={e => setNewGuide({ ...newGuide, isPlatform: e.target.value === 'platform' })}
                            >
                                <option value="organization">Our Organization Only</option>
                                <option value="platform">Platform Wide (All Orgs)</option>
                            </select>
                        </div>
                    )}
                    <div className="col-span-2">
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                        <textarea
                            className={INPUT_CLASS}
                            rows={2}
                            placeholder="Brief description..."
                            value={newGuide.description}
                            onChange={e => setNewGuide({ ...newGuide, description: e.target.value })}
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Content (HTML)</label>
                        <RichTextEditor
                            value={newGuide.content || ''}
                            onChange={(content) => setNewGuide({ ...newGuide, content })}
                            placeholder="Enter guide content..."
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    {editingGuide && (
                        <button
                            onClick={handleCancelEdit}
                            className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        onClick={handleSaveGuide}
                        disabled={!newGuide.title || !newGuide.readTime || !newGuide.description}
                        className={BUTTON_PRIMARY}
                    >
                        <Save className="w-4 h-4 mr-2" /> {editingGuide ? 'Update Guide' : 'Create Guide'}
                    </button>
                </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-4">Current Discussion Guides</h3>
                {discussionGuides.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">No discussion guides added yet.</p>
                ) : (
                    <div className="space-y-3">
                        {discussionGuides.map((guide) => (
                            <div key={guide.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">{guide.title}</h4>
                                        {guide.isPlatform ? (
                                            <span className="text-[10px] uppercase font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">Platform Focused</span>
                                        ) : (
                                            <span className="text-[10px] uppercase font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">Our Organization</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{guide.description}</p>
                                    <p className="text-xs text-slate-400 mt-1">{guide.readTime} • {guide.author}</p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                                    <button
                                        onClick={() => { setEditingGuide(guide); setNewGuide({ ...guide }); }}
                                        className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                        title="Edit"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => { if (confirm('Are you sure you want to delete this guide?')) onDelete(guide.id); }}
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

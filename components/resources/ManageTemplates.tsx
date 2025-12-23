
import React, { useState } from 'react';
import { Plus, Save, Edit, Trash2 } from 'lucide-react';
import { CareerTemplate } from '../../types';
import { CARD_CLASS, INPUT_CLASS, BUTTON_PRIMARY } from '../../styles/common';
import RichTextEditor from '../RichTextEditor';

interface ManageTemplatesProps {
    careerTemplates: CareerTemplate[];
    onAdd: (template: Omit<CareerTemplate, 'id' | 'createdAt'>) => void;
    onUpdate: (id: string, updates: Partial<CareerTemplate>) => void;
    onDelete: (id: string) => void;
    canManagePlatform: boolean;
    userOrganizationId?: string;
    onTemplateSelected?: (template: CareerTemplate) => void;
}

export const ManageTemplates: React.FC<ManageTemplatesProps> = ({
    careerTemplates,
    onAdd,
    onUpdate,
    onDelete,
    canManagePlatform,
    userOrganizationId,
    onTemplateSelected
}) => {
    const [newTemplate, setNewTemplate] = useState<Partial<CareerTemplate>>({
        title: '',
        type: 'DOCX',
        size: '',
        description: '',
        content: '',
        isPlatform: false
    });
    const [editingTemplate, setEditingTemplate] = useState<CareerTemplate | null>(null);

    const handleSaveTemplate = async () => {
        if (!newTemplate.title || !newTemplate.type || !newTemplate.description) return;

        const templateData: Omit<CareerTemplate, 'id' | 'createdAt'> = {
            title: newTemplate.title!,
            type: newTemplate.type!,
            size: newTemplate.size || '0 KB',
            description: newTemplate.description!,
            content: newTemplate.content || '',
            isPlatform: canManagePlatform && (newTemplate.isPlatform || false),
            organizationId: (canManagePlatform && newTemplate.isPlatform) ? undefined : userOrganizationId
        };

        if (editingTemplate) {
            await onUpdate(editingTemplate.id, templateData);
        } else {
            await onAdd(templateData);
        }

        handleCancelEdit();
    };

    const handleCancelEdit = () => {
        setEditingTemplate(null);
        setNewTemplate({
            title: '',
            type: 'DOCX',
            size: '',
            description: '',
            content: '',
            isPlatform: false
        });
    };

    const handleEdit = (template: CareerTemplate) => {
        setEditingTemplate(template);
        setNewTemplate({ ...template });
        if (onTemplateSelected) onTemplateSelected(template);
    };

    return (
        <div className="space-y-6">
            <div className={CARD_CLASS}>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                    <Plus className="w-5 h-5 mr-2 text-emerald-600" />
                    {editingTemplate ? 'Edit Template' : 'Add New Career Template'}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="col-span-2">
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Title</label>
                        <input
                            className={INPUT_CLASS}
                            placeholder="e.g. Mentorship Agreement"
                            value={newTemplate.title}
                            onChange={e => setNewTemplate({ ...newTemplate, title: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
                        <select
                            className={INPUT_CLASS}
                            value={newTemplate.type}
                            onChange={e => setNewTemplate({ ...newTemplate, type: e.target.value })}
                        >
                            <option>DOCX</option>
                            <option>PDF</option>
                            <option>XLSX</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Size</label>
                        <input
                            className={INPUT_CLASS}
                            placeholder="e.g. 1.2 MB"
                            value={newTemplate.size}
                            onChange={e => setNewTemplate({ ...newTemplate, size: e.target.value })}
                        />
                    </div>
                    {canManagePlatform && (
                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Scope</label>
                            <select
                                className={INPUT_CLASS}
                                value={newTemplate.isPlatform ? 'platform' : 'organization'}
                                onChange={e => setNewTemplate({ ...newTemplate, isPlatform: e.target.value === 'platform' })}
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
                            value={newTemplate.description}
                            onChange={e => setNewTemplate({ ...newTemplate, description: e.target.value })}
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Content (HTML)</label>
                        <RichTextEditor
                            value={newTemplate.content || ''}
                            onChange={(content) => setNewTemplate({ ...newTemplate, content })}
                            placeholder="Enter template content..."
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    {editingTemplate && (
                        <button
                            onClick={handleCancelEdit}
                            className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        onClick={handleSaveTemplate}
                        disabled={!newTemplate.title || !newTemplate.type || !newTemplate.description}
                        className={BUTTON_PRIMARY}
                    >
                        <Save className="w-4 h-4 mr-2" /> {editingTemplate ? 'Update Template' : 'Create Template'}
                    </button>
                </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-4">Current Templates</h3>
                {careerTemplates.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">No templates added yet.</p>
                ) : (
                    <div className="space-y-3">
                        {careerTemplates.map((template) => (
                            <div key={template.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">{template.title}</h4>
                                        {template.isPlatform ? (
                                            <span className="text-[10px] uppercase font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">Platform Focused</span>
                                        ) : (
                                            <span className="text-[10px] uppercase font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">Our Organization</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{template.description}</p>
                                    <p className="text-xs text-slate-400 mt-1">{template.type} • {template.size}</p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                                    <button
                                        onClick={() => handleEdit(template)}
                                        className="p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                                        title="Edit"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => { if (confirm('Are you sure you want to delete this template?')) onDelete(template.id); }}
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

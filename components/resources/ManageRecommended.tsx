
import React, { useState } from 'react';
import { Plus, Save, Loader2 } from 'lucide-react';
import { Resource } from '../../types';
import { CARD_CLASS, INPUT_CLASS, BUTTON_PRIMARY } from '../../styles/common';

export type NewRecommendedResourcePayload = Pick<
  Resource,
  'title' | 'url' | 'description' | 'type'
>;

interface ManageRecommendedProps {
  customResources: Resource[];
  onAddResource: (resource: NewRecommendedResourcePayload) => void | Promise<void>;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export const ManageRecommended: React.FC<ManageRecommendedProps> = ({
  customResources,
  onAddResource,
}) => {
  const [newRes, setNewRes] = useState<Partial<Resource>>({
    type: 'Article',
    title: '',
    url: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSaveResource = async () => {
    setFormError(null);
    const title = (newRes.title || '').trim();
    const url = (newRes.url || '').trim();
    const description = (newRes.description || '').trim();

    if (!title || !url) {
      setFormError('Add a title and a full URL.');
      return;
    }
    if (!isValidHttpUrl(url)) {
      setFormError('URL must start with http:// or https:// (e.g. https://example.com/article).');
      return;
    }

    const payload: NewRecommendedResourcePayload = {
      title,
      url,
      description,
      type: (newRes.type || 'Article') as Resource['type'],
    };

    setSaving(true);
    try {
      await Promise.resolve(onAddResource(payload));
      setNewRes({ type: 'Article', title: '', url: '', description: '' });
    } catch (e) {
      console.error('Add recommended resource failed:', e);
      // Error toast is shown in App; keep form values so the user can fix and retry.
    } finally {
      setSaving(false);
    }
  };

  const canSubmit =
    !!(newRes.title || '').trim() && !!(newRes.url || '').trim() && !saving;

  return (
    <div className="space-y-6">
      <div className={CARD_CLASS}>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center">
          <Plus className="w-5 h-5 mr-2 text-emerald-600" /> Add New Recommended Reading
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Title
            </label>
            <input
              className={INPUT_CLASS}
              placeholder="e.g. Effective Leadership Strategies"
              value={newRes.title}
              onChange={(e) => setNewRes({ ...newRes, title: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Resource Type
            </label>
            <select
              className={INPUT_CLASS}
              value={newRes.type}
              onChange={(e) =>
                setNewRes({ ...newRes, type: e.target.value as Resource['type'] })
              }
            >
              <option>Article</option>
              <option>Book</option>
              <option>Video</option>
              <option>Course</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              URL
            </label>
            <input
              className={INPUT_CLASS}
              type="url"
              inputMode="url"
              autoComplete="url"
              placeholder="https://..."
              value={newRes.url}
              onChange={(e) => setNewRes({ ...newRes, url: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              className={INPUT_CLASS}
              rows={3}
              placeholder="Brief summary..."
              value={newRes.description}
              onChange={(e) => setNewRes({ ...newRes, description: e.target.value })}
            />
          </div>
        </div>
        {formError && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-3" role="alert">
            {formError}
          </p>
        )}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSaveResource}
            disabled={!canSubmit}
            className={BUTTON_PRIMARY}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {saving ? 'Saving…' : 'Publish Resource'}
          </button>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
        <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-4">Current Custom Resources</h3>
        {customResources.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No custom resources added yet.</p>
        ) : (
          <div className="space-y-3">
            {customResources.map((r) => (
              <div
                key={r.id}
                className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 flex justify-between items-center"
              >
                <div className="min-w-0 pr-2">
                  <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">
                    {r.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {r.type} • {r.url}
                  </p>
                </div>
                <div className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs rounded-full font-medium shrink-0">
                  Active
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

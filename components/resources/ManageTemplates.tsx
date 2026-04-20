
import React, { useCallback, useRef, useState } from 'react';
import { Plus, Save, Edit, Trash2, Upload, FileText, ChevronDown } from 'lucide-react';
import { CareerTemplate } from '../../types';
import { CARD_CLASS, INPUT_CLASS, BUTTON_PRIMARY } from '../../styles/common';
import RichTextEditor from '../RichTextEditor';
import { uploadFile, generateUniquePath } from '../../services/storage';

const DOC_ACCEPT =
  '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function inferDocType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toUpperCase() || 'FILE';
  const known = ['PDF', 'DOC', 'DOCX', 'XLS', 'XLSX', 'PPT', 'PPTX', 'TXT'];
  return known.includes(ext) ? ext : ext;
}

function hasMeaningfulHtml(html: string): boolean {
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 0;
}

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
  onTemplateSelected,
}) => {
  const [newTemplate, setNewTemplate] = useState<Partial<CareerTemplate>>({
    title: '',
    type: 'PDF',
    size: '',
    description: '',
    content: '',
  });
  const [editingTemplate, setEditingTemplate] = useState<CareerTemplate | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const storageFolder = canManagePlatform ? 'platform' : userOrganizationId || 'org';

  const applyFile = useCallback((file: File) => {
    setUploadedFile(file);
    setFormError(null);
    const baseTitle = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
    setNewTemplate((prev) => ({
      ...prev,
      type: inferDocType(file.name),
      size: formatFileSize(file.size),
      title: (prev.title || '').trim() ? prev.title : baseTitle,
    }));
  }, []);

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) applyFile(file);
    e.target.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) applyFile(file);
  };

  const handleSaveTemplate = async () => {
    setFormError(null);
    if (!newTemplate.title?.trim() || !newTemplate.description?.trim()) {
      setFormError('Add a title and short description.');
      return;
    }

    const hasNewFile = !!uploadedFile;
    const hasExistingFile = !!editingTemplate?.fileUrl;
    const richText = hasMeaningfulHtml(newTemplate.content || '');

    if (!hasNewFile && !hasExistingFile && !richText) {
      setFormError('Upload a document, or open “Write in the app instead” and add content.');
      return;
    }

    if (!canManagePlatform && !userOrganizationId) {
      setFormError('Missing organization; refresh and try again.');
      return;
    }

    setSaving(true);
    try {
      let fileUrl = editingTemplate?.fileUrl;
      let originalFileName = editingTemplate?.originalFileName;

      if (uploadedFile) {
        const path = generateUniquePath(uploadedFile.name, `careerTemplates/${storageFolder}`);
        fileUrl = await uploadFile(uploadedFile, path);
        originalFileName = uploadedFile.name;
      }

      const templateData: Omit<CareerTemplate, 'id' | 'createdAt'> = {
        title: newTemplate.title!.trim(),
        type: newTemplate.type || 'PDF',
        size: newTemplate.size?.trim() || (uploadedFile ? formatFileSize(uploadedFile.size) : '—'),
        description: newTemplate.description!.trim(),
        content: newTemplate.content || '',
        isPlatform: canManagePlatform,
        organizationId: canManagePlatform ? undefined : userOrganizationId,
        ...(fileUrl ? { fileUrl, originalFileName: originalFileName || undefined } : {}),
      };

      if (editingTemplate) {
        await onUpdate(editingTemplate.id, templateData);
      } else {
        await onAdd(templateData);
      }

      handleCancelEdit();
    } catch (err) {
      console.error('Error saving document:', err);
      setFormError('Could not save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingTemplate(null);
    setUploadedFile(null);
    setFormError(null);
    setEditorOpen(false);
    setNewTemplate({
      title: '',
      type: 'PDF',
      size: '',
      description: '',
      content: '',
    });
  };

  const handleEdit = (template: CareerTemplate) => {
    setEditingTemplate(template);
    setUploadedFile(null);
    setFormError(null);
    setEditorOpen(hasMeaningfulHtml(template.content || ''));
    setNewTemplate({ ...template });
    if (onTemplateSelected) onTemplateSelected(template);
  };

  const canSubmit =
    !!newTemplate.title?.trim() &&
    !!newTemplate.description?.trim() &&
    (!!uploadedFile || !!editingTemplate?.fileUrl || hasMeaningfulHtml(newTemplate.content || ''));

  return (
    <div className="space-y-6">
      <div className={CARD_CLASS}>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center">
          <Plus className="w-5 h-5 mr-2 text-emerald-600" />
          {editingTemplate ? 'Edit document' : 'Add document'}
        </h2>

        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className="mb-6 rounded-xl border-2 border-dashed border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 px-4 py-8 text-center cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-600 transition-colors"
        >
          <Upload className="w-10 h-10 mx-auto text-emerald-600 dark:text-emerald-400 mb-2" />
          <p className="font-medium text-slate-800 dark:text-slate-200">
            Drop a file here or click to upload
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            PDF, Word, Excel, PowerPoint, or text — type and size fill in automatically.
          </p>
          {uploadedFile && (
            <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-3 font-medium">
              Selected: {uploadedFile.name} ({formatFileSize(uploadedFile.size)})
            </p>
          )}
          {editingTemplate?.fileUrl && !uploadedFile && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-3 flex items-center justify-center gap-2">
              <FileText className="w-4 h-4" />
              Current file: {editingTemplate.originalFileName || 'Attached document'} — upload a new file
              to replace it
            </p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept={DOC_ACCEPT}
            className="hidden"
            onChange={onFileInputChange}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Title
            </label>
            <input
              className={INPUT_CLASS}
              placeholder="e.g. Mentorship agreement"
              value={newTemplate.title}
              onChange={(e) => setNewTemplate({ ...newTemplate, title: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              File type
            </label>
            <select
              className={INPUT_CLASS}
              value={newTemplate.type}
              onChange={(e) => setNewTemplate({ ...newTemplate, type: e.target.value })}
            >
              <option>PDF</option>
              <option>DOCX</option>
              <option>DOC</option>
              <option>XLSX</option>
              <option>XLS</option>
              <option>PPTX</option>
              <option>PPT</option>
              <option>TXT</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Size (auto-filled from upload)
            </label>
            <input
              className={INPUT_CLASS}
              placeholder="e.g. 1.2 MB"
              value={newTemplate.size}
              onChange={(e) => setNewTemplate({ ...newTemplate, size: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              className={INPUT_CLASS}
              rows={2}
              placeholder="What is this document for?"
              value={newTemplate.description}
              onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
            />
          </div>
        </div>

        <details
          className="mb-4 group border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
          open={editorOpen}
          onToggle={(e) => setEditorOpen((e.target as HTMLDetailsElement).open)}
        >
          <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 flex items-center gap-2 list-none [&::-webkit-details-marker]:hidden">
            <ChevronDown className="w-4 h-4 shrink-0 transition-transform group-open:rotate-180" />
            Write in the app instead (no file upload)
          </summary>
          <div className="p-4 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              Use this if the library entry should be rich text only. If you also upload a file, both are
              saved — notes appear on the detail page under the download.
            </p>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Notes / body (HTML)
            </label>
            <RichTextEditor
              value={newTemplate.content || ''}
              onChange={(content) => setNewTemplate({ ...newTemplate, content })}
              placeholder="Type or paste content here…"
            />
          </div>
        </details>

        {formError && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-3" role="alert">
            {formError}
          </p>
        )}

        <div className="flex justify-end gap-2">
          {editingTemplate && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleSaveTemplate}
            disabled={!canSubmit || saving}
            className={BUTTON_PRIMARY}
          >
            <Save className="w-4 h-4 mr-2" />{' '}
            {saving ? 'Saving…' : editingTemplate ? 'Update document' : 'Save document'}
          </button>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
        <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-4">Documents in library</h3>
        {careerTemplates.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No documents yet.</p>
        ) : (
          <div className="space-y-3">
            {careerTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 flex items-start justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                      {template.title}
                    </h4>
                    {template.fileUrl && (
                      <span className="text-[10px] uppercase font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                        File
                      </span>
                    )}
                    {template.isPlatform ? (
                      <span className="text-[10px] uppercase font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                        Platform Focused
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                        Our Organization
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{template.description}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {template.type} • {template.size}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <button
                    type="button"
                    onClick={() => handleEdit(template)}
                    className="p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Delete this document from the library?')) onDelete(template.id);
                    }}
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

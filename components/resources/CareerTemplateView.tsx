
import React, { useRef } from 'react';
import { FileText, Upload, Download } from 'lucide-react';
import { CareerTemplate } from '../../types';
import { BUTTON_PRIMARY, CARD_CLASS } from '../../styles/common';
import RichTextEditor from '../RichTextEditor';
import { BackButton } from './BackButton';
import { downloadAsHtml, isWordDocument } from '../../utils/resourceUtils';
import { cleanHtml } from '../../utils/htmlUtils';
import mammoth from 'mammoth';

interface CareerTemplateViewProps {
    template: CareerTemplate;
    content: string;
    setContent: (content: string) => void;
    onBack: () => void;
    isUploading: boolean;
    setIsUploading: (val: boolean) => void;
}

export const CareerTemplateView: React.FC<CareerTemplateViewProps> = ({
    template,
    content,
    setContent,
    onBack,
    isUploading,
    setIsUploading
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!isWordDocument(file)) {
            alert('Please upload a Word document (.docx or .doc file)');
            return;
        }

        setIsUploading(true);
        try {
            if (file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.convertToHtml({ arrayBuffer });
                const html = result.value;
                const cleanedHtml = cleanHtml(html);
                setContent(cleanedHtml || '<p></p>');
            } else {
                alert('Please convert your .doc file to .docx format, or copy and paste the content directly.');
            }
        } catch (error) {
            console.error('Error processing Word document:', error);
            alert('Failed to process Word document. Please try copying and pasting the content instead.');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-right-4">
            <BackButton onClick={onBack} />
            <div className="max-w-4xl mx-auto">
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50 dark:bg-slate-950">
                        <div className="flex items-start gap-4">
                            <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                                <FileText className="w-8 h-8 text-emerald-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{template.title}</h1>
                                <div className="flex items-center gap-3 text-sm text-slate-500">
                                    <span className="bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-xs font-bold">{template.type}</span>
                                    <span>•</span>
                                    <span>{template.size}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors border ${isUploading
                                    ? 'opacity-50 cursor-not-allowed border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                    : 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                                    }`}
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                {isUploading ? 'Uploading...' : 'Upload Word'}
                            </button>
                            <button
                                onClick={() => downloadAsHtml(content, template.title.replace(/\s+/g, '_'))}
                                className={BUTTON_PRIMARY}
                            >
                                <Download className="w-4 h-4 mr-2" /> Download File
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                        </div>
                    </div>
                    <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2">
                            <h3 className="font-bold text-lg mb-4 text-slate-900 dark:text-white">Description</h3>
                            <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">{template.description}</p>

                            <h3 className="font-bold text-lg mb-4 text-slate-900 dark:text-white">Edit Template</h3>
                            <RichTextEditor
                                value={content}
                                onChange={setContent}
                                placeholder="Start editing your template... You can paste content from MS Word, Google Docs, or any other document."
                                className="mb-4"
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                💡 Tip: Upload a Word document (.docx) using the upload button above, or paste content from MS Word/Google Docs - formatting will be automatically cleaned up.
                            </p>
                        </div>
                        <div className="space-y-6">
                            <div className={CARD_CLASS}>
                                <h4 className="font-bold text-sm mb-3">Usage Tips</h4>
                                <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2 list-disc list-inside">
                                    <li>Customize the template with your own content.</li>
                                    <li>Use the toolbar above to format your text.</li>
                                    <li>Upload a Word document (.docx) or paste from Word/Docs - formatting will be cleaned automatically.</li>
                                    <li>Download when finished to save your work.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

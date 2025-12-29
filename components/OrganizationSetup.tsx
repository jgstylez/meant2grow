import React, { useState } from 'react';
import { ProgramSettings } from '../types';
import { INPUT_CLASS, BUTTON_PRIMARY, CARD_CLASS } from '../styles/common';
import { Check, ChevronRight, ChevronLeft, Upload, Layout, Type, ToggleLeft, ToggleRight, Info, Plus, Trash2, X, Palette } from 'lucide-react';

interface OrganizationSetupProps {
  onComplete: (settings: ProgramSettings) => void;
  initialSettings?: ProgramSettings | null;
}

const OrganizationSetup: React.FC<OrganizationSetupProps> = ({ onComplete, initialSettings }) => {
  const [step, setStep] = useState(1);
  
  const defaultSettings: ProgramSettings = {
    programName: 'Meant2Grow Mentorship',
    logo: null,
    accentColor: '#10b981', // Default Emerald
    introText: 'Welcome to our mentorship program! Please complete your profile to get matched.',
    fields: [
      { id: 'org', label: 'Organization', description: 'User\'s company or department', included: true, required: true, previewType: 'text' },
      { id: 'practice', label: 'Practice area / discipline', included: true, required: true, previewType: 'text' },
      { id: 'title', label: 'Job title', included: true, required: true, previewType: 'text' },
      { 
        id: 'exp', 
        label: 'How many years of work experience do you have?', 
        included: true, 
        required: true, 
        previewType: 'pills', 
        previewOptions: ['Less than a year', '1-3 years', '4-5 years', '6-10 years', '11-20 years', 'Over 20 years'] 
      },
      { id: 'loc', label: 'Where are you located?', included: true, required: true, previewType: 'select', previewOptions: ['United States', 'United Kingdom', 'Canada', 'Germany', 'Other'] },
      { id: 'bio', label: 'Let potential matches know a little about yourself', included: true, required: false, previewType: 'textarea' },
      { 
        id: 'interests', 
        label: 'What best describes you?', 
        included: true, 
        required: false, 
        previewType: 'pills', 
        previewOptions: ['Dog Lover', 'Cat Lover', 'Bookworm', 'Film Buff', 'Sports Enthusiast', 'Foodie', 'Tech Enthusiast'] 
      },
      { id: 'linkedin', label: 'LinkedIn profile (optional)', included: true, required: false, previewType: 'text' },
    ]
  };
  
  const [settings, setSettings] = useState<ProgramSettings>(
    initialSettings || defaultSettings
  );

  // Modal State for Adding Question
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    label: '',
    type: 'text' as 'text' | 'textarea' | 'select' | 'pills',
    options: '',
    required: false
  });

  const BRAND_COLORS = [
    { name: 'Emerald', hex: '#10b981', tailwind: 'bg-emerald-500' },
    { name: 'Blue', hex: '#3b82f6', tailwind: 'bg-blue-500' },
    { name: 'Indigo', hex: '#6366f1', tailwind: 'bg-indigo-500' },
    { name: 'Violet', hex: '#8b5cf6', tailwind: 'bg-violet-500' },
    { name: 'Rose', hex: '#f43f5e', tailwind: 'bg-rose-500' },
    { name: 'Amber', hex: '#f59e0b', tailwind: 'bg-amber-500' },
    { name: 'Slate', hex: '#64748b', tailwind: 'bg-slate-500' },
  ];

  const handleToggleField = (id: string, key: 'included' | 'required') => {
    setSettings(prev => ({
      ...prev,
      fields: prev.fields.map(f => f.id === id ? { ...f, [key]: !f[key] } : f)
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setSettings(prev => ({ ...prev, logo: url }));
    }
  };

  const handleDeleteField = (id: string) => {
    setSettings(prev => ({
      ...prev,
      fields: prev.fields.filter(f => f.id !== id)
    }));
  };

  const handleAddQuestion = () => {
    if (!newQuestion.label) return;

    const optionsArray = newQuestion.type === 'select' || newQuestion.type === 'pills' 
      ? newQuestion.options.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;

    const newField = {
      id: `custom-${Date.now()}`,
      label: newQuestion.label,
      included: true,
      required: newQuestion.required,
      previewType: newQuestion.type,
      previewOptions: optionsArray,
      isCustom: true
    };

    setSettings(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }));

    // Reset and Close
    setNewQuestion({ label: '', type: 'text', options: '', required: false });
    setShowAddQuestion(false);
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center space-x-4 mb-8">
      <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${step >= 1 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
        {step > 1 ? <Check className="w-5 h-5" /> : '1'}
      </div>
      <div className={`h-1 w-16 rounded-full ${step >= 2 ? 'bg-emerald-600' : 'bg-slate-200'}`}></div>
      <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${step >= 2 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
        2
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Welcome to Your Program Setup</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">Let's customize your mentorship platform to match your organization's brand and needs.</p>
        </div>

        {renderStepIndicator()}

        {step === 1 && (
          <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 flex items-center">
                <Layout className="w-6 h-6 mr-2 text-emerald-600" /> Brand Your Program
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8">Customize your mentorship portal with your organization's branding. This creates a cohesive experience for your mentors and mentees.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center">
                      <Layout className="w-5 h-5 mr-2 text-slate-400" /> General Info
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Program Name</label>
                        <input 
                          type="text" 
                          value={settings.programName}
                          onChange={(e) => setSettings({...settings, programName: e.target.value})}
                          className={INPUT_CLASS}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Accent Color</label>
                        <div className="flex flex-wrap gap-3">
                          {BRAND_COLORS.map(color => (
                            <button
                              key={color.name}
                              onClick={() => setSettings({...settings, accentColor: color.hex})}
                              className={`w-8 h-8 rounded-full ${color.tailwind} transition-transform hover:scale-110 focus:outline-none ring-offset-2 dark:ring-offset-slate-900 ${settings.accentColor === color.hex ? 'ring-2 ring-slate-900 dark:ring-white scale-110' : ''}`}
                              title={color.name}
                            />
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Program Logo</label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 dark:border-slate-700 border-dashed rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer relative group">
                          <div className="space-y-1 text-center">
                            {settings.logo ? (
                              <img src={settings.logo} alt="Logo" className="mx-auto h-16 object-contain mb-2" />
                            ) : (
                              <Upload className="mx-auto h-12 w-12 text-slate-400" />
                            )}
                            <div className="flex text-sm text-slate-600 dark:text-slate-400 justify-center">
                              <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-emerald-600 hover:text-emerald-500">
                                <span>Upload a file</span>
                                <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleLogoUpload} accept="image/*" />
                              </label>
                              <p className="pl-1">or drag and drop</p>
                            </div>
                            <p className="text-xs text-slate-500">PNG, JPG, GIF up to 10MB</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
                      Signup form introduction
                    </h3>
                    <textarea 
                      rows={4}
                      value={settings.introText}
                      onChange={(e) => setSettings({...settings, introText: e.target.value})}
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col items-center justify-center text-center">
                   <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-lg shadow-md overflow-hidden relative">
                      <div className="h-2 w-full transition-colors duration-300" style={{ backgroundColor: settings.accentColor }}></div>
                      <div className="p-6">
                         {settings.logo && <img src={settings.logo} alt="Logo Preview" className="h-8 mb-4 mx-auto" />}
                         <h4 className="font-bold text-lg text-slate-900 dark:text-white mb-2">{settings.programName}</h4>
                         <p className="text-xs text-slate-500 dark:text-slate-400">{settings.introText}</p>
                         <div className="mt-4 space-y-3">
                            <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded w-full"></div>
                            <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded w-full"></div>
                            <button className="w-full py-2 rounded text-white text-xs font-bold transition-colors duration-300" style={{ backgroundColor: settings.accentColor }}>
                               Sign Up
                            </button>
                         </div>
                      </div>
                   </div>
                   <p className="mt-4 text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center">
                       <Palette className="w-3 h-3 mr-1" /> Live Preview
                   </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end pt-4">
              <button onClick={() => setStep(2)} className={BUTTON_PRIMARY + " px-8 py-3 text-base shadow-lg"}>
                Next <ChevronRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
             <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-8">
                <div className="mb-8">
                   <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 flex items-center">
                      <Type className="w-6 h-6 mr-2 text-emerald-600" /> Configure Signup Forms
                   </h2>
                   <p className="text-slate-500 dark:text-slate-400">
                      Customize the questions mentors and mentees will answer when they join your program. You can include standard fields or add your own custom questions.
                   </p>
                </div>

                <div className="space-y-6">
                   {settings.fields.map((field) => (
                      <div key={field.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-6 hover:border-emerald-200 dark:hover:border-emerald-900 transition-colors bg-slate-50/30 dark:bg-slate-900/30 relative group">
                         {field.isCustom && (
                             <button 
                               onClick={() => handleDeleteField(field.id)}
                               className="absolute top-4 right-4 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                               title="Delete Question"
                             >
                                 <Trash2 className="w-4 h-4" />
                             </button>
                         )}
                         <div className="mb-4">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Question Text</span>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">{field.label}</h3>
                         </div>
                         
                         <div className="mb-6 p-4 bg-white dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800">
                            <span className="text-xs text-slate-400 mb-2 block">Answer Preview</span>
                            {field.previewType === 'text' && <div className="h-10 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 w-full flex items-center px-3 text-sm text-slate-400">Free text</div>}
                            {field.previewType === 'textarea' && <div className="h-20 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 w-full p-3 text-sm text-slate-400">Free text</div>}
                            {field.previewType === 'select' && (
                               <div className="h-10 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 w-full flex items-center px-3 justify-between text-sm text-slate-500">
                                  {field.previewOptions?.[0] || 'Select an option'} <div className="w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-slate-400"></div>
                               </div>
                            )}
                            {field.previewType === 'pills' && (
                               <div className="flex flex-wrap gap-2">
                                  {field.previewOptions?.map(opt => (
                                     <span key={opt} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">{opt}</span>
                                  ))}
                               </div>
                            )}
                         </div>

                         <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center space-x-2">
                               {/* Only show "Required" toggle if the field is included */}
                               {field.included && (
                                 <label className="flex items-center cursor-pointer">
                                    <button onClick={() => handleToggleField(field.id, 'required')} className={`transition-colors ${field.required ? 'text-emerald-600' : 'text-slate-300'}`}>
                                       {field.required ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10" />}
                                    </button>
                                    <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">Users are required to answer this question</span>
                                 </label>
                               )}
                            </div>
                            
                            <label className="flex items-center cursor-pointer">
                               <span className="mr-3 text-sm font-medium text-slate-600 dark:text-slate-400">Include this question</span>
                               <button onClick={() => handleToggleField(field.id, 'included')} className={`transition-colors ${field.included ? 'text-emerald-600' : 'text-slate-300'}`}>
                                  {field.included ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10" />}
                               </button>
                            </label>
                         </div>
                      </div>
                   ))}

                   <button 
                     onClick={() => setShowAddQuestion(true)}
                     className="w-full py-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-500 hover:text-emerald-600 hover:border-emerald-300 dark:hover:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all flex items-center justify-center font-medium"
                   >
                       <Plus className="w-5 h-5 mr-2" /> Add Custom Question
                   </button>
                </div>
             </div>

             <div className="flex justify-between pt-4">
               <button onClick={() => setStep(1)} className="px-6 py-3 text-slate-500 hover:text-slate-700 font-medium flex items-center">
                  <ChevronLeft className="w-5 h-5 mr-1" /> Back
               </button>
               <button onClick={() => onComplete(settings)} className={BUTTON_PRIMARY + " px-8 py-3 text-base shadow-lg bg-emerald-600 hover:bg-emerald-700"}>
                  Launch Program <Check className="w-5 h-5 ml-2" />
               </button>
             </div>
          </div>
        )}

        {/* Add Question Modal */}
        {showAddQuestion && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6 max-w-lg w-full mx-4 border border-slate-200 dark:border-slate-800">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add Custom Question</h3>
                        <button onClick={() => setShowAddQuestion(false)}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Question Label</label>
                            <input 
                                className={INPUT_CLASS} 
                                placeholder="e.g., What is your favorite book?"
                                value={newQuestion.label}
                                onChange={e => setNewQuestion({...newQuestion, label: e.target.value})}
                            />
                        </div>
                        
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Answer Type</label>
                            <select 
                                className={INPUT_CLASS}
                                value={newQuestion.type}
                                onChange={e => setNewQuestion({...newQuestion, type: e.target.value as any})}
                            >
                                <option value="text">Short Text</option>
                                <option value="textarea">Long Text</option>
                                <option value="select">Dropdown Select</option>
                                <option value="pills">Multiple Choice (Pills)</option>
                            </select>
                        </div>

                        {(newQuestion.type === 'select' || newQuestion.type === 'pills') && (
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Options (Comma separated)</label>
                                <textarea 
                                    className={INPUT_CLASS} 
                                    placeholder="Option 1, Option 2, Option 3..."
                                    rows={3}
                                    value={newQuestion.options}
                                    onChange={e => setNewQuestion({...newQuestion, options: e.target.value})}
                                />
                            </div>
                        )}

                        <div className="flex items-center space-x-2 pt-2">
                            <button onClick={() => setNewQuestion({...newQuestion, required: !newQuestion.required})}>
                                {newQuestion.required ? <ToggleRight className="w-10 h-10 text-emerald-600" /> : <ToggleLeft className="w-10 h-10 text-slate-300" />}
                            </button>
                            <span className="text-sm text-slate-600 dark:text-slate-300">Required field</span>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-8">
                        <button onClick={() => setShowAddQuestion(false)} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-medium">Cancel</button>
                        <button 
                            onClick={handleAddQuestion} 
                            disabled={!newQuestion.label || ((newQuestion.type === 'select' || newQuestion.type === 'pills') && !newQuestion.options)}
                            className={BUTTON_PRIMARY}
                        >
                            Add Question
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default OrganizationSetup;
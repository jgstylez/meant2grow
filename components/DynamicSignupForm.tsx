import React, { useState, useEffect } from 'react';
import { ProgramSettings } from '../types';
import { INPUT_CLASS } from '../styles/common';
import { Logo } from './Logo';

interface DynamicSignupFormProps {
  programSettings: ProgramSettings;
  onSubmit: (data: Record<string, any>) => void;
  submitButtonText?: string;
  excludeFields?: string[]; // Field IDs to exclude (already collected in onboarding)
}

const DynamicSignupForm: React.FC<DynamicSignupFormProps> = ({ 
  programSettings, 
  onSubmit,
  submitButtonText = "Continue",
  excludeFields = []
}) => {
  // Load persisted form data from localStorage
  const getStoredFormData = () => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(`dynamicSignupForm_${programSettings.programName}`);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  const storedData = getStoredFormData();
  const [formData, setFormData] = useState<Record<string, any>>(storedData || {});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [logoError, setLogoError] = useState(false);

  // Helper function to check if logo URL is valid
  // Rejects blob URLs (temporary) and only accepts permanent URLs (http/https) or data URLs
  const hasValidLogo = () => {
    const logo = programSettings?.logo;
    if (!logo || typeof logo !== 'string') return false;
    const trimmed = logo.trim();
    if (trimmed.length === 0) return false;
    // Normalize to lowercase for case-insensitive scheme comparison (RFC 3986)
    const lowercased = trimmed.toLowerCase();
    // Reject blob URLs - they're temporary and won't persist across page reloads
    if (lowercased.startsWith('blob:')) return false;
    // Accept http/https URLs or data URLs (base64 encoded images)
    return lowercased.startsWith('http://') || lowercased.startsWith('https://') || lowercased.startsWith('data:');
  };

  // Reset logo error when logo URL changes
  useEffect(() => {
    if (hasValidLogo()) {
      setLogoError(false);
    } else {
      setLogoError(true); // No valid logo, show default Logo component
    }
  }, [programSettings?.logo]);

  // Helper function to check if a field should be excluded
  const shouldExcludeField = (field: typeof programSettings.fields[0]): boolean => {
    // Check by field ID (exact match)
    if (excludeFields.includes(field.id)) {
      return true;
    }
    
    // Check by field ID patterns (common variations)
    const fieldIdLower = field.id.toLowerCase();
    const idPatterns = ['title', 'job', 'company', 'org', 'organization', 'bio', 'story'];
    if (idPatterns.some(pattern => fieldIdLower.includes(pattern))) {
      return true;
    }
    
    // Check by label (case insensitive) for common duplicates
    const labelLower = field.label.toLowerCase();
    const labelPatterns = [
      'job title', 'title',
      'company', 'organization', 'org',
      'bio', 'story', 'about yourself', 'tell us about'
    ];
    
    return labelPatterns.some(pattern => labelLower.includes(pattern));
  };

  // Get only included fields, excluding duplicates
  const includedFields = programSettings.fields.filter(field => 
    field.included && !shouldExcludeField(field)
  );

  const handleChange = (fieldId: string, value: any) => {
    const newFormData = { ...formData, [fieldId]: value };
    setFormData(newFormData);
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(`dynamicSignupForm_${programSettings.programName}`, JSON.stringify(newFormData));
    }
    // Clear error for this field
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    includedFields.forEach(field => {
      if (field.required) {
        const value = formData[field.id];
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          newErrors[field.id] = `${field.label} is required`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      // Clear localStorage after successful submission
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`dynamicSignupForm_${programSettings.programName}`);
      }
      onSubmit(formData);
    }
  };

  const renderField = (field: typeof includedFields[0]) => {
    const value = formData[field.id] || '';
    const hasError = !!errors[field.id];

    switch (field.previewType) {
      case 'text':
        return (
          <div key={field.id} className="space-y-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400">{field.description}</p>
            )}
            <input
              type="text"
              value={value}
              onChange={(e) => handleChange(field.id, e.target.value)}
              className={`${INPUT_CLASS} ${hasError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
              placeholder={field.label}
            />
            {hasError && (
              <p className="text-xs text-red-500">{errors[field.id]}</p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.id} className="space-y-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400">{field.description}</p>
            )}
            <textarea
              value={value}
              onChange={(e) => handleChange(field.id, e.target.value)}
              className={`${INPUT_CLASS} ${hasError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
              rows={4}
              placeholder={field.label}
            />
            {hasError && (
              <p className="text-xs text-red-500">{errors[field.id]}</p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={field.id} className="space-y-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400">{field.description}</p>
            )}
            <select
              value={value}
              onChange={(e) => handleChange(field.id, e.target.value)}
              className={`${INPUT_CLASS} ${hasError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
            >
              <option value="">Select an option</option>
              {field.previewOptions?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {hasError && (
              <p className="text-xs text-red-500">{errors[field.id]}</p>
            )}
          </div>
        );

      case 'pills':
        return (
          <div key={field.id} className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400">{field.description}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {field.previewOptions?.map((option) => {
                const isSelected = value === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleChange(field.id, option)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-2 border-emerald-600'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700'
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            {hasError && (
              <p className="text-xs text-red-500">{errors[field.id]}</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header with program branding */}
      <div className="text-center mb-8">
        {hasValidLogo() && !logoError ? (
          <img 
            src={programSettings.logo!} 
            alt={programSettings.programName} 
            className="h-12 mx-auto mb-4"
            onError={() => {
              setLogoError(true);
            }}
          />
        ) : (
          <Logo className="h-12 mx-auto mb-4" />
        )}
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          {programSettings.programName}
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          {programSettings.introText}
        </p>
      </div>

      {/* Dynamic form fields */}
      <div className="space-y-6">
        {includedFields.map(field => renderField(field))}
      </div>

      {/* Submit button with custom accent color */}
      <button
        type="submit"
        className="w-full py-3 px-4 rounded-lg text-white font-semibold shadow-lg hover:shadow-xl transition-all"
        style={{ backgroundColor: programSettings.accentColor }}
        onMouseEnter={(e) => {
          // Darken color on hover
          const color = programSettings.accentColor;
          e.currentTarget.style.filter = 'brightness(0.9)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.filter = 'brightness(1)';
        }}
      >
        {submitButtonText}
      </button>
    </form>
  );
};

export default DynamicSignupForm;


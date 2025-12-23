import React, { useState, useRef, useEffect } from 'react';
import { INPUT_CLASS } from '../styles/common';
import { PREDEFINED_SKILLS } from '../constants';
import { X, ChevronDown } from 'lucide-react';

interface SkillsSelectorProps {
  selectedSkills: string[];
  onSkillsChange: (skills: string[]) => void;
  placeholder?: string;
  label?: string;
}

const SkillsSelector: React.FC<SkillsSelectorProps> = ({
  selectedSkills = [],
  onSkillsChange,
  placeholder = 'Select or type a skill',
  label,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customSkill, setCustomSkill] = useState('');
  const [filteredSkills, setFilteredSkills] = useState(PREDEFINED_SKILLS);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ensure selectedSkills is always an array
  const safeSelectedSkills = selectedSkills || [];

  // Filter out already selected skills from the dropdown
  const availableSkills = filteredSkills.filter(
    (skill) => !safeSelectedSkills.includes(skill)
  );

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelectSkill = (skill: string) => {
    if (!safeSelectedSkills.includes(skill)) {
      onSkillsChange([...safeSelectedSkills, skill]);
    }
    setIsOpen(false);
    setCustomSkill('');
    setFilteredSkills(PREDEFINED_SKILLS);
  };

  const handleRemoveSkill = (skill: string) => {
    onSkillsChange(safeSelectedSkills.filter((s) => s !== skill));
  };

  const handleAddCustomSkill = () => {
    const trimmedSkill = customSkill.trim();
    if (
      trimmedSkill &&
      !safeSelectedSkills.includes(trimmedSkill) &&
      trimmedSkill.length > 0
    ) {
      onSkillsChange([...safeSelectedSkills, trimmedSkill]);
      setCustomSkill('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomSkill(value);

    // Filter predefined skills based on input
    if (value.trim()) {
      const filtered = PREDEFINED_SKILLS.filter((skill) =>
        skill.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSkills(filtered);
      setIsOpen(true);
    } else {
      setFilteredSkills(PREDEFINED_SKILLS);
      setIsOpen(false);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (customSkill.trim()) {
        handleAddCustomSkill();
      } else if (availableSkills.length > 0 && isOpen) {
        handleSelectSkill(availableSkills[0]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleInputFocus = () => {
    if (customSkill.trim() || availableSkills.length > 0) {
      setIsOpen(true);
    }
  };

  return (
    <div className="space-y-4">
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {label}
        </label>
      )}

      {/* Selected Skills Display */}
      {safeSelectedSkills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {safeSelectedSkills.map((skill, idx) => (
            <span
              key={idx}
              className="inline-flex items-center px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 rounded-full text-sm font-medium"
            >
              {skill}
              <button
                onClick={() => handleRemoveSkill(skill)}
                className="ml-2 text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-400"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input and Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={customSkill}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            onFocus={handleInputFocus}
            className={INPUT_CLASS + ' pr-10'}
            placeholder={placeholder}
          />
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <ChevronDown
              className={`w-5 h-5 transition-transform ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {availableSkills.length > 0 ? (
              <div className="py-1">
                {availableSkills.slice(0, 10).map((skill, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSkill(skill)}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                  >
                    {skill}
                  </button>
                ))}
                {availableSkills.length > 10 && (
                  <div className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400">
                    +{availableSkills.length - 10} more skills
                  </div>
                )}
              </div>
            ) : customSkill.trim() ? (
              <div className="py-2 px-4">
                <button
                  type="button"
                  onClick={handleAddCustomSkill}
                  className="w-full text-left text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-4 py-2 rounded transition-colors"
                >
                  Add &quot;{customSkill.trim()}&quot; as custom skill
                </button>
              </div>
            ) : (
              <div className="py-2 px-4 text-sm text-slate-500 dark:text-slate-400">
                No available skills. Type to add a custom skill.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Helper Text */}
      <p className="text-xs text-slate-500 dark:text-slate-400">
        <span className="font-semibold">Add one at a time.</span> Select from the dropdown or type to add a custom skill. Press Enter to add.
      </p>
    </div>
  );
};

export default SkillsSelector;


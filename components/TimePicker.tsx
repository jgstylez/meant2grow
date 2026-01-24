import React, { useState, useRef, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { INPUT_CLASS } from '../styles/common';

interface TimePickerProps {
  value: string; // Format: "HH:MM" (24-hour format)
  onChange: (time: string) => void;
  minTime?: string; // Format: "HH:MM"
  maxTime?: string; // Format: "HH:MM"
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  minTime,
  maxTime,
  placeholder = 'Select time',
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hours, setHours] = useState<number>(0);
  const [minutes, setMinutes] = useState<number>(0);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Initialize hours/minutes from value
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':').map(Number);
      setHours(h);
      setMinutes(m);
    } else {
      const now = new Date();
      setHours(now.getHours());
      setMinutes(now.getMinutes());
    }
  }, [value]);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const formatTime = (h: number, m: number): string => {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const isTimeDisabled = (h: number, m: number): boolean => {
    const timeStr = formatTime(h, m);
    if (minTime && timeStr < minTime) return true;
    if (maxTime && timeStr > maxTime) return true;
    return false;
  };

  const handleTimeSelect = (h: number, m: number) => {
    if (!isTimeDisabled(h, m)) {
      const timeStr = formatTime(h, m);
      onChange(timeStr);
      setIsOpen(false);
    }
  };

  const displayValue = value
    ? (() => {
        const [h, m] = value.split(':').map(Number);
        const date = new Date();
        date.setHours(h);
        date.setMinutes(m);
        return date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
      })()
    : '';

  const hourOptions = Array.from({ length: 24 }, (_, i) => i);
  const minuteOptions = Array.from({ length: 60 }, (_, i) => i);

  return (
    <div ref={pickerRef} className={`relative ${className}`}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`${INPUT_CLASS} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} flex items-center justify-between`}
      >
        <span className={value ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}>
          {displayValue || placeholder}
        </span>
        <Clock className="w-4 h-4 text-slate-400" />
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 mt-2 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-4 w-64">
          <div className="flex gap-4">
            {/* Hours */}
            <div className="flex-1">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2 text-center">
                Hour
              </div>
              <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                {hourOptions.map((h) => {
                  const disabled = isTimeDisabled(h, minutes);
                  const selected = hours === h;
                  return (
                    <button
                      key={h}
                      onClick={() => {
                        setHours(h);
                        handleTimeSelect(h, minutes);
                      }}
                      disabled={disabled}
                      className={`
                        w-full px-3 py-2 text-sm transition-colors
                        ${disabled
                          ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                          : selected
                          ? 'bg-emerald-600 text-white font-semibold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }
                      `}
                    >
                      {String(h).padStart(2, '0')}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Minutes */}
            <div className="flex-1">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2 text-center">
                Minute
              </div>
              <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                {minuteOptions.map((m) => {
                  const disabled = isTimeDisabled(hours, m);
                  const selected = minutes === m;
                  return (
                    <button
                      key={m}
                      onClick={() => {
                        setMinutes(m);
                        handleTimeSelect(hours, m);
                      }}
                      disabled={disabled}
                      className={`
                        w-full px-3 py-2 text-sm transition-colors
                        ${disabled
                          ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                          : selected
                          ? 'bg-emerald-600 text-white font-semibold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }
                      `}
                    >
                      {String(m).padStart(2, '0')}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex gap-2">
            <button
              onClick={() => {
                const now = new Date();
                const h = now.getHours();
                const m = now.getMinutes();
                if (!isTimeDisabled(h, m)) {
                  handleTimeSelect(h, m);
                }
              }}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
            >
              Now
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

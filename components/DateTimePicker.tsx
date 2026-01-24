import React from 'react';
import { DatePicker } from './DatePicker';
import { TimePicker } from './TimePicker';
import { INPUT_CLASS } from '../styles/common';

interface DateTimePickerProps {
  dateValue: string; // Format: "YYYY-MM-DD"
  timeValue: string; // Format: "HH:MM"
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  minDate?: string;
  maxDate?: string;
  minTime?: string;
  maxTime?: string;
  datePlaceholder?: string;
  timePlaceholder?: string;
  className?: string;
  disabled?: boolean;
  showLabels?: boolean;
}

/**
 * Combined Date and Time Picker component
 * Provides consistent date/time selection UI across the app
 */
export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  dateValue,
  timeValue,
  onDateChange,
  onTimeChange,
  minDate,
  maxDate,
  minTime,
  maxTime,
  datePlaceholder = 'Select date',
  timePlaceholder = 'Select time',
  className = '',
  disabled = false,
  showLabels = true,
}) => {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${className}`}>
      <div>
        {showLabels && (
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">
            Date
          </label>
        )}
        <DatePicker
          value={dateValue}
          onChange={onDateChange}
          minDate={minDate}
          placeholder={datePlaceholder}
          className={disabled ? 'opacity-50 cursor-not-allowed' : ''}
        />
      </div>
      <div>
        {showLabels && (
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">
            Time
          </label>
        )}
        <TimePicker
          value={timeValue}
          onChange={onTimeChange}
          minTime={minTime}
          maxTime={maxTime}
          placeholder={timePlaceholder}
          disabled={disabled}
        />
      </div>
    </div>
  );
};

import React from 'react';
import { INPUT_CLASS } from '../styles/common';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  minDate?: string;
  maxDate?: string;
  placeholder?: string;
  className?: string;
}

/**
 * Date picker using native <input type="date"> for consistent UX across the app.
 * Matches the standard used in Goals and other date inputs—browser-native calendar
 * with month/year navigation, Clear and Today buttons.
 */
export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  minDate,
  maxDate,
  className = '',
}) => {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      min={minDate}
      max={maxDate}
      className={`${INPUT_CLASS} ${className}`.trim()}
    />
  );
};


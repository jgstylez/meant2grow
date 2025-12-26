import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { INPUT_CLASS } from '../styles/common';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  minDate?: string;
  placeholder?: string;
  className?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  minDate,
  placeholder = 'Select a date',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const pickerRef = useRef<HTMLDivElement>(null);

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

  // Initialize month/year from value if provided
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      setCurrentMonth(date.getMonth());
      setCurrentYear(date.getFullYear());
    }
  }, [value]);

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isDateDisabled = (date: Date): boolean => {
    if (minDate) {
      return formatDate(date) < minDate;
    }
    return false;
  };

  const isDateSelected = (date: Date): boolean => {
    return value === formatDate(date);
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const handleDateSelect = (day: number) => {
    const selectedDate = new Date(currentYear, currentMonth, day);
    const dateString = formatDate(selectedDate);
    
    if (!isDateDisabled(selectedDate)) {
      onChange(dateString);
      setIsOpen(false);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDayOfWeek = getFirstDayOfMonth(currentMonth, currentYear);
  const days: (number | null)[] = [];

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(null);
  }

  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  const displayValue = value
    ? new Date(value).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return (
    <div ref={pickerRef} className={`relative ${className}`}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`${INPUT_CLASS} cursor-pointer flex items-center justify-between`}
      >
        <span className={value ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}>
          {displayValue || placeholder}
        </span>
        <Calendar className="w-4 h-4 text-slate-400" />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-2 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-4 w-80">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {new Date(currentYear, currentMonth).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </h3>
            <button
              onClick={() => navigateMonth('next')}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="text-xs font-medium text-slate-500 dark:text-slate-400 text-center py-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const date = new Date(currentYear, currentMonth, day);
              const dateString = formatDate(date);
              const disabled = isDateDisabled(date);
              const selected = isDateSelected(date);
              const today = isToday(date);

              return (
                <button
                  key={day}
                  onClick={() => handleDateSelect(day)}
                  disabled={disabled}
                  className={`
                    aspect-square text-sm rounded-lg transition-colors
                    ${disabled
                      ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                      : selected
                      ? 'bg-emerald-600 text-white font-semibold'
                      : today
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex gap-2">
            <button
              onClick={() => {
                const today = new Date();
                const todayString = formatDate(today);
                if (!minDate || todayString >= minDate) {
                  onChange(todayString);
                  setIsOpen(false);
                }
              }}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => {
                const nextWeek = new Date();
                nextWeek.setDate(nextWeek.getDate() + 7);
                const nextWeekString = formatDate(nextWeek);
                if (!minDate || nextWeekString >= minDate) {
                  onChange(nextWeekString);
                  setIsOpen(false);
                }
              }}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
            >
              Next Week
            </button>
            <button
              onClick={() => {
                const nextMonth = new Date();
                nextMonth.setMonth(nextMonth.getMonth() + 1);
                const nextMonthString = formatDate(nextMonth);
                if (!minDate || nextMonthString >= minDate) {
                  onChange(nextMonthString);
                  setIsOpen(false);
                }
              }}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
            >
              Next Month
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


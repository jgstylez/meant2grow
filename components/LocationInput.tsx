import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MapPin, ChevronDown, X } from 'lucide-react';
import { INPUT_CLASS } from '../styles/common';
import { CityStateZip } from './CityStateZipInput';

interface LocationInputProps {
  value: CityStateZip;
  onChange: (value: CityStateZip) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  showLabels?: boolean;
}

// Common US cities with state and zip code prefixes for autocomplete
const COMMON_CITIES: Array<{ city: string; state: string; stateCode: string; zipPrefix: string }> = [
  { city: 'New York', state: 'New York', stateCode: 'NY', zipPrefix: '100' },
  { city: 'Los Angeles', state: 'California', stateCode: 'CA', zipPrefix: '900' },
  { city: 'Chicago', state: 'Illinois', stateCode: 'IL', zipPrefix: '606' },
  { city: 'Houston', state: 'Texas', stateCode: 'TX', zipPrefix: '770' },
  { city: 'Phoenix', state: 'Arizona', stateCode: 'AZ', zipPrefix: '850' },
  { city: 'Philadelphia', state: 'Pennsylvania', stateCode: 'PA', zipPrefix: '191' },
  { city: 'San Antonio', state: 'Texas', stateCode: 'TX', zipPrefix: '782' },
  { city: 'San Diego', state: 'California', stateCode: 'CA', zipPrefix: '921' },
  { city: 'Dallas', state: 'Texas', stateCode: 'TX', zipPrefix: '752' },
  { city: 'San Jose', state: 'California', stateCode: 'CA', zipPrefix: '951' },
  { city: 'Austin', state: 'Texas', stateCode: 'TX', zipPrefix: '787' },
  { city: 'Jacksonville', state: 'Florida', stateCode: 'FL', zipPrefix: '322' },
  { city: 'Fort Worth', state: 'Texas', stateCode: 'TX', zipPrefix: '761' },
  { city: 'Columbus', state: 'Ohio', stateCode: 'OH', zipPrefix: '432' },
  { city: 'Charlotte', state: 'North Carolina', stateCode: 'NC', zipPrefix: '282' },
  { city: 'San Francisco', state: 'California', stateCode: 'CA', zipPrefix: '941' },
  { city: 'Indianapolis', state: 'Indiana', stateCode: 'IN', zipPrefix: '462' },
  { city: 'Seattle', state: 'Washington', stateCode: 'WA', zipPrefix: '981' },
  { city: 'Denver', state: 'Colorado', stateCode: 'CO', zipPrefix: '802' },
  { city: 'Boston', state: 'Massachusetts', stateCode: 'MA', zipPrefix: '021' },
  { city: 'El Paso', state: 'Texas', stateCode: 'TX', zipPrefix: '799' },
  { city: 'Detroit', state: 'Michigan', stateCode: 'MI', zipPrefix: '482' },
  { city: 'Nashville', state: 'Tennessee', stateCode: 'TN', zipPrefix: '372' },
  { city: 'Portland', state: 'Oregon', stateCode: 'OR', zipPrefix: '972' },
  { city: 'Oklahoma City', state: 'Oklahoma', stateCode: 'OK', zipPrefix: '731' },
  { city: 'Las Vegas', state: 'Nevada', stateCode: 'NV', zipPrefix: '891' },
  { city: 'Memphis', state: 'Tennessee', stateCode: 'TN', zipPrefix: '381' },
  { city: 'Louisville', state: 'Kentucky', stateCode: 'KY', zipPrefix: '402' },
  { city: 'Baltimore', state: 'Maryland', stateCode: 'MD', zipPrefix: '212' },
  { city: 'Milwaukee', state: 'Wisconsin', stateCode: 'WI', zipPrefix: '532' },
  { city: 'Albuquerque', state: 'New Mexico', stateCode: 'NM', zipPrefix: '871' },
  { city: 'Tucson', state: 'Arizona', stateCode: 'AZ', zipPrefix: '857' },
  { city: 'Fresno', state: 'California', stateCode: 'CA', zipPrefix: '937' },
  { city: 'Sacramento', state: 'California', stateCode: 'CA', zipPrefix: '958' },
  { city: 'Kansas City', state: 'Missouri', stateCode: 'MO', zipPrefix: '641' },
  { city: 'Mesa', state: 'Arizona', stateCode: 'AZ', zipPrefix: '852' },
  { city: 'Atlanta', state: 'Georgia', stateCode: 'GA', zipPrefix: '303' },
  { city: 'Omaha', state: 'Nebraska', stateCode: 'NE', zipPrefix: '681' },
  { city: 'Raleigh', state: 'North Carolina', stateCode: 'NC', zipPrefix: '276' },
  { city: 'Miami', state: 'Florida', stateCode: 'FL', zipPrefix: '331' },
  { city: 'Long Beach', state: 'California', stateCode: 'CA', zipPrefix: '908' },
  { city: 'Virginia Beach', state: 'Virginia', stateCode: 'VA', zipPrefix: '234' },
  { city: 'Oakland', state: 'California', stateCode: 'CA', zipPrefix: '946' },
  { city: 'Minneapolis', state: 'Minnesota', stateCode: 'MN', zipPrefix: '554' },
  { city: 'Tulsa', state: 'Oklahoma', stateCode: 'OK', zipPrefix: '741' },
  { city: 'Arlington', state: 'Texas', stateCode: 'TX', zipPrefix: '760' },
  { city: 'Tampa', state: 'Florida', stateCode: 'FL', zipPrefix: '336' },
  { city: 'New Orleans', state: 'Louisiana', stateCode: 'LA', zipPrefix: '701' },
];

// US States for dropdown
const US_STATES = [
  { name: 'Alabama', code: 'AL' },
  { name: 'Alaska', code: 'AK' },
  { name: 'Arizona', code: 'AZ' },
  { name: 'Arkansas', code: 'AR' },
  { name: 'California', code: 'CA' },
  { name: 'Colorado', code: 'CO' },
  { name: 'Connecticut', code: 'CT' },
  { name: 'Delaware', code: 'DE' },
  { name: 'Florida', code: 'FL' },
  { name: 'Georgia', code: 'GA' },
  { name: 'Hawaii', code: 'HI' },
  { name: 'Idaho', code: 'ID' },
  { name: 'Illinois', code: 'IL' },
  { name: 'Indiana', code: 'IN' },
  { name: 'Iowa', code: 'IA' },
  { name: 'Kansas', code: 'KS' },
  { name: 'Kentucky', code: 'KY' },
  { name: 'Louisiana', code: 'LA' },
  { name: 'Maine', code: 'ME' },
  { name: 'Maryland', code: 'MD' },
  { name: 'Massachusetts', code: 'MA' },
  { name: 'Michigan', code: 'MI' },
  { name: 'Minnesota', code: 'MN' },
  { name: 'Mississippi', code: 'MS' },
  { name: 'Missouri', code: 'MO' },
  { name: 'Montana', code: 'MT' },
  { name: 'Nebraska', code: 'NE' },
  { name: 'Nevada', code: 'NV' },
  { name: 'New Hampshire', code: 'NH' },
  { name: 'New Jersey', code: 'NJ' },
  { name: 'New Mexico', code: 'NM' },
  { name: 'New York', code: 'NY' },
  { name: 'North Carolina', code: 'NC' },
  { name: 'North Dakota', code: 'ND' },
  { name: 'Ohio', code: 'OH' },
  { name: 'Oklahoma', code: 'OK' },
  { name: 'Oregon', code: 'OR' },
  { name: 'Pennsylvania', code: 'PA' },
  { name: 'Rhode Island', code: 'RI' },
  { name: 'South Carolina', code: 'SC' },
  { name: 'South Dakota', code: 'SD' },
  { name: 'Tennessee', code: 'TN' },
  { name: 'Texas', code: 'TX' },
  { name: 'Utah', code: 'UT' },
  { name: 'Vermont', code: 'VT' },
  { name: 'Virginia', code: 'VA' },
  { name: 'Washington', code: 'WA' },
  { name: 'West Virginia', code: 'WV' },
  { name: 'Wisconsin', code: 'WI' },
  { name: 'Wyoming', code: 'WY' },
];

/**
 * Simple and intuitive location input component
 * Supports autocomplete dropdown and manual entry
 */
export const LocationInput: React.FC<LocationInputProps> = ({
  value,
  onChange,
  placeholder = 'City, State, ZIP',
  className = '',
  disabled = false,
  required = false,
  showLabels = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputMode, setInputMode] = useState<'combined' | 'separate'>('combined');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize search query from value if provided
  useEffect(() => {
    if (value.city || value.state || value.zip) {
      const parts: string[] = [];
      if (value.city) parts.push(value.city);
      if (value.state) parts.push(value.state);
      if (value.zip) parts.push(value.zip);
      setSearchQuery(parts.join(', '));
    }
  }, []); // Only on mount

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Filter cities based on search query
  const filteredCities = useMemo(() => {
    if (!searchQuery.trim()) {
      return COMMON_CITIES.slice(0, 8); // Show top 8 by default
    }

    const query = searchQuery.toLowerCase();
    return COMMON_CITIES.filter(
      (city) =>
        city.city.toLowerCase().includes(query) ||
        city.state.toLowerCase().includes(query) ||
        city.stateCode.toLowerCase().includes(query) ||
        city.zipPrefix.includes(query)
    ).slice(0, 8);
  }, [searchQuery]);

  // Format display value
  const displayValue = useMemo(() => {
    if (!value.city && !value.state && !value.zip) {
      return '';
    }
    const parts: string[] = [];
    if (value.city) parts.push(value.city);
    if (value.state) parts.push(value.state);
    if (value.zip) parts.push(value.zip);
    return parts.join(', ');
  }, [value]);

  // Handle city selection from dropdown
  const handleCitySelect = (city: typeof COMMON_CITIES[0]) => {
    const newValue = {
      city: city.city,
      state: city.stateCode,
      zip: city.zipPrefix + '00', // Suggest zip prefix
    };
    onChange(newValue);
    setSearchQuery(`${city.city}, ${city.stateCode} ${city.zipPrefix}00`);
    setIsOpen(false);
  };

  // Handle manual input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setSearchQuery(input);
    setIsOpen(true);

    // Try to parse "City, State ZIP" or "City, State" format
    const parts = input.split(',').map((p) => p.trim());
    if (parts.length >= 2) {
      const city = parts[0];
      const stateZip = parts[1].split(/\s+/).filter(Boolean);
      
      // Check if last part looks like a zip code (5 digits)
      const lastPart = stateZip[stateZip.length - 1];
      const isZip = /^\d{5}$/.test(lastPart);
      
      if (isZip && stateZip.length >= 2) {
        // Format: "City, State ZIP"
        const state = stateZip.slice(0, -1).join(' ');
        const zip = lastPart;
        onChange({
          city,
          state: state.length === 2 ? state.toUpperCase() : state,
          zip,
        });
      } else {
        // Format: "City, State" (no zip yet)
        const state = stateZip.join(' ');
        onChange({
          city,
          state: state.length === 2 ? state.toUpperCase() : state,
          zip: value.zip || '', // Keep existing zip if any
        });
      }
    } else {
      // Just city typed - keep existing state/zip
      onChange({
        city: input,
        state: value.state || '',
        zip: value.zip || '',
      });
    }
  };

  // Handle separate field changes
  const handleCityChange = (city: string) => {
    onChange({ ...value, city });
    if (city) {
      setSearchQuery(city);
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const handleStateChange = (state: string) => {
    onChange({ ...value, state });
  };

  const handleZipChange = (zip: string) => {
    // Validate zip format (5 digits)
    const cleaned = zip.replace(/\D/g, '').slice(0, 5);
    onChange({ ...value, zip: cleaned });
  };

  // Clear all fields
  const handleClear = () => {
    onChange({ city: '', state: '', zip: '' });
    setSearchQuery('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Combined Input Mode (Default) - Simple and Intuitive */}
      {inputMode === 'combined' ? (
        <div className="relative">
          {showLabels && (
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">
              Location
            </label>
          )}
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery || displayValue}
              onChange={handleInputChange}
              onFocus={() => setIsOpen(true)}
              placeholder={placeholder}
              disabled={disabled}
              required={required}
              className={`${INPUT_CLASS} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} pr-20`}
              aria-label="Location (City, State, ZIP)"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {value.city || value.state || value.zip ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClear();
                  }}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                  aria-label="Clear location"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              ) : null}
              <MapPin className="w-4 h-4 text-slate-400" />
            </div>
          </div>

          {/* Dropdown Suggestions */}
          {isOpen && !disabled && (
            <div className="absolute z-50 mt-2 w-full bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 max-h-64 overflow-y-auto">
              {filteredCities.length > 0 ? (
                <>
                  <div className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    Suggested Locations
                  </div>
                  {filteredCities.map((city, index) => (
                    <button
                      key={`${city.city}-${city.stateCode}-${index}`}
                      type="button"
                      onClick={() => handleCitySelect(city)}
                      className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-b-0 min-h-[44px] touch-manipulation"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-900 dark:text-white truncate">
                            {city.city}, {city.stateCode}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {city.state} • ZIP: {city.zipPrefix}XX
                          </div>
                        </div>
                        <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 ml-2" />
                      </div>
                    </button>
                  ))}
                  <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <button
                      type="button"
                      onClick={() => {
                        setInputMode('separate');
                        setIsOpen(false);
                      }}
                      className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline w-full text-center min-h-[32px] touch-manipulation"
                    >
                      Or enter manually →
                    </button>
                  </div>
                </>
              ) : searchQuery.trim() ? (
                <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 text-center">
                  <p className="mb-2">No matches found for "{searchQuery}"</p>
                  <button
                    type="button"
                    onClick={() => {
                      setInputMode('separate');
                      setIsOpen(false);
                    }}
                    className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium min-h-[32px] touch-manipulation"
                  >
                    Enter manually →
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : (
        /* Separate Fields Mode - For Manual Entry */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            {showLabels && (
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                Location
              </label>
            )}
            <button
              type="button"
              onClick={() => {
                setInputMode('combined');
                setSearchQuery('');
                setIsOpen(false);
              }}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline ml-auto"
            >
              Use autocomplete →
            </button>
          </div>

          {/* City Input with Suggestions */}
          <div className="relative">
            <input
              type="text"
              value={value.city}
              onChange={(e) => handleCityChange(e.target.value)}
              onFocus={() => value.city && setIsOpen(true)}
              placeholder="City"
              disabled={disabled}
              required={required}
              className={`${INPUT_CLASS} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            {value.city && (
              <button
                type="button"
                onClick={() => handleCityChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded min-h-[32px] min-w-[32px] flex items-center justify-center"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>

          {/* State and ZIP in one row */}
          <div className="grid grid-cols-2 gap-3">
            {/* State Dropdown */}
            <div className="relative">
              <select
                value={value.state}
                onChange={(e) => handleStateChange(e.target.value)}
                disabled={disabled}
                required={required}
                className={`${INPUT_CLASS} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} appearance-none pr-8 min-h-[44px]`}
              >
                <option value="">State</option>
                {US_STATES.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            {/* ZIP Input */}
            <div>
              <input
                type="text"
                value={value.zip}
                onChange={(e) => handleZipChange(e.target.value)}
                placeholder="ZIP Code"
                disabled={disabled}
                maxLength={5}
                pattern="[0-9]{5}"
                className={`${INPUT_CLASS} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} min-h-[44px]`}
              />
            </div>
          </div>

          {/* City Suggestions (if typing in separate mode) */}
          {value.city && isOpen && inputMode === 'separate' && filteredCities.length > 0 && (
            <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-200 dark:border-slate-800 max-h-48 overflow-y-auto">
              {filteredCities
                .filter((c) => c.city.toLowerCase().startsWith(value.city.toLowerCase()))
                .slice(0, 5)
                .map((city, index) => (
                  <button
                    key={`suggest-${city.city}-${index}`}
                    type="button"
                    onClick={() => {
                      handleCitySelect(city);
                      setIsOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm border-b border-slate-100 dark:border-slate-800 last:border-b-0 min-h-[44px] touch-manipulation"
                  >
                    <div className="font-medium text-slate-900 dark:text-white">
                      {city.city}, {city.stateCode}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {city.state}
                    </div>
                  </button>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

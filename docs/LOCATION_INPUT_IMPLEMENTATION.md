# Location Input Component Implementation

## Overview

Created a simple and intuitive location input component (`LocationInput`) that provides autocomplete suggestions for city/state/zip with the ability to type manually if the location doesn't exist in the suggestions.

## Components Created

### 1. `CityStateZipInput.tsx`
- Base component with full functionality
- Exports `CityStateZip` interface

### 2. `LocationInput.tsx` (Recommended)
- Simplified wrapper around CityStateZipInput
- Better naming and cleaner API
- Used throughout the app

## Features

### ✅ Autocomplete Dropdown
- Shows top 8 common US cities by default
- Filters as user types
- Displays: "City, State • ZIP: XXXxx"
- Click to select and auto-fill

### ✅ Manual Entry Mode
- Switch to separate fields (City, State dropdown, ZIP)
- State dropdown with all 50 US states
- ZIP code validation (5 digits, numbers only)
- City suggestions still work in manual mode

### ✅ Prefill Support
- Automatically prefills from user data (city, state, zip fields)
- Parses existing values on mount
- Maintains state when switching modes

### ✅ Simple & Intuitive
- Default: Single input with autocomplete
- Type "City, State ZIP" or just "City"
- Clear button to reset
- Easy switch between autocomplete and manual entry

## Usage Examples

### In SettingsView (Profile Editing)
```tsx
<LocationInput
  value={{
    city: user.city || '',
    state: user.state || '',
    zip: user.zip || '',
  }}
  onChange={(location) => {
    updateUser({
      ...user,
      city: location.city,
      state: location.state,
      zip: location.zip,
    });
  }}
  placeholder="City, State, ZIP"
  showLabels={true}
/>
```

### In DynamicSignupForm (Onboarding)
Automatically detects location fields by:
- Field ID containing "loc", "location", or "city"
- Field label containing "location" or "where are you"
- Field type set to "location"

### In Custom Forms
```tsx
const [location, setLocation] = useState<CityStateZip>({
  city: '',
  state: '',
  zip: '',
});

<LocationInput
  value={location}
  onChange={setLocation}
  placeholder="Enter your location"
/>
```

## Data Format

### Input/Output
```typescript
interface CityStateZip {
  city: string;    // e.g., "New York"
  state: string;   // e.g., "NY" (2-letter code)
  zip: string;     // e.g., "10001" (5 digits)
}
```

### Storage Format
- Stored as separate fields: `user.city`, `user.state`, `user.zip`
- Or as combined string: `"City, State ZIP"` (for DynamicSignupForm compatibility)

## User Experience Flow

1. **User clicks input** → Dropdown shows top cities
2. **User types** → Filters suggestions in real-time
3. **User selects from dropdown** → Auto-fills city, state, and suggested ZIP
4. **User wants manual entry** → Clicks "Or enter manually" → Separate fields appear
5. **User types city manually** → Still shows city suggestions
6. **User selects state** → Dropdown with all states
7. **User types ZIP** → Validates to 5 digits

## Integration Points

### ✅ Completed
- Added to `SettingsView.tsx` - Profile editing
- Added to `DynamicSignupForm.tsx` - Auto-detects location fields
- Added `city`, `state`, `zip` fields to `User` type

### 🔄 Next Steps
- Update `MentorOnboarding.tsx` to use LocationInput
- Update `MenteeOnboarding.tsx` to use LocationInput
- Update `OrganizationSignup.tsx` if location is needed
- Update `UserManagement.tsx` EditUserForm to include location

## Technical Details

### City Database
- 50 common US cities pre-loaded
- Includes state, state code, and ZIP prefix
- Can be extended with API integration later

### State Dropdown
- All 50 US states with full names and codes
- Alphabetically sorted
- Easy to select

### ZIP Validation
- Accepts only digits
- Limits to 5 characters
- Auto-formats as user types

## Future Enhancements

1. **API Integration** (Optional)
   - Integrate with free geocoding API for more cities
   - Real-time ZIP code lookup
   - City/state autofill from ZIP

2. **International Support**
   - Add country selector
   - Support international postal codes
   - City/state equivalents for other countries

3. **Recent Locations**
   - Remember user's recent locations
   - Show in dropdown for quick selection

4. **Geolocation**
   - Optional "Use my location" button
   - Auto-fill from browser geolocation API

## Accessibility

- ✅ Proper ARIA labels
- ✅ Keyboard navigation support
- ✅ Screen reader friendly
- ✅ Touch-friendly (44px minimum touch targets)
- ✅ Focus management

## Mobile Optimization

- ✅ Touch-friendly buttons (min-h-[44px])
- ✅ Responsive layout
- ✅ Dropdown scrollable on mobile
- ✅ Easy to use on small screens

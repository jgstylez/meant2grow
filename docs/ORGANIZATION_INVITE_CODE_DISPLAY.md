# Organization Invite Code Display - Implementation

## Date: December 14, 2025

## Overview

Each organization in the Meant2Grow platform has a unique 6-character invite code that allows new participants to join directly. This implementation adds UI elements to prominently display and share this code.

## Problem

The organization invite code (`organizationCode`) was being generated and stored in the database when organizations were created, but there was no UI to display this code to administrators. Admins had no way to retrieve and share the code with potential participants.

## Solution

Added the organization code display in two strategic locations:

### 1. **Referrals Page** (Primary Location)
- Prominent gradient banner at the top of the Referrals page
- Large, readable font with clear labeling
- One-click copy button with visual feedback
- Contextual help text explaining the code's purpose

### 2. **Admin Dashboard** (Quick Access)
- Compact card in the admin dashboard sidebar
- Quick copy functionality for easy access
- Placed alongside other admin management tools

## Implementation Details

### Files Modified

#### 1. `/App.tsx`
- Added `organization` to the destructured values from `useOrganizationData` hook
- Passed `organizationCode` prop to Dashboard component
- Passed `organizationCode` prop to Referrals component

**Changes:**
```typescript
// Extract organization from hook
const {
  // ... other fields
  organization,  // Added this
  // ... rest
} = useOrganizationData(userId, organizationId);

// Pass to Dashboard
<Dashboard
  // ... other props
  organizationCode={organization?.organizationCode}
/>

// Pass to Referrals
<Referrals
  // ... other props
  organizationCode={organization?.organizationCode}
/>
```

#### 2. `/components/Referrals.tsx`
- Added `Copy` and `Check` icons to imports
- Added `organizationCode` prop to interface
- Added `copied` state for copy feedback
- Implemented `handleCopyCode` function
- Added prominent invite code banner with copy button

**Features:**
- Large emerald gradient banner
- Font-mono display for code readability
- Copy button with icon swap on success
- Clear instructions for sharing

#### 3. `/components/Dashboard.tsx`
- Added `Copy` icon to imports
- Added `organizationCode` prop to interface
- Added `codeCopied` state for copy feedback
- Implemented `handleCopyCode` function
- Added compact invite code card in admin dashboard

**Features:**
- Compact purple gradient card
- Positioned with other admin tools
- Quick copy functionality
- Only shown to admin users

### Organization Code Format

- **Length**: 6 characters
- **Characters**: A-Z (excluding confusing letters like I, O) and numbers 2-9
- **Example**: `ABC123`, `XYZ789`, `MNT42K`
- **Generation**: Done automatically when an organization is created

### User Experience

#### For Admins (on Referrals Page):
1. Navigate to "Invite Colleague" or "Grow the Community"
2. See large banner with invite code at the top
3. Click "Copy Code" button
4. Button shows checkmark and "Copied!" confirmation
5. Share code with colleagues via email, Slack, etc.

#### For Admins (on Dashboard):
1. View dashboard
2. See compact invite code card in sidebar
3. Click copy icon for quick access
4. Visual confirmation (checkmark icon) on copy

#### For Participants:
1. Receive invite code from admin
2. Go to signup page
3. Select "Join existing organization"
4. Enter the 6-character code
5. Complete profile and join

### Copy Functionality

Both implementations use the modern Clipboard API:

```typescript
const handleCopyCode = () => {
  if (organizationCode) {
    navigator.clipboard.writeText(organizationCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
};
```

**Features:**
- Instant copy to clipboard
- 2-second visual confirmation
- Graceful handling if code is undefined

### Visual Design

#### Referrals Page Banner:
- **Colors**: Emerald-to-teal gradient (`from-emerald-500 to-teal-600`)
- **Size**: Full-width, prominent placement
- **Typography**: Large (2xl) mono font for code
- **Button**: White semi-transparent with hover effect

#### Dashboard Card:
- **Colors**: Indigo-to-purple gradient (`from-indigo-500 to-purple-600`)
- **Size**: Compact card format
- **Typography**: Large (lg) mono font for code
- **Button**: Icon-only for space efficiency

### Accessibility Features

- Clear labels and descriptions
- High-contrast text on gradient backgrounds
- Button states (hover, active)
- Visual feedback on interaction
- Keyboard accessible copy buttons

## Data Flow

```
1. Organization created → generateOrganizationCode() → Store in Firestore
2. App loads → useOrganizationData hook → Fetch organization
3. Pass organization.organizationCode to components
4. Display code with copy functionality
5. User clicks copy → navigator.clipboard.writeText()
6. Show visual confirmation
```

## Testing Checklist

### As Admin:
- [ ] Navigate to Referrals page
- [ ] Verify invite code banner is visible
- [ ] Click "Copy Code" button
- [ ] Verify checkmark and "Copied!" appears
- [ ] Paste code somewhere to confirm it copied correctly
- [ ] Navigate to Dashboard
- [ ] Verify compact invite code card is visible
- [ ] Click copy icon
- [ ] Verify checkmark appears
- [ ] Paste to confirm

### As Mentee/Mentor:
- [ ] Navigate to Referrals page
- [ ] Verify invite code banner is visible (if they have permission)
- [ ] Navigate to Dashboard
- [ ] Verify no invite code card (not admin)

### Code Validation:
- [ ] Verify code is 6 characters
- [ ] Verify code uses allowed character set
- [ ] Verify code persists across sessions
- [ ] Verify same code shown in all locations

## Benefits

1. **Easy Discovery**: Admins can quickly find the invite code
2. **Quick Sharing**: One-click copy makes sharing effortless
3. **Multiple Access Points**: Available in both dashboard and referrals
4. **Visual Clarity**: Clear, readable display with context
5. **User-Friendly**: No need to dig into settings or database

## Future Enhancements (Optional)

1. **QR Code Generation**: Generate QR code for the invite link
2. **Email Integration**: "Share via Email" button
3. **Usage Analytics**: Track how many people used the code
4. **Code Regeneration**: Allow admins to generate a new code if needed
5. **Expiring Codes**: Option for time-limited invite codes
6. **Multiple Codes**: Different codes for different cohorts
7. **Direct Link**: Generate and copy a full signup URL with code pre-filled

## Related Files

- `/services/database.ts` - `generateOrganizationCode()` function
- `/hooks/useOrganizationData.ts` - Loads organization data
- `/types.ts` - `Organization` interface with `organizationCode` field
- `/components/Authentication.tsx` - Where participants enter the code

## Notes

- The organization code is immutable once created
- Each organization has exactly one code
- The code is required for participant signup
- The code does not expire
- No special permissions needed to view (visible to all org members if desired)


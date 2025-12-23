# Quick Fix: Clear Browser Data to Show Landing Page

## Problem
The app is showing a blank screen because it's trying to load data for a previously logged-in user, but that data doesn't exist or failed to load.

## Solution: Clear localStorage

### Method 1: Browser Console (Fastest)
1. Open browser console: Press `F12` or `Cmd+Option+I` (Mac)
2. Go to **Console** tab
3. Type this command and press Enter:
```javascript
localStorage.clear(); location.reload();
```

### Method 2: Application/Storage Tab
1. Open DevTools: Press `F12`
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Find **Local Storage** in the left sidebar
4. Click on `http://localhost:3000`
5. Right-click → **Clear**
6. Refresh the page

### Method 3: Add a Reset Button (Developer Tool)
I've added console logging that will show:
```
🔐 Checking authentication...
👋 No authentication found, showing landing page
```
OR
```
🔐 Checking authentication...
✅ User authenticated, loading app data...
```

## What This Does
Clears all saved authentication data:
- `userId` - Your user ID
- `organizationId` - Your organization ID  
- `authToken` - Auth token
- `onboardingComplete` - Onboarding status

## After Clearing
The app will:
1. Show the landing page (beautiful hero section)
2. Allow you to:
   - View public pages
   - Sign up as new organization
   - Join existing organization
   - See demo/marketing content

## To Login Again
1. Click "Get Started" or "Sign In"
2. Create a new organization OR
3. Use an organization invite code

## Still Not Working?
If clearing localStorage doesn't work, check browser console for errors:
1. Press F12
2. Look for red error messages
3. Share the error message with me


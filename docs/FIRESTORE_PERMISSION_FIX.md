# Firestore Permission Errors - Diagnosis and Fix

## Problem

You're seeing errors like:
```
Missing or insufficient permissions
Error in getAllGoals
Error in getAllMatches
Error in getAllRatings
Error in getAllCalendarEvents
```

## Root Cause

The Firestore security rules check if the user document exists and has the correct role (`PLATFORM_ADMIN`) before allowing access to collections. If:

1. **User document doesn't exist** in Firestore (authenticated in Firebase Auth but no Firestore document)
2. **User role is not `PLATFORM_ADMIN`** in the Firestore document
3. **User document is missing or corrupted**

Then the security rules will deny access to platform-wide data.

## Recent Fix

Updated Firestore rules to check if user document exists before accessing it:

```javascript
// Added userExists() check
function userExists() {
  return isAuthenticated() && 
         exists(/databases/$(database)/documents/users/$(request.auth.uid));
}

// Updated all helper functions to check userExists() first
function isPlatformAdmin() {
  return isAuthenticated() && 
         userExists() &&  // ← New check
         (getUserData().role == 'PLATFORM_ADMIN' || 
          getUserData().role == 'PLATFORM_OPERATOR' ||
          getUserData().organizationId == 'platform');
}
```

**Deployed:** ✅ Rules deployed on 2026-01-04 at 13:01:38 UTC

## How to Diagnose

### Step 1: Check browser console

Look for detailed error logs in the console showing:
- User ID
- Current role
- Organization ID
- Whether user is detected as platform admin

### Step 2: Get your user ID

In browser console:
```javascript
localStorage.getItem('userId')
```

### Step 3: Check if user document exists

```bash
firebase firestore:get users/<YOUR_USER_ID>
```

### Step 4: Run diagnostic script

```bash
npx ts-node scripts/check-user-role.ts <YOUR_USER_ID>
```

## How to Fix

### Option 1: Use the diagnostic script (Recommended)

```bash
npx ts-node scripts/check-user-role.ts <YOUR_USER_ID> --fix
```

This will:
1. Check if user document exists
2. Display current role and permissions
3. Update role to `PLATFORM_ADMIN` if you use `--fix` flag
4. Show clear instructions on what to do next

### Option 2: Manual fix via Firebase CLI

```bash
# Update user role to PLATFORM_ADMIN
firebase firestore:update users/<YOUR_USER_ID> role=PLATFORM_ADMIN

# OR set organizationId to 'platform'
firebase firestore:update users/<YOUR_USER_ID> organizationId=platform
```

### Option 3: Manual fix via Firebase Console

1. Go to Firebase Console: https://console.firebase.google.com
2. Navigate to Firestore Database
3. Find the `users` collection
4. Find your user document by ID
5. Edit the `role` field to `PLATFORM_ADMIN`
6. Save changes

### Option 4: Create user document if missing

If the document doesn't exist at all, you need to create it:

```bash
# Create a new user document with platform admin role
firebase firestore:set users/<YOUR_USER_ID> \
  email=<YOUR_EMAIL> \
  name="<YOUR_NAME>" \
  role=PLATFORM_ADMIN \
  organizationId=platform \
  createdAt=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
```

## After Fixing

1. **Refresh your browser** - The app should now load without permission errors
2. **Check console** - Verify no more "Missing or insufficient permissions" errors
3. **Test access** - Navigate to Users, Matches, Goals, etc. to confirm access

## Verification

After applying the fix, you should see:
- ✅ No permission errors in console
- ✅ Platform admin dashboard loads successfully
- ✅ Can access all users, organizations, matches, goals, etc.
- ✅ User role shows as "Platform Admin" in UI

## Technical Details

### Firestore Security Rules

The rules now safely handle cases where:
- User is authenticated but document doesn't exist
- User document exists but role is not set
- User document is being accessed during rule evaluation

### Key Functions

```javascript
userExists()        // Checks if user document exists
getUserData()       // Gets user document (only if exists)
isPlatformAdmin()   // Checks if user has platform admin role
isOrgScoped()       // Checks organization access
```

### Collections Affected

These collections require platform admin access:
- `users` (all users across all orgs)
- `organizations` (all organizations)
- `matches` (all matches across all orgs)
- `goals` (all goals across all orgs)
- `ratings` (all ratings across all orgs)
- `calendarEvents` (all events across all orgs)

## Prevention

To prevent this issue in the future:

1. **Always create user document during authentication** - The auth flow should create a Firestore document when a new user signs up
2. **Set correct role during signup** - For platform admins, set `role: 'PLATFORM_ADMIN'` and `organizationId: 'platform'`
3. **Verify user document exists** - After authentication, check that the Firestore document was created successfully

## Related Files

- `firestore.rules` - Security rules with the fix
- `scripts/check-user-role.ts` - Diagnostic script
- `components/Dashboard.tsx` - Enhanced error logging
- `api/auth/google.ts` - User creation during auth

## Need Help?

If the issue persists after following these steps:

1. Check the detailed error logs in browser console
2. Verify Firebase credentials are correct in `.env.local`
3. Ensure Firestore rules were deployed successfully
4. Contact support with:
   - Your user ID
   - Screenshot of console errors
   - Output of diagnostic script

# Password Authentication Migration Guide

**Last Updated:** January 2025  
**Status:** ⚠️ **Issues Reported - Needs Troubleshooting**

---

## Overview

This document explains the password authentication system, migration process, and current issues with user authentication for dashboard access.

---

## Current Issues

### Issue 1: Users Cannot Access Dashboards with Passwords

**Symptoms:**
- Users cannot log in with email/password
- Password reset emails not being received
- Dashboard access denied after password reset
- Firebase Auth accounts not being created properly

**Possible Causes:**
1. **Firebase Authentication Not Enabled:**
   - Email/password provider not enabled in Firebase Console
   - Authentication method disabled

2. **Migration Issues:**
   - Legacy users don't have Firebase Auth accounts
   - `firebaseAuthUid` field missing in Firestore
   - Password hash migration incomplete

3. **Email Delivery Issues:**
   - Password reset emails not being sent (see [Transactional Emails Status](./TRANSACTIONAL_EMAILS_STATUS.md))
   - Reset tokens not being generated

4. **Firebase Auth Configuration:**
   - Service account not properly configured
   - Firebase Admin SDK initialization failing

**Troubleshooting Steps:**

1. **Verify Firebase Authentication is Enabled:**
   - Go to Firebase Console → Authentication → Sign-in method
   - Ensure "Email/Password" provider is enabled
   - Check that "Email link (passwordless sign-in)" is configured if needed

2. **Check User Migration Status:**
   ```bash
   # Run migration script to check user status
   ts-node scripts/migrate-password-auth.ts --dry-run
   ```

3. **Test Password Reset Flow:**
   - Request password reset via `/api/auth/forgot-password`
   - Check if reset token is created in Firestore
   - Verify reset email is sent (check Mailtrap logs)
   - Test reset link functionality

4. **Check Firebase Auth Account Creation:**
   - Verify `ensureFirebaseAuthAccount()` is being called
   - Check Firebase Functions logs for errors
   - Verify `createFirebaseAuthAccount()` works for new users

---

## Authentication Architecture

### Current System

The application uses a **hybrid authentication system**:

1. **Firebase Authentication** (Primary):
   - Email/password authentication
   - Google OAuth authentication
   - Password reset via Firebase Auth
   - Session management via Firebase Auth tokens

2. **Firestore User Documents** (Secondary):
   - User profile data stored in Firestore
   - Linked to Firebase Auth via `firebaseAuthUid` field
   - Role-based access control (ADMIN, MENTOR, MENTEE, PLATFORM_ADMIN)

### User Document Schema

**Current Schema:**
```typescript
{
  id: string;                    // Firestore document ID
  email: string;
  name: string;
  role: Role;                    // ADMIN, MENTOR, MENTEE, PLATFORM_ADMIN
  organizationId: string;
  firebaseAuthUid?: string;      // Firebase Auth UID (required for authentication)
  passwordHash?: string;         // Legacy field (being removed)
  googleId?: string;            // Google OAuth ID
  // ... other fields
}
```

**Target Schema (After Migration):**
```typescript
{
  id: string;
  email: string;
  name: string;
  role: Role;
  organizationId: string;
  firebaseAuthUid: string;       // Required - links to Firebase Auth
  googleId?: string;
  // passwordHash removed
  // ... other fields
}
```

---

## Migration Strategy

### Automatic Lazy Migration

The application includes a **lazy migration** system that automatically creates Firebase Auth accounts when users log in:

**Location:** `services/firebaseAuth.ts` → `ensureFirebaseAuthAccount()`

**How it works:**
1. User attempts to log in with email/password
2. System checks if Firebase Auth account exists
3. If not, creates Firebase Auth account with provided password
4. Links `firebaseAuthUid` to Firestore user document
5. Removes `passwordHash` field (migration cleanup)

**Limitation:** Users must know their password to migrate. If they've forgotten it, they need to use password reset.

### Password Reset Migration

**Location:** `api/auth/reset-password.ts`

The password reset endpoint now:
1. Creates or updates Firebase Auth account with new password
2. Links `firebaseAuthUid` to Firestore user document
3. Removes `passwordHash` field (migration cleanup)
4. Marks reset token as used

**Status:** ✅ Implemented, but email delivery issues may prevent users from completing reset

---

## Migration Process

### Step 1: Identify Users Needing Migration

Run the migration script to identify users:

```bash
# Dry run (no changes)
ts-node scripts/migrate-password-auth.ts --dry-run

# Full report
ts-node scripts/migrate-password-auth.ts
```

The script will report:
- Total users
- Users with `passwordHash` but no `firebaseAuthUid`
- Users with invalid `firebaseAuthUid` references
- Users already migrated

### Step 2: Enable Firebase Authentication

1. **Enable Email/Password Provider:**
   - Go to Firebase Console → Authentication → Sign-in method
   - Enable "Email/Password" provider
   - Save changes

2. **Configure Authorized Domains:**
   - Add your app domain to authorized domains
   - Include localhost for development

### Step 3: User Actions

Users needing migration have two options:

#### Option A: Login with Existing Password
- User logs in with their existing password
- Lazy migration automatically creates Firebase Auth account
- No action required from user

#### Option B: Password Reset
- User clicks "Forgot Password"
- Receives password reset email (if email delivery works)
- Sets new password
- Password reset endpoint creates Firebase Auth account
- `passwordHash` is removed from Firestore

### Step 4: Verification

After migration period, verify all users are migrated:

```bash
ts-node scripts/migrate-password-auth.ts --dry-run
```

All users should have:
- ✅ `firebaseAuthUid` field
- ✅ Firebase Auth account exists
- ❌ No `passwordHash` field (or it's being removed)

---

## Technical Details

### Files Modified

1. **`api/auth/reset-password.ts`**
   - Uses Firebase Admin Auth instead of storing `passwordHash`
   - Creates/updates Firebase Auth accounts
   - Removes `passwordHash` field during reset

2. **`api/auth/forgot-password.ts`**
   - Generates reset tokens
   - Calls `sendPasswordResetEmail` Cloud Function
   - Handles email delivery (may have issues)

3. **`services/firebaseAuth.ts`**
   - Includes lazy migration logic (`ensureFirebaseAuthAccount`)
   - Handles account creation on login
   - Creates user documents with Firebase Auth UID as ID

4. **`components/Authentication.tsx`**
   - Login/signup UI
   - Handles email/password authentication
   - Calls `ensureFirebaseAuthAccount` for legacy users

5. **`components/ResetPassword.tsx`**
   - Password reset UI
   - Calls reset-password endpoint

### Firebase Auth Account

After migration, each user has:
- Firebase Auth account with email/password provider
- Password stored securely by Firebase (bcrypt/scrypt)
- Email verification status preserved
- Session tokens managed by Firebase Auth

---

## Common Scenarios

### Scenario 1: User with passwordHash, no Firebase Auth

**State:**
- Has `passwordHash` in Firestore
- No `firebaseAuthUid`
- No Firebase Auth account

**Migration:**
- User logs in → Lazy migration creates Firebase Auth account
- OR User resets password → Reset endpoint creates Firebase Auth account

**Status:** ✅ Should work, but email delivery issues may prevent password reset

### Scenario 2: User with invalid firebaseAuthUid

**State:**
- Has `firebaseAuthUid` in Firestore
- Firebase Auth account doesn't exist (deleted or invalid)

**Migration:**
- User logs in → System detects invalid UID, creates new account
- OR User resets password → Reset endpoint creates new account

**Status:** ✅ Should work

### Scenario 3: User with both passwordHash and firebaseAuthUid

**State:**
- Has both `passwordHash` and `firebaseAuthUid`
- Legacy state from transition period

**Migration:**
- `passwordHash` is removed on next password reset
- Or can be cleaned up manually via script

**Status:** ✅ Should work

### Scenario 4: New User Signup

**State:**
- New user signing up with email/password

**Process:**
- `createFirebaseAuthAccount()` creates Firebase Auth account
- Links `firebaseAuthUid` to Firestore user document
- No `passwordHash` field created

**Status:** ✅ Should work

---

## Troubleshooting

### Issue: User can't log in

**Possible causes:**
1. User doesn't have Firebase Auth account
2. Password doesn't match Firebase Auth account
3. Email/password auth not enabled in Firebase Console
4. Firebase Auth account exists but password is wrong

**Solution:**
- User should use "Forgot Password" to reset
- Verify email/password auth is enabled in Firebase Console
- Check Firebase Functions logs for errors
- Verify `ensureFirebaseAuthAccount()` is being called

### Issue: Password reset doesn't work

**Possible causes:**
1. Reset email not being sent (see [Transactional Emails Status](./TRANSACTIONAL_EMAILS_STATUS.md))
2. Reset token not being generated
3. Reset link expired or invalid
4. Firebase Auth account creation failing

**Solution:**
- Check email delivery (Mailtrap logs)
- Verify reset token is created in Firestore
- Check reset-password endpoint logs
- Verify Firebase Admin Auth is initialized correctly

### Issue: Dashboard access denied after login

**Possible causes:**
1. `firebaseAuthUid` not set in Firestore user document
2. Firestore security rules checking `request.auth.uid` but user document ID doesn't match
3. User document not found by Firebase Auth UID

**Solution:**
- Verify `firebaseAuthUid` is set in user document
- Check Firestore security rules
- Verify user document exists with Firebase Auth UID as ID (created by `ensureFirebaseAuthAccount`)

### Issue: Migration script errors

**Check:**
- Firebase Admin credentials are configured
- Environment variables are set correctly
- Firestore permissions allow reading users collection
- Script has proper error handling

---

## Best Practices

1. **Monitor Migration Progress:** Run migration script regularly during transition
2. **User Communication:** Inform users about password reset if needed
3. **Cleanup:** Remove `passwordHash` fields after migration is complete
4. **Testing:** Test password reset flow with legacy users
5. **Documentation:** Keep this guide updated as migration progresses
6. **Error Handling:** Log all authentication errors for debugging

---

## Future Cleanup

Once all users are migrated:

1. Remove `passwordHash` field from all user documents
2. Update Firestore security rules to remove any `passwordHash` references
3. Remove migration script (or archive it)
4. Update documentation to reflect Firebase Auth-only authentication
5. Simplify authentication flow (remove lazy migration code)

---

## Related Files

- `api/auth/reset-password.ts` - Password reset endpoint
- `api/auth/forgot-password.ts` - Password reset request endpoint
- `services/firebaseAuth.ts` - Firebase Auth utilities and lazy migration
- `components/Authentication.tsx` - Login/signup UI
- `components/ResetPassword.tsx` - Password reset UI
- `components/ForgotPassword.tsx` - Forgot password UI
- `scripts/migrate-password-auth.ts` - Migration analysis script

---

## Support

If you encounter issues during migration:

1. Check Firebase Console → Authentication → Users
2. Review server logs for errors
3. Run migration script with `--dry-run` to diagnose
4. Verify Firebase Admin credentials are correct
5. Check email delivery status (Mailtrap logs)
6. Review Firebase Functions logs for authentication errors

---

## Next Steps

1. **Immediate:**
   - [ ] Fix email delivery issues (see [Transactional Emails Status](./TRANSACTIONAL_EMAILS_STATUS.md))
   - [ ] Verify Firebase Authentication is enabled
   - [ ] Test password reset flow end-to-end
   - [ ] Check Firebase Functions logs for errors

2. **Short-term:**
   - [ ] Run migration script to identify users needing migration
   - [ ] Test lazy migration with legacy users
   - [ ] Verify dashboard access after password reset
   - [ ] Monitor authentication errors

3. **Long-term:**
   - [ ] Complete migration for all users
   - [ ] Remove `passwordHash` fields
   - [ ] Simplify authentication code
   - [ ] Update documentation

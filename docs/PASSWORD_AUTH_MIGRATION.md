# Password Authentication Migration Guide

## Overview

This document explains the migration process for users who were created before Firebase Authentication was added to the application. These users may have passwords stored in Firestore (`passwordHash` field) but no corresponding Firebase Auth account.

## Problem Statement

### Historical Context

1. **Before Firebase Auth**: Accounts were created with passwords stored as SHA256 hashes in Firestore (`passwordHash` field)
2. **After Firebase Auth**: Authentication was migrated to Firebase Auth, which requires:
   - A Firebase Auth account (created via `createUserWithEmailAndPassword`)
   - A `firebaseAuthUid` field linking the Firestore user to the Firebase Auth account

### Current State

- **Legacy Users**: Users created before Firebase Auth was added may have:
  - `passwordHash` field in Firestore (SHA256 hash)
  - No `firebaseAuthUid` field
  - No Firebase Auth account

- **New Users**: Users created after Firebase Auth was added have:
  - Firebase Auth account
  - `firebaseAuthUid` field in Firestore
  - No `passwordHash` field

### Why Migration is Needed

1. **Security**: Firebase Auth provides better password security (bcrypt/scrypt hashing)
2. **Consistency**: All authentication should go through Firebase Auth
3. **Features**: Firebase Auth enables features like password reset, email verification, etc.
4. **Firestore Rules**: Security rules may depend on Firebase Auth tokens

## Migration Strategy

### Automatic Lazy Migration

The application includes a **lazy migration** system that automatically creates Firebase Auth accounts when users log in:

**Location**: `services/firebaseAuth.ts` → `ensureFirebaseAuthAccount()`

**How it works**:
1. User attempts to log in with email/password
2. System checks if Firebase Auth account exists
3. If not, creates Firebase Auth account with provided password
4. Links `firebaseAuthUid` to Firestore user document

**Limitation**: Users must know their password to migrate. If they've forgotten it, they need to use password reset.

### Password Reset Migration

**Fixed**: The password reset endpoint (`/api/auth/reset-password`) now:
1. Creates or updates Firebase Auth account with new password
2. Links `firebaseAuthUid` to Firestore user document
3. Removes `passwordHash` field (migration cleanup)

**Location**: `api/auth/reset-password.ts`

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

### Step 2: Notify Users (Optional)

If you want to proactively notify users:

```bash
# Send password reset emails to users needing migration
ts-node scripts/migrate-password-auth.ts --send-reset-emails
```

**Note**: This requires implementing the email sending logic in the script.

### Step 3: User Actions

Users needing migration have two options:

#### Option A: Login with Existing Password
- User logs in with their existing password
- Lazy migration automatically creates Firebase Auth account
- No action required from user

#### Option B: Password Reset
- User clicks "Forgot Password"
- Receives password reset email
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

## Technical Details

### Files Modified

1. **`api/auth/reset-password.ts`**
   - Now uses Firebase Admin Auth instead of storing `passwordHash`
   - Creates/updates Firebase Auth accounts
   - Removes `passwordHash` field during reset

2. **`services/firebaseAuth.ts`**
   - Already includes lazy migration logic
   - Handles account creation on login

3. **`scripts/migrate-password-auth.ts`** (New)
   - Identifies users needing migration
   - Generates migration reports

### User Document Schema

**Before Migration**:
```typescript
{
  id: string;
  email: string;
  passwordHash?: string;  // SHA256 hash
  firebaseAuthUid?: string;  // Missing or invalid
  // ... other fields
}
```

**After Migration**:
```typescript
{
  id: string;
  email: string;
  firebaseAuthUid: string;  // Valid Firebase Auth UID
  // passwordHash removed
  // ... other fields
}
```

### Firebase Auth Account

After migration, each user has:
- Firebase Auth account with email/password provider
- Password stored securely by Firebase (bcrypt/scrypt)
- Email verification status preserved

## Common Scenarios

### Scenario 1: User with passwordHash, no Firebase Auth

**State**:
- Has `passwordHash` in Firestore
- No `firebaseAuthUid`
- No Firebase Auth account

**Migration**:
- User logs in → Lazy migration creates Firebase Auth account
- OR User resets password → Reset endpoint creates Firebase Auth account

### Scenario 2: User with invalid firebaseAuthUid

**State**:
- Has `firebaseAuthUid` in Firestore
- Firebase Auth account doesn't exist (deleted or invalid)

**Migration**:
- User logs in → System detects invalid UID, creates new account
- OR User resets password → Reset endpoint creates new account

### Scenario 3: User with both passwordHash and firebaseAuthUid

**State**:
- Has both `passwordHash` and `firebaseAuthUid`
- Legacy state from transition period

**Migration**:
- `passwordHash` is removed on next password reset
- Or can be cleaned up manually via script

## Troubleshooting

### Issue: User can't log in

**Possible causes**:
1. User doesn't have Firebase Auth account
2. Password doesn't match Firebase Auth account
3. Email/password auth not enabled in Firebase Console

**Solution**:
- User should use "Forgot Password" to reset
- Verify email/password auth is enabled in Firebase Console

### Issue: Migration script errors

**Check**:
- Firebase Admin credentials are configured
- Environment variables are set correctly
- Firestore permissions allow reading users collection

### Issue: Password reset doesn't create Firebase Auth account

**Check**:
- Firebase Admin Auth is initialized correctly
- Email/password auth is enabled in Firebase Console
- Check server logs for errors

## Best Practices

1. **Monitor Migration Progress**: Run migration script regularly during transition
2. **User Communication**: Inform users about password reset if needed
3. **Cleanup**: Remove `passwordHash` fields after migration is complete
4. **Testing**: Test password reset flow with legacy users
5. **Documentation**: Keep this guide updated as migration progresses

## Future Cleanup

Once all users are migrated:

1. Remove `passwordHash` field from all user documents
2. Update Firestore security rules to remove any `passwordHash` references
3. Remove migration script (or archive it)
4. Update documentation to reflect Firebase Auth-only authentication

## Related Files

- `api/auth/reset-password.ts` - Password reset endpoint
- `api/auth/forgot-password.ts` - Password reset request endpoint
- `services/firebaseAuth.ts` - Firebase Auth utilities and lazy migration
- `components/Authentication.tsx` - Login/signup UI
- `components/ResetPassword.tsx` - Password reset UI
- `scripts/migrate-password-auth.ts` - Migration analysis script

## Support

If you encounter issues during migration:

1. Check Firebase Console → Authentication → Users
2. Review server logs for errors
3. Run migration script with `--dry-run` to diagnose
4. Verify Firebase Admin credentials are correct

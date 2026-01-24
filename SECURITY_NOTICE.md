# Security Notice: Exposed Credentials

## ⚠️ CRITICAL: Credentials Were Exposed on GitHub

**Date:** January 24, 2026  
**Status:** FIXED - File removed from git tracking, but credentials need to be rotated

## What Was Exposed

The file `functions/.env.meant2grow-dev` was accidentally committed to git and contains the following exposed credentials:

1. **MailerSend API Token**: `mlsn.efd8cc59d84c3d992905f35121134160facce34cb2bfe6b071f9abffa542d5bc`
2. **Mailtrap API Token**: `362e9acbf833a36f42c24cda845fc177`
3. **Google Service Account Email**: `joshua@greenxvii.com`

## What Was Fixed

✅ **Removed from Git Tracking**: The file `functions/.env.meant2grow-dev` has been removed from git tracking  
✅ **Updated .gitignore**: Added explicit rules to prevent future commits of environment files  
✅ **Created Example File**: Added `functions/.env.meant2grow-dev.example` as a template  

## ⚠️ IMMEDIATE ACTION REQUIRED

### 1. Rotate MailerSend API Token (CRITICAL)

**The MailerSend API token is exposed and must be rotated immediately:**

1. Log into MailerSend: https://app.mailersend.com
2. Go to **Settings → API Tokens**
3. **Revoke/Delete** the exposed token: `mlsn.efd8cc59d84c3d992905f35121134160facce34cb2bfe6b071f9abffa542d5bc`
4. Create a **new API token**
5. Update the following locations with the new token:
   - Local: `.env.local` (if using locally)
   - Firebase Functions: `firebase functions:secrets:set MAILERSEND_API_TOKEN`
   - GitHub Secrets: Update `SANDBOX_MAILERSEND_API_TOKEN` and `PROD_MAILERSEND_API_TOKEN` if needed

### 2. Rotate Mailtrap API Token (if still in use)

**Note:** You've migrated to MailerSend, but the old Mailtrap token is still exposed:

1. Log into Mailtrap: https://mailtrap.io
2. Go to **Settings → API Tokens**
3. **Revoke** the exposed token: `362e9acbf833a36f42c24cda845fc177`
4. If you're still using Mailtrap for testing, create a new token

### 3. Review Google Service Account Access

The Google Service Account email `joshua@greenxvii.com` was exposed. While this is just an email address (not a credential), you should:

1. Review who has access to this service account
2. Ensure proper IAM permissions are set
3. Consider rotating service account keys if there are concerns

### 4. Update Local Environment Files

After rotating credentials, update your local environment files:

```bash
# Copy the example file
cp functions/.env.meant2grow-dev.example functions/.env.meant2grow-dev

# Edit and add your new credentials
# (This file is now ignored by git)
```

### 5. Update Firebase Functions Secrets

Update Firebase Functions with the new credentials:

```bash
# Set MailerSend credentials
firebase functions:secrets:set MAILERSEND_API_TOKEN
firebase functions:secrets:set MAILERSEND_FROM_EMAIL
firebase functions:secrets:set MAILERSEND_REPLY_TO_EMAIL
```

### 6. Update GitHub Secrets (if using CI/CD)

If you're using GitHub Actions, update the secrets:

1. Go to your GitHub repository → **Settings → Secrets and variables → Actions**
2. Update:
   - `SANDBOX_MAILERSEND_API_TOKEN`
   - `PROD_MAILERSEND_API_TOKEN`

## Git History Cleanup (Optional but Recommended)

**Note:** The credentials are still visible in git history. If this is a public repository, consider:

1. **Rotate all exposed credentials immediately** (most important)
2. Use `git filter-branch` or BFG Repo-Cleaner to remove the file from history
3. Force push to remote (⚠️ **WARNING**: This rewrites history - coordinate with your team)

**For private repositories:** Rotating credentials is usually sufficient, but consider cleaning history if you plan to make it public.

## Prevention Measures

✅ **Files Now Ignored:**
- `.env.local`
- `.env.production`
- `.env.sandbox`
- `functions/.env.*`
- `functions/.env.meant2grow-dev`
- `functions/.env.meant2grow-prod`

✅ **Example Files Created:**
- `functions/.env.meant2grow-dev.example` (template with placeholders)

## Verification Checklist

- [ ] MailerSend API token rotated
- [ ] Mailtrap API token revoked (if applicable)
- [ ] Firebase Functions secrets updated
- [ ] GitHub Secrets updated (if using CI/CD)
- [ ] Local environment files updated
- [ ] Test email sending functionality
- [ ] Verify no other credentials are exposed

## Questions or Issues?

If you encounter any issues during credential rotation, refer to:
- [MailerSend Migration Guide](./docs/MAILERSEND_MIGRATION.md)
- [Firebase Functions Secrets Documentation](https://firebase.google.com/docs/functions/config-env)

---

**Remember:** Even though the file is removed from git tracking, the credentials remain visible in git history. Rotate them immediately!

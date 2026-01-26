# Fix Service Account Permissions for Firebase Auth

## Problem

When running `npm run set-platform-admin-password`, you see this error:

```
❌ Firebase Auth error: Credential implementation provided to initializeApp() via the "credential" property has insufficient permission to access the requested resource.
```

This means the service account doesn't have permission to manage Firebase Auth users.

## Solution

Grant the service account the **Firebase Admin SDK Administrator Service Agent** role in Google Cloud Console.

### Steps:

1. **Go to Google Cloud Console IAM:**
   - Open: https://console.cloud.google.com/iam-admin/iam?project=meant2grow-dev
   - (Replace `meant2grow-dev` with your project ID if different)

2. **Find the service account:**
   - Look for: `meant2grow-meet-service@meant2grow-dev.iam.gserviceaccount.com`
   - Or search for "meant2grow-meet-service"

3. **Edit the service account:**
   - Click the pencil icon (Edit) next to the service account

4. **Add the required role:**
   - Click **"ADD ANOTHER ROLE"**
   - Search for: `Firebase Admin SDK Administrator Service Agent`
   - Select it from the dropdown
   - Click **"SAVE"**

5. **Wait for propagation:**
   - Wait 30-60 seconds for permissions to propagate

6. **Try again:**
   ```bash
   npm run set-platform-admin-password support@meant2grow.com '!Meant2Grow'
   ```

## Alternative Roles (if the above doesn't work)

If `Firebase Admin SDK Administrator Service Agent` doesn't work, try these roles (in order of preference):

1. **Firebase Admin SDK Administrator Service Agent** (recommended - least privilege)
2. **Firebase Admin** (broader permissions)
3. **Service Account User** + **Firebase Admin** (if needed)

## Verify Permissions

After adding the role, verify it worked:

1. Go back to IAM page
2. Find your service account
3. Verify you see the new role listed

## For Production

If you need to do this for production as well:

1. Switch to production project: https://console.cloud.google.com/iam-admin/iam?project=meant2grow-prod
2. Find: `meant2grow-meet-service@meant2grow-prod.iam.gserviceaccount.com`
3. Add the same role: `Firebase Admin SDK Administrator Service Agent`

## Quick Reference

**Service Account Email Format:**
- Sandbox: `meant2grow-meet-service@meant2grow-dev.iam.gserviceaccount.com`
- Production: `meant2grow-meet-service@meant2grow-prod.iam.gserviceaccount.com`

**Required Role:**
- `Firebase Admin SDK Administrator Service Agent`

**IAM Console Links:**
- Sandbox: https://console.cloud.google.com/iam-admin/iam?project=meant2grow-dev
- Production: https://console.cloud.google.com/iam-admin/iam?project=meant2grow-prod

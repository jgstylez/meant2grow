# How to Access Platform Admin Dashboard

This guide provides step-by-step instructions for creating and accessing the Platform Admin dashboard.

## Step 1: Create a Platform Admin Account

You need to create a platform admin user account first. There are two ways to do this:

### Option A: Using the Script (Recommended for First Admin)

1. **Open your terminal** in the project root directory (`/Users/jgstylez/dev/meant2grow`)

2. **Run the create platform admin script:**
   ```bash
   npm run create:platform-admin <your-email> "Your Name"
   ```
   
   **Example:**
   ```bash
   npm run create:platform-admin admin@meant2grow.com "Platform Admin"
   ```

3. **Verify the account was created:**
   - The script will output a success message
   - You should see: `✅ Platform admin user created successfully!`
   - Note the User ID that's displayed

### Option B: Manual Creation via Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`meant2grow-dev`)
3. Navigate to **Firestore Database**
4. Go to the `users` collection
5. Click **Add document**
6. Set the following fields:
   - `email`: Your email address (e.g., `admin@meant2grow.com`)
   - `name`: Your name (e.g., `Platform Admin`)
   - `role`: `PLATFORM_ADMIN` (must be exactly this)
   - `organizationId`: `platform` (must be exactly this)
   - `avatar`: `https://ui-avatars.com/api/?name=Platform+Admin&background=10b981&color=fff`
   - `title`: `Platform Administrator`
   - `company`: `Meant2Grow`
   - `skills`: `[]` (empty array)
   - `bio`: `Platform administrator for Meant2Grow`
   - `createdAt`: Click the timestamp icon to set current time

## Step 2: Log In to the Platform Admin Dashboard

1. **Start your development server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Open your browser** and navigate to your app (usually `http://localhost:5173`)

3. **Click "Sign In"** on the landing page

4. **Enter your platform admin email** in the email field

5. **Enter any password** (password validation is not implemented yet, so any password will work)

6. **Click "Sign In"**

7. **You should be redirected to the Platform Admin Dashboard**

## Step 3: Verify You're on the Platform Admin Dashboard

When you successfully log in as a platform admin, you should see:

- **Dashboard Header**: "Platform Admin Dashboard" with a globe icon (🌐)
- **Description**: "Manage platform-wide content, resources, and settings"
- **Special Cards**: 
  - Platform Resources card
  - Platform Admin Settings card
- **Navigation Menu**: Should show platform admin-specific options

## Troubleshooting

### Issue: "User not found" error when logging in

**Solution:**
1. Verify the user was created in Firestore:
   - Go to Firebase Console → Firestore → `users` collection
   - Find your email address
   - Check that `role` is exactly `"PLATFORM_ADMIN"` (with quotes)
   - Check that `organizationId` is exactly `"platform"` (lowercase)

2. If the user doesn't exist, create it using Step 1 above

3. If the user exists but has wrong role/organizationId:
   - Edit the document in Firestore
   - Set `role` to `PLATFORM_ADMIN`
   - Set `organizationId` to `platform`
   - Save the changes

### Issue: Logged in but seeing regular dashboard (not platform admin)

**Solution:**
1. **Check your user role in Firestore:**
   - Go to Firebase Console → Firestore → `users` collection
   - Find your user document
   - Verify `role` field is `PLATFORM_ADMIN` (not `ADMIN`)

2. **Clear browser cache and localStorage:**
   - Open browser DevTools (F12)
   - Go to Application tab → Local Storage
   - Clear all localStorage items
   - Refresh the page and log in again

3. **Check browser console for errors:**
   - Open DevTools → Console tab
   - Look for any error messages
   - Check if user data is loading correctly

### Issue: Script fails to run

**Error: "Cannot find module 'ts-node'":**
```bash
npm install --save-dev ts-node dotenv
```

**Error: Firebase connection issues:**
1. Verify `.env.local` exists with correct Firebase credentials
2. Check that `meant2grow-dev-dfcfbc9ebeaa.json` exists in project root
3. Verify Firebase project is initialized: `firebase projects:list`

### Issue: Can't see Platform Admin features after login

**Check:**
1. User role is `PLATFORM_ADMIN` in Firestore
2. `organizationId` is `platform` (not a real organization ID)
3. You've refreshed the page after logging in
4. Browser console shows no errors

## Quick Reference

### Create Platform Admin Command
```bash
npm run create:platform-admin <email> "<name>"
```

### Login Steps
1. Go to app → Click "Sign In"
2. Enter platform admin email
3. Enter any password
4. Click "Sign In"
5. You'll see Platform Admin Dashboard

### Verify Platform Admin Status
- Check Firestore: `users/{userId}` → `role` = `"PLATFORM_ADMIN"`
- Check Firestore: `users/{userId}` → `organizationId` = `"platform"`
- Dashboard should show "Platform Admin Dashboard" header

## What You Can Do as Platform Admin

Once logged in, you can:

1. **Manage Platform Resources:**
   - Create/edit/delete platform-wide discussion guides
   - Create/edit/delete platform-wide career templates
   - Create/edit/delete platform-wide training videos
   - Create/edit/delete blog posts (visible to all organizations)

2. **Manage Platform Admins:**
   - Go to Settings → Platform Admin tab
   - Create new platform admin users

3. **View Platform-Wide Content:**
   - All resources marked as "Platform" scope
   - Blog posts visible to all organizations

## Need Help?

If you're still having issues:

1. Check the browser console (F12 → Console) for errors
2. Verify Firestore data structure matches the requirements
3. Try clearing localStorage and logging in again
4. Check that your Firebase project is properly configured


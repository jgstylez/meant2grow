# How to Access Platform Operator Dashboard

This guide provides step-by-step instructions for creating and accessing the Platform Operator dashboard.

## Step 1: Create a Platform Operator Account

You need to create a platform operator user account first. There are two ways to do this:

### Option A: Using the Script (Recommended for First Admin)

1. **Open your terminal** in the project root directory (`/Users/jgstylez/dev/meant2grow`)

2. **Run the create platform operator script:**
   ```bash
   npm run create:platform-operator <your-email> "Your Name"
   ```
   
   **Example:**
   ```bash
   npm run create:platform-operator operator@meant2grow.com "Platform Operator"
   ```

3. **Verify the account was created:**
   - The script will output a success message
   - You should see: `✅ Platform operator user created successfully!`
   - Note the User ID that's displayed

4. **IMPORTANT: Set a password for the platform operator:**
   ```bash
   npm run set-platform-operator-password <email> "<password>"
   ```
   
   **Example:**
   ```bash
   npm run set-platform-operator-password operator@meant2grow.com "SecurePassword123"
   ```
   
   **Password Requirements:**
   - At least 8 characters long
   - Contains at least one lowercase letter
   - Contains at least one uppercase letter
   - Contains at least one number
   
   **Note:** This step is REQUIRED. Without setting a password, you won't be able to log in.

### Option B: Manual Creation via Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`meant2grow-dev`)
3. Navigate to **Firestore Database**
4. Go to the `users` collection
5. Click **Add document**
6. Set the following fields:
   - `email`: Your email address (e.g., `admin@meant2grow.com`)
   - `name`: Your name (e.g., `Platform Operator`)
   - `role`: `PLATFORM_OPERATOR` (must be exactly this)
   - `organizationId`: `platform` (must be exactly this)
   - `avatar`: `https://ui-avatars.com/api/?name=Platform+Operator&background=10b981&color=fff`
   - `title`: `Platform Operator`
   - `company`: `Meant2Grow`
   - `skills`: `[]` (empty array)
   - `bio`: `Platform operator for Meant2Grow`
   - `createdAt`: Click the timestamp icon to set current time

## Step 2: Set Password for Platform Operator

**⚠️ IMPORTANT: You MUST set a password before you can log in.**

After creating the platform operator account, you need to set a password:

```bash
npm run set-platform-operator-password <email> "<password>"
```

**Example:**
```bash
npm run set-platform-operator-password operator@meant2grow.com "SecurePassword123"
```

**Password Requirements:**
- At least 8 characters long
- Contains at least one lowercase letter
- Contains at least one uppercase letter
- Contains at least one number

**Note:** If you skip this step, login will fail with an authentication error.

## Step 3: Log In to the Platform Operator Dashboard

1. **Start your development server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Open your browser** and navigate to your app (usually `http://localhost:5173`)

3. **Click "Sign In"** on the landing page

4. **Enter your platform operator email** in the email field

5. **Enter the password you set in Step 2**

6. **Click "Sign In"**

7. **You should be redirected to the Platform Operator Dashboard**

## Step 4: Verify You're on the Platform Operator Dashboard

When you successfully log in as a platform operator, you should see:

- **Dashboard Header**: "Platform Operator Dashboard" with a globe icon (🌐)
- **Description**: "Manage platform-wide content, resources, and settings"
- **Special Cards**: 
  - Platform Resources card
  - Platform Operator Settings card
- **Navigation Menu**: Should show platform operator-specific options

**Note:** Platform operators do NOT have automatic access to "Mentors Circle" or "Mentees Hub" chat groups. They must be explicitly invited to these groups if access is needed.

## Troubleshooting

### Issue: "User not found" error when logging in

**Solution:**
1. Verify the user was created in Firestore:
   - Go to Firebase Console → Firestore → `users` collection
   - Find your email address
   - Check that `role` is exactly `"PLATFORM_OPERATOR"` (with quotes)
   - Check that `organizationId` is exactly `"platform"` (lowercase)

2. If the user doesn't exist, create it using Step 1 above

3. If the user exists but has wrong role/organizationId:
   - Edit the document in Firestore
   - Set `role` to `PLATFORM_OPERATOR`
   - Set `organizationId` to `platform`
   - Save the changes

### Issue: "Password is required" or "Incorrect password" error when logging in

**Solution:**
1. **Make sure you set a password first:**
   ```bash
   npm run set-platform-operator-password <email> "<password>"
   ```

2. **Verify Firebase Auth account exists:**
   - Go to Firebase Console → Authentication
   - Check if your email appears in the users list
   - If not, run the `set-platform-operator-password` script

3. **Check the password:**
   - Make sure you're using the exact password you set via the script
   - Passwords are case-sensitive

4. **If password was forgotten:**
   - Use the "Forgot Password" link on the login page
   - Or reset it via the script:
     ```bash
     npm run set-platform-operator-password <email> "<new-password>"
     ```

### Issue: Logged in but seeing regular dashboard (not platform operator)

**Solution:**
1. **Check your user role in Firestore:**
   - Go to Firebase Console → Firestore → `users` collection
   - Find your user document
   - Verify `role` field is `PLATFORM_OPERATOR` (not `ADMIN`)

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

### Issue: Can't see Platform Operator features after login

**Check:**
1. User role is `PLATFORM_OPERATOR` in Firestore
2. `organizationId` is `platform` (not a real organization ID)
3. You've refreshed the page after logging in
4. Browser console shows no errors

## Quick Reference

### Create Platform Operator Command
```bash
npm run create:platform-operator <email> "<name>"
```

### Setup Steps
1. Create platform operator: `npm run create:platform-operator <email> "<name>"`
2. Set password: `npm run set-platform-operator-password <email> "<password>"`
3. Go to app → Click "Sign In"
4. Enter platform operator email
5. Enter the password you set
6. Click "Sign In"
7. You'll see Platform Operator Dashboard

### Verify Platform Operator Status
- Check Firestore: `users/{userId}` → `role` = `"PLATFORM_OPERATOR"`
- Check Firestore: `users/{userId}` → `organizationId` = `"platform"`
- Dashboard should show "Platform Operator Dashboard" header

## What You Can Do as Platform Operator

Once logged in, you can:

1. **Manage Platform Resources:**
   - Create/edit/delete platform-wide discussion guides
   - Create/edit/delete platform-wide career templates
   - Create/edit/delete platform-wide training videos
   - Create/edit/delete blog posts (visible to all organizations)

2. **Manage Platform Operators:**
   - Go to Operators page (in left navigation menu)
   - Create new platform operator users

3. **View Platform-Wide Content:**
   - All resources marked as "Platform" scope
   - Blog posts visible to all organizations

4. **Chat Groups Access:**
   - Platform operators do NOT automatically have access to "Mentors Circle" or "Mentees Hub"
   - Must be explicitly invited by an organization admin to access these groups

## Need Help?

If you're still having issues:

1. Check the browser console (F12 → Console) for errors
2. Verify Firestore data structure matches the requirements
3. Try clearing localStorage and logging in again
4. Check that your Firebase project is properly configured

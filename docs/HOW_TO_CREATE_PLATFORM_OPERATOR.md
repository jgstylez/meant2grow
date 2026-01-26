# How to Create a Platform Operator

This guide provides step-by-step instructions for creating new Platform Operator accounts.

**Note:** "Platform Operator" is the preferred terminology throughout this documentation. The role value stored in the database is `PLATFORM_OPERATOR`.

## Prerequisites

- You must already be a Platform Operator to create new Platform Operators via the UI
- For script-based creation, you need access to the project's Firebase credentials
- The new Platform Operator will need a password set before they can sign in

## Method 1: Using the UI (Recommended for Existing Platform Operators)

This is the easiest method if you're already logged in as a Platform Operator.

### Steps:

1. **Log in** to the application as a Platform Operator

2. **Navigate to Platform Operator Management:**
   - Click **"Operators"** in the left navigation menu, OR
   - Go to Dashboard → Click **"Create Platform Operator"** in Quick Actions

3. **Fill in the form:**
   - **Email Address**: Enter the new Platform Operator's email (e.g., `operator@meant2grow.com`)
   - **Full Name**: Enter their full name (e.g., `Jane Doe`)

4. **Click "Create Platform Operator"**

5. **Set the password** (required before they can sign in):
   ```bash
   npm run set-platform-operator-password <email> <password>
   ```
   
   Example:
   ```bash
   npm run set-platform-operator-password operator@meant2grow.com "SecurePassword123"
   ```
   
   **Important:** If your password contains special characters (especially `!`), use single quotes instead of double quotes to prevent shell expansion:
   ```bash
   npm run set-platform-operator-password operator@meant2grow.com '!SecurePassword123'
   ```

6. **Verify creation:**
   - The new Platform Operator should appear in the list
   - They can now sign in with their email and password

### Notes:
- If a user with that email already exists, their role will be updated to Platform Operator
- The new Platform Operator will need to verify their email address if email verification is enabled

---

## Method 2: Using the Script (Recommended for First Platform Operator)

Use this method when creating the very first Platform Operator, or when you don't have UI access.

### Steps:

1. **Open your terminal** in the project root directory (`/Users/jgstylez/dev/meant2grow`)

2. **Switch to the correct Firebase environment** (if needed):
   ```bash
   # For sandbox (default)
   firebase use sandbox
   
   # For production
   firebase use production
   ```
   
   **Note:** The script defaults to **sandbox** (`meant2grow-dev`). If you want to create a Platform Operator in production, run `firebase use production` first.

3. **Run the create Platform Operator script:**
   ```bash
   npm run create:platform-operator <email> "<name>"
   ```
   
   **Example:**
   ```bash
   npm run create:platform-operator operator@meant2grow.com "Jane Doe"
   ```

4. **Verify the account was created:**
   - The script will output a success message
   - You should see: `✅ Platform operator user created successfully!`
   - Check the project ID shown - it should match your intended environment (sandbox or production)
   - Note the User ID that's displayed

5. **Set the password** (required before they can sign in):
   ```bash
   npm run set-platform-operator-password <email> <password>
   ```
   
   Example:
   ```bash
   npm run set-platform-operator-password operator@meant2grow.com "SecurePassword123"
   ```
   
   **Important:** 
   - If your password contains special characters (especially `!`), use single quotes instead of double quotes to prevent shell expansion:
     ```bash
     npm run set-platform-operator-password operator@meant2grow.com '!SecurePassword123'
     ```
   - Make sure you're using the same Firebase environment as when you created the user (run `firebase use sandbox` or `firebase use production` first)

### Password Requirements:
- At least 8 characters long
- Contains at least one lowercase letter
- Contains at least one uppercase letter
- Contains at least one number

### Troubleshooting Script Issues:

**Error: "Cannot find module 'ts-node'":**
```bash
npm install --save-dev ts-node dotenv
```

**Error: Firebase connection issues:**
1. Verify `.env.local` exists with correct Firebase credentials
2. Check that service account JSON file exists in project root:
   - `meant2grow-prod-0587fbfd09ba.json` (production)
   - `meant2grow-dev-dfcfbc9ebeaa.json` (development)
3. Verify Firebase project is initialized: `firebase projects:list`

**Error: Permission Denied:**
- The service account needs Firestore permissions
- See the script output for detailed instructions on fixing permissions

---

## Method 3: Manual Creation via Firebase Console

Use this method only if the other methods are unavailable.

### Steps:

1. **Go to Firebase Console:**
   - Navigate to [Firebase Console](https://console.firebase.google.com/)
   - Select your project (`meant2grow-dev` or `meant2grow-prod`)

2. **Navigate to Firestore Database:**
   - Click **Firestore Database** in the left menu
   - Go to the `users` collection

3. **Create a new document:**
   - Click **Add document**
   - Set the following fields:
     - `email`: Platform Operator's email (e.g., `operator@meant2grow.com`)
     - `name`: Their full name (e.g., `Jane Doe`)
     - `role`: `PLATFORM_OPERATOR` (must be exactly this, case-sensitive)
     - `organizationId`: `platform` (must be exactly this, lowercase)
     - `avatar`: `https://ui-avatars.com/api/?name=Jane+Doe&background=10b981&color=fff`
     - `title`: `Platform Operator`
     - `company`: `Meant2Grow`
     - `skills`: `[]` (empty array)
     - `bio`: `Platform operator for Meant2Grow`
     - `createdAt`: Click the timestamp icon to set current time

4. **Save the document**

5. **Set the password** (required before they can sign in):
   ```bash
   npm run set-platform-operator-password <email> <password>
   ```

---

## Complete Setup Workflow

After creating a Platform Operator account, complete the setup:

### 1. Create the Platform Operator
Choose one of the three methods above.

### 2. Set the Password
```bash
npm run set-platform-operator-password <email> <password>
```

### 3. Verify Account Creation
Check that the user exists in Firestore with:
- `role` = `PLATFORM_OPERATOR`
- `organizationId` = `platform`
- `email` = correct email address

### 4. Test Sign-In
1. Go to the application login page
2. Enter the Platform Operator's email
3. Enter the password you set
4. Click "Sign In"
5. Verify they see the Platform Operator Dashboard

---

## Updating Platform Operator Credentials

### Update Email:
```bash
npm run update-platform-operator-email <old-email> <new-email>
```

### Update Password:
```bash
npm run set-platform-operator-password <email> <new-password>
```

**Note:** If your password contains special characters (especially `!`), use single quotes:
```bash
npm run set-platform-operator-password <email> '!PasswordWithSpecialChars'
```

### Update via UI:
1. Go to Platform Operator Management
2. Click the edit icon next to the Platform Operator
3. Update name or email
4. Click "Save Changes"
5. If updating email, also run the email update script to sync Firebase Auth

---

## Platform Operator Capabilities

Once created and logged in, Platform Operators can:

1. **Manage Platform Resources:**
   - Create/edit/delete platform-wide discussion guides
   - Create/edit/delete platform-wide career templates
   - Create/edit/delete platform-wide training videos
   - Create/edit/delete blog posts (visible to all organizations)

2. **Manage Platform Operators:**
   - Create new Platform Operator accounts
   - Edit existing Platform Operator information
   - Delete Platform Operator accounts (cannot delete self)

3. **Manage All Users:**
   - View all users across all organizations
   - Edit user information
   - Impersonate users (for support purposes)

4. **View Platform-Wide Analytics:**
   - Platform metrics and statistics
   - Organization overviews
   - User activity across the platform

**Note:** Platform Operators do NOT automatically have access to "Mentors Circle" or "Mentees Hub" chat groups. They must be explicitly invited by an organization admin if access is needed.

---

## Quick Reference

### Create Platform Operator Commands

**Via Script:**
```bash
npm run create:platform-operator <email> "<name>"
```

**Set Password:**
```bash
npm run set-platform-operator-password <email> <password>
```

**Update Email:**
```bash
npm run update-platform-operator-email <old-email> <new-email>
```

### Verify Platform Operator Status

Check Firestore document `users/{userId}`:
- `role` = `"PLATFORM_OPERATOR"`
- `organizationId` = `"platform"`
- `email` = correct email address

### Access Platform Operator Management

- **Navigation**: Click "Operators" in left sidebar (Platform Operators only)
- **Dashboard**: Click "Create Platform Operator" in Quick Actions
- **Direct URL**: Navigate to `platform-operator-management` page

---

## Troubleshooting

### Issue: Platform Operator can't sign in

**Check:**
1. Password was set using `set-platform-operator-password` script
2. Email address is correct (case-insensitive)
3. User exists in Firestore with correct role
4. Firebase Auth account exists (check `firebaseAuthUid` field in Firestore)

**Solution:**
```bash
npm run set-platform-operator-password <email> <password>
```

### Issue: Platform Operator sees regular dashboard instead of Platform Operator Dashboard

**Check:**
1. User role in Firestore is `PLATFORM_OPERATOR` (not `ADMIN`)
2. `organizationId` is `platform` (lowercase)
3. Browser cache/localStorage cleared
4. User signed out and signed back in

**Solution:**
1. Verify Firestore document has correct `role` and `organizationId`
2. Clear browser localStorage
3. Sign out and sign back in

### Issue: Can't access Platform Operator Management page

**Check:**
1. Current user is a Platform Operator
2. Not impersonating another user (impersonation hides Platform Operator features)

**Solution:**
1. Verify your role in Firestore
2. End any active impersonation sessions
3. Sign out and sign back in

---

## Need Help?

If you're still having issues:

1. Check the browser console (F12 → Console) for errors
2. Verify Firestore data structure matches the requirements
3. Try clearing localStorage and logging in again
4. Check that your Firebase project is properly configured
5. Review the script output for detailed error messages

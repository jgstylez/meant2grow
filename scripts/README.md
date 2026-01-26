# Migration Scripts

This directory contains utility scripts for managing platform resources and admin users.

## Prerequisites

1. Install dependencies:
```bash
npm install
```

2. Ensure `.env.local` is configured with Firebase credentials

## Scripts

### 1. Migrate Platform Resources

Seeds Firestore with platform-wide discussion guides, career templates, and training videos.

```bash
npm run migrate:platform-resources
```

This will create:
- 5 Discussion Guides (platform-wide)
- 5 Career Templates (platform-wide)
- 4 Training Videos (platform-wide)

**Note:** Running this script multiple times will create duplicate entries. To avoid duplicates, check Firestore first or delete existing platform resources.

### 2. Create Platform Operator

Creates a new platform operator user or updates an existing user to platform operator role.

**Note:** "Platform Operator" is the preferred terminology. The role value stored in the database is `PLATFORM_OPERATOR`.

```bash
npm run create:platform-operator <email> <name>
```

**Example:**
```bash
npm run create:platform-operator operator@meant2grow.com "Jane Doe"
```

**What it does:**
- Creates a new user with `PLATFORM_OPERATOR` role (stored in database)
- If user already exists, updates their role to `PLATFORM_OPERATOR`
- Sets `organizationId` to `'platform'` (distinguishes from organization administrators)

**Important:** After creating a platform operator user, you must:
1. Set a password using: `npm run set-platform-operator-password <email> <password>`
2. The user can then sign in through the app using their email and password

## Manual Steps

### Creating Platform Operators via Firebase Console

Alternatively, you can manually create platform operator users:

1. Go to Firebase Console → Firestore
2. Navigate to `users` collection
3. Create a new document with:
   ```json
   {
     "email": "operator@meant2grow.com",
     "name": "Platform Operator",
     "role": "PLATFORM_OPERATOR",
     "organizationId": "platform",
     "avatar": "https://ui-avatars.com/api/?name=Platform+Operator&background=10b981&color=fff",
     "title": "Platform Operator",
     "company": "Meant2Grow",
     "skills": [],
     "bio": "Platform operator for Meant2Grow",
     "createdAt": [current timestamp]
   }
   ```

**Note:** After manual creation, set a password using: `npm run set-platform-operator-password <email> <password>`

## Troubleshooting

### Script fails with "Cannot find module"

Make sure you've installed dependencies:
```bash
npm install
```

### Script fails with Firebase errors

1. Check that `.env.local` exists and has correct Firebase config
2. Verify Firebase project is initialized: `firebase projects:list`
3. Ensure Firestore is enabled in Firebase Console

### Duplicate resources created

If you run the migration script multiple times, you'll get duplicates. You can:
1. Delete duplicates manually in Firestore Console
2. Or modify the script to check for existing resources before creating


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

### 2. Create Platform Admin

Creates a new platform admin user or updates an existing user to platform admin role.

```bash
npm run create:platform-admin <email> <name>
```

**Example:**
```bash
npm run create:platform-admin admin@meant2grow.com "Platform Admin"
```

**What it does:**
- Creates a new user with `PLATFORM_ADMIN` role
- If user already exists, updates their role to `PLATFORM_ADMIN`
- Sets `organizationId` to `'platform'` (placeholder)

**Important:** After creating a platform admin user, they will need to:
1. Sign in through the app using their email
2. The authentication system will need to recognize their email and assign the correct role

## Manual Steps

### Creating Platform Admins via Firebase Console

Alternatively, you can manually create platform admin users:

1. Go to Firebase Console → Firestore
2. Navigate to `users` collection
3. Create a new document with:
   ```json
   {
     "email": "admin@meant2grow.com",
     "name": "Platform Admin",
     "role": "PLATFORM_ADMIN",
     "organizationId": "platform",
     "avatar": "https://ui-avatars.com/api/?name=Platform+Admin&background=10b981&color=fff",
     "title": "Platform Administrator",
     "company": "Meant2Grow",
     "skills": [],
     "bio": "Platform administrator for Meant2Grow",
     "createdAt": [current timestamp]
   }
   ```

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


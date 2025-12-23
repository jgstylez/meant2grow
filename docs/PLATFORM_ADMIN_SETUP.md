# Platform Admin Setup & Testing Guide

This guide covers setting up platform admin users, migrating platform resources, and testing the new features.

## Prerequisites

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   - Ensure `.env.local` exists with Firebase credentials
   - Verify Firestore is enabled in Firebase Console

## Step 1: Create Platform Admin Users

### Option A: Using the Script (Recommended)

```bash
npm run create:platform-admin <email> <name>
```

**Example:**
```bash
npm run create:platform-admin admin@meant2grow.com "Platform Admin"
```

### Option B: Using the UI (After first admin is created)

1. Sign in as a platform admin
2. Go to Settings → Platform Admin tab
3. Enter email and name
4. Click "Create Platform Admin"

### Option C: Manual Creation via Firebase Console

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

## Step 2: Migrate Platform Resources

Run the migration script to seed Firestore with platform-wide resources:

```bash
npm run migrate:platform-resources
```

This creates:
- **5 Discussion Guides** (platform-wide)
- **5 Career Templates** (platform-wide)
- **4 Training Videos** (platform-wide)

**Note:** Running this multiple times will create duplicates. Check Firestore first or delete existing platform resources.

## Step 3: Testing Checklist

### 3.1 Platform Admin Features

#### ✅ Blog Post Management
- [ ] Sign in as Platform Admin
- [ ] Navigate to Resources → Manage Library
- [ ] Verify "Public Blog" tab is visible
- [ ] Create a new blog post
- [ ] Edit an existing blog post
- [ ] Delete a blog post
- [ ] Toggle publish/unpublish status
- [ ] Verify blog posts appear on public landing page

#### ✅ Platform Resource Management
- [ ] In Resources → Manage Library, verify tabs:
  - [ ] Discussion Guides
  - [ ] Career Templates
  - [ ] Training Videos
- [ ] Create a new platform-wide discussion guide
- [ ] Create a new platform-wide template
- [ ] Create a new platform-wide video
- [ ] Verify "Platform" scope option is available when creating resources

#### ✅ Platform Admin Settings
- [ ] Go to Settings → Platform Admin tab
- [ ] Verify tab is only visible to Platform Admins
- [ ] Create a new platform admin user
- [ ] Verify success message appears
- [ ] Check Firestore to confirm user was created with `PLATFORM_ADMIN` role

### 3.2 Organization Admin Features

#### ✅ Organization Resource Management
- [ ] Sign in as Organization Admin (regular ADMIN role)
- [ ] Navigate to Resources → Manage Library
- [ ] Verify tabs available:
  - [ ] Recommended Reading
  - [ ] Discussion Guides
  - [ ] Career Templates
  - [ ] Training Videos
- [ ] Verify "Public Blog" tab is NOT visible
- [ ] Create an organization-specific discussion guide
- [ ] Create an organization-specific template
- [ ] Create an organization-specific video
- [ ] Verify "Organization Only" scope is selected (platform scope not available)

### 3.3 Resource Filtering

#### ✅ Discussion Guides Filtering
- [ ] Navigate to Resources → Discussion Guides
- [ ] Verify filter buttons: "All", "Platform", "Organization"
- [ ] Click "All" - should show both platform and org guides
- [ ] Click "Platform" - should show only platform guides with "Platform" badge
- [ ] Click "Organization" - should show only org guides
- [ ] Verify platform guides have "Platform" badge in top-right corner

#### ✅ Templates Filtering
- [ ] Navigate to Resources → Career Templates
- [ ] Test filtering: All / Platform / Organization
- [ ] Verify platform templates show "Platform" badge

#### ✅ Videos Filtering
- [ ] Navigate to Resources → Training Videos
- [ ] Test filtering: All / Platform / Organization
- [ ] Verify platform videos show "Platform" badge

### 3.4 Regular User Experience

#### ✅ Viewing Resources
- [ ] Sign in as regular user (MENTOR or MENTEE)
- [ ] Navigate to Resources
- [ ] Verify can see all resources (platform + organization)
- [ ] Verify filtering works
- [ ] Verify "Manage Library" button is NOT visible
- [ ] Click on a discussion guide - should open detail view
- [ ] Click on a template - should open detail view with editing capability
- [ ] Click on a video - should open detail view

### 3.5 Cross-Organization Testing

#### ✅ Platform Resources Visibility
- [ ] Create resources in Organization A
- [ ] Sign in to Organization B
- [ ] Verify Organization B can see:
  - [ ] Platform resources (yes)
  - [ ] Organization A resources (no)
  - [ ] Organization B resources (yes)

## Step 4: Verification

### Check Firestore Collections

Verify the following collections exist and have data:

1. **blogPosts**
   - Should contain blog posts
   - No `organizationId` field (platform-wide)

2. **discussionGuides**
   - Should contain guides with `isPlatform: true` (platform)
   - May contain guides with `isPlatform: false` (organization-specific)

3. **careerTemplates**
   - Should contain templates with `isPlatform: true` (platform)
   - May contain templates with `isPlatform: false` (organization-specific)

4. **trainingVideos**
   - Should contain videos with `isPlatform: true` (platform)
   - May contain videos with `isPlatform: false` (organization-specific)

5. **users**
   - Should contain users with `role: "PLATFORM_ADMIN"`
   - Should contain users with `role: "ADMIN"` (organization admins)

## Troubleshooting

### Script Fails to Run

**Error:** "Cannot find module 'ts-node'"
```bash
npm install --save-dev ts-node dotenv
```

**Error:** Firebase connection issues
- Verify `.env.local` has correct Firebase config
- Check Firebase project is initialized: `firebase projects:list`
- Ensure Firestore is enabled

### Resources Not Showing

1. **Check Firestore Rules**
   - Verify rules allow read access to new collections
   - Deploy rules: `firebase deploy --only firestore:rules`

2. **Check Data Structure**
   - Verify `isPlatform` field exists and is boolean
   - Verify `organizationId` is set correctly

3. **Check Browser Console**
   - Look for Firestore query errors
   - Check network tab for failed requests

### Platform Admin Tab Not Visible

1. **Verify User Role**
   - Check Firestore: `users/{userId}` → `role` should be `"PLATFORM_ADMIN"`
   - Sign out and sign back in to refresh role

2. **Check SettingsView Component**
   - Verify `isPlatformAdmin` check is working
   - Check browser console for errors

### Filtering Not Working

1. **Check Resource Data**
   - Verify `isPlatform` field exists on all resources
   - Check that filtering logic in Resources component is correct

2. **Test Filter Functions**
   - Check browser console for filter function errors
   - Verify `getFilteredGuides()`, `getFilteredTemplates()`, `getFilteredVideos()` work

## Next Steps

After successful testing:

1. ✅ Create production platform admin users
2. ✅ Migrate production resources
3. ✅ Set up proper Firestore security rules (replace `allow read, write: if true`)
4. ✅ Document platform admin workflows for your team
5. ✅ Set up monitoring/alerts for platform admin activities

## Quick Reference

### Scripts
```bash
# Create platform admin
npm run create:platform-admin <email> <name>

# Migrate platform resources
npm run migrate:platform-resources
```

### Firestore Collections
- `blogPosts` - Platform-wide blog posts
- `discussionGuides` - Discussion guides (platform + org)
- `careerTemplates` - Career templates (platform + org)
- `trainingVideos` - Training videos (platform + org)
- `users` - All users (check `role` field)

### Roles
- `PLATFORM_ADMIN` - Can manage platform-wide content
- `ADMIN` - Can manage organization-specific content
- `MENTOR` / `MENTEE` - Can view all resources


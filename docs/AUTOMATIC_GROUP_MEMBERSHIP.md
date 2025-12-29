# Automatic Chat Group Membership

## Overview
Mentors Circle and Mentees Hub are **preset, persistent groups** that automatically manage membership based on user roles.

## How It Works

### Group Creation
- **Mentors Circle** (ID: `g-mentors`) - Created automatically when first mentor joins
- **Mentees Hub** (ID: `g-mentees`) - Created automatically when first mentee joins

### Automatic Membership Sync
The system automatically:
1. **Adds new mentors** to Mentors Circle when they sign up
2. **Adds new mentees** to Mentees Hub when they sign up
3. **Updates membership** whenever users change (role changes, new signups, etc.)
4. **Removes users** if they're no longer mentors/mentees

## Implementation

### Location
`components/Chat.tsx` - Lines 77-140

### Logic Flow
```typescript
1. Load existing groups from Firestore (filtered by organizationId)
2. Filter users to only include those from the current organization (u.organizationId === organizationId)
3. Get all current mentors from organization's user list
4. Get all current mentees from organization's user list
5. Get all organization admins from organization's user list (exclude platform operators)

6. For Mentors Circle:
   - If doesn't exist → Create with all mentors + organization admins (from THIS organization only)
   - If exists → Compare members and update if needed
   - Preserve platform operators who were explicitly added (don't auto-add new ones)
   - CRITICAL: Only users from the group's organization are included

7. For Mentees Hub:
   - If doesn't exist → Create with all mentees + organization admins (from THIS organization only)
   - If exists → Compare members and update if needed
   - Preserve platform operators who were explicitly added (don't auto-add new ones)
   - CRITICAL: Only users from the group's organization are included
```

### When Sync Happens
- On component mount (first chat page load)
- When user list changes (new signup, role change)
- When organization changes

## User Experience

### For Mentors
- Sign up as mentor
- Navigate to "Messages" or "Mentors Circle"
- See Mentors Circle in chat list
- Can chat with all other mentors

### For Mentees
- Sign up as mentee
- Navigate to "Messages" or "Mentees Hub"
- See Mentees Hub in chat list
- Can chat with all other mentees

### For Organization Admins
- See both groups in chat list
- Can access both Mentors Circle and Mentees Hub
- Can monitor conversations

### For Platform Operators
- **No automatic access** to Mentors Circle or Mentees Hub
- Must be explicitly invited as a member to access these groups
- If invited, will see the group in chat list and can participate

## Group Details

### Mentors Circle
- **ID**: `g-mentors` (fixed)
- **Name**: "Mentors Circle"
- **Avatar**: Teal background with initials
- **Members**: All users with `role === 'MENTOR'` + Organization Admins (auto-added) **from the same organization**
- **Access**: Mentors and Organization Admins only (Platform Operators must be explicitly invited)
- **Organization Scoping**: Only includes mentors and admins from the group's `organizationId`

### Mentees Hub
- **ID**: `g-mentees` (fixed)
- **Name**: "Mentees Hub"
- **Avatar**: Indigo background with initials
- **Members**: All users with `role === 'MENTEE'` + Organization Admins (auto-added) **from the same organization**
- **Access**: Mentees and Organization Admins only (Platform Operators must be explicitly invited)
- **Organization Scoping**: Only includes mentees and admins from the group's `organizationId`

## Database Structure

### Firestore Collection: `chatGroups`
```typescript
{
  id: 'g-mentors',  // Fixed ID
  organizationId: 'org-123',
  name: 'Mentors Circle',
  avatar: 'https://...',
  type: 'group',
  members: ['user1', 'user2', 'user3'],  // Auto-synced
  createdBy: 'admin-user-id',
  createdAt: Timestamp
}
```

## Console Logging

The system logs sync operations:
```
✅ Created Mentors Circle group
✅ Updated Mentors Circle membership: 5 mentors
✅ Created Mentees Hub group
✅ Updated Mentees Hub membership: 12 mentees
❌ Error syncing chat groups: [error details]
```

## Edge Cases Handled

### No Mentors Yet
- Mentors Circle created when first mentor signs up
- Empty group not created

### No Mentees Yet
- Mentees Hub created when first mentee signs up
- Empty group not created

### User Role Changes
- If mentor becomes mentee: Removed from Mentors Circle, added to Mentees Hub
- If mentee becomes mentor: Removed from Mentees Hub, added to Mentors Circle

### Organization Isolation (CRITICAL)
- **Each organization has its own separate groups** - Groups are scoped by `organizationId`
- **Users are automatically filtered by organization** - Only users from the same organization are added to groups
- **Example**: If Joe signs up as a mentee under organization "123", he will:
  - Automatically be added to "Mentees Hub" for organization "123"
  - **NOT** have access to "Mentees Hub" for organization "321"
  - Only see and interact with mentees from organization "123"
- **Organization Admins**: Admins for organization "123" have access to both groups under organization "123", but **NOT** groups from organization "321"
- **Platform Operators**: Can be explicitly added to any organization's groups, but are not automatically added

## Benefits

1. **Zero Manual Setup** - Groups created automatically
2. **Always Current** - Membership stays in sync
3. **Reliable IDs** - Fixed IDs (`g-mentors`, `g-mentees`) enable direct navigation
4. **Scalable** - Works for 2 users or 2000 users
5. **Self-Healing** - Corrects membership if out of sync

## Testing Checklist

### Basic Functionality
- [ ] Sign up as first mentor → Mentors Circle created
- [ ] Sign up as second mentor → Added to existing Mentors Circle
- [ ] Sign up as first mentee → Mentees Hub created
- [ ] Sign up as second mentee → Added to existing Mentees Hub
- [ ] Navigate to Mentors Circle → See all mentors
- [ ] Navigate to Mentees Hub → See all mentees
- [ ] Organization Admin user → See both groups
- [ ] Platform Operator user → Don't see groups unless explicitly invited
- [ ] Mentor user → Only see Mentors Circle
- [ ] Mentee user → Only see Mentees Hub

### Organization Isolation (CRITICAL)
- [ ] Create mentee "Joe" in organization "123" → Joe added to org "123" Mentees Hub
- [ ] Create mentee "Jane" in organization "321" → Jane added to org "321" Mentees Hub
- [ ] Verify Joe cannot see/access org "321" Mentees Hub
- [ ] Verify Jane cannot see/access org "123" Mentees Hub
- [ ] Create org admin "Admin123" for organization "123" → Admin123 has access to both groups under org "123"
- [ ] Verify Admin123 cannot see/access groups from organization "321"
- [ ] Create mentor "Mentor123" in organization "123" → Mentor123 added to org "123" Mentors Circle
- [ ] Verify Mentor123 cannot see/access org "321" Mentors Circle

## Future Enhancements

1. **Welcome Messages** - Auto-send welcome message when user joins
2. **Group Announcements** - Pin important messages
3. **Group Settings** - Allow admins to customize names/avatars
4. **Subgroups** - Create topic-specific subgroups
5. **Group Archives** - Archive old conversations
6. **Member Count Badge** - Show member count in sidebar


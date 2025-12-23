# Firestore Database Access & Optimization Guide

This document outlines the database structure, access patterns, and indexing strategy for the Meant2Grow application. It serves as a reference for understanding how data is utilized and optimized for performance.

## 1. Data Structure Overview

The application uses Cloud Firestore with the following primary collections:

*   **`organizations`**: Stores organization details, settings, and subscription status.
*   **`users`**: Stores user profiles, roles, and organization affiliation.
*   **`matches`**: Links mentors and mentees within an organization.
*   **`goals`**: Tracks mentorship goals and their progress.
*   **`ratings`**: Stores feedback and mood ratings.
*   **`resources`**: Educational or program resources for organizations.
*   **`calendarEvents`**: Scheduled meetings and events.
*   **`notifications`**: In-app user notifications.
*   **`invitations`**: Email invitations sent to potential users.
*   **`chatMessages`** & **`chatGroups`**: Messaging system data.
*   **`blogPosts`**: Platform-wide content.
*   **`discussionGuides`, `careerTemplates`, `trainingVideos`**: Content libraries (both platform-wide and organization-specific).

## 2. Access Patterns & Read/Write Operations

The application primarily uses `services/database.ts` for client-side operations. Key patterns include:

### Organization-Scoped Reads
Most data is siloed by `organizationId`. Queries almost always filter by `organizationId` first.
*   **Pattern**: `collection(X).where('organizationId', '==', orgId).orderBy('field', 'desc')`
*   **Optimization**: Requires composite indexes on `organizationId` + `orderByField`.

### User-Scoped Reads
Data specific to a user within an organization.
*   **Pattern**: `collection(X).where('organizationId', '==', orgId).where('userId', '==', uid).orderBy('field', 'desc')`
*   **Optimization**: Requires composite indexes on `organizationId` + `userId` + `orderByField` to allow efficient sorting and filtering.

### Platform vs. Organization Content
Content types like Discussion Guides use a hybrid access pattern:
*   **Read All**: `collection(X).orderBy('createdAt', 'desc')` (filtered in memory for complex OR logic).
*   **Read Platform**: `where('isPlatform', '==', true)`
*   **Read Org**: `where('isPlatform', '==', false).where('organizationId', '==', orgId)`

### Real-time Listeners
Real-time updates are heavily used for:
*   Chat messages (instant communication).
*   User lists (admin dashboard).
*   Notifications.

**Write Operations**:
*   Most writes are simple `setDoc` (create) or `updateDoc` (patch).
*   `deleteDoc` is used for cleanup.

## 3. Indexing Strategy (`firestore.indexes.json`)

To support the above patterns and ensure query performance (avoiding client-side filtering where possible), the following composite indexes have been configured:

### Core Indexes
| Collection | Fields (Filter + Sort) | Purpose |
| :--- | :--- | :--- |
| `users` | `organizationId` (ASC), `createdAt` (DESC) | Sorting member lists by newest. |
| `matches` | `organizationId` (ASC), `startDate` (DESC) | Showing recent matches. |
| `goals` | `organizationId` (ASC), `dueDate` (ASC) | Upcoming goals for the org. |
| `goals` | `organizationId` (ASC), `userId` (ASC), `dueDate` (ASC) | Upcoming goals for a specific user. |
| `resources` | `organizationId` (ASC), `createdAt` (DESC) | Newest resources first. |

### Communication Indexes
| Collection | Fields | Purpose |
| :--- | :--- | :--- |
| `chatMessages` | `organizationId`, `chatId`, `timestamp` (DESC) | Loading chat history efficiently. |
| `notifications` | `organizationId`, `userId`, `timestamp` (DESC) | User's recent alerts. |

### Content Indexes
| Collection | Fields | Purpose |
| :--- | :--- | :--- |
| `blogPosts` | `published`, `createdAt` (DESC) | Showing published API/Blog content. |
| `discussionGuides` | `isPlatform`, `createdAt` (DESC) | Listing platform guides. |
| `discussionGuides` | `organizationId`, `isPlatform`, `createdAt` (DESC) | Listing org-specific guides. |
*Similar indexes exist for `careerTemplates` and `trainingVideos`.*

## 4. Optimization Recommendations

1.  **Pagination**: Pagination implementation (using `limit` and `startAfter`) is present in `database.ts` (e.g., `getUsersByOrganizationPaginated`). Ensure this is used for all lists that can grow indefinitely (Chats, Users, Logs).
2.  **Snapshot Listeners**: Carefully manage the lifecycle of `onSnapshot`. Ensure `unsubscribe()` is always called in `useEffect` cleanup to prevent memory leaks and excessive reads.
3.  **Filtered Views**: The "All" views for content (combining Platform + Org) currently fetch all and filter in memory in some places. For large datasets, consider two separate queries combined UI-side to utilize indexes fully.

# Dashboard Features Quick Reference

## Platform Admin Dashboard (`PLATFORM_ADMIN` role)

### Key Features
- **Platform Metrics**: Total users, organizations, matches, goals, ratings
- **User Management**: Search, view, and manage all platform users
- **Organization Management**: View all organizations and their details
- **Rating Approval**: Approve/reject ratings across all organizations
- **Analytics**: Charts and visualizations for platform health

### Navigation Links
- Dashboard → `dashboard`
- Users → `user-management:users`
- Operators → `platform-operator-management`
- Resources → `resources` (for content management)

### Database Functions
- `getAllUsers()`
- `getAllOrganizations()`
- `getAllMatches()`
- `getAllGoals()`
- `getAllRatings()`
- `getAllCalendarEvents()`

---

## Organization Admin Dashboard (`ADMIN` role)

### Key Features
- **Organization Stats**: Participants, matches, pending reviews
- **User Management**: View and manage organization participants
- **Match Management**: Create and manage mentorship matches
- **Resource Management**: Create organization-specific resources
- **Rating Approval**: Approve/reject ratings from organization participants
- **Community Access**: Access to Mentors Circle and Mentees Hub

### Navigation Links
- Dashboard → `dashboard`
- Users → `participants`
- Matches → `matching`
- Referrals → `referrals`
- Messages → `chat`
- Resources → `resources`
- Calendar → `calendar`
- Mentors Circle → `chat-mentors`
- Mentees Hub → `chat-mentees`

### Key Actions
- Copy organization invite code
- Edit program configuration
- View participants (mentors/mentees)

---

## Mentor Dashboard (`MENTOR` role)

### Key Features
- **My Mentees**: List of matched mentees with goals and progress
- **Metrics**: Active mentees count, average rating, scheduled events
- **Actions**: Message, schedule, rate mentees
- **Upcoming Events**: Next 3 calendar events
- **Mentors Circle**: Access to mentors community group
- **Resource Library**: Link to resources

### Navigation Links
- Dashboard → `dashboard`
- Messages → `chat`
- Resources → `resources`
- Calendar → `calendar`
- Mentors Circle → `chat-mentors`

### Key Actions
- Rate mentees (submits for approval)
- Message mentees
- Schedule meetings
- View mentee goals and progress

---

## Mentee Dashboard (`MENTEE` role)

### Key Features
- **My Match**: Mentor profile with skills and contact options
- **My Goals**: Top 3 goals with progress tracking
- **Upcoming Events**: Next 3 calendar events
- **My Feedback**: Approved ratings given by mentee
- **Mentees Hub**: Access to mentees community group

### Navigation Links
- Dashboard → `dashboard`
- My Goals → `my-goals`
- Messages → `chat`
- Resources → `resources`
- Calendar → `calendar`
- Mentees Hub → `chat-mentees`

### Key Actions
- Rate mentor (submits for approval)
- Message mentor
- Schedule meetings
- View and track goals

---

## Common Features

### Rating Modal
- Available in all dashboards
- Star rating (1-5)
- Optional comment
- Submits for admin approval

### Event Filtering
- Shows events where user is participant
- Handles `participants` array and `mentorId`/`menteeId` fields
- Only shows future events

### Responsive Design
- Mobile-friendly
- Touch targets ≥ 44px
- Proper breakpoints (sm/md/lg)

---

## Status: ✅ All Systems Operational

All dashboards are fully functional with proper:
- Role-based access control
- Navigation routing
- Database integration
- Error handling
- Loading states
- Responsive design

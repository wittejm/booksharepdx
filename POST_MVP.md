# Post-MVP Features

This document lists features that have been deferred from the initial MVP implementation. These will be added after the core platform is launched and the backend is implemented.

---

## OAuth Integration

**Priority**: High
**Reason for deferral**: Adds complexity to demo, requires backend OAuth flows

### Features:
- Google OAuth login/signup
- Facebook OAuth login/signup
- Account linking when OAuth email matches existing account
  - Password verification flow
  - Link confirmation
  - Show connected providers in Settings
- OAuth profile picture import
- "Sign in with Google" / "Sign in with Facebook" buttons

### Implementation Notes:
- Use passport.js for OAuth flows (backend)
- JWT token management for all auth methods
- Settings page: "Connected Accounts" section showing linked providers
- Ability to disconnect OAuth providers

### UX Flows to Implement:

**OAuth Sign-Up:**
1. User clicks "Sign in with Google"
2. OAuth flow redirects to Google
3. User authorizes
4. Return to app, create account with OAuth data
5. Profile created with username from email, bio required on first login

**Account Linking (Duplicate Email):**
1. User tries OAuth with email that exists
2. Modal: "Account Already Exists"
3. Enter password to link accounts
4. Confirmation: "Google account linked successfully"
5. Can now log in with either method

**Settings - Connected Accounts:**
- Shows linked OAuth providers (Google icon, Facebook icon)
- "Disconnect" button next to each
- Warning when disconnecting if no password set

---

## QR Code Flyers

**Priority**: Low
**Reason for removal**: Low expected usage, medium implementation complexity
**Status**: Removed entirely (not planned for post-MVP)

This feature will not be implemented. Users can share the platform URL manually at little free libraries.

---

## Real-Time Notifications

**Priority**: Medium
**Reason for deferral**: Requires WebSocket infrastructure

### Features:
- Real-time notification of new messages
- Real-time notification when someone expresses interest in your post
- Real-time notification when you receive a moderator message
- Browser notifications (with permission)
- In-app notification bell icon with badge count

### Implementation Notes:
- WebSocket connection (Socket.io or native WebSockets)
- Notification persistence in database
- Mark as read functionality
- Notification preferences in Settings

---

## Advanced Search & Filtering

**Priority**: Low
**Reason for deferral**: Complex feature, not essential for MVP

### Features:
- Full-text search across book titles, authors, descriptions
- Filter by reading level (children's, YA, adult)
- Filter by language
- Save search filters as "Saved Searches"
- Search history

---

## Book Clubs & Reading Groups

**Priority**: Medium
**Reason for deferral**: Significant feature addition

### Features:
- Create book clubs
- Invite members
- Club discussions
- Shared reading lists
- Club-specific posts/exchanges

---

## Events

**Priority**: Low
**Reason for deferral**: Complex feature

### Features:
- Book swap events
- Reading meetups
- Event RSVP
- Event calendar
- Event location mapping

---

## Recommendation Algorithm

**Priority**: Medium
**Reason for deferral**: Requires ML or collaborative filtering

### Features:
- "Because you liked..." recommendations
- Similar users suggestions
- Trending books in your neighborhood
- Personalized feed sorting

---

## Mobile Apps

**Priority**: High (long-term)
**Reason for deferral**: Separate project

### Features:
- Native iOS app (React Native or Swift)
- Native Android app (React Native or Kotlin)
- Push notifications
- Camera for book cover scanning
- Location services integration

---

## Enhanced Profile Features

**Priority**: Low
**Reason for deferral**: Nice-to-have, not essential

### Features:
- Currently reading shelf
- Want to read shelf
- Reading challenges
- Reading stats (pages read, books finished)
- Goodreads integration (import shelves)

---

## Moderation Enhancements

**Priority**: Medium
**Reason for deferral**: Build these as community grows

### Features:
- Auto-moderation (spam detection, profanity filters)
- Keyword flagging
- User reporting trends/analytics
- Moderator training mode (practice on old reports)
- Public transparency reports
- Community moderator elections/applications

---

## Advanced Messaging

**Priority**: Low
**Reason for deferral**: Current messaging sufficient for MVP

### Features:
- Image attachments in messages
- Read receipts
- Typing indicators
- Message reactions
- Message search

---

## Multi-City Expansion

**Priority**: High (long-term)
**Reason for deferral**: MVP focused on Portland

### Features:
- Support for multiple cities
- City selection during sign-up
- City-specific landing pages
- Cross-city user connections (optional)
- Admin tools for adding new cities

---

## Analytics & Insights

**Priority**: Low
**Reason for deferral**: Build after launch with real data

### Features:
- Platform-wide stats dashboard (admin)
- Most exchanged books
- Most active neighborhoods
- User growth metrics
- Exchange success rates
- Popular genres by neighborhood

---

## Accessibility Enhancements

**Priority**: Medium
**Reason for deferral**: MVP includes basic accessibility, these are advanced

### Features:
- Screen reader optimizations beyond WCAG AA
- High contrast mode toggle
- Font size adjustment
- Keyboard shortcut customization
- Audio descriptions for images

---

## Email Digest

**Priority**: Low
**Reason for deferral**: Requires email infrastructure

### Features:
- Weekly digest of new books in your area
- Daily summary of messages
- Monthly community highlights
- Customizable digest preferences

---

## Notes:
- All deferred features should be designed with the current architecture in mind
- OAuth is the highest priority post-MVP addition
- Features will be prioritized based on user feedback after launch
- Some features may be reconsidered or removed based on community needs

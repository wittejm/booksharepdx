# UX Design Specification

## Overview

This document outlines the user experience design for BookSharePDX, a neighbor-based book sharing platform. The design prioritizes mobile-first responsive design, clear user flows, and intuitive interactions that make book discovery and exchange feel natural and community-focused.

## Design Principles

- **Mobile-first**: Design for mobile screens, enhance for desktop
- **Community-focused**: Emphasize local connections and neighborhood identity
- **Low-friction**: Minimize steps between discovering a book and connecting with a neighbor
- **Transparent**: Clear affordances, no hidden features, predictable behavior

---

## Landing Page Layout

### Hero Section (Above the Fold)

**Purpose**: Immediately communicate value and drive action

**Components**:
- **Large headline**: Clear value proposition
  - Example: "Share books with your neighbors. Build community, one page at a time."
- **Visual**: Photo or illustration showing books, neighbors, or Portland community
- **Location context**: Subtle indicator that this is Portland-focused or hyperlocal
- **Primary CTA**: Prominent "Get Started" and "Browse Books" buttons

**Layout**:
- Full viewport height
- Center-aligned content
- High contrast text over image or solid background
- CTA button stands out with accent color

### Public Feed Preview

**Behavior**: Anonymous visitors can browse real book listings immediately
- Shows actual posts from the platform
- Demonstrates value before requiring sign-up
- Posts are clickable to view details
- Interactions (comment, message, claim) trigger sign-up prompt

### Below the Fold Sections

1. **How It Works**
   - Step-by-step visual guide
   - 3-4 steps: Set location → Post books → Find neighbors → Exchange
   - Icons or illustrations for each step
   - Simple, scannable layout

2. **Why BookSharePDX vs Others**
   - Comparison to Buy Nothing, Facebook, Nextdoor
   - Highlight unique value: hyperlocal, book-specific, community-focused
   - Bullet points with icons

### Footer

**Components**:
- Contact/Feedback: Email link (mailto: to project email)
- Privacy Policy (generated using template from termly.io or similar)
- Terms of Use (user conduct, liability disclaimer, content ownership, 13+ age requirement)
- GitHub repository link (open source project)
- **Discord button**: Styled button "Join our Discord!" linking to https://discord.gg/KsN2rapS
- Copyright: "© 2025 BookSharePDX"

**Discord Button Styling**:
- Prominent call-to-action button
- Discord brand color (#5865F2) or themed to match site
- Icon + text: "Join our Discord!"
- Opens in new tab

---

## Navigation Structure

### Header Navigation - Logged In Users

**Desktop & Mobile**:
```
[Logo]  Browse  Post  Messages  [Discord Icon]  [Profile Dropdown ▼]
```

**Profile Dropdown contains**:
- My Profile
- Settings
- Logout

**Discord Icon**:
- Links to https://discord.gg/KsN2rapS
- Opens in new tab
- Tooltip: "Join our Discord community"

### Header Navigation - Anonymous Users

**Desktop & Mobile**:
```
[Logo]  Browse  About  [Discord Icon]  [Sign Up]  [Login]
```

### Responsive Behavior

- **Mobile**: Full navigation visible, may collapse to hamburger menu at very small sizes
- **Desktop**: Full navigation always visible in header
- Logo always links to home/landing (or browse feed if logged in)

### Authenticated User Landing Behavior

When logged-in users visit the site, **skip the landing page entirely** and go directly to the browse/discovery feed.

---

## Authentication & Sign-Up

### Sign-Up

**Method**: Email + password only (OAuth deferred to post-MVP, see POST_MVP.md)

**Required Fields**:
- Email (unique)
- Password (minimum 8 characters, no other requirements)
- Username (unique, used in profile URLs)
- Bio (minimum one sentence)
- Community Guidelines acceptance checkbox

**Flow**:
1. User fills form
2. Clicks "Create Account"
3. Account created (stored in demo: localStorage)
4. Toast: "A verification email has been sent to [email]" with "Resend" button
5. **Demo**: Spoofed endpoint instantly sets `verified: true` in localStorage
6. User is logged in and can use app immediately

**Email Verification**:
- Modal shows: "We sent you a verification email. Check your inbox!"
- "Resend Email" button available
- **Demo**: Clicking "Resend" shows toast "Verification email sent" (no actual email)
- **Demo**: User is already verified (spoofed endpoint handles this instantly)
- Unverified users attempting to post/comment/message see verification prompt

### Login

**Method**: Email + password

**Flow**:
1. User enters email and password
2. Clicks "Log In"
3. Authenticated and redirected to browse feed

**Forgot Password Link**:
- Links to password reset flow (see below)

### Password Reset

**Flow**:
1. User clicks "Forgot password?" on login page
2. Enters email address
3. Toast: "Password reset email sent" (demo: instant)
4. **Demo Testing**: Link in header "Demo: Reset Password" shows reset form
5. User enters new password
6. Confirmation: "Password updated successfully"
7. Redirect to login

---

## Onboarding Flow

### After Sign-Up

**Immediate Required Step**: Set location

**Flow**:
1. Welcome screen: "Welcome to BookSharePDX! Let's find books near you."
2. Location selection interface (see Location Selection UX below)
3. After location set, redirect to browse feed

**Rationale**: Location is required for core functionality, so collect it upfront before user can access the app.

---

## Location Selection UX

### Interface Layout

**Map Display**:
- Full-width map (edge to edge on all screen sizes)
- Initially slightly faded/dimmed
- Portland neighborhood boundaries loaded and ready

**Control Buttons** (above map):
```
( ) Choose Neighborhood    ( ) Drop Pin for Approximate Location
```

**Interaction Flow**:

1. **Initial State**:
   - Map is faded
   - User sees two radio button options
   - Prompt: "How would you like to share your location?"

2. **Choose Neighborhood selected**:
   - Map becomes active (no longer faded)
   - Neighborhood boundaries are visible as clickable polygons
   - Hover shows neighborhood name tooltip
   - Click neighborhood to select, it highlights
   - Confirm button appears

3. **Drop Pin selected**:
   - Map becomes active (no longer faded)
   - Neighborhood boundaries are hidden or very subtle
   - User can click anywhere to drop a pin
   - Pin is draggable to adjust
   - Confirm button appears

**Mobile**:
- Full-screen map interface
- Same toggle buttons at top
- Touch interactions for selecting neighborhood or dropping pin

**Desktop**:
- Map takes full width of content area
- May have additional instructions/help text on the side

---

## Post Creation Flow

### Creating a Book Post

**Flow**:
1. Click "Post" button in header
2. Open post creation form (modal or dedicated page)

**Form Steps** (single screen, linear):

1. **Find the Book**:
   - Text input: "Type book title or author"
   - Autocomplete dropdown appears as user types
   - Shows book cover thumbnails, title, author in results
   - User selects book from autocomplete

2. **Set Exchange Type**:
   - Radio buttons or toggle:
     - ( ) Give Away (green gift icon 🎁)
     - ( ) Exchange (blue handshake icon 🤝)
   - Tooltips: "Free to take" / "Trade for another book"

3. **Add Note** (optional):
   - Textarea: "Condition, notes, or anything else..."
   - Placeholder: "Great condition, slight wear on cover"

4. **Cross-Post Options** (optional):
   - Checkboxes:
     - [ ] Share to Buy Nothing
     - [ ] Share to Facebook
     - [ ] Share to Nextdoor
   - Help text: "Cross-post to reach more neighbors"

5. **Submit**:
   - "Post Book" button
   - On success, redirect to user's posts view with new post visible
   - Share buttons appear on the post (see Cross-Posting UX)

**Validation**:
- Book selection required
- Exchange type required
- Inline error messages if missing

---

## Browse / Discovery Page

### Desktop Layout

```
┌─────────────────────────────────────────┐
│ Header Navigation                       │
├──────────┬──────────────────────────────┤
│          │                              │
│ Filters  │    Feed (scrollable)         │
│ Sidebar  │                              │
│          │    [Post card]               │
│ Genre    │    [Post card]               │
│ Distance │    [Post card]               │
│ Type     │    [Post card expanded]      │
│          │    [Post card]               │
│          │                              │
└──────────┴──────────────────────────────┘
```

**Filters Sidebar** (left, ~250px):
- Genre dropdown/checkboxes
- Distance slider (0.5 mi, 1 mi, 5 mi, 10 mi)
- Type: Give Away / Exchange checkboxes
- Group posts by user toggle (see Grouping Posts section below)
- Clear filters button

**Feed** (main area):
- Scrollable list of post cards
- Infinite scroll or pagination
- Empty state if no results: "No books found nearby. Try expanding your search radius or post a book!"

### Mobile Layout

```
┌─────────────────────┐
│ Header Nav          │
├─────────────────────┤
│ [Filters Dropdown]  │
├─────────────────────┤
│                     │
│ Feed (scrollable)   │
│                     │
│ [Post card]         │
│ [Post card]         │
│ [Post card expanded]│
│ [Post card]         │
│                     │
└─────────────────────┘
```

**Filters Dropdown** (top):
- Tap to open slide-up drawer or expand section
- Same filter options as desktop sidebar
- "Apply" button to close and filter

### Post Card Design

**Collapsed State**:
```
┌─────────────────────────────────────┐
│ ┌────────┐                          │
│ │ Book   │  Title: "The Overstory"  │
│ │ Cover  │  Author: Richard Powers  │
│ │ Medium │                          │
│ │ Thumb  │  [pic] Username • 0.8 mi │
│ └────────┘  [🎁 Give Away]          │
└─────────────────────────────────────┘
```

**Components**:
- **Book cover thumbnail**: Medium size (100-150px tall)
- **Title**: Bold, prominent
- **Author**: Secondary text
- **User info**: Small profile pic + username + distance
- **Type badge**:
  - Green gift box icon + "Give Away" text (tooltip: "This book is free to take")
  - OR Blue handshake icon + "Exchange" text (tooltip: "Owner wants to trade for another book")

**Expanded State** (inline):
- Card expands in place when clicked
- Shows full description/notes from poster
- Shows "Interested" or "Message" buttons
- Shows public comments if any
- Shows share buttons if it's the user's own post

**Mobile**:
- Slightly smaller thumbnails
- Stack layout (thumbnail above text on very small screens)

---

## Grouping Posts by User

### Problem

One user posting many books nearby can dominate the feed, making it hard to discover other people's posts.

### Solution: Global Toggle

**Global Filter**: "Group posts by user"
- Toggle in filters sidebar/dropdown
- Default: OFF (individual posts)
- When ON: All users' posts are grouped
- Applies to entire feed

### Behavior

**When Global Filter is OFF**:
- Feed shows individual book posts sorted by distance
- Each book appears as separate card
- Good for browsing by book

**When Global Filter is ON**:
- Feed shows grouped user cards sorted by user's distance (nearest users first)
- User cards can be expanded to see their books
- Good for browsing by person

### Grouped User Card Design

**Collapsed State**:
```
┌─────────────────────────────────────┐
│ [Profile Pic]  Username • 0.8 mi    │
│                5 books available    │
└─────────────────────────────────────┘
```

**Components**:
- Profile picture (medium size)
- Username
- Distance from viewer
- Book count: "X books available"

**Expanded State** (inline):
- Card expands in place showing list of user's books
- Each book shows: thumbnail, title, author, type badge
- Clicking individual book opens full post detail (see Post Detail section)
- Collapse via X button, click outside, or click card again

**Example Expanded**:
```
┌─────────────────────────────────────┐
│ [Profile Pic]  Username • 0.8 mi    │
│                5 books available  ×  │
├─────────────────────────────────────┤
│ [📚] "The Overstory"                │
│      Richard Powers  [🎁 Give Away] │
├─────────────────────────────────────┤
│ [📚] "Braiding Sweetgrass"          │
│      Robin Wall Kimmerer  [🤝 Ex..] │
├─────────────────────────────────────┤
│ ... (3 more books)                  │
└─────────────────────────────────────┘
```

### Sorting

**Individual Posts Mode** (global filter OFF):
- Posts sorted by distance (nearest books first)

**Grouped Mode** (global filter ON):
- User cards sorted by user's distance (nearest users first)
- Books within expanded card: user's choice or by recency

---

## Post Detail / Interaction

### Clicking a Post Card

**Behavior**: Expands inline within the feed

**Expanded View Shows**:
- Full book metadata (cover, title, author, genre, etc.)
- User's notes about condition
- Posted date
- User profile snippet (name, bio snippet, bookshare count)
- Type badge (give away / exchange)
- Distance from viewer

**Action Buttons**:
- If viewer's own post:
  - "Edit" button
  - "Mark as Given" button
  - Share buttons (see Cross-Posting UX)
- If someone else's post:
  - "I'm Interested" button (triggers claim flow)

**Public Comments Section**:
- Shows existing public comments
- "Add a comment" input if logged in

**Collapse**:
- Click outside card or "X" button to collapse back to card view
- Feed scroll position maintained

---

## Claim / Interest Flow

### When User Clicks "I'm Interested"

**Modal Appears**:
```
┌─────────────────────────────────────┐
│ How would you like to respond?      │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 💬 Public Comment                │ │
│ │ Visible to everyone              │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ✉️  Private Message              │ │
│ │ Only you and the owner           │ │
│ └─────────────────────────────────┘ │
│                                     │
│          [Cancel]                   │
└─────────────────────────────────────┘
```

**User Selects**:
- **Public Comment**: Modal closes, focus moves to comment input below post, user types and posts
- **Private Message**: Opens message composer (see Messaging UX)

---

## Cross-Posting

**Location**: Share buttons appear on user's own posts after creation

**Share Buttons**:
- Small platform icons appear on the user's own posts when viewing them
- Platforms: Buy Nothing, Facebook, Nextdoor, Reddit
- Click opens platform-specific share dialog or copies formatted text + link

**Share Behavior**:
- Click "Share to Facebook" → Opens Facebook share dialog with pre-filled post
- Click "Share to Buy Nothing" → Copies formatted text to clipboard with toast confirmation
- Click "Share to Reddit" → Opens Reddit submit page with title/link
- Click "Share to Nextdoor" → Copies formatted text to clipboard

**Example Share Text**:
```
"The Overstory" by Richard Powers - available for free in Sellwood!

Condition: Great, slight wear on cover

Get it on BookSharePDX: https://booksharepdx.app/post/12345
```

**Not Included**: No cross-posting checkboxes during post creation (simplified to reduce friction)

---

## Messaging UX

### Important: Messages Tied to Posts

**All messages are about posts**:
- Users can only message someone about a specific post
- No standalone DMs between users
- Every conversation shows the post context
- To message someone, you must respond to one of their posts

**Why**: Keeps interactions focused on book exchanges, prevents spam/harassment

### Desktop Layout

**Split View**:
```
┌─────────────────────────────────────────┐
│ Header Navigation                       │
├──────────┬──────────────────────────────┤
│ Thread   │                              │
│ List     │   Conversation View          │
│          │                              │
│ [Post 1] │   [Post card header]         │
│ active   │   [Message bubble]           │
│          │   [Message bubble]           │
│ [Post 2] │   [Message bubble]           │
│          │                              │
│ [Post 3] │   [Message input box]        │
│          │                              │
└──────────┴──────────────────────────────┘
```

**Thread List** (left, ~300px):
- Each thread tied to a post
- Shows book thumbnail, title, other user's name
- Unread indicator
- Most recent message timestamp
- Click to open conversation on right

**Conversation View** (right):
- Post card at top (shows which book this is about)
- Message thread below
- Message input at bottom
- All messages in chronological order

### Mobile Layout

**Default View - Thread List**:
```
┌─────────────────────┐
│ Header Nav          │
├─────────────────────┤
│ Messages            │
├─────────────────────┤
│                     │
│ [Post 1 thread]     │
│ [Post 2 thread]     │
│ [Post 3 thread]     │
│                     │
└─────────────────────┘
```

**Tap Thread → Full-Screen Conversation**:
```
┌─────────────────────┐
│ [← Back]  Post Title│
├─────────────────────┤
│                     │
│ [Message bubble]    │
│ [Message bubble]    │
│ [Message bubble]    │
│                     │
│ [Message input]     │
└─────────────────────┘
```

- Back button returns to thread list
- Maintains scroll position in thread list

### Message Composer

**From Private Message Flow**:
- Opens conversation view (desktop: right panel, mobile: full screen)
- Book post context shown at top
- Message input focused
- "Send" button

**Unread Counts**:
- Badge on "Messages" nav item shows total unread count
- Thread list shows unread indicators per conversation

---

## User Profile Page

### Layout

**Header Section**:
- Profile picture (if set) or default avatar
- Username
- Bio
- Location (neighborhood name or "nearby")
- Member since date

**Stats Summary** (prominent):
```
┌─────────────────────────────────────┐
│  📚 12 Books Given                  │
│  📖 8 Books Received                │
│  🤝 5 Bookshares                    │
└─────────────────────────────────────┘
```

**Tabs**:
- **Active Posts**: Current available books
- **Archive**: Past exchanges, completed posts
- **Saved**: Bookmarked posts and posts user has expressed interest in
- (If own profile: **Settings** in dropdown, not a tab)

**Tab Content**:
- Same post card design as browse feed
- Empty states if no content:
  - "You haven't posted any books yet. [Post a Book]"
  - "No archived exchanges yet."
  - "Save books you're interested in to keep track of them!"

**Saved Tab Details**:
- Combines bookmarks and expressed interest
- Posts are added when:
  - User clicks bookmark icon on a post
  - User sends message or comment about a post
- Can be removed manually
- Shows original post with current status (available/given/archived)

### Viewing Others' Profiles

- Same layout, but no Settings access
- Shows their active posts and stats
- Archive may be hidden or limited for privacy

---

## Settings Page

**Access**: Via profile dropdown in header

**Sections**:

1. **Account**:
   - Email (display only or editable)
   - Password change
   - Connected OAuth providers

2. **Location**:
   - Current location shown (neighborhood or approximate)
   - "Change Location" button → opens location selection interface

3. **Profile**:
   - Edit username
   - Edit bio
   - Upload profile picture
   - Reading preferences (favorite genres, authors)
   - Social links (Goodreads, Instagram, etc.)

4. **Notifications** (future):
   - Email preferences
   - In-app notification settings

5. **Privacy**:
   - Profile visibility
   - Block list management

6. **Danger Zone**:
   - Delete account

---

## Safety Features

### Block & Report Access Points

**Available Everywhere Users Interact**:
- User profiles (via three-dot menu or "..." button)
- Post cards (three-dot menu in top-right corner)
- Message conversations (in conversation header)

### Blocking a User

**Access**:
- Three-dot menu → "Block User"

**Confirmation Modal**:
```
┌─────────────────────────────────────┐
│ Block [Username]?                   │
│                                     │
│ They will no longer be able to:    │
│ • See your posts or profile         │
│ • Send you messages                 │
│                                     │
│ You will no longer see:             │
│ • Their posts in your feed          │
│ • Messages from them                │
│                                     │
│     [Cancel]    [Block User]        │
└─────────────────────────────────────┘
```

**After Blocking**:
- Toast notification: "[Username] has been blocked"
- User immediately disappears from feed/search results
- Mutual invisibility enforced (neither can see the other's content)
- Existing message threads become read-only and marked as blocked

**Behavior**:
- Blocked user's posts don't appear in your feed
- Your posts don't appear in their feed
- Cannot message each other
- Cannot see each other's profiles
- If they try to view your profile URL directly: "This profile is not available"

### Reporting a User

**Access**:
- Three-dot menu → "Report User"

**Report Modal**:
```
┌─────────────────────────────────────┐
│ Report [Username]                   │
│                                     │
│ Reason (optional):                  │
│ [ ] Spam                            │
│ [ ] Harassment                      │
│ [ ] Scam/fraud                      │
│ [ ] Inappropriate content           │
│ [ ] Other                           │
│                                     │
│ Additional details (optional):      │
│ [Text area]                         │
│                                     │
│ [ ] Include message history         │
│     (if reporting from messages)    │
│                                     │
│ ℹ️  More detail helps us moderate   │
│    and protect the community        │
│                                     │
│     [Cancel]    [Submit Report]     │
└─────────────────────────────────────┘
```

**Form Details**:
- Reason checkboxes: optional, can select multiple
- Additional details: optional textarea for context
- Include message history: checkbox (only shown if reporting from a conversation)
- Help text: "More detail helps us moderate and protect the community"

**After Submitting**:
- Toast notification: "Report submitted. Thank you for helping keep BookSharePDX safe."
- Modal closes
- User can continue using the app normally
- Report sent to moderation queue (future: admin dashboard)

**Option to Block After Reporting**:
```
┌─────────────────────────────────────┐
│ Report submitted                    │
│                                     │
│ Would you also like to block        │
│ [Username]?                         │
│                                     │
│     [No, thanks]    [Block User]    │
└─────────────────────────────────────┘
```

### Managing Blocked Users

**Access**: Settings → Privacy → Blocked Users

**Blocked Users List**:
```
┌─────────────────────────────────────┐
│ Blocked Users (3)                   │
├─────────────────────────────────────┤
│ [pic] Username1      [Unblock]      │
│       Blocked 2 days ago            │
├─────────────────────────────────────┤
│ [pic] Username2      [Unblock]      │
│       Blocked 1 week ago            │
├─────────────────────────────────────┤
│ [pic] Username3      [Unblock]      │
│       Blocked 3 weeks ago           │
└─────────────────────────────────────┘
```

**Unblocking**:
- Click "Unblock" button
- Confirmation modal: "Unblock [Username]? You will be able to see each other's posts and profiles again."
- After unblock: Toast notification "[Username] has been unblocked"

**Empty State**:
- If no blocked users: "You haven't blocked anyone yet."

### Three-Dot Menu Placement

**On Post Cards** (top-right corner):
```
┌─────────────────────────────────┐
│ Post Title                  ⋮   │
│                                 │
```

**Menu Options** (depends on context):
- If own post:
  - Edit Post
  - Mark as Given
  - Delete Post
- If someone else's post:
  - Group [Username]'s posts (or "Ungroup [Username]'s posts" if global filter is ON)
  - Report Post
  - Block User

**On User Profiles** (near username):
```
[Profile Pic]  Username  ⋮
               Bio text...
```

**Menu Options**:
- Report User
- Block User

**In Message Conversations** (header area):
```
[← Back]  [Username]  ⋮
```

**Menu Options**:
- Report User
- Block User

---

## Error Handling & Edge Cases

### Inline Validation

**Form Inputs**:
- Real-time validation as user types or on blur
- Error message appears below field in red
- Field border highlights in red
- Example: "Book title is required" below empty autocomplete

### Toast Notifications

**Success/Error Actions**:
- Small non-blocking notification appears (top-right or bottom)
- Auto-dismisses after 3-5 seconds
- Examples:
  - "Book posted successfully!"
  - "Failed to send message. Please try again."
  - "Location updated"

**Design**:
- Green for success
- Red for error
- Yellow for warnings
- Close button to dismiss early

### Empty States

**No Results**:
- Friendly message with guidance
- Example (browse feed): "No books found nearby. Try expanding your search radius or [Post a Book] to get started!"
- Example (messages): "No messages yet. When you connect with neighbors, conversations will appear here."

**First-Time User**:
- Empty profile: "Share your first book to start building your BookSharePDX profile!"
- Empty wishlist: "Express interest in books you'd like to find similar recommendations!"

### Loading States

**Spinners/Skeletons**:
- Show skeleton screens for feed loading
- Spinner for form submissions
- Loading indicator for autocomplete searches

### No Internet / API Failures

**Graceful Degradation**:
- Toast notification: "Connection lost. Some features may not work."
- Retry buttons on failed loads
- Cache previous data where possible

---

## Mobile-First Responsive Breakpoints

### Design Approach

Start with mobile design, enhance for larger screens:

**Mobile (< 768px)**:
- Single column layouts
- Full-width components
- Filters in dropdowns/drawers
- Full-screen modals
- Tap-friendly button sizes (min 44px)

**Tablet (768px - 1024px)**:
- Two-column layouts where appropriate
- Sidebar filters appear
- Modals become centered overlays (not full-screen)

**Desktop (> 1024px)**:
- Multi-column layouts
- Persistent sidebars
- Wider max-width for readability
- Hover states become relevant

### Key Mobile Considerations

- **Touch targets**: Minimum 44x44px for buttons/links
- **Scrolling**: Smooth, momentum scrolling
- **Gestures**: Swipe to dismiss modals/drawers
- **Orientation**: Support both portrait and landscape
- **Map interactions**: Pinch to zoom, drag to pan

---

## Accessibility Considerations

### Color & Contrast

- Type badges use both icon AND text (not color alone)
- WCAG AA contrast ratios (4.5:1 for text)
- Focus indicators on all interactive elements

### Keyboard Navigation

- All interactions accessible via keyboard
- Tab order follows visual hierarchy
- Modal traps focus, Esc to close
- Skip to main content link

### Screen Readers

- Semantic HTML (nav, main, article, etc.)
- ARIA labels where needed
- Alt text for images (book covers, profile pics)
- Form labels properly associated

### Responsive Text

- Base font size 16px minimum
- Scalable with browser zoom
- Line height 1.5 for readability

---

## Detailed Specifications

### Visual Design

**Color Scheme**: Warm, community-focused
- Warm colors: greens, browns, oranges
- Friendly and approachable aesthetic
- Book/library-inspired palette

**Default Book Cover**: Generic book icon
- Simple illustrated book icon
- Book title overlaid on icon when no cover available

### Sign-Up & Authentication

**Required Fields**:
- Email (required, unique)
- Password (min 8 characters, no complexity requirements)
- Username (required, unique, used in profile URLs)
- Bio (required, at least one sentence)
- Community Guidelines acceptance checkbox

**OAuth**: Deferred to post-MVP (see POST_MVP.md)

**Email Verification** (Demo):
- Spoofed endpoint instantly sets verified: true
- User sees "Verification email sent" toast
- Can use app immediately
- Unverified blocking is implemented but never triggered in demo

**Password Reset** (Demo):
- "Forgot password?" link available
- Demo testing link in header for easy access
- Spoofed endpoint updates password instantly

### Post Creation & Editing

**Form Type**: Modal overlay
- Desktop: Centered modal ~600px wide
- Mobile: Full-screen modal slides up from bottom

**Book Search & Entry**:
- Autocomplete searches external APIs (Google Books, OpenLibrary)
- If book not found: "Can't find your book? Add manually" link
- Manual entry fields:
  - Title (required)
  - Author (required)
  - Cover image upload (optional)
  - Genre/category (select from predefined list)

**Genre System**: Hybrid approach
- Predefined common genres: Fiction, Non-Fiction, Mystery, Sci-Fi, Romance, Biography, Self-Help, etc.
- "Other" option allows user to add custom genre

**Post Editing**:
- Users can edit notes/condition text
- Users CAN change exchange type (Give Away ↔ Exchange)
- Cannot change which book the post is about (must create new post)
- Can delete post entirely

### Browse & Discovery

**Default Settings**:
- Sort by: Distance (nearest first)
- Default radius: 3 miles
- Infinite scroll for feed pagination

**Distance Selector**:
- UI: Slider with mile markers
- Options: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10+ miles
- "10+" shows all posts beyond 10 miles

**Distance Display**: Rounded to one decimal
- Examples: "0.8 mi", "2.3 mi", "5.1 mi"

**Search**:
- Location: In browse filters sidebar/dropdown
- Searches: Book titles and authors in current feed
- Updates results as user types

**Filter Application**:
- Desktop: Immediate update as filters change
- Mobile: Immediate update, filters in dropdown

**Reading Preferences Filter**:
- Checkbox option: "Only show books matching my preferred genres"
- Uses genres selected in user profile settings

**Empty Feed** (New User):
- Message: "Be the first in your neighborhood! [Post a Book]"
- Encouragement to start sharing

**Grouping Posts by User** (Simplified):
- Global filter toggle only: "Group posts by user" (default OFF)
- When ON: Feed shows grouped user cards sorted by user's distance
- When OFF: Feed shows individual posts sorted by book distance
- No per-user override (simpler implementation)
- Grouped user card shows: Profile pic, username, distance, book count
- Click grouped card to expand inline, showing list of their books
- Click individual book within to open full post detail

### Post Cards & Interaction

**Three-Dot Menu**:
- Always visible on all post cards (collapsed and expanded)
- Top-right corner of card

**Post Card Components**:
- Book cover thumbnail: Medium size (100-150px tall)
- Title (bold)
- Author (secondary text)
- User profile pic (small) + username + distance
- Type badge with icon + text:
  - Green gift icon 🎁 + "Give Away" (tooltip: "This book is free to take")
  - Blue handshake icon 🤝 + "Exchange" (tooltip: "Owner wants to trade for another book")

**Expanding/Collapsing Posts**:
- Click card to expand inline
- Collapse via:
  - X button in top-right corner
  - Click outside expanded card
  - Click card title again (toggle)
- Feed scroll position maintained

**Bookmark/Save Feature**:
- Separate bookmark icon on each post card
- Saves to "Saved" tab in user profile
- Independent of "I'm Interested" action

### Claiming & Messaging

**Anonymous User Click Interest**:
- Shows sign-up prompt modal
- "Sign up to express interest in this book"
- Sign Up / Login buttons

**"I'm Interested" Flow** (Logged-In Users):
1. Click "I'm Interested" button
2. Modal appears: "How would you like to respond?"
   - Option: 💬 Public Comment
   - Option: ✉️ Private Message
3. User must type and send actual message or comment
4. After sending, post added to their Wishlist/Interested tab

**Switching Communication Method**:
- Both public comment and private message options always available
- Can comment publicly AND send private message on same post

**Wishlist/Interested Tab**:
- Auto-populated when user sends message/comment expressing interest
- Manual "Add to Wishlist" button to proactively add books
- Separate "Saved" posts (bookmarked items)

### Marking as Given & Exchange Completion

When a user posts a book as "Exchange", they expect to receive a book in return. This section specifies the complete flow for completing both give away and exchange transactions.

---

#### Give Away Flow (Simple)

**Step 1: Person A Clicks "Mark as Given"**

**Context**: Person A posted a book as **Give Away**

**UI**: Modal appears

```
┌─────────────────────────────────────┐
│ Mark "1984" as Given                │
├─────────────────────────────────────┤
│ Who did you give this book to?      │
│                                     │
│ ○ Sarah (@sarahreads) - 0.8 mi     │
│   Messaged 2 days ago               │
│                                     │
│ ○ Mike (@mikebooks) - 1.2 mi       │
│   Commented 3 days ago              │
│                                     │
│           [Cancel] [Next]           │
└─────────────────────────────────────┘
```

**List shows**:
- Users who messaged OR commented on this post
- Sorted by most recent interaction
- Profile pic, username, distance, last interaction time

**Step 2: Select Recipient (Person B selected)**

**UI**: Modal updates to show confirmation

```
┌─────────────────────────────────────┐
│ Confirm Gift                        │
├─────────────────────────────────────┤
│ You're giving "1984" to:            │
│                                     │
│ [Profile Pic] Sarah (@sarahreads)   │
│                                     │
│ This will:                          │
│ • Archive this post                 │
│ • Add to your Given count (+1)      │
│ • Add to Sarah's Received count (+1)│
│                                     │
│        [Cancel] [Confirm]           │
└─────────────────────────────────────┘
```

**Step 3: Confirm**

**What happens**:
1. Post archived immediately
2. Stats updated:
   - Person A: +1 given
   - Sarah: +1 received
3. **Message sent to conversation**:
   ```
   [System Message]
   ✅ Gift Completed

   Person A gave "1984" to Sarah as a gift.
   ```
4. Both users can now add bookshare vouch ("I met this person")

---

#### Exchange Flow (Two-Party Confirmation)

**Step 1: Person A Clicks "Mark as Given"**

**Context**: Person A posted "1984" as **Exchange**

**UI**: Modal appears (same as Give Away flow)

```
┌─────────────────────────────────────┐
│ Mark "1984" as Given                │
├─────────────────────────────────────┤
│ Who did you give this book to?      │
│                                     │
│ ○ Sarah (@sarahreads) - 0.8 mi     │
│   Messaged 2 days ago               │
│                                     │
│ ○ Mike (@mikebooks) - 1.2 mi       │
│   Commented 3 days ago              │
│                                     │
│           [Cancel] [Next]           │
└─────────────────────────────────────┘
```

**Step 2: Select Recipient (Person B selected)**

**UI**: Modal updates to show exchange selection

```
┌─────────────────────────────────────┐
│ Complete Exchange with Sarah        │
├─────────────────────────────────────┤
│ You're giving: "1984"               │
│                                     │
│ What book are you receiving from    │
│ Sarah in exchange?                  │
│                                     │
│ Sarah's Available Books:            │
│                                     │
│ ○ [📚] "Dune"                       │
│   Frank Herbert                     │
│   Exchange • 0.8 mi                 │
│                                     │
│ ○ [📚] "The Overstory"              │
│   Richard Powers                    │
│   Give Away • 0.8 mi                │
│                                     │
│ □ I gave this away (no exchange)    │
│                                     │
│        [Cancel] [Confirm]           │
└─────────────────────────────────────┘
```

**Sarah's Available Books**:
- Shows all of Sarah's active posts (not archived)
- Radio buttons to select one book
- Shows book cover thumbnail, title, author, type, distance
- **OR** checkbox: "I gave this away (no exchange)"
  - If checked, radio buttons disabled
  - Acts like a gift instead of exchange

**Step 3: Confirm Exchange**

**Person A selects "Dune" and clicks Confirm**

**What happens**:
1. Toast: "Exchange initiated with Sarah"
2. Person A's "1984" post:
   - Status: "Pending Exchange Confirmation"
   - Shows: "Waiting for Sarah to confirm receiving 1984"
   - Not yet archived
   - Person A can cancel
3. Sarah's "Dune" post:
   - Status: "Pending Exchange Confirmation"
   - Shows: "Waiting for you to confirm this exchange"
   - Not yet archived
   - Sarah can decline
4. **Message sent to conversation thread**:
   ```
   [System Message]
   📦 Exchange Proposed

   Person A wants to exchange:
   • Give: "1984" by George Orwell
   • Receive: "Dune" by Frank Herbert

   Sarah, please confirm this exchange.
   ```
5. Sarah receives notification

**Step 4: Sarah Confirms (or Declines)**

**Sarah sees notification**: "Person A proposed an exchange with you"

**Sarah navigates to**:
- Messages thread with Person A (system message appears)
- OR her "Dune" post (banner appears)
- OR her profile → Active Posts tab (status shows "Pending Exchange")

**UI on Sarah's "Dune" post**:
```
┌─────────────────────────────────────┐
│ ⚠️ Pending Exchange                 │
│                                     │
│ Person A (@jordan) wants to         │
│ exchange their "1984" for your      │
│ "Dune"                              │
│                                     │
│   [Decline Exchange] [Confirm]      │
└─────────────────────────────────────┘
```

**UI in Messages thread** (under system message):
```
[Confirm Exchange] [Decline Exchange]
```

**Step 5a: Sarah Confirms Exchange**

**Sarah clicks "Confirm Exchange"**

**What happens**:
1. Toast (Sarah): "Exchange confirmed!"
2. Toast (Person A): "Sarah confirmed the exchange!"
3. Both posts archived immediately
4. Stats updated:
   - Person A: +1 given, +1 received
   - Sarah: +1 given, +1 received
5. **Message sent to conversation**:
   ```
   [System Message]
   ✅ Exchange Completed

   • Person A gave: "1984" by George Orwell
   • Sarah gave: "Dune" by Frank Herbert

   Both books marked as exchanged!
   ```
6. Both users can now add bookshare vouch ("I met this person")

**Step 5b: Sarah Declines Exchange**

**Sarah clicks "Decline Exchange"**

**Modal appears**:
```
┌─────────────────────────────────────┐
│ Decline Exchange                    │
├─────────────────────────────────────┤
│ Why are you declining?              │
│                                     │
│ ○ This book is no longer available  │
│ ○ I'd prefer a different book       │
│ ○ Changed my mind about exchanging  │
│ ○ Other (will send message)         │
│                                     │
│ Optional message to Person A:       │
│ [___________________________]       │
│                                     │
│        [Cancel] [Decline]           │
└─────────────────────────────────────┘
```

**What happens**:
1. Exchange cancelled
2. Person A's "1984" post: Returns to active (no longer pending)
3. Sarah's "Dune" post: Returns to active
4. **Message sent to conversation**:
   ```
   [System Message]
   ❌ Exchange Declined

   Sarah declined the exchange for "Dune"
   Reason: This book is no longer available

   [Optional message from Sarah appears here]
   ```
5. Person A can propose different exchange or mark as given to someone else

---

#### Exchange Edge Cases

**Edge Case 1: Selected Book No Longer Available**

**Scenario**: Person A selects Sarah's "Dune" but Sarah already gave it away before confirming

**Detection**: When Sarah goes to confirm, system checks if "Dune" is still active

**UI for Sarah**:
```
┌─────────────────────────────────────┐
│ ⚠️ Book No Longer Available         │
│                                     │
│ "Dune" has already been given away. │
│                                     │
│ Person A wanted to exchange for     │
│ this book. What would you like      │
│ to do?                              │
│                                     │
│ ○ Offer a different book            │
│ ○ Accept as a gift (no exchange)    │
│ ○ Cancel this transaction           │
│                                     │
│           [Continue]                │
└─────────────────────────────────────┘
```

**If "Offer a different book"**:
```
┌─────────────────────────────────────┐
│ Select Different Book               │
├─────────────────────────────────────┤
│ Choose a book to offer Person A:    │
│                                     │
│ ○ [📚] "The Overstory"              │
│   Richard Powers                    │
│   Give Away • 0.8 mi                │
│                                     │
│ ○ [📚] "Braiding Sweetgrass"        │
│   Robin Wall Kimmerer              │
│   Exchange • 0.8 mi                 │
│                                     │
│        [Cancel] [Propose]           │
└─────────────────────────────────────┘
```

**Message sent**:
```
[System Message]
📦 Exchange Updated

Sarah's "Dune" is no longer available.
Sarah is offering "The Overstory" instead.

Person A, please confirm this exchange.
```

**Now Person A needs to confirm the updated exchange**

**Edge Case 2: Person Has No Available Books**

**Scenario**: Person A wants to exchange with Sarah, but Sarah has no active posts

**UI**:
```
┌─────────────────────────────────────┐
│ Complete Exchange with Sarah        │
├─────────────────────────────────────┤
│ You're giving: "1984"               │
│                                     │
│ Sarah doesn't have any available    │
│ books right now.                    │
│                                     │
│ Options:                            │
│ ○ Give away (no exchange)           │
│ ○ Wait for Sarah to post books      │
│ ○ Select someone else               │
│                                     │
│        [Cancel] [Continue]          │
└─────────────────────────────────────┘
```

**Edge Case 3: "Give Away" Selected During Exchange**

**Scenario**: Person A's post is "Exchange" but checks "I gave this away (no exchange)"

**UI after clicking Confirm**:
```
┌─────────────────────────────────────┐
│ Confirm Gift                        │
├─────────────────────────────────────┤
│ You posted this as "Exchange" but   │
│ you're giving it away without       │
│ receiving a book.                   │
│                                     │
│ This will:                          │
│ • Archive this post                 │
│ • Add to your Given count (+1)      │
│ • Add to Sarah's Received count (+1)│
│ • No book received for you          │
│                                     │
│        [Cancel] [Confirm]           │
└─────────────────────────────────────┘
```

**Message sent**:
```
[System Message]
✅ Gift Completed

Person A gave "1984" to Sarah as a gift.
```

**Edge Case 4: Person A Cancels Pending Exchange**

**Scenario**: Person A initiated exchange, waiting for Sarah to confirm, but changes mind

**UI on Person A's pending post**:
```
┌─────────────────────────────────────┐
│ "1984"                              │
│ George Orwell                       │
├─────────────────────────────────────┤
│ ⏳ Pending Exchange Confirmation    │
│                                     │
│ Waiting for Sarah to confirm        │
│ exchange for "Dune"                 │
│                                     │
│ [Cancel Exchange] [View Messages]   │
└─────────────────────────────────────┘
```

**Person A clicks "Cancel Exchange"**

**Confirmation modal**:
```
┌─────────────────────────────────────┐
│ Cancel Exchange?                    │
├─────────────────────────────────────┤
│ This will cancel the pending        │
│ exchange with Sarah.                │
│                                     │
│ Your post will return to active     │
│ and you can mark it as given to     │
│ someone else.                       │
│                                     │
│        [Back] [Cancel Exchange]     │
└─────────────────────────────────────┘
```

**Message sent**:
```
[System Message]
❌ Exchange Cancelled

Person A cancelled the pending exchange.
```

---

#### Post States

**Post States**:
1. **Active** - Available for exchange/gift
2. **Pending Exchange Confirmation** - Waiting for other party to confirm
3. **Archived** - Exchange/gift completed

**Action Buttons by State**:

**Active Exchange Post (Own)**:
- [Edit] [Mark as Given] [Share] [⋮]

**Pending Exchange Post (Initiator)**:
- [Cancel Exchange] [View Messages] [⋮]

**Pending Exchange Post (Recipient)**:
- [Confirm Exchange] [Decline Exchange] [View Messages] [⋮]

**Active Give Away Post (Own)**:
- [Edit] [Mark as Given] [Share] [⋮]

---

#### Bookshare Vouching

**"I met this person" button**:
- Appears at bottom of message conversation
- Available after exchange/gift is completed
- Mutual vouching required: both users must vouch
- Creates +1 Bookshares count on both profiles
- Only available once per user pair

---

#### Implementation Notes

**Database/State**:
- Posts need `status` field: 'active' | 'pending_exchange' | 'archived'
- Pending exchanges need to track:
  - `pendingExchange: { initiator, recipient, givingPost, receivingPost, timestamp }`
- System messages in conversation thread
- Notifications for exchange events

**Validation**:
- Check selected book still active before confirming
- Prevent confirming if either user's book is already archived
- Allow cancellation at any time before confirmation

**Notifications**:
- "Person A proposed an exchange with you"
- "Sarah confirmed the exchange!"
- "Sarah declined the exchange"

**Statistics**:
- Exchange (both sides complete): Both get +1 given, +1 received
- Gift (no exchange): Giver +1 given, receiver +1 received

### Archive & History

**Archived Posts**:
- Read-only, cannot interact (no new comments/messages)
- Visible on user profile under Archive tab

**Viewing Others' Profiles**:
- Active posts visible
- Separator: "Completed Exchanges"
- Archived posts below separator, slightly faded
- User can hide/delete their own archived posts via per-post menu

**Archive Management** (Own Posts):
- Three-dot menu on each archived post:
  - "Hide from public" - removes from public profile view
  - "Delete forever" - permanently removes post

### User Profiles

**Profile Pictures**:
- Optional
- Default: Generated avatar or initials
- Users can upload custom picture
- **Upload flow**:
  1. Click "Change Avatar" in Settings
  2. File picker opens (JPG, PNG, GIF accepted, max 5MB)
  3. Cropping tool appears (react-easy-crop or similar)
  4. User crops to square aspect ratio
  5. Image stored as base64 in localStorage (demo) or uploaded to server (production)
  6. Displayed immediately at 200x200px

**Profile URL Format**:
- Username-based: `/profile/jordansmith`
- Usernames must be unique
- **Username changes**: Allowed, old URLs return 404 (no redirects)
  - User can change username in Settings
  - Warning: "Old profile links will no longer work"
  - Immediate update across platform

**Reading Preferences**:
- UI: Multi-select checkboxes for genres
- Authors: Tag/autocomplete input
- Used for:
  - Profile display
  - Matching/recommendations (future)
  - Feed filter option

**Social Links** (Simplified):
- Generic link fields with label + URL
- UI shows:
  ```
  Social Links
  ┌─────────────────────────────┐
  │ Label: [Goodreads         ] │ ← Text suggestions appear
  │ URL:   [https://...       ] │
  │ [× Remove]                  │
  ├─────────────────────────────┤
  │ [+ Add Another Link]        │
  └─────────────────────────────┘
  ```
- Label suggestions: Goodreads, Instagram, Twitter, Bluesky, Mastodon, Facebook (user can type custom)
- Already added links show above empty field with × button to remove
- No predefined platform selection, just text fields

### Messaging

**Unread Count Badge**:
- Number displayed in red badge on "Messages" nav item
- Shows total unread message count

**Thread List**:
- Grouped by post/book
- Shows book thumbnail, title, other user's name
- Unread indicator per conversation
- Most recent message timestamp

### Comments

**Comment Structure**: Flat list
- Chronological order
- No threading or nested replies
- Simple, easy to follow

### Cross-Posting

**Share Buttons** (on own posts only):
- Platform icons appear on user's own posts
- Platforms: Buy Nothing, Facebook, Nextdoor, Reddit
- Click opens share dialog or copies text

**Share URLs**:
- Facebook: `https://www.facebook.com/sharer/sharer.php?u=POST_URL`
- Reddit: Reddit submit page with title/link
- Buy Nothing/Nextdoor: Copy formatted text to clipboard

**Generated Share Text Example**:
```
"The Overstory" by Richard Powers - available for free in Sellwood!

Condition: Great, slight wear on cover

Get it on BookSharePDX: https://booksharepdx.app/post/12345
```

### Account Management

**Delete Account**:
- User posts: Deleted completely
- User messages: Anonymized (show as "[deleted user]")
- User comments: Anonymized
- Action is permanent and immediate

### About Page

**Sections**:
- Mission/story: Why BookSharePDX exists, the vision
- How it works: Step-by-step guide
- Team/credits: Who built it, acknowledgments
- FAQ section with common questions
- Contact email link for additional questions (no form)

### Toast Notifications

**Position**:
- Desktop: Top-right
- Mobile: Top-center

**Auto-Dismiss**: 3-5 seconds
**Colors**:
- Green: Success
- Red: Error
- Yellow: Warning

### Timestamps

**Format**: Hybrid relative and absolute
- **Recent** (< 6 hours): Relative time
  - "2 minutes ago"
  - "1 hour ago"
  - "5 hours ago"
- **Older** (≥ 6 hours): Absolute with time
  - "11:45am Dec 28, 2025"
  - "3:22pm Jan 15, 2025"
  - Format: `hh:mmam/pm MMM DD, YYYY`

**Applied to**:
- Post age (shown on all posts)
- Comment timestamps
- Message timestamps
- All moderation actions

### Suspended User Banner

**Display**: Persistent header banner
- Shows when suspended user is logged in
- Appears at top of every page (below main nav)
- Cannot be dismissed
- Red/warning color

**Content**:
```
⚠️ Your account is suspended until [date] for [reason].
You cannot post, comment, or send messages during this time.
To appeal: email [email] with subject "BOOKSHAREPDX APPEAL"
```

**Behavior**:
- User can still browse, view profile, edit settings
- Blocking actions: Post, Comment, Message buttons are disabled
- Clicking disabled button shows same banner message as toast

### Distance Calculations

**Point-to-Point** (Pin to Pin):
- Haversine formula for accurate geo distance
- Earth radius: 3959 miles (or use standard library)

**Point-to-Neighborhood** (Pin to Neighborhood or vice versa):
- Calculate to center of neighborhood polygon (centroid)
- Use polygon centroid coordinates

**Neighborhood-to-Neighborhood**:
- Center to center distance

**Demo Implementation**:
- Calculate on-the-fly (same as eventual production)
- Store lat/lng for pins, centroid for neighborhoods
- Consistent with backend implementation

**Display**:
- Rounded to one decimal: "0.8 mi", "2.3 mi"

### Infinite Scroll

**Initial Load**: 10 posts

**Scroll Trigger**: 80% of page scrolled
- When user scrolls to 80% of current content
- Load next 10 posts
- Smooth loading indicator

**Loading State**:
- Skeleton screens for loading posts
- "Loading more..." text
- Spinner at bottom of feed

**End of Results**:
- "No more books to show" message
- Suggest: "Expand your search radius" or "Post a book"

---

## Moderation & Safety

### Overview

BookSharePDX uses a community moderation system with trusted moderators and site administrators to maintain safety and enforce community guidelines.

### Roles & Permissions

**Administrators**:
- Site owners and core team
- Can promote/demote moderators
- Can override any moderator decision
- Can permanently ban users (IP-based)
- Full access to all moderation tools and logs

**Moderators**:
- Trusted community members promoted by admins
- Can review reports
- Can remove content
- Can warn users
- Can suspend users (temporary restrictions)
- Can escalate issues to admins for permanent bans
- Cannot promote other moderators
- Status hidden from community until they take official action

### Moderator Promotion

**Process**: Admin-initiated only
- Admins identify trusted, active community members
- Admin sends promotion via system (automatic, no acceptance needed)
- New moderator receives email notification
- Moderator gains access to moderation dashboard immediately
- Written guidelines/handbook provided for training

### Community Guidelines Acceptance

**During Sign-Up**:
- After email/password entry, user must acknowledge Community Guidelines
- Checkbox: "I have read and agree to the Community Guidelines"
- Link to full guidelines opens in new tab
- Cannot proceed without checking box
- Guidelines cover:
  - Respectful behavior
  - No harassment or hate speech
  - No spam or scams
  - Book exchange etiquette
  - Meeting safety recommendations

### Report System

**Filing Reports** (covered in Safety Features section, expanded here):

When user reports content or another user:
1. Report submitted with reason and optional details
2. Report enters moderation queue as "New"
3. Reporter sees confirmation: "Report submitted. Thank you for helping keep BookSharePDX safe."

**Special Case - Reports Against Moderators**:
- If reported user is a moderator, report bypasses mod queue
- Goes directly to admins only
- Moderators cannot see reports filed against themselves

### Moderation Dashboard

**Access**:
- URL: `/moderation`
- Navigation: Separate "Moderation" tab in header (visible only to moderators/admins)
- Desktop and mobile responsive

**Dashboard Sections**:

1. **Reports Queue**:
   - Tabs: New | In Review | Resolved
   - Each report shows:
     - Reporter username
     - Reported user/content
     - Report reason
     - Timestamp
     - Report type (post/comment/user/message)
   - Click to open detailed review view

2. **User Lookup**:
   - Search bar: Find user by username or email
   - Results show:
     - User profile summary
     - Moderation history (warnings, suspensions, bans)
     - Reports filed by this user
     - Reports filed against this user
     - Quick action buttons

3. **Moderator Activity Log**:
   - Feed of all moderator actions
   - Shows: Moderator name, action type, target user, timestamp, reason
   - Searchable and filterable
   - Provides transparency within moderator team

4. **Statistics** (MVP):
   - Total reports this week/month
   - Average response time
   - Actions breakdown (dismissed/warned/suspended/banned)
   - Basic metrics for mod team transparency

### Report Review Workflow

**Step 1: Claim Report**
- Moderator opens report from "New" queue
- Click "Start Review" button
- Report moves to "In Review" and shows claiming moderator's name
- Other moderators can see it's being handled

**Step 2: Investigation**
- Moderator views:
  - Reported content (post, comment, or user profile)
  - Full context (thread, conversation history)
  - Reporter's description and reason
  - Reported user's moderation history
  - Previous offenses (if any)
- Moderator can add internal notes (visible to other mods)

**Step 3: Take Action**
Moderator selects one of the following:

**Dismiss**:
- No action taken, report unfounded
- Reason logged for transparency
- Reporter notified: "Your report has been reviewed. No action was needed at this time."

**Warn User**:
- Send official warning message via Moderator DM
- Warning logged in user's moderation history (permanent)
- User receives message explaining violation
- Reporter notified: "Your report has been reviewed. Action has been taken."

**Remove Content**:
- Post or comment is removed from platform
- Content disappears from feed/threads
- Only visible in reported user's moderation history (Settings)
- User receives Moderator DM notification
- Reporter notified: "Your report has been reviewed. Action has been taken."

**Suspend User**:
- Temporary account restriction
- Duration options: 1 day, 7 days, 30 days
- User cannot post, comment, or send messages during suspension
- User CAN still:
  - View their profile
  - Edit their profile
  - Delete their account
  - Browse anonymously
- User sees banner: "Your account is suspended until [date] for [reason]"
- Logged in moderation history
- User receives Moderator DM with explanation
- Reporter notified: "Your report has been reviewed. Action has been taken."

**Escalate to Admin**:
- Moderator recommends permanent ban
- Admin reviews case and makes final decision
- Used for severe or repeat violations

**Step 4: Notification**
- Reporter receives generic confirmation (doesn't reveal specific action)
- Reported user receives detailed notification if action taken
- Report marked "Resolved" and archived

### User Moderation States

**Block** (User-Initiated):
- Personal action, not moderation
- Mutual invisibility
- Reversible by blocker
- Covered in Safety Features section

**Suspend** (Moderator-Initiated):
- Temporary restriction (1/7/30 days)
- Limited platform access (can browse, can't interact)
- Can edit profile, delete account
- Automatically lifted after duration
- Visible in user's moderation history
- Can be reverted early by moderators/admins

**Ban** (Admin-Initiated):
- Permanent account restriction
- **IP-based**: User's IP address logged and blocked on next login attempt
- User cannot log in
- All posts and content hidden from platform
- Ban can be reverted by admins (rare)
- Visible in moderation logs

### Content Removal Display

**When Post is Removed**:
- Post disappears entirely from feed
- Other users cannot see it
- Removed post is still visible to:
  - The user who posted it (in their moderation history)
  - Moderators (in review interface)

**When Comment is Removed**:
- Comment disappears from thread
- Same visibility rules as posts

**Partial Transparency**:
- No placeholder or "removed" notice shown to community
- Clean removal to avoid drawing attention
- User can see their own removed content in Settings → Moderation History

### Moderator Messaging

**Moderator DM System**:
- Special message type: "Moderator Notice"
- Appears in user's Messages inbox with distinct badge/icon
- Subject line indicates reason (Warning, Suspension, Content Removal)
- Body explains violation and action taken
- Uses templates for consistency:
  - Warning template
  - Suspension template
  - Content removal template
  - Custom message option for complex cases

**Message Features**:
- User can reply for questions or appeals
- All moderators can view the thread (not just sender)
- Moderator can close thread if resolved
- Thread archived but remains accessible

**Moderator-Only Notes**:
- Attached to each report
- Chronological list of notes mods can add
- Visible only to moderators and admins
- Used to discuss difficult cases or ask for second opinions
- Format:
  ```
  Notes:
  • jordan - 2 hours ago: "This looks like spam. Should we ban?"
  • alexpdx - 1 hour ago: "Agreed, clear spam. Banning now."
  ```
- Simple, no threading, just chronological notes

### User Moderation History

**Location**: Settings → Moderation History

**What Users See**:
- Full details of all actions taken against them
- Format:
  ```
  [Date] - [Action Type]
  Reason: [Detailed explanation]
  Moderator: [Moderator username]
  ```
- Examples:
  - "Jan 15, 2025 - Warning | Reason: Inappropriate language in comment | Moderator: @jordan"
  - "Jan 22, 2025 - Post Removed | Reason: Spam content | Moderator: @alexpdx"
  - "Feb 1, 2025 - 7-day Suspension | Reason: Repeat violation of community guidelines | Moderator: @sarahbooks"

**Removed Content View**:
- Users can view their own removed posts/comments
- Shows original content with "REMOVED" label
- Explanation of why it was removed

**Appeal Option**:
- Simple text instruction next to each action
- "To appeal this decision, email our moderation team at [email] with the subject line BOOKSHAREPDX APPEAL"

### Appeal Process

**All Appeals via Email**:
- No in-app appeal form or functionality
- Users email moderation team directly
- Subject line: "BOOKSHAREPDX APPEAL"
- Admin reviews email and responds
- Admin can reverse decision if appropriate

**For Banned Users**:
- Banned users cannot log in
- Ban notice shows: "If you believe this is a mistake, email our moderation team at [email] with the subject line BOOKSHAREPDX APPEAL"
- Admin reviews and can reverse ban if appropriate

### Preventing Moderator Abuse

**Admin Oversight**:
- Admins review moderator activity regularly
- Activity log shows all actions
- Flag unusual patterns (e.g., one mod dismissing all reports)

**Appeal Process**:
- Users can appeal any decision to admins
- Admin can override moderator decisions

**Activity Tracking**:
- All moderator actions logged with timestamp and reason
- Cannot be deleted (audit trail)

**Community Feedback**:
- Users can report moderator abuse via contact form
- Reports go directly to admins, not mod queue

### Enforcement Guidelines

**Warning System - Escalation Path**:
1. **First offense**: Warning message
2. **Second offense**: 1-day suspension
3. **Third offense**: 7-day suspension
4. **Fourth offense**: 30-day suspension
5. **Fifth offense**: Escalate to admin for potential permanent ban

**All warnings are permanent** (no expiration)

**Exceptions**:
- Severe violations (threats, doxxing, hate speech): Skip to suspension or ban
- Spam/scam accounts: Immediate ban without warning
- Moderator discretion for context

### Community Guidelines

**Content Policy** (what's allowed):
- Respectful communication
- Book-related posts only
- Accurate book conditions
- Safe exchange practices

**Prohibited Content**:
- Harassment, hate speech, threats
- Spam, scams, fraud
- Adult content or illegal material
- Personal information (doxxing)
- Impersonation

**Response Templates** (for moderators):

**Warning Template**:
```
Hi [username],

This is an official warning from the BookSharePDX moderation team.

Your [post/comment] violated our Community Guidelines: [specific rule]

[Quote or describe the violation]

Please review our Community Guidelines to ensure future posts comply. Repeated violations may result in suspension or removal from the platform.

If you have questions or believe this is a mistake, you can reply to this message or email our moderation team at [email] with the subject line BOOKSHAREPDX APPEAL.

— BookSharePDX Moderation Team
```

**Suspension Template**:
```
Hi [username],

Your account has been suspended for [duration] due to violations of our Community Guidelines.

Reason: [Detailed explanation]

During this suspension, you cannot post, comment, or send messages. You can still browse the platform and view your profile.

Your suspension will be lifted on [date]. To appeal this decision, email our moderation team at [email] with the subject line BOOKSHAREPDX APPEAL.

— BookSharePDX Moderation Team
```

**Content Removal Template**:
```
Hi [username],

Your [post/comment] has been removed for violating our Community Guidelines: [specific rule]

[Brief explanation]

You can view the removed content in Settings → Moderation History. To appeal this decision, email our moderation team at [email] with the subject line BOOKSHAREPDX APPEAL.

— BookSharePDX Moderation Team
```

### Moderator Guidelines (Handbook)

**Moderator Training Documents** (provided on promotion):
1. **Community Guidelines**: Full policy document
2. **Enforcement Guide**: When to warn vs. suspend vs. escalate
3. **Response Templates**: Copy-paste templates for consistency
4. **Best Practices**:
   - Always provide clear reasons
   - Be respectful and professional
   - When in doubt, ask another moderator
   - Escalate complex or severe cases
   - Review user's full history before acting
5. **Common Scenarios**: Examples of past cases and resolutions

**Moderator Expectations**:
- Respond to reports within 24-48 hours
- Maintain neutrality and fairness
- Use templates for consistency
- Document all actions with clear reasons
- Communicate professionally with users

---

## Future Enhancements

These are not in MVP but noted for future consideration:

- **Real-time notifications**: New messages, interest in your posts
- **Advanced search**: Full-text search, filter by reading level, language
- **Book clubs / reading groups**: Organized community features
- **Events**: Book swaps, meetups
- **Recommendation algorithm**: "Because you liked..."
- **Mobile apps**: Native iOS/Android apps
- **Push notifications**: Mobile app notifications
- **Map view of posts**: Interactive map showing nearby books (we decided against this for MVP, but could add later)

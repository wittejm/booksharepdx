# TODO - BookSharePDX Implementation

## Phase 1: Project Setup & Infrastructure

### Monorepo Structure
- [ ] Create root package.json with npm workspaces
- [ ] Create .node-version file (Node 20.x LTS)
- [ ] Set up frontend/ directory
- [ ] Set up backend/ directory (scaffolded but not implemented yet)
- [ ] Set up shared/ directory for TypeScript types
- [ ] Create .gitignore for all workspaces
- [ ] Set up ESLint and Prettier configs

### Frontend Foundation
- [ ] Initialize Vite + React + TypeScript project
- [ ] Install and configure Tailwind CSS
- [ ] Install React Router v6
- [ ] Install TanStack Query (React Query)
- [ ] Install D3.js for map coordinate transformations
- [ ] Install react-easy-crop for avatar cropping
- [ ] Set up path aliases (@/ imports)
- [ ] Create environment variable files (.env.development, .env.production.demo)
- [ ] Configure Vite for HashRouter/BrowserRouter switching

### Shared Types Package
- [ ] Create @booksharepdx/shared package structure
- [ ] Define core entity types (User, Book, Post, Comment, Message, etc.)
- [ ] Define post states (active, pending_exchange, archived)
- [ ] Define API request/response types
- [ ] Export all types from index

---

## Phase 2: Demo Data & localStorage Architecture

### Mock Data Creation
- [ ] Create 20 realistic user profiles with:
  - [ ] Usernames and bios
  - [ ] Mix of neighborhood and pin locations (lat/lng)
  - [ ] Reading preferences (genres, authors)
  - [ ] Stats (books given, received, bookshares)
  - [ ] Profile pictures (base64 or placeholder avatars)
- [ ] Create 50 book listings with:
  - [ ] Real book titles and authors across genres
  - [ ] Mix of "give away" and "exchange" types
  - [ ] Realistic condition notes
  - [ ] Geographic distribution across Portland neighborhoods
- [ ] Create message threads tied to posts
- [ ] Create public comments on posts
- [ ] Create completed exchange history
- [ ] Create bookshare vouching relationships

### Data Service Layer (localStorage)
- [ ] Create mockData.ts with all hardcoded demo data
- [ ] Create dataService.ts with localStorage operations
  - [ ] GET methods: Merge hardcoded mocks + localStorage data
  - [ ] POST methods: Write to localStorage
  - [ ] PUT methods: Update in localStorage
  - [ ] DELETE methods: Remove from localStorage
- [ ] Implement filtering logic (genre, distance, type, search)
- [ ] Implement sorting logic (distance, recency)
- [ ] Implement distance calculation utilities
  - [ ] Haversine formula for point-to-point
  - [ ] Centroid calculation for neighborhoods
  - [ ] Point-to-neighborhood distance
- [ ] Create spoofed endpoint functions
  - [ ] sendVerificationEmail (instantly sets verified: true)
  - [ ] resetPassword (instantly updates password in localStorage)
  - [ ] Any other email/backend-dependent operations

---

## Phase 3: Core UI Components

### Layout & Navigation
- [ ] Create Header component
  - [ ] Logo
  - [ ] Navigation (Browse, Post, Messages, Discord icon, Profile dropdown)
  - [ ] Discord icon links to https://discord.gg/KsN2rapS
  - [ ] Mobile responsive nav (hamburger menu)
  - [ ] Demo testing link: "Demo: Reset Password" (for testing)
- [ ] Create Footer component
  - [ ] Contact/Feedback email link
  - [ ] Privacy Policy link
  - [ ] Terms of Use link
  - [ ] GitHub repository link
  - [ ] Discord styled button "Join our Discord!"
  - [ ] Copyright: © 2025 BookSharePDX
- [ ] Create main layout wrapper
- [ ] Implement routing with HashRouter/BrowserRouter toggle

### Reusable Components
- [ ] Button component (variants: primary, secondary, ghost)
- [ ] Input component (text, textarea, with validation)
- [ ] Select/Dropdown component
- [ ] Modal component (centered on desktop, full-screen on mobile)
- [ ] Toast notification system
  - [ ] Position: top-right (desktop), top-center (mobile)
  - [ ] Auto-dismiss: 3-5 seconds
  - [ ] Colors: green (success), red (error), yellow (warning)
- [ ] Loading spinner/skeleton screens
- [ ] Empty state component
- [ ] Card component
- [ ] Badge component (for post types, statuses)
- [ ] Avatar component (with initials fallback)

---

## Phase 4: Interactive Map

### Neighborhood Map
- [ ] Load and parse Neighborhoods_regions.geojson
- [ ] Calculate centroids for all neighborhoods
- [ ] Convert GeoJSON to SVG paths
- [ ] Implement D3.js coordinate transformations
- [ ] Create NeighborhoodMap component
  - [ ] Render all neighborhood polygons
  - [ ] Hover states with tooltips (neighborhood names)
  - [ ] Click to select neighborhood (highlight polygon)
  - [ ] Smooth transitions
- [ ] Create PinDropMap component
  - [ ] Click to drop pin
  - [ ] Draggable pin marker
  - [ ] Show approximate location
- [ ] Create LocationSelector component
  - [ ] Toggle between neighborhood/pin modes
  - [ ] Integrate both map components
  - [ ] Confirm button
  - [ ] Responsive design (mobile + desktop)

---

## Phase 5: Authentication & User Management

### Auth UI (Email/Password Only - OAuth deferred to POST_MVP.md)
- [ ] Create Login page/modal
  - [ ] Email + password form
  - [ ] "Forgot password" link
  - [ ] Form validation
- [ ] Create Sign-up page/modal
  - [ ] Email + password form
  - [ ] Username field (unique)
  - [ ] Bio field (required, minimum one sentence)
  - [ ] Community Guidelines acceptance checkbox
  - [ ] Form validation
- [ ] Create Forgot Password flow
  - [ ] Email input
  - [ ] Demo: Spoofed endpoint, instant password reset
  - [ ] Demo testing link in header for easy access
  - [ ] Success message
- [ ] Create Email Verification flow
  - [ ] Toast: "Verification email sent" with Resend button
  - [ ] Demo: Spoofed endpoint instantly sets verified: true
  - [ ] Unverified user blocking (show modal if trying to post/comment/message)
  - [ ] Modal: "Verify your account to continue"

### Onboarding
- [ ] Create Welcome screen
- [ ] Create Location Selection onboarding step
- [ ] Redirect to browse feed after setup

### User Context
- [ ] Create AuthContext for user state
- [ ] Implement login/logout (demo: localStorage)
- [ ] Implement session persistence (localStorage)
- [ ] Protected route wrapper
- [ ] Current user stored in localStorage

---

## Phase 6: Browse & Discovery

### Browse Page
- [ ] Create Browse page layout (filters sidebar + feed)
- [ ] Implement filters sidebar
  - [ ] Genre checkboxes
  - [ ] Distance slider (1-10+ miles)
  - [ ] Type filters (Give Away, Exchange)
  - [ ] "Group posts by user" toggle (global only)
  - [ ] Reading preferences filter (match user's favorite genres)
  - [ ] Clear filters button
- [ ] Create mobile filters dropdown
- [ ] Implement search bar (title/author search, live filtering)
- [ ] Implement infinite scroll
  - [ ] Initial load: 10 posts
  - [ ] Trigger: 80% scrolled
  - [ ] Load: 10 more posts
  - [ ] Loading state with skeleton screens
  - [ ] End of results message
- [ ] Implement distance-based sorting (nearest first)
- [ ] Empty state for no results

### Post Cards
- [ ] Create PostCard component
  - [ ] Book cover thumbnail (or default book icon)
  - [ ] Title and author
  - [ ] User info (pic, username, distance)
  - [ ] Type badge (give away/exchange)
  - [ ] Post age timestamp (relative <6h, absolute ≥6h)
  - [ ] Three-dot menu
- [ ] Implement expand/collapse inline
- [ ] Create expanded post view
  - [ ] Full book metadata
  - [ ] User notes/condition
  - [ ] Posted date
  - [ ] Action buttons
  - [ ] Public comments section
- [ ] Implement three-dot menu actions
  - [ ] Report post
  - [ ] Block user
  - [ ] Bookmark/Save post

### Grouped User Cards
- [ ] Create GroupedUserCard component
  - [ ] Profile pic, username, distance, book count
  - [ ] Collapsed state (default)
  - [ ] Expand to show books list inline
  - [ ] Click individual book to view detail
- [ ] Implement grouping logic
  - [ ] Global filter ON: all users grouped
  - [ ] Global filter OFF: individual posts
  - [ ] Sort by user distance (when grouped)

---

## Phase 7: Post Creation

### Create Post Flow
- [ ] Create PostCreationModal component
  - [ ] Full-screen on mobile, centered on desktop
- [ ] Implement book search autocomplete
  - [ ] Search demo data by title/author
  - [ ] Display results with covers
  - [ ] Select book from results
- [ ] Create manual book entry form (if not found)
  - [ ] Title, author, genre fields
  - [ ] Optional cover image upload
- [ ] Implement exchange type selector (give away / exchange)
- [ ] Add notes textarea (condition, location details)
- [ ] Form validation
- [ ] Success toast and redirect to feed
- [ ] New post appears in feed (from localStorage)

---

## Phase 8: Interest & Messaging

### Interest Flow
- [ ] Create "I'm Interested" button on posts
- [ ] Create interest modal (public comment OR private message choice)
- [ ] Anonymous user sign-up prompt

### Messaging (All Messages Tied to Posts)
- [ ] Create Messages page
  - [ ] Desktop: split view (thread list + conversation)
  - [ ] Mobile: thread list → full-screen conversation
- [ ] Create MessageThread component
  - [ ] Post card at top (book context)
  - [ ] Message bubbles (chronological)
  - [ ] Unread indicators
  - [ ] Message timestamps (relative <6h, absolute ≥6h)
  - [ ] System messages (exchange proposals, completions, etc.)
- [ ] Create MessageInput component
- [ ] Implement unread count badge on Messages nav
- [ ] No standalone DMs (all tied to posts)

### Public Comments
- [ ] Create Comment component
- [ ] Create CommentList component
- [ ] Create CommentInput component
- [ ] Flat comment structure (no threading, chronological)
- [ ] Comment timestamps (relative <6h, absolute ≥6h)

---

## Phase 9: User Profiles

### Profile Page
- [ ] Create Profile page layout
  - [ ] Header (avatar, username, bio, location, member since)
  - [ ] Stats summary (books given, received, bookshares)
  - [ ] Tabs (Active Posts, Archive, Saved)
- [ ] Implement profile tabs
  - [ ] Active Posts tab
  - [ ] Archive tab (faded completed exchanges)
  - [ ] Saved tab (bookmarked posts + posts user expressed interest in)
    - [ ] Auto-added when user messages/comments on a post
    - [ ] Manual bookmark button
    - [ ] Can be removed manually
- [ ] Viewing others' profiles
- [ ] Viewing own profile
- [ ] Empty states for each tab

### Profile Avatar Upload
- [ ] Create avatar upload flow in Settings
  - [ ] File picker (JPG, PNG, GIF accepted, max 5MB)
  - [ ] Cropping tool (react-easy-crop)
  - [ ] Crop to square aspect ratio
  - [ ] Store as base64 in localStorage (demo mode)
  - [ ] Display at 200x200px
  - [ ] Default: Generated avatar or initials

### Settings
- [ ] Create Settings page
  - [ ] Account section (email, password change)
  - [ ] Location section (change location with map)
  - [ ] Profile section
    - [ ] Username (editable, warning about broken links)
    - [ ] Bio
    - [ ] Avatar upload
    - [ ] Reading preferences (genres, authors)
    - [ ] Social links (simplified UI with label + URL fields)
  - [ ] Privacy section (block list)
  - [ ] Moderation History section (see Phase 18)
  - [ ] Danger zone (delete account)
- [ ] Implement profile editing
- [ ] Implement location change
- [ ] Implement block list management
- [ ] Social links UI
  - [ ] Label + URL fields
  - [ ] Suggestions: Goodreads, Instagram, Twitter, Bluesky, Mastodon, Facebook
  - [ ] Add/remove links with +/× buttons
  - [ ] Already added links shown above empty field

---

## Phase 10: Exchange & Gift Completion

### Give Away Flow (Simple)
- [ ] Create "Mark as Given" button on own posts
- [ ] Recipient selection modal
  - [ ] List users who commented/messaged on this post
  - [ ] Show profile pic, username, distance, last interaction
  - [ ] Sort by most recent interaction
- [ ] Confirm gift modal
  - [ ] Summary of action
  - [ ] Stats update preview
- [ ] Archive post immediately
- [ ] Update stats: Giver +1 given, Recipient +1 received
- [ ] Send system message to conversation: "✅ Gift Completed"

### Exchange Flow (Two-Party Confirmation)
- [ ] Implement "Mark as Given" for Exchange posts
- [ ] Recipient selection modal (same as give away)
- [ ] Select book to receive from recipient
  - [ ] Show recipient's active posts
  - [ ] Radio buttons to select one book
  - [ ] Display book cover, title, author, type
  - [ ] Checkbox: "I gave this away (no exchange)"
- [ ] Create exchange proposal
  - [ ] Both posts set to status: "Pending Exchange Confirmation"
  - [ ] Initiator post shows: "Waiting for [Person] to confirm"
  - [ ] Recipient post shows banner: "Waiting for you to confirm"
  - [ ] Store pending exchange details
- [ ] Send system message with exchange details
  - [ ] "📦 Exchange Proposed"
  - [ ] Show both books being exchanged
  - [ ] Confirm/Decline buttons in message
- [ ] Send notification to recipient

### Exchange Confirmation (Recipient Side)
- [ ] Show pending exchange banner on recipient's post
- [ ] Confirm/Decline buttons
  - [ ] In messages thread
  - [ ] On post card
- [ ] Decline modal
  - [ ] Reason selection (book unavailable, prefer different, changed mind, other)
  - [ ] Optional message to initiator
- [ ] Handle confirmation
  - [ ] Archive both posts immediately
  - [ ] Update stats: Both users +1 given, +1 received
  - [ ] Send system message: "✅ Exchange Completed"
  - [ ] Enable bookshare vouching
- [ ] Handle decline
  - [ ] Both posts return to active status
  - [ ] Clear pending exchange data
  - [ ] Send system message: "❌ Exchange Declined" with reason

### Exchange Edge Cases
- [ ] Selected book no longer available
  - [ ] Detection when recipient confirms
  - [ ] Show error modal to recipient
  - [ ] Options:
    - [ ] Offer a different book (shows recipient's other books)
    - [ ] Accept as gift (no exchange)
    - [ ] Cancel transaction
  - [ ] If offering different book, initiator must re-confirm
- [ ] Recipient has no available books
  - [ ] Show message during selection
  - [ ] Options:
    - [ ] Give away (no exchange)
    - [ ] Wait for them to post books
    - [ ] Select someone else
- [ ] Exchange post given without exchange
  - [ ] When "I gave this away" checked
  - [ ] Confirmation modal explains change from Exchange to Gift
  - [ ] Acts like gift flow
- [ ] Cancel pending exchange
  - [ ] Cancel button for initiator (on pending post)
  - [ ] Confirmation modal
  - [ ] Both posts return to active
  - [ ] Send system message: "❌ Exchange Cancelled"

### Post State UI
- [ ] Active state
  - [ ] Actions: [Edit] [Mark as Given] [Share]
- [ ] Pending Exchange (Initiator)
  - [ ] Show waiting message
  - [ ] Actions: [Cancel Exchange] [View Messages]
- [ ] Pending Exchange (Recipient)
  - [ ] Show confirmation banner
  - [ ] Actions: [Confirm Exchange] [Decline Exchange] [View Messages]
- [ ] Archived state
  - [ ] Read-only (no new comments/messages)
  - [ ] Visible in Archive tab
  - [ ] Archive management: Hide from public / Delete forever

### Bookshare Vouching
- [ ] "I met this person" button in messages
- [ ] Available after exchange/gift completion
- [ ] Mutual vouching required (both must vouch)
- [ ] Update bookshares count on both profiles (+1 each when mutual)
- [ ] Only available once per user pair

---

## Phase 11: Safety Features

### Block & Report
- [ ] Create Block User modal
  - [ ] Confirmation dialog
  - [ ] Immediate mutual invisibility
  - [ ] Add to block list in localStorage
- [ ] Create Report User/Post modal
  - [ ] Report type (spam, harassment, inappropriate, other)
  - [ ] Additional details textarea
  - [ ] Include message history checkbox (if reporting from conversation)
  - [ ] Submit creates report in moderation queue
- [ ] Implement block/report in three-dot menus
  - [ ] Post cards
  - [ ] User profiles
  - [ ] Message conversations
- [ ] Create "Block after report" prompt
- [ ] Implement blocked users list in Settings
  - [ ] Show blocked users
  - [ ] Unblock button

---

## Phase 12: Cross-Posting (Share Buttons Only)

### Share Functionality on Own Posts
- [ ] Create share buttons (appear on user's own posts only)
  - [ ] Platform icons: Buy Nothing, Facebook, Nextdoor, Reddit
  - [ ] Visible when viewing own posts
- [ ] Implement platform-specific share behavior
  - [ ] Facebook: Open share dialog with pre-filled post
  - [ ] Reddit: Open submit page with title/link
  - [ ] Buy Nothing: Copy formatted text to clipboard + toast
  - [ ] Nextdoor: Copy formatted text to clipboard + toast
- [ ] Generate formatted share text
  - [ ] Book title and author
  - [ ] Condition notes
  - [ ] Link to post on BookSharePDX
- [ ] Copy to clipboard functionality
- [ ] Toast confirmation when copied

---

## Phase 13: Landing Page & Static Pages

### Landing Page
- [ ] Create Landing page
  - [ ] Hero section (headline, visual, CTAs)
  - [ ] Public feed preview (shows actual demo posts)
  - [ ] "How It Works" section (3-4 steps with icons)
  - [ ] "Why BookSharePDX vs Others" section
  - [ ] Footer
- [ ] Redirect authenticated users to browse feed (skip landing)
- [ ] Sign-up/Login CTAs for anonymous visitors
- [ ] Clicking posts in public feed → sign-up prompt for interactions

### About Page
- [ ] Create About page
  - [ ] Mission/story: Why BookSharePDX exists
  - [ ] How it works: Step-by-step guide
  - [ ] Team/credits
  - [ ] FAQ section (static, no form)
  - [ ] Contact email link for questions

### Legal Pages
- [ ] Create Privacy Policy page (generated from template like termly.io)
- [ ] Create Terms of Use page
  - [ ] User conduct rules
  - [ ] Liability disclaimer
  - [ ] Content ownership
  - [ ] 13+ age requirement

---

## Phase 14: Polish & Responsiveness

### Mobile Optimization
- [ ] Test all pages on mobile viewport
- [ ] Adjust touch targets (minimum 44px)
- [ ] Optimize modals for mobile (full-screen where appropriate)
- [ ] Test map interactions on touch devices
- [ ] Smooth scrolling and transitions

### Accessibility
- [ ] Semantic HTML throughout
- [ ] ARIA labels where needed
- [ ] Keyboard navigation for all interactive elements
- [ ] Focus indicators visible
- [ ] Color contrast WCAG AA compliance
- [ ] Screen reader testing

### Error Handling & States
- [ ] Inline form validation with clear error messages
- [ ] Toast notifications for all user actions
- [ ] Empty states with helpful messages and CTAs
- [ ] Loading states (spinners/skeletons)
- [ ] Graceful error handling
- [ ] 404 page for invalid routes

### Suspended User Experience
- [ ] Persistent header banner for suspended users
  - [ ] Red/warning color
  - [ ] Shows suspension reason and end date
  - [ ] Appeal instructions (email with subject "BOOKSHAREPDX APPEAL")
  - [ ] Cannot be dismissed
- [ ] Disable post/comment/message actions
- [ ] Show same banner message as toast when clicking disabled buttons
- [ ] Allow browsing, profile viewing, settings editing

---

## Phase 15: GitHub Pages Deployment

### Deployment Setup
- [ ] Create .github/workflows/deploy.yml
  - [ ] Trigger on push to main
  - [ ] Build with VITE_USE_HASH_ROUTER=true
  - [ ] Build with VITE_USE_DEMO_DATA=true
  - [ ] Deploy to gh-pages branch
- [ ] Configure GitHub Pages in repo settings
  - [ ] Source: gh-pages branch
  - [ ] URL: wittejm.github.io/booksharepdx
- [ ] Test HashRouter on GitHub Pages
- [ ] Add deployment badge to README

### Production Build
- [ ] Optimize build size
- [ ] Test production build locally
- [ ] Verify environment variables
- [ ] Test on GitHub Pages URL
- [ ] Verify all features work with HashRouter

---

## Phase 16: Documentation

### README Updates
- [ ] Add demo site link (GitHub Pages URL)
- [ ] Add setup instructions
- [ ] Add development instructions
- [ ] Add deployment instructions
- [ ] Add screenshots/demo GIF
- [ ] Technology stack list
- [ ] Contributing guidelines link

### Code Documentation
- [ ] Add JSDoc comments to key functions
- [ ] Document component props (TypeScript interfaces)
- [ ] Document data structures
- [ ] Create CONTRIBUTING.md

---

## Phase 17: Moderation Features

### Moderation Dashboard
- [ ] Create `/moderation` route (moderators/admins only)
- [ ] Add "Moderation" tab to header navigation (visible only to mods/admins)
- [ ] Create Moderation Dashboard layout
  - [ ] Reports Queue section (tabs: New, In Review, Resolved)
  - [ ] User Lookup section with search
  - [ ] Moderator Activity Log section
  - [ ] Statistics section (MVP: basic metrics)

### Reports Queue
- [ ] Create ReportCard component
  - [ ] Show reporter, reported user/content, reason, timestamp
  - [ ] "Start Review" button
- [ ] Implement queue filtering/sorting
- [ ] Create Report Detail view
  - [ ] Show full context (content, thread, user history)
  - [ ] Action buttons (Dismiss, Warn, Remove, Suspend, Escalate)
  - [ ] Moderator notes field (chronological list)
- [ ] Implement claim/unclaim report functionality
- [ ] Special routing: Reports against moderators go to admins only

### User Lookup
- [ ] Create user search interface
- [ ] Display user moderation history
- [ ] Show reports filed by/against user
- [ ] Quick action buttons (Warn, Suspend, Ban)

### Moderator Actions
- [ ] Implement Dismiss Report
  - [ ] Log reason
  - [ ] Notify reporter: "Your report has been reviewed"
- [ ] Implement Warn User
  - [ ] Send Moderator DM with warning template
  - [ ] Log in user's moderation history (permanent)
  - [ ] Notify reporter
- [ ] Implement Remove Content
  - [ ] Hide post/comment from feed (not deleted)
  - [ ] Keep in user's moderation history
  - [ ] Send Moderator DM notification
  - [ ] Notify reporter
- [ ] Implement Suspend User
  - [ ] Duration selection (1/7/30 days)
  - [ ] Restrict posting/commenting/messaging
  - [ ] Show persistent suspension banner to user
  - [ ] Send Moderator DM with suspension template
  - [ ] Log in moderation history
  - [ ] Notify reporter
  - [ ] Auto-lift suspension after duration
- [ ] Implement Escalate to Admin
  - [ ] Flag for admin review
  - [ ] Add moderator recommendation notes
  - [ ] Admin-only queue for escalated reports

### Moderator Messaging
- [ ] Create Moderator DM message type
  - [ ] Distinct badge/icon in Messages
  - [ ] Subject line (Warning, Suspension, Content Removal)
  - [ ] Template support
- [ ] Implement warning template
- [ ] Implement suspension template
- [ ] Implement content removal template
- [ ] Allow user replies to moderator messages
- [ ] All moderators can view thread (not just sender)
- [ ] Moderator can close thread

### Moderator Notes (Internal)
- [ ] Create notes field on each report
- [ ] Chronological list of notes
- [ ] Visible only to moderators and admins
- [ ] Format: "• [username] - [timestamp]: [note text]"
- [ ] Add note button and input

### User Moderation History
- [ ] Create Settings → Moderation History page
- [ ] Display all actions taken against user
  - [ ] Date, action type, reason, moderator name
  - [ ] Format: "[Date] - [Action Type] | Reason: [explanation] | Moderator: @[username]"
- [ ] Show removed content with "REMOVED" label
- [ ] Show appeal instruction text for each action

### Ban System (Admin-Only)
- [ ] Implement permanent ban
  - [ ] User cannot log in
  - [ ] No IP-based blocking (account-based only)
- [ ] Hide all user's posts/content from platform
- [ ] Show ban notice: "Your account has been banned. To appeal, email [email] with subject BOOKSHAREPDX APPEAL"
- [ ] Admin can reverse ban

### Moderator Promotion
- [ ] Create admin-only "Promote to Moderator" action
- [ ] Send email notification to promoted user (spoofed in demo)
- [ ] Grant moderation dashboard access (role flag in localStorage)
- [ ] Provide moderator handbook/guidelines link

### Activity Log
- [ ] Log all moderator actions
  - [ ] Moderator name, action type, target user, timestamp, reason
- [ ] Display in Moderation Dashboard
- [ ] Make searchable and filterable
- [ ] Prevent deletion (audit trail)
- [ ] Admin oversight features (flag unusual patterns)

### Community Guidelines
- [ ] Write Community Guidelines document
  - [ ] Content policy (what's allowed)
  - [ ] Prohibited content (harassment, spam, etc.)
  - [ ] Enforcement escalation path
- [ ] Add guidelines acceptance during sign-up
  - [ ] Checkbox: "I have read and agree to the Community Guidelines"
  - [ ] Link to full guidelines (opens in new tab)
  - [ ] Required to proceed
- [ ] Create Community Guidelines page
- [ ] Link from footer

### Moderator Guidelines
- [ ] Create moderator handbook document
  - [ ] Enforcement guide (when to warn vs suspend vs escalate)
  - [ ] Response templates (copy-paste ready)
  - [ ] Best practices
  - [ ] Common scenarios and examples
  - [ ] Moderator expectations (24-48h response time, etc.)
- [ ] Provide on moderator promotion
- [ ] Link from Moderation Dashboard

### Preventing Moderator Abuse
- [ ] Admin oversight: Review moderator activity regularly
- [ ] Flag unusual patterns in activity log
- [ ] Appeal process for users (via email)
- [ ] Contact form for reporting moderator abuse (goes to admins)

---

## Future Backend Integration (Post-Demo)

- [ ] Implement backend API (separate phase, see DESIGN.md)
- [ ] Update dataService.ts to use real API calls
- [ ] Remove localStorage persistence (move to database)
- [ ] Test API integration thoroughly
- [ ] Migrate from HashRouter to BrowserRouter for production
- [ ] Set up production deployment (AWS/Vercel/etc.)
- [ ] Implement real email service
- [ ] OAuth integration (see POST_MVP.md)

---

## Notes

- All tasks assume frontend-only implementation with localStorage persistence
- Backend tasks are scaffolded but not implemented
- Focus on creating a polished, fully-functional demo
- Code should be ready to plug into backend API with minimal changes
- Demo deployment target: GitHub Pages (wittejm.github.io/booksharepdx)
- See POST_MVP.md for deferred features (OAuth, advanced moderation, etc.)

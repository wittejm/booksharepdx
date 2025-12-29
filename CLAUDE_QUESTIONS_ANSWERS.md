# UX Design Questions & Answers

This document contains all the questions asked and answers provided during the UX design clarification process for BookSharePDX.

---

## Landing Page & Initial Experience

**Q1: What should the landing page hero (first screen before scrolling) communicate?**
- Clear value proposition
- Visual of books/community
- Immediate CTA
- Location context

**Q2: Should the landing page show real listings before sign-up?**
A: Yes, show public feed (Recommended) - Let visitors browse real books/posts to see value immediately, requires sign-up to interact

**Q3: What sections should appear below the fold on landing page?**
- How It Works
- Why BookSharePDX vs others
- ~~Neighborhood showcase~~ (decided to skip for MVP)

**Q4: How should authenticated users land when they return to the site?**
A: Browse feed immediately (Recommended) - Skip landing page, go straight to book discovery feed

---

## Navigation

**Q5: What should be in the main header navigation for logged-in users?**
A: Logo, Browse, Post, Messages, Profile (Recommended)

**Q6: Should anonymous users see a different header?**
A: Yes, show Logo, Browse, About, Sign Up/Login (Recommended)

**Q7: What should the footer contain?**
- Contact/Feedback (form sends email to project email)
- Privacy & Terms
- GitHub/Social links

**Q8: How should users access settings/preferences?**
A: Profile dropdown menu (Recommended) - Click profile photo/name in header → dropdown with Settings, Logout, etc.

---

## Onboarding & Authentication

**Q9: What's the first thing new users do after signing up?**
A: Set location immediately (Recommended) - Required step: choose neighborhood or drop pin before seeing any content

**Q10: What fields are required for sign-up with email/password?**
- Email
- Password
- Username
- Bio (required, at least a sentence)

**Q11: Bio field during sign-up - what if user skips it?**
A: Actually required (Recommended) - Must enter at least a sentence, helps build community trust

**Q12: Password requirements for email/password sign-up?**
A: Min 8 characters (Recommended) - At least 8 characters, no other requirements

**Q13: Sign-up/login - which OAuth providers to support?**
- Google
- Facebook

**Q14: OAuth duplicate email handling?**
A: Prompt to link accounts with password verification - When OAuth email matches existing account, user must enter password to confirm and link accounts

**Q15: Email verification - required or optional?**
A: Required before posting (Recommended) - Can browse, but must verify email to post/message

**Q16: Forgot password flow?**
A: Email reset link (Recommended) - Send link to email, click to set new password

---

## Location Selection

**Q17: How does the map/neighborhood selection work in profile setup?**
A: Interactive map with faded background. Prominent choice buttons "Choose Neighborhood" and "Drop Pin For Approximate Location". Selecting one un-fades the map and either shows neighborhood borders (for neighborhood mode) or hides them (for pin mode).

---

## Post Creation

**Q18: Post creation form - modal or dedicated page?**
A: Yes, modal (Recommended) - Slides up full-screen on mobile, centered overlay on desktop

**Q19: How do users post a book? What's the flow?**
A: Type title → select from autocomplete → set give away/exchange → add note → post

**Q20: If book not found in autocomplete, what happens?**
A: Manual entry option (Recommended) - "Can't find your book? Add manually" link at bottom of autocomplete

**Q21: Manual book entry fields?**
- Title (required)
- Author (required)
- Cover image upload (optional)
- Genre/category (select from predefined list)

**Q22: Genre filter - predefined list or user-generated tags?**
A: Hybrid - Predefined common genres + "Other" option to add custom

**Q23: When user edits a post, what can they change?**
A: Notes only (Recommended) - Only allow editing notes/condition, not book or type

**Q24: Cross-posting behavior - what happens when checkboxes are selected during post creation?**
A: Platform share URLs - Opens share URLs in new tabs (e.g., Facebook share dialog via URL)

**Q25: Share buttons on posts?**
A: On own posts only (visible after posting) + checkboxes in post creation flow

---

## Browse & Discovery

**Q26: What does the main browse/discovery page look like?**
A: Feed with filters sidebar (Recommended) - Scrollable post feed, left sidebar with genre/distance/type filters

**Q27: Browse feed pagination?**
A: Infinite scroll (Recommended) - Load more posts as user scrolls down, better mobile UX

**Q28: Default feed sort order?**
A: Distance (nearest first) (Recommended) - Show closest books first, most relevant for local sharing

**Q29: Default search radius?**
A: 3 miles with slider from 1-10+ miles

**Q30: Distance selector UI?**
A: Slider with mile markers (Recommended) - Options: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10+ miles

**Q31: How specific should distance display be?**
A: Rounded (Recommended) - "0.8 mi", "2.3 mi", "5.1 mi" - one decimal

**Q32: Search bar - where does it appear and what does it search?**
A: In browse filters, searches posts (Recommended) - Text search in filters sidebar/dropdown, searches book titles/authors in feed

**Q33: Feed filters - applied immediately or 'Apply' button?**
A: Immediate (Recommended) - Feed updates as filters change on all devices

**Q34: Reading preferences in profile - used for what?**
- Matching/recommendations (future)
- Profile display
- Search filter option: "Only show books matching my preferred genres"

**Q35: How should reading preferences be captured?**
A: Multi-select checkboxes (Recommended) - List of genres with checkboxes, authors as tags/autocomplete

**Q36: Feed empty state for new users?**
A: Encouragement to post (Recommended) - "Be the first in your neighborhood! [Post a Book]"

---

## Grouping Posts by User

**Q37: When filter 'Group posts by user' is ON, how are grouped user cards sorted?**
A: By user's distance (Recommended) - Nearest users first, regardless of how many books they have

**Q38: When you expand a grouped user card to see their books, how does it work?**
A: Expand inline (Recommended) - Card expands in place showing list of their books, collapse with X or click again

**Q39: What does a grouped user card look like (collapsed state)?**
A: Profile pic, name, book count, distance (Recommended) - [Profile pic] Username • 0.8 mi • 5 books available

**Q40: If user has manually grouped someone, then turns ON global filter, what happens?**
A: Per-post becomes 'Ungroup' - With global ON, per-post action changes to "Ungroup [Username]'s posts"

---

## Post Cards & Interaction

**Q41: How should book posts be displayed in the feed?**
A: Cover image, title, author, user, distance, type badge - Mid-size thumbnails, user profile pic secondary to the book. Type badge is icon + text (green gift box "Give Away" or blue handshake "Exchange")

**Q42: What happens when you click a book post?**
A: Expand inline - Post card expands in place within the feed

**Q43: When viewing expanded post, how do you collapse it?**
- X button in corner
- Click outside card
- Click card title again (toggle)

**Q44: Post card three-dot menu - shown on collapsed or expanded posts?**
A: Always visible on cards (Recommended) - Three-dot menu in top-right of every post card

**Q45: Default book cover when no image available?**
A: Generic book icon (Recommended) - Simple illustrated book icon with title text overlay

---

## Claiming & Messaging

**Q46: When someone wants to claim a book, what happens?**
A: Choose: public comment or private message (Recommended) - Modal asks "How do you want to respond?" with both options

**Q47: So 'I'm Interested' flow: user must type something, not just click?**
A: Yes, must send message/comment (Recommended) - Modal → choose public/private → type message → send. Then added to Wishlist.

**Q48: Anonymous users browsing - what do they see when clicking 'I'm Interested'?**
A: Sign-up prompt modal (Recommended) - "Sign up to express interest in this book" with Sign Up / Login buttons

**Q49: Wishlist/Interested tab - how do books get added?**
- Manual add button (proactive wishlist)
- Saving posts (separate bookmark feature)
- Must type message to express interest (not just click)

**Q50: Save/bookmark feature - separate from 'I'm Interested'?**
A: Yes, separate bookmark icon (Recommended) - Bookmark icon on posts to save without messaging. Separate "Saved" tab.

**Q51: Comment vs Message decision - can users change their mind?**
A: Can switch - Both options always available. After commenting publicly, can still send private message

**Q52: What does the Messages/inbox page look like?**
A: Thread list + conversation view - Full-page list if no conversation selected. When selected, conversation expands from right (desktop split view, mobile full-screen)

**Q53: Notification badge on Messages nav?**
A: Number count (Recommended) - Red badge with '3' showing unread message count

**Q54: Public comments on posts - threaded or flat?**
A: Flat list (Recommended) - All comments in chronological order, no replies-to-replies

---

## Marking as Given & Stats

**Q55: When user marks post as 'Given', what happens?**
A: Prompt for recipient (Recommended) - Modal: "Who received this book?" with list of people who commented/messaged

**Q56: Mark as Given recipient selection - show everyone or just commenters/messagers?**
A: Only people who responded (Recommended) - List shows only users who commented or messaged about this post

**Q57: When marking as given with recipient selection - how does it affect stats?**
A: Both users update (Recommended) - Giver gets +1 Books Given, Recipient gets +1 Books Received

**Q58: 'Bookshare' mutual vouching - where does the button appear?**
A: In messages, button at bottom - Don't ask on resolve, because mark as given happens before meeting. After meeting, users can vouch in messages.

---

## Archive & History

**Q59: What happens to archived posts in user profile Archive tab?**
A: Read-only history (Recommended) - Can view past exchanges, see who received/gave, cannot interact

**Q60: When viewing someone else's profile, what posts do you see?**
A: Active posts + separator + faded archived posts - "Completed Exchanges" separator, archived posts below are slightly faded. User settings has options: "hide from public" and "delete forever"

**Q61: Archive settings - where do 'hide from public' and 'delete forever' options appear?**
A: Per-post action menu (Recommended) - Three-dot menu on each archived post has these options

---

## User Profiles

**Q62: Profile pictures - required, optional, or skip for MVP?**
A: Optional with default avatar (Recommended) - Users can upload, default to generated avatar or initials

**Q63: User profile URLs - username-based or ID-based?**
A: Username: /profile/jordansmith (Recommended) - Clean URLs, usernames must be unique, can change username with redirect

**Q64: Username changes - what happens to old URLs?**
A: 301 redirect (Recommended) - Old username redirects to new one for 30-90 days, then 404

**Q65: Social links in profile - which platforms to support?**
- Goodreads
- Instagram
- Twitter/X
- Bluesky
- Mastodon
- Facebook
- Freeform URL field for others

**Q66: How do users see their own activity and stats?**
- Active posts tab
- Archive/history tab
- Stats summary (books given, received, bookshares count)
- Wishlist/interested tab

---

## Visual Design & UI

**Q67: Color scheme / design direction for the app?**
A: Warm, community-focused (Recommended) - Warm colors (greens, browns, oranges), friendly and approachable

**Q68: Should we design mobile-first or desktop-first?**
A: Mobile-first (Recommended) - Design for mobile, enhance for desktop. Most users likely on phones

**Q69: Toast notification position?**
A: Top-right (desktop), top-center (mobile)

**Q70: How should errors and edge cases be handled?**
- Inline validation (form errors)
- Toast notifications (success/error actions)
- Empty states with guidance

---

## Account Management & Settings

**Q71: Delete account - what happens to user's posts and messages?**
A: Delete posts, anonymize messages (Recommended) - Posts deleted, messages stay but show "[deleted user]"

---

## About Page & Legal

**Q72: About page - what should it include?**
- Mission/story
- How it works
- Team/credits
- FAQ section with "Ask another question!" field at bottom

**Q73: Privacy policy - write custom or use template/generator?**
A: Use generator template (Recommended) - Tools like termly.io, fill in specifics about BookSharePDX

**Q74: Terms of use - what key points to include?**
- User conduct rules
- Liability disclaimer
- Content ownership
- Age requirement (13+)

**Q75: Contact/feedback - where do submissions go?**
A: Email to you (Recommended) - Form sends email to your personal/project email

**Q76: Footer copyright/attribution text?**
A: © 2025 BookSharePDX (Recommended)

---

## QR Codes

**Q77: QR code flyers - generated per-user or generic?**
A: Generic landing page (Recommended) - All QR codes point to same landing page

---

## Summary of Key Decisions

- **Mobile-first design** with warm, community-focused colors
- **Email + OAuth authentication** (Google, Facebook) with email linking
- **Required location selection** during onboarding (neighborhood or pin)
- **Hybrid genre system** (predefined + custom)
- **3-mile default radius** with 1-10+ mile slider
- **Distance-sorted feed** with infinite scroll
- **Group posts by user** feature (global toggle + per-post action)
- **Buy Nothing-style claiming** (public comment or private message, must type)
- **Separate bookmark** and wishlist features
- **Bookshare vouching** in messages after meeting
- **Optional profile pictures** with username-based URLs
- **Read-only archive** with hide/delete options
- **Flat comment structure** (no threading)
- **Generic QR codes** for little free libraries

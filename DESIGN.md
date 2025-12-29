# Design Specification

## Core Concept

A neighbor-based social platform for connecting over sharing and discussing books. Users post approximate locations and books they like or are willing to share/give away. Others nearby can discover and connect to exchange books.

## User Flow

### Account & Authentication

**Account Model**: Optional accounts
- Users can browse anonymously without account
- Account required to post books or respond to posts
- Account creation via email + password or OAuth

**Verification Methods**:
- Email verification (required)
- Optional OAuth providers (Google, Facebook, etc.) for additional trust signals
- Mutual "I met this person" vouching: when two users tag each other after meeting, it increments a "X bookshares" count on both profiles

### Location Sharing

**Method**: Hybrid - neighborhood or pin
- Interactive map displays Portland neighborhood boundaries (from City of Portland Open Data)
- Users can either:
  - Click to select a neighborhood (e.g., "Sellwood", "Pearl District")
  - Drop a pin anywhere on the map (for areas outside defined neighborhoods or user preference)
- Neighborhood boundaries rendered as clickable polygons with hover tooltips
- Clicking a neighborhood highlights it and sets location type to 'neighborhood'
- Clicking outside neighborhoods or in blank areas drops a pin marker
- Users can switch between neighborhood and pin selection
- No exact addresses stored or displayed publicly

### Book Management

**Adding Books**:
- Users type title/author with autocomplete
- Autocomplete searches external APIs (Google Books, OpenLibrary)
- Selected books saved to our database for future autocomplete

**Book Database**:
- Hybrid approach
- Start with empty database
- As users add books via autocomplete, save metadata to our DB
- Future autocomplete queries check our DB first, fall back to external APIs

**Exchange Options**:
- Each book marked as either "give away" or "available for exchange"
- Users specify per book

### Discovery

**Discovery Methods**:
1. List/feed view - scrollable feed sorted by distance or recency
2. Search filters - by genre, author, distance, type (give away vs exchange)
3. Matching/recommendations - algorithm suggests users with similar reading tastes or books on their wishlist

**Discovery Logic** (neighborhood priority):
- **Neighborhood users**: See posts from their neighborhood first, then nearby pins and adjacent neighborhoods within search radius
- **Pin users**: See all posts within specified radius (both neighborhood and pin users), sorted by distance
- Distance calculations respect both point-to-point (pins) and point-to-polygon (neighborhoods) geometry

**What Users See**:
- Book listings with title, author, cover image
- Location display: neighborhood name OR "nearby" with approximate distance
- User profile snippet
- Type (give away or exchange)

### Claiming & Exchange Process

**Flow** (Buy Nothing model):
1. User posts book as "available"
2. Interested users can:
   - Post public comment on the listing
   - Send private message to poster
3. Poster chooses recipient and marks post as "given" or "exchanged"
4. Contact information exchanged based on user preference:
   - Reveal contact info directly, OR
   - Continue conversation via in-app messaging

**Post Resolution**:
- When marked as given/exchanged, post becomes archived
- Archived posts cannot receive new responses
- Users can:
  - Hide their own posts (no longer visible publicly)
  - Purge/delete posts (removes from correspondents' DMs also)

### User Profiles

**Profile Data**:
- Username/display name
- Bio/about me (free text)
- Reading preferences (favorite genres, authors)
- Social links (Goodreads, Instagram, etc.)
- Books currently available (give away or exchange)
- Books on wishlist/interested in
- Exchange history stats (books given, books received)
- Bookshare count (mutual "I met this person" tags)
- Verification badges (email verified, OAuth provider icons)

**Privacy**:
- Profiles visible to all (logged in or not)
- Contact info only shared when users engage on a post

### Messaging & Communication

**Message Model**:
- Users can only send messages in direct response to posts (offers or requests)
- Either public comments on post OR private messages to poster
- After post resolved (archived), thread becomes read-only
- No general user-to-user messaging outside of post context

**Message Persistence**:
- Messages persist while post is active
- Archived when post marked as resolved
- User can purge their posts, deleting all associated messages from correspondents' inboxes

## Features

### Cross-Posting to Social Media

**Platforms**: Buy Nothing, Reddit, Facebook, Nextdoor, others

**Mechanism**: Manual one-click share
- After creating a post, user sees "Share to..." buttons
- Click generates platform-specific formatted post with link back to listing
- User completes share on that platform (opens share dialog or copies text)

**Share Format**:
- Title: Book title + "available in [neighborhood]"
- Body: Brief description, type (give away/exchange), link to listing
- Image: Book cover

### QR Code Fliers

**Purpose**: Promote platform at little free libraries

**Function**: Link to general landing page
- QR codes print on fliers
- Scan goes to homepage/about page explaining the platform
- Encourages sign-up and participation

**Distribution**: Users can generate and print fliers to post at local little free libraries

### Safety & Trust

**Features**:
1. Block/report users
   - Block prevents user from seeing your posts or contacting you
   - Report flags for review (future: moderation queue)

2. Meet in public recommendations
   - Safety tips displayed when arranging exchanges
   - Suggest coffee shops, libraries, public spaces
   - "Never share personal address until you're comfortable"

3. Review/rating system
   - After exchange, both parties can rate the interaction (thumbs up/down or 1-5 stars)
   - Can flag issues (no-show, book condition mismatch, etc.)
   - Ratings visible on profile

4. Verification badges
   - Email verified (required)
   - OAuth provider badges (optional)
   - Bookshare count (mutual vouching)

### Gamification (Minimal)

**Stats Displayed**:
- Books given count
- Books received count
- Bookshares count (mutual meetings)
- Member since date

**No**:
- Leaderboards
- Flashy achievements
- Streaks or daily engagement mechanics

Keep it simple and community-focused.

## Data Model

### User
- id
- email (unique, required)
- password_hash (if not OAuth-only)
- username
- bio
- location_type (enum: 'neighborhood', 'pin')
- neighborhood_id (nullable, foreign key to Neighborhood)
- location_lat (nullable, for pin users)
- location_lng (nullable, for pin users)
- location_precision (radius in meters, for pin users)
- created_at
- updated_at
- email_verified
- oauth_providers (JSON array)

### Neighborhood
- id
- name (e.g., "Sellwood", "Pearl District")
- boundary (PostGIS geometry - polygon)
- created_at

### Book (metadata)
- id
- title
- author
- isbn
- cover_image_url
- genre
- description
- external_id (Google Books/OpenLibrary ID)
- created_at

### UserBook (user's book listing)
- id
- user_id
- book_id
- type (enum: give_away, exchange)
- status (enum: available, pending, given)
- notes (user's notes about condition, etc.)
- created_at
- updated_at
- archived_at

### Post
- id
- user_id
- userbook_id
- content (post text)
- type (enum: offer, request)
- status (enum: active, resolved, archived)
- created_at
- resolved_at

### Comment
- id
- post_id
- user_id
- content
- is_private (boolean)
- created_at

### UserProfile
- user_id
- favorite_genres (JSON array)
- favorite_authors (JSON array)
- social_links (JSON object)
- books_given_count
- books_received_count
- bookshares_count

### Bookshare (mutual vouching)
- id
- user1_id
- user2_id
- created_at

### Review
- id
- reviewer_id
- reviewee_id
- post_id
- rating (1-5 or boolean)
- comment
- created_at

### Block
- id
- blocker_id
- blocked_id
- created_at

### Report
- id
- reporter_id
- reported_id
- post_id (nullable)
- reason
- created_at

## Technical Architecture

### Stack
- Frontend: React + TypeScript
- Backend: Node.js + Express + TypeScript
- ORM: TypeORM
- Database: PostgreSQL (PostGIS for geospatial queries)
- Deployment: AWS (EC2/ECS + RDS)
- Storage: S3 for user uploads (future: profile pics)

### Key Technical Decisions

**Geospatial Queries**:
- Use PostGIS extension in PostgreSQL
- Store neighborhood boundaries as polygons and pin locations as lat/lng points
- Hybrid query strategy:
  - Neighborhood users: query by neighborhood_id match, UNION with ST_DWithin for nearby pins/neighborhoods
  - Pin users: ST_DWithin searches both point-to-point (other pins) and point-to-polygon (neighborhoods)
- Distance calculations use geography type for accurate real-world distances

**Neighborhood Boundaries**:
- Data source: City of Portland Open Data Portal (gis-pdx.opendata.arcgis.com)
- Dataset: "Neighborhoods (Regions)" - 90+ official Portland neighborhoods
- Format: GeoJSON exported and imported into PostgreSQL/PostGIS
- One-time seed of Neighborhood table during initial deployment

**Interactive Mapping**:
- Frontend library: Leaflet.js or Mapbox GL JS
- Render neighborhood polygons as clickable overlays from GeoJSON
- Features: hover tooltips, click to select neighborhood, click blank area to drop pin
- Styling: highlighted selected neighborhood, pin marker for custom locations

**Book Autocomplete**:
- Frontend debounces input
- Backend searches local DB first (fuzzy match on title/author)
- If < 5 results, query external APIs (Google Books, OpenLibrary)
- Save new matches to DB

**External API Integration**:
- Google Books API for book metadata
- OpenLibrary API as fallback
- Cache responses in our Book table

**Cross-Posting**:
- Generate shareable links with Open Graph meta tags for rich previews
- Platform-specific share URLs (Facebook Share Dialog, Reddit submit, etc.)
- Pre-formatted text for copy-paste

**QR Code Generation**:
- Server-side QR generation (qrcode npm package)
- Returns SVG or PNG
- Links to landing page with optional UTM parameters for tracking

### Authentication
- JWT tokens for session management
- Refresh token rotation
- OAuth 2.0 for Google/Facebook login (passport.js)
- Email verification via token sent to email

### API Structure

**RESTful endpoints**:
```
/auth
  POST /register
  POST /login
  POST /verify-email
  POST /oauth/google
  POST /oauth/facebook

/users
  GET /:id
  PUT /:id
  GET /:id/books
  POST /:id/vouches

/neighborhoods
  GET / (returns all neighborhoods with boundaries for map rendering)
  GET /:id

/books (metadata)
  GET /search?q=title
  GET /:id

/posts
  GET / (query params: neighborhood_id OR lat/lng/radius, plus type, genre, etc.)
  POST /
  GET /:id
  PUT /:id (mark as resolved)
  DELETE /:id

/comments
  POST / (post_id, content, is_private)
  GET / (query param: post_id)

/reviews
  POST /
  GET / (query param: user_id)

/blocks
  POST /
  DELETE /:id

/reports
  POST /

/qr
  GET /flier (generates QR code image)
```

### Frontend Routes
```
/ - Landing page
/browse - Map/list view of available books
/book/:id - Book listing detail
/profile/:id - User profile
/messages - User's DMs and comment threads
/post - Create new post
/settings - User settings
```

---

## Implementation Technical Decisions

### Project Structure

```
booksharepdx/
├── .node-version           # nodenv file (Node 20.x LTS)
├── frontend/               # React + Vite + TypeScript
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── src/
├── backend/                # Express + TypeScript + TypeORM
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
├── shared/                 # Shared TypeScript types/interfaces
│   ├── package.json
│   ├── tsconfig.json
│   └── types/
├── docker-compose.yml      # PostgreSQL + PostGIS only
├── package.json            # Root workspace config
├── README.md
├── DESIGN.md
└── UX_DESIGN.md
```

**Monorepo Management**: npm workspaces
- Root `package.json` defines workspaces
- Shared types imported as `@booksharepdx/shared`
- Single `npm install` at root installs all dependencies

### Development Environment

**Node.js Version**: 20.x LTS
- Managed via nodenv (`.node-version` file)
- All packages use same Node version

**Development Stack**:
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL 15 + PostGIS 3.3 (Docker)
- **ORM**: TypeORM

**Running Locally**:
- Database: Docker Compose (`docker-compose up`)
- Frontend + Backend: Native npm (`npm run dev` at root uses `concurrently`)
  - Fast hot module replacement (HMR)
  - Easy debugging
  - Fast restarts with nodemon

**Why Hybrid (Docker for DB, Native for Code)**:
- PostgreSQL + PostGIS consistent across environments
- No need to install/configure PostGIS locally
- Fast frontend HMR and backend restarts
- Easy debugging with Chrome DevTools / VS Code

### Frontend Technology Stack

**Core Framework**:
- React 18 + TypeScript
- Vite (dev server, build tool)
- React Router v6 (routing)

**State & Data Fetching**:
- TanStack Query (React Query) for API calls and caching
- React Context for global UI state (auth, theme)

**Styling**:
- Tailwind CSS
- Build components from scratch (full control, fastest for MVP)
- No component library (avoiding lock-in and learning curve)

**Map Library**:
- **Leaflet.js** (free, open source, no API key required)
- React-Leaflet wrapper for React integration
- GeoJSON layer for neighborhood boundaries
- Custom markers for pin drops

**Form Handling**:
- React Hook Form (lightweight, good performance)
- Zod for validation (TypeScript-first schema validation)

**Build Tool**:
- Vite (faster than webpack, great DX)

### Backend Technology Stack

**Core Framework**:
- Express.js + TypeScript
- tsx for running TypeScript directly in development

**Database & ORM**:
- PostgreSQL 15 with PostGIS 3.3
- TypeORM for database access
- Type-safe queries and entities

**Authentication**:
- JWT stored in httpOnly cookies (secure, XSS-resistant)
- Refresh token rotation for security
- Passport.js for OAuth (Google, Facebook)

**Email Service**:
- **Development**: Console logging (emails printed to terminal)
- **Production**: SendGrid or AWS SES (add later)
- **Testing**: Ethereal (fake SMTP for preview)

**File Upload/Storage**:
- **Development/MVP**: Local filesystem (`backend/uploads/`)
- **Production**: AWS S3 (migrate later)
- User-uploaded book covers and profile pictures

**External APIs**:
- Google Books API (book metadata)
- OpenLibrary API (fallback)
- QR code generation: `qrcode` npm package

### Shared Types Package

**Purpose**: Single source of truth for TypeScript interfaces

**Location**: `shared/types/`

**Examples**:
```typescript
// shared/types/entities.ts
export interface User {
  id: string;
  username: string;
  email: string;
  bio: string;
  location_type: 'neighborhood' | 'pin';
  // ...
}

export interface Post {
  id: string;
  book: Book;
  user: UserSummary;
  type: 'give_away' | 'exchange';
  distance?: number;
  // ...
}
```

**Import Pattern**:
- Frontend: `import { User, Post } from '@booksharepdx/shared'`
- Backend: `import { User, Post } from '@booksharepdx/shared'`

### TypeScript Configuration

**Strictness**: `strict: false` for MVP
- Allows faster development
- Fewer type gymnastics during prototyping
- Can enable strict mode after MVP

**Path Mapping**:
- Frontend: `@/components`, `@/utils`, etc.
- Backend: `@/controllers`, `@/models`, etc.
- Shared: `@booksharepdx/shared`

### API Architecture

**Style**: RESTful HTTP + JSON
- Standard HTTP verbs (GET, POST, PUT, DELETE)
- Predictable endpoint patterns
- Clear, documented endpoints

**Why REST over GraphQL**:
- Simpler for well-defined data patterns
- Better HTTP caching
- Easier to reason about and debug
- Less setup overhead for MVP
- Can migrate to GraphQL later if needed

**Response Format**:
```typescript
// Success
{ data: T, meta?: { ... } }

// Error
{ error: { message: string, code: string, details?: any } }
```

### Testing Strategy

**Backend Tests** (Vitest + Supertest):
- Auth endpoints (register, login, JWT validation)
- Post creation/retrieval
- User profile CRUD
- Location-based queries (distance, radius)
- Mark as given (stats update)
- ~60-70% coverage of critical paths

**Frontend Tests** (Vitest + React Testing Library):
- Critical user flows (smoke tests)
  - User can sign up
  - User can create post
  - User can browse feed
- Component unit tests for complex logic only

**What We Skip for MVP**:
- Full E2E testing (Playwright/Cypress)
- Every component in isolation
- Visual regression tests
- Load/performance tests

**Test Runner**: Vitest
- Fast (Vite-powered)
- Jest-compatible API
- Works for both frontend and backend
- TypeScript support out of the box

### Development Scripts

**Root package.json**:
```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "npm run dev --workspace=backend",
    "dev:frontend": "npm run dev --workspace=frontend",
    "test": "npm run test --workspaces",
    "build": "npm run build --workspaces"
  }
}
```

**Single Command Development**:
- `npm run dev` - Starts backend + frontend simultaneously
- `docker-compose up` - Starts PostgreSQL + PostGIS
- Both terminal outputs visible via `concurrently`

### Environment Variables

**Backend (.env)**:
```
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://dev:dev@localhost:5432/booksharepdx
JWT_SECRET=dev-secret-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret

# OAuth (add when implementing)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=

# Email (future)
SENDGRID_API_KEY=
EMAIL_FROM=noreply@booksharepdx.app
```

**Frontend (.env)**:
```
VITE_API_URL=http://localhost:3000
```

### Database Setup

**Docker Compose**:
```yaml
services:
  postgres:
    image: postgis/postgis:15-3.3
    container_name: booksharepdx-db
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: booksharepdx
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/src/database/seeds:/docker-entrypoint-initdb.d

volumes:
  postgres_data:
```

**TypeORM Configuration**:
- Entities in `backend/src/entities/`
- Migrations in `backend/src/database/migrations/`
- Seeding scripts for neighborhood data

**Initial Seed Data**:
- Portland neighborhoods from GeoJSON
- Sample users for testing (optional)

### Code Quality Tools

**Linting**: ESLint
- TypeScript-specific rules
- React hooks rules
- Import sorting

**Formatting**: Prettier
- Consistent code style
- Runs on save (VSCode) or pre-commit

**Pre-commit Hooks** (Optional for MVP):
- Husky + lint-staged
- Format + lint staged files

### Deployment Preparation

**Production Considerations** (not implementing yet):
- Environment-specific configs
- Database migrations strategy
- Asset optimization (Vite build)
- Docker images for frontend/backend
- AWS deployment (EC2/ECS + RDS)
- S3 for file uploads
- CloudFront CDN

**For MVP**: Focus on local development
- Production deployment is phase 2
- Ensure code is deployment-ready but don't deploy yet

---

## Demo Implementation Specifications

### Overview

The initial implementation will be a **fully-functional frontend demo** using mock data. This demo will later be deployed to GitHub Pages and eventually connected to the backend API with minimal changes.

### Routing Strategy

**Two Router Modes**:
1. **HashRouter** for GitHub Pages deployment (`wittejm.github.io/booksharepdx`)
   - Required because GitHub Pages serves from a subdirectory
   - URLs will use hash routing (e.g., `/#/browse`, `/#/profile/username`)
2. **BrowserRouter** for local development and future production
   - Clean URLs (e.g., `/browse`, `/profile/username`)
   - Preferred for better UX and SEO

**Implementation**:
- Environment variable `VITE_USE_HASH_ROUTER` determines which router to use
- GitHub Pages build sets this to `true`
- Local development uses `false` by default
- Single codebase supports both routing strategies

### Data Layer Architecture

**Demo Mode**: Fully functional offline app using localStorage
- **No backend required**
- **No demo-specific frontend code**
- Clean separation via spoofed API endpoints

**Data Flow**:
```typescript
// All data operations use service layer
// src/services/dataService.ts

export const dataService = {
  // GETs: Read from hardcoded mocks + localStorage (merged)
  async getPosts(filters) {
    const mockPosts = MOCK_DATA.posts;
    const localPosts = JSON.parse(localStorage.getItem('posts') || '[]');
    const allPosts = [...mockPosts, ...localPosts];
    return filterAndSort(allPosts, filters);
  },

  // POSTs: Write to localStorage
  async createPost(postData) {
    const posts = JSON.parse(localStorage.getItem('posts') || '[]');
    const newPost = { ...postData, id: generateId(), createdAt: Date.now() };
    posts.push(newPost);
    localStorage.setItem('posts', JSON.stringify(posts));
    return newPost;
  },

  // PUTs: Update in localStorage
  async updatePost(id, updates) {
    const posts = JSON.parse(localStorage.getItem('posts') || '[]');
    const index = posts.findIndex(p => p.id === id);
    posts[index] = { ...posts[index], ...updates };
    localStorage.setItem('posts', JSON.stringify(posts));
    return posts[index];
  },

  // DELETEs: Remove from localStorage
  async deletePost(id) {
    const posts = JSON.parse(localStorage.getItem('posts') || '[]');
    const filtered = posts.filter(p => p.id !== id);
    localStorage.setItem('posts', JSON.stringify(filtered));
  }
};
```

**Spoofed Endpoints** (No Real Network Calls):
```typescript
// Email verification - instantly succeeds
async sendVerificationEmail(email) {
  const user = getCurrentUser();
  user.verified = true;
  localStorage.setItem('currentUser', JSON.stringify(user));
  return { success: true };
}

// Password reset - instantly succeeds
async resetPassword(email, newPassword) {
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  const user = users.find(u => u.email === email);
  user.password = hashPassword(newPassword);
  localStorage.setItem('users', JSON.stringify(users));
  return { success: true };
}
```

**User Experience**:
- Initial load: 20 demo users + 50 demo books from hardcoded mocks
- User creates account: Added to localStorage users array
- User posts book: Shows immediately in feed (from localStorage)
- User messages someone: Stored in localStorage
- Everything persists across page refreshes
- Users can log in as ANY user (all in localStorage)

**Benefits**:
- Fully functional demo with zero backend
- User data persists locally
- Can test complete workflows
- Easy to deploy to GitHub Pages (static site)
- When backend is ready, swap dataService implementation
- **No demo-specific code in components**

### Demo Data Specifications

**Volume**:
- 20 users with diverse profiles
- 50 books across Portland neighborhoods
- Realistic distribution across neighborhoods

**User Profiles**:
- Mix of neighborhood and pin-based locations
- Varied reading preferences (genres, authors)
- Different activity levels (books given, received, bookshares)
- Realistic Portland-area usernames and bios
- Profile pictures: Mix of avatars and initials

**Book Listings**:
- Real book titles and authors across genres:
  - Literary fiction
  - Science fiction
  - Mystery/thriller
  - Non-fiction (history, science, memoir)
  - YA/Children's books
  - Poetry
  - Graphic novels
- Mix of "give away" and "exchange" types
- Realistic condition notes
- Good geographic distribution across Portland

**Neighborhoods Represented**:
- Sellwood
- Pearl District
- Hawthorne
- Alberta Arts District
- St. Johns
- Montavilla
- Division/Clinton
- Eastmoreland
- Laurelhurst
- Woodstock
- Northwest District
- And others from the GeoJSON data

**Realistic Scenarios**:
- Active threads with public comments and private messages
- Completed exchanges with stats updates
- Users with multiple books posted
- Mix of recent and older posts
- Bookshare vouching relationships

### Interactive Map Implementation

**Data Source**: `Neighborhoods_regions.geojson`
- 90+ Portland neighborhoods with polygon boundaries
- Display as interactive SVG map

**Features**:
- Render all neighborhood boundaries from GeoJSON
- Hover states with neighborhood name tooltips
- Click to select neighborhood (highlights polygon)
- Click outside neighborhoods to drop pin
- Toggle between neighborhood and pin mode
- Smooth transitions and visual feedback

**Technical Approach**:
- Convert GeoJSON coordinates to SVG path elements
- Use D3.js or similar for coordinate transformations
- Handle zoom/pan for large map area
- Responsive design for mobile and desktop

### GitHub Pages Deployment

**Workflow**:
```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build:demo
        env:
          VITE_USE_HASH_ROUTER: true
          VITE_USE_DEMO_DATA: true
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./frontend/dist
```

**Build Script**:
```json
{
  "scripts": {
    "build:demo": "VITE_USE_HASH_ROUTER=true VITE_USE_DEMO_DATA=true vite build"
  }
}
```

### Future API Integration

**When Backend is Ready**:
1. Set `VITE_USE_DEMO_DATA=false`
2. Implement API client methods (already scaffolded)
3. No changes to components or UI logic
4. Test thoroughly to ensure API matches expected data shapes

**API Client Scaffolding**:
```typescript
// src/services/apiClient.ts
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const apiClient = {
  async getPosts(params?: FilterParams) {
    const response = await fetch(`${BASE_URL}/posts?${new URLSearchParams(params)}`)
    return response.json()
  },
  // ... other methods
}
```

### Environment Variables Summary

**Development (`.env.development`)**:
```
VITE_USE_HASH_ROUTER=false
VITE_USE_DEMO_DATA=true
VITE_API_URL=http://localhost:3000
```

**GitHub Pages (`.env.production.demo`)**:
```
VITE_USE_HASH_ROUTER=true
VITE_USE_DEMO_DATA=true
```

**Production with API (`.env.production`)**:
```
VITE_USE_HASH_ROUTER=false
VITE_USE_DEMO_DATA=false
VITE_API_URL=https://api.booksharepdx.app
```

---

## MVP Scope

Launch with full feature set:
- Core posting and discovery
- In-app messaging and commenting
- Cross-posting integrations
- QR flier generation
- Safety features (block, report, reviews)
- Verification (email + OAuth)
- Minimal stats/gamification

## Future Enhancements

- Mobile apps (React Native)
- Push notifications for new messages/matches
- Advanced recommendation algorithm (collaborative filtering)
- Book clubs / reading groups
- Events (book swaps, meetups)
- Multi-city expansion
- Moderation dashboard
- Analytics (most exchanged books, active neighborhoods, etc.)

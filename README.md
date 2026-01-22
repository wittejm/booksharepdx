# BookSharePDX

A neighbor-based social platform for connecting over sharing and discussing books in Portland.

## Concept

Post your approximate location and the books you like and the books you are willing to share or give away. Find others near you with similar interests and hand over or exchange books.

## Features

- Post approximate location
- List books you like
- List books willing to share or give away
- Find nearby users with similar interests
- Arrange book exchanges and handovers
- Cross-post activity to:
  - Buy Nothing
  - Reddit
  - Facebook
  - Nextdoor
  - Other social media platforms
- Generate QR code fliers for little free libraries

## Tech Stack

- TypeScript
- React
- Node.js
- Express
- TypeORM
- Cloudflare Pages (frontend)
- Google Cloud Run (backend)
- Neon (database)

## Development Setup

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- pnpm (or npm)

### Starting the Development Stack

```bash
# Start PostgreSQL containers (dev on :5432, test on :5433)
npm run db:start

# Install dependencies
npm install

# Start backend (port 3001)
npm run dev --workspace=backend

# Start frontend (port 5173)
npm run dev --workspace=frontend
```

## Testing

The project uses separate database and port configurations for testing to avoid conflicts with development.

| Environment | Backend Port | Frontend Port | Database Port | Database Name |
|-------------|--------------|---------------|---------------|---------------|
| Development | 3001 | 5173 | 5432 | booksharepdx |
| Test | 3002 | 5174 | 5433 | booksharepdx_test |

### Starting the Test Stack

```bash
# 1. Start Docker containers (includes both dev and test databases)
npm run db:start

# 2. Reset the test database (if needed)
npm run db:reset-test --workspace=backend
```

### Running Unit Tests

Unit tests use Vitest and run without needing the full stack.

```bash
# Backend unit tests
npm run test --workspace=backend

# Frontend unit tests
npm run test --workspace=frontend

# With coverage reports
npm run test:coverage --workspace=backend
npm run test:coverage --workspace=frontend
```

### Running E2E Tests

E2E tests use Playwright and require the full test stack running.

```bash
# Terminal 1: Start backend on test stack (port 3002, test database)
npm run dev:test --workspace=backend

# Terminal 2: Start frontend on test stack (port 5174)
npm run dev:test --workspace=frontend

# Terminal 3: Run Playwright E2E tests
npm run test:e2e --workspace=frontend
```

### E2E Test Notes

- Tests run sequentially (single worker) to avoid race conditions
- Test users are created with timestamp-based unique identifiers
- Timeouts are intentionally short (2s) to enforce performance requirements
- Tests fail fast with no retries—reliability is expected on first run

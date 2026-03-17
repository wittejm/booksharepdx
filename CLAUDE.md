# BookSharePDX

Monorepo: `frontend/` (React/Vite), `backend/` (Express/TypeORM/Postgres), `shared/` (types).

## Commands

- `npm run dev` — starts frontend + backend concurrently
- `cd frontend && npx tsc --noEmit` — type-check frontend
- `cd frontend && npx vitest run` — run frontend unit tests
- `cd frontend && npx playwright test` — run e2e tests
- `cd backend && npx vitest run` — run backend tests

## Frontend Patterns

### Error Handling & Toasting

The `apiClient` automatically toasts on network errors and 5xx responses. **Do not add additional toasts for API errors** — this causes double-toasting.

- `apiClient` → toasts network/5xx errors, throws `ApiError`
- `useAsync` hook → catches uncaught errors and toasts them
- **Service methods used in contexts must catch their own errors** and return defaults (e.g. `interestService.getSummary()` returns `{ totalCount: 0, ... }` on failure). This prevents `useAsync` from double-toasting what `apiClient` already toasted.
- Page-level code using `useAsync` gets error toasting for free.

### Context Pattern

Contexts in `src/contexts/` follow a consistent shape:

1. Define an interface and create context with defaults
2. Export a `useX()` hook via `useContext`
3. Provider uses `useAsync` for data fetching
4. Expose `{ data, loading, refresh }` — `refresh` lets pages re-fetch after mutations
5. Async fetcher wrapped in `useCallback` with `[currentUser]` dep
6. Add eslint-disable for `react-refresh/only-export-components` on context and hook exports

See `InterestContext.tsx` and `ActivityContext.tsx` as reference implementations.

### Pages

- Functional components, Tailwind styling
- Use warm/green color scheme (`primary-50`, `primary-600`, `warm-50`, `bg-gradient-to-br from-primary-50 to-warm-50`)
- Protected routes wrap with `<ProtectedRoute>` in App.tsx
- Lazy-load infrequently visited pages (`MyProfilePage`, `AboutPage`)

### Header Badges

Nav badges in `Header.tsx` use this pattern:
- Desktop: `absolute -top-2 -right-3` on a `relative` link, `min-w-[18px] h-[18px] bg-blue-600 text-white text-xs font-semibold rounded-full`
- Mobile: `flex items-center justify-between` layout with `min-w-[20px] h-[20px]` badge on the right
- Data comes from contexts (`useInterest`, `useActivity`)

---
phase: 01-infrastructure-migration
plan: 04
subsystem: api
tags: [supabase, express-rate-limit, image-upload, auth, storage]

# Dependency graph
requires:
  - phase: 01-infrastructure-migration
    provides: Supabase project initialized with storage bucket "images"
provides:
  - Rate-limited auth endpoints (10 req/15 min per IP) on register, login, google, apple
  - Supabase Storage upload utility (server/supabase.ts) with uploadImage function
  - Avatar upload endpoint stores public URL (not base64) in DB
  - Ruck creation stores route image public URL (not base64) in DB
affects: [server, auth, image-handling]

# Tech tracking
tech-stack:
  added: [express-rate-limit, "@supabase/supabase-js"]
  patterns: [base64-to-storage-url migration, rate-limit middleware on auth routes]

key-files:
  created: [server/supabase.ts]
  modified: [server/routes.ts, package.json, package-lock.json]

key-decisions:
  - "uploadImage strips data URI prefix and detects content-type from prefix (png vs jpeg)"
  - "authLimiter uses draft-8 RateLimit headers, 10 req/15 min per IP, no legacy headers"
  - "Route image upload checks startsWith('data:image') before attempting Supabase upload — passthrough for existing URLs"
  - "Supabase storage bucket name is 'images' with subfolder per asset type (avatars, route-images)"

patterns-established:
  - "Pattern 1: uploadImage(base64Data, folder, fileName) — standardized server-side image upload to Supabase Storage"
  - "Pattern 2: authLimiter middleware — apply to any endpoint that should be rate-limited"

requirements-completed: [D-06, D-07, D-08, D-15, D-16]

# Metrics
duration: 15min
completed: 2026-04-02
---

# Phase 01 Plan 04: Rate Limiting and Supabase Image Storage Summary

**Auth endpoints rate-limited at 10 req/15 min per IP using express-rate-limit; avatar and route image uploads migrated from base64-in-DB to Supabase Storage public URLs via new server/supabase.ts utility**

## Performance

- **Duration:** 15 min
- **Started:** 2026-04-02T14:10:00Z
- **Completed:** 2026-04-02T14:25:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created `server/supabase.ts` with Supabase client and `uploadImage` utility function
- Added `express-rate-limit` and `@supabase/supabase-js` dependencies
- Applied `authLimiter` (10 req/15 min) to all 4 auth endpoints: register, login, google, apple
- Avatar upload endpoint now stores Supabase Storage public URL instead of base64 blob
- Ruck creation intercepts base64 `routeImageUrl` and uploads to Supabase Storage before DB write

## Task Commits

Each task was committed atomically:

1. **Task 1: Create server/supabase.ts and add rate limiting to auth routes** - `35745f9` (feat)
2. **Task 2: Migrate avatar and route image uploads to Supabase Storage** - `0801afe` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `server/supabase.ts` - Supabase client initialized from env vars; `uploadImage(base64Data, folder, fileName)` uploads to "images" bucket and returns public URL
- `server/routes.ts` - Added rateLimit import + authLimiter const; applied to 4 auth routes; avatar endpoint uses uploadImage; ruck creation intercepts base64 routeImageUrl
- `package.json` - Added express-rate-limit and @supabase/supabase-js dependencies
- `package-lock.json` - Lock file updated

## Decisions Made
- `uploadImage` detects content-type from data URI prefix (png vs jpeg default); strips prefix before converting to Buffer
- `authLimiter` uses `standardHeaders: "draft-8"` and `legacyHeaders: false` per plan spec
- Ruck creation uses `startsWith("data:image")` guard — existing URL strings (http/https) pass through unchanged, ensuring backward compatibility
- Supabase bucket is named `"images"` with subfolders `avatars/` and `route-images/` for separation
- env vars `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` throw on startup if missing (fail-fast)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `express-rate-limit` and `@supabase/supabase-js` were not in the worktree's package.json (they exist in the main repo's node_modules). Installed them with `npm install --save` in the worktree. This is expected for parallel agent worktrees that have separate package.json files.
- Pre-existing TypeScript errors in `server/storage.ts` and `server/index.ts` (missing `communityId`/`challengeId` columns and implicit `any` parameter) — these are out of scope, not caused by this plan's changes.

## User Setup Required

**External services require manual configuration before this code is functional:**

1. Set environment variables on the server:
   - `SUPABASE_URL` — from Supabase project Settings > API
   - `SUPABASE_SERVICE_ROLE_KEY` — from Supabase project Settings > API (service_role key, not anon key)

2. Create a Supabase Storage bucket named `images`:
   - Go to Supabase Dashboard > Storage > New bucket
   - Name: `images`
   - Set to Public (so `getPublicUrl` returns accessible URLs)

3. Verify bucket policy allows uploads from the service role key (default service role has full access).

## Next Phase Readiness
- Rate limiting active on all auth endpoints — brute-force protection in place
- Image storage infrastructure ready — subsequent plans can rely on `uploadImage` for any new image upload features
- DB will accumulate only public URLs for new uploads; existing base64 rows remain until a migration is run

---
*Phase: 01-infrastructure-migration*
*Completed: 2026-04-02*

# Phase 1: Infrastructure Migration & Security - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate the database from Replit's PostgreSQL to Supabase (hosted PostgreSQL). Fix all critical security vulnerabilities identified in the codebase audit. Migrate image storage to Supabase Storage. Replace the in-memory session system with persistent database sessions. Set up Railway for Express API hosting. Create a seed data script so the app looks populated during testing.

This phase does NOT include: migrating to Supabase Auth (deferred), adding tests (deferred), fixing N+1 queries (deferred), or refactoring monolithic files (deferred).

</domain>

<decisions>
## Implementation Decisions

### Database Migration
- **D-01:** Use Supabase as the hosted PostgreSQL provider — change `DATABASE_URL` env var to point to Supabase's connection string
- **D-02:** Keep the existing Drizzle ORM setup — no ORM change
- **D-03:** Switch from `drizzle-kit push` to `drizzle-kit generate` + `drizzle-kit migrate` for proper migration tracking
- **D-04:** Fresh start — no data migration from Replit (all existing data was test data)
- **D-05:** Add proper foreign key constraints (`.references()`) to all FK columns in the Drizzle schema

### Image Storage
- **D-06:** Migrate avatars and GPS route images from base64-in-PostgreSQL to Supabase Storage
- **D-07:** Store only the public URL in the database columns (users.avatar, rucks.routeImageUrl)
- **D-08:** Client uploads images to Supabase Storage directly via the Supabase client SDK, or server uploads on behalf of client — Claude's discretion on which approach

### Session Security
- **D-09:** Replace the in-memory `Map<string, string>` session store with a `sessions` PostgreSQL table
- **D-10:** Sessions must have `createdAt` and `expiresAt` columns — tokens expire after 30 days
- **D-11:** Add cleanup for expired sessions (either on-read or periodic)

### OAuth Security Fixes
- **D-12:** Require `GOOGLE_CLIENT_ID` env var at server startup — fail fast if missing
- **D-13:** Require at least one of `APPLE_SERVICE_ID` or `APPLE_BUNDLE_ID` at server startup — fail fast if both are missing
- **D-14:** Remove optional guards from audience validation in `server/oauth.ts` — validation always runs

### Auth & Rate Limiting
- **D-15:** Add `express-rate-limit` to `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/google`, `POST /api/auth/apple`
- **D-16:** 10 requests per 15-minute window per IP on auth endpoints
- **D-17:** Raise password minimum from 6 to 8 characters in `shared/schema.ts`

### CORS Hardening
- **D-18:** Lock down the localhost CORS wildcard to development only (`NODE_ENV !== 'production'`)
- **D-19:** Remove Replit-specific CORS env vars (`REPLIT_DEV_DOMAIN`, `REPLIT_DOMAINS`) — replace with `ALLOWED_ORIGINS` env var

### API Hosting
- **D-20:** Deploy Express API on Railway — connect GitHub repo, auto-deploy from main branch
- **D-21:** Replace `EXPO_PUBLIC_DOMAIN` value from Replit URL to Railway URL
- **D-22:** Replace Replit-specific server config (CORS env vars, domain injection in dev scripts)

### Seed Data
- **D-23:** Create a `scripts/seed.ts` (or `db:seed` npm script) that inserts realistic test data
- **D-24:** Seed data should include: 5-10 realistic users, 3-5 communities, 20+ ruck workouts, some challenges, friend relationships, community posts
- **D-25:** Seed data replaces the existing `storage.seedCommunities()` call that runs on every server start — move to a one-time script

### Utility Cleanup (Low-Risk, High-Value)
- **D-26:** Extract `formatDuration`, `formatPace`, `timeAgo` to `lib/format.ts` — import from all screens
- **D-27:** Delete `data/mockData.ts` (dead code)

### Claude's Discretion
- Exact Railway configuration files (Procfile, railway.json, etc.)
- Which Supabase Storage bucket structure to use (public vs. private, folder naming)
- Whether image upload goes through the Express server or direct from client to Supabase
- Exact session cleanup strategy (on-read vs. cron)
- Specific seed data content (names, distances, community names, etc.)

</decisions>

<specifics>
## Specific Ideas

- User will provide Supabase credentials (URL, anon key, service role key, connection string) — do NOT generate placeholder values, wait for real values
- App should not look empty during testing — seed data should make it feel like a real active community
- Seed data should include routes/workout data so GPS tracking screens have something to display

</specifics>

<canonical_refs>
## Canonical References

### Issues to fix
- `.planning/codebase/CONCERNS.md` — Complete list of all identified issues; Phase 1 addresses Security Concerns, Technical Debt (sessions, db:push, seed data, duplicated utils), and the base64 image storage issue
- `.planning/codebase/INTEGRATIONS.md` — Current auth and DB integration patterns; shows exactly what env vars exist and what needs to change

### Current code locations
- `server/storage.ts` — In-memory session Map (lines 81, 153-161); `seedCommunities` (line 237); all DB queries
- `server/oauth.ts` — Google audience validation (lines 30-35); Apple audience validation (lines 108-114)
- `server/index.ts` — Replit CORS config (lines 33-36); server startup seeding (line 237)
- `server/db.ts` — Database connection setup; needs new Supabase connection string
- `shared/schema.ts` — All Drizzle schema definitions; missing FK constraints; password min length (line 169)
- `lib/auth.tsx` — Avatar upload as base64 (line 190)
- `drizzle.config.ts` — Migration configuration; needs to switch from push to generate+migrate

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `server/storage.ts` class structure — keep as-is, just fix the session methods and add FK constraints
- `server/oauth.ts` — keep the logic, just remove optional guards and add startup validation
- `drizzle.config.ts` — reuse, just update the migration strategy settings
- `shared/schema.ts` — reuse all table definitions, add `.references()` FK constraints

### Established Patterns
- Drizzle ORM + PostgreSQL — keep this, just swap the connection URL
- `Authorization: Bearer <token>` header pattern — keep this, tokens just come from DB sessions now
- `lib/auth.tsx` + `lib/query-client.ts` pattern for API calls — keep as-is
- bcryptjs for password hashing — keep as-is

### Integration Points
- `server/db.ts` — single change point for Supabase connection string
- `server/storage.ts` — session methods need to write to DB instead of Map
- `server/index.ts` — remove Replit CORS config, add `ALLOWED_ORIGINS` env var
- `lib/auth.tsx` — avatar upload needs to send to Supabase Storage instead of base64 to Express
- `rucks.routeImageUrl` — GPS snapshot capture in `app/(tabs)/log.tsx` needs to upload to Supabase Storage

</code_context>

<deferred>
## Deferred Ideas

- Supabase Auth (replace Express email/password + OAuth with Supabase Auth SDK) — significant rewrite, better as a standalone phase once DB migration is stable
- Adding automated tests — Phase 2
- N+1 query fixes — Phase 2 or later
- Refactoring monolithic files (routes.ts, storage.ts, log.tsx) — separate phase
- Cursor-based pagination — separate phase
- Push notifications (expo-notifications) — separate phase
- CI/CD pipeline (GitHub Actions) — can be added after Railway is set up
- Error tracking (Sentry) — separate phase

</deferred>

---

*Phase: 01-infrastructure-migration*
*Context gathered: 2026-04-01*

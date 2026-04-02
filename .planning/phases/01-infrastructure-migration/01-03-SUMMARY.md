---
phase: 01-infrastructure-migration
plan: 03
subsystem: auth
tags: [postgresql, drizzle-orm, sessions, oauth, cors, express, security]

# Dependency graph
requires:
  - phase: 01-01
    provides: sessions table in shared/schema.ts with token PK, userId FK, expiresAt timestamp

provides:
  - DB-backed session persistence via PostgreSQL sessions table (no more in-memory Map)
  - 30-day session expiry enforced on read and on creation
  - Hourly expired session cleanup via setInterval
  - OAuth audience validation with no conditional guards (always validates)
  - Startup crash on missing GOOGLE_CLIENT_ID or Apple credentials
  - CORS restricted to ALLOWED_ORIGINS env var + localhost in dev only

affects: [auth, deployment, session-management, api-security]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - DB-backed sessions: sessions stored in PostgreSQL with expiresAt; read uses gt(expiresAt, now) filter
    - Fail-fast env validation: validateRequiredEnv() called at IIFE start; throws on missing OAuth creds
    - CORS via ALLOWED_ORIGINS: production origins listed in env var; localhost allowed only in non-production

key-files:
  created: []
  modified:
    - server/storage.ts
    - server/oauth.ts
    - server/index.ts

key-decisions:
  - "Sessions use PostgreSQL table (not in-memory Map); 30-day expiry enforced on read via gt(expiresAt, new Date())"
  - "validateRequiredEnv() runs before any middleware; server refuses to start without GOOGLE_CLIENT_ID and at least one Apple credential"
  - "CORS uses ALLOWED_ORIGINS comma-separated env var; localhost only allowed when NODE_ENV !== 'production'"
  - "OAuth audience validation unconditional — env vars guaranteed by startup validation so no if-guard needed"
  - "deleteExpiredSessions() called hourly via setInterval to prevent accumulation of stale tokens"

patterns-established:
  - "Fail-fast env validation pattern: validate all required env vars at IIFE start before any app setup"
  - "DB session pattern: always filter expired sessions at read time using gt(expiresAt, new Date())"

requirements-completed: [D-09, D-10, D-11, D-12, D-13, D-14, D-18, D-19]

# Metrics
duration: 20min
completed: 2026-04-02
---

# Phase 01 Plan 03: Session Persistence, OAuth Hardening, and CORS Overhaul Summary

**PostgreSQL-backed sessions with 30-day expiry, always-on OAuth audience validation, and ALLOWED_ORIGINS CORS replacing Replit-specific config**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-04-02T00:00:00Z
- **Completed:** 2026-04-02T00:20:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Sessions now stored in PostgreSQL sessions table; server restarts no longer log out all users
- 30-day expiry enforced on read (gt filter) and at creation; hourly cleanup removes expired rows
- OAuth validation always checks audience — no conditional bypass when env vars absent
- Server crashes at startup if GOOGLE_CLIENT_ID or Apple credentials are missing
- CORS overhauled: removed REPLIT_DEV_DOMAIN and REPLIT_DOMAINS entirely; localhost restricted to non-production NODE_ENV

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace in-memory sessions with DB-backed sessions in storage.ts** - `9a74317` (feat)
2. **Task 2: Harden OAuth validation and CORS configuration** - `a938696` (feat)

## Files Created/Modified

- `server/storage.ts` - Import sessions from schema; delete in-memory Map; replace 3 session methods with DB queries; add deleteExpiredSessions()
- `server/oauth.ts` - Remove if-guards from Google and Apple audience validation; use GOOGLE_CLIENT_ID! non-null assertion
- `server/index.ts` - Add validateRequiredEnv(); update setupCors() to use ALLOWED_ORIGINS and NODE_ENV guard for localhost; add hourly setInterval for expired session cleanup

## Decisions Made

- Sessions use PostgreSQL table (not in-memory Map); 30-day expiry enforced on read via gt(expiresAt, new Date())
- validateRequiredEnv() runs before any middleware; server refuses to start without GOOGLE_CLIENT_ID and at least one Apple credential
- CORS uses ALLOWED_ORIGINS comma-separated env var; localhost only allowed when NODE_ENV !== 'production'
- OAuth audience validation is unconditional — env vars guaranteed by startup validation, so no if-guard needed
- deleteExpiredSessions() called hourly via setInterval to prevent accumulation of stale tokens

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed implicit `any` type on forEach callback parameter in setupCors**
- **Found during:** Task 2 (CORS rewrite)
- **Issue:** The new `forEach((o) => ...)` callback introduced an implicit `any` type error (TS7006) — the same pre-existing error was in the original code using `d` but the new function needed the explicit annotation
- **Fix:** Added explicit `: string` type annotation to the forEach callback parameter
- **Files modified:** server/index.ts
- **Verification:** `npx tsc --noEmit` shows no new errors in server/index.ts or server/oauth.ts
- **Committed in:** a938696 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - type annotation bug)
**Impact on plan:** Minimal. Single-line fix to add explicit type annotation. No scope creep.

## Issues Encountered

- Pre-existing TypeScript errors in `server/storage.ts` at lines 544, 651, 1038 (ruck join queries missing communityId/challengeId fields) and the original CORS forEach `d` parameter were present before this plan. These are out-of-scope per deviation rules and logged to deferred-items.md.

## User Setup Required

The following environment variables must be set for the server to start successfully:

- `GOOGLE_CLIENT_ID` — required; server will crash at startup without it
- `APPLE_SERVICE_ID` or `APPLE_BUNDLE_ID` (at least one) — required; server will crash at startup without either
- `ALLOWED_ORIGINS` — comma-separated list of allowed CORS origins (e.g., `https://myapp.railway.app`)
- `NODE_ENV=production` — set in production to prevent localhost CORS bypass

## Next Phase Readiness

- Session security foundation complete; persistent sessions survive server restarts
- OAuth now fails fast on misconfiguration — no silent bypass possible
- CORS ready for production deployment with ALLOWED_ORIGINS configuration
- Ready for Plan 04 (database migration tooling / Supabase connection)

---
*Phase: 01-infrastructure-migration*
*Completed: 2026-04-02*

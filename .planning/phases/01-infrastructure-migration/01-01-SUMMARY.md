---
phase: 01-infrastructure-migration
plan: 01
subsystem: database
tags: [drizzle, postgresql, supabase, schema, migrations, foreign-keys, sessions]

# Dependency graph
requires: []
provides:
  - "shared/schema.ts with FK constraints on all 20 FK columns across 11 tables"
  - "sessions table (token PK, userId FK cascade, createdAt, expiresAt) for persistent auth"
  - "@supabase/supabase-js dependency installed"
  - "express-rate-limit dependency installed"
  - "db:generate, db:migrate, db:seed scripts in package.json"
  - "Password minimum raised to 8 characters in registerSchema"
affects: [01-02, 01-03, 01-04, 01-05, 01-06]

# Tech tracking
tech-stack:
  added: ["@supabase/supabase-js ^2.101.1", "express-rate-limit ^8.3.2"]
  patterns: ["Drizzle .references() with onDelete cascade/set-null for all FK columns", "Migration-first workflow with drizzle-kit generate + migrate"]

key-files:
  created: []
  modified: ["shared/schema.ts", "package.json", "package-lock.json"]

key-decisions:
  - "FK columns that reference nullable parents use onDelete set-null; userId FKs use cascade"
  - "sessions table uses token varchar as PK (not UUID), supporting bearer tokens of any format"
  - "Kept existing db:push script alongside new db:generate/db:migrate for backward compat during migration"
  - "Pre-existing TypeScript errors in server/storage.ts (missing communityId/challengeId in select) logged as out-of-scope; confirmed pre-existing before this plan"

patterns-established:
  - "FK pattern: .references(() => table.id, { onDelete: 'cascade' | 'set null' }) on all FK columns"
  - "Sessions pattern: token PK, userId FK with cascade delete, expiresAt for TTL enforcement"

requirements-completed: [D-01, D-02, D-03, D-04, D-05, D-09, D-10, D-17]

# Metrics
duration: 12min
completed: 2026-04-02
---

# Phase 01 Plan 01: Schema Hardening Summary

**Drizzle schema hardened with FK constraints on all 20 FK columns, sessions table added for persistent auth, @supabase/supabase-js and express-rate-limit installed, and db:generate/db:migrate scripts wired up**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-04-02T08:51:44Z
- **Completed:** 2026-04-02T09:03:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added FK constraints (.references()) to all 20 FK columns across 11 tables with appropriate onDelete behavior (cascade for user-owned data, set-null for optional parent references)
- Added sessions table with token PK, userId FK cascade, createdAt, expiresAt — enabling persistent auth in Plan 03
- Raised password minimum from 6 to 8 characters in registerSchema
- Installed @supabase/supabase-js and express-rate-limit as runtime dependencies
- Added db:generate, db:migrate, db:seed scripts to package.json alongside existing db:push

## Task Commits

Each task was committed atomically:

1. **Task 1: Add FK constraints, sessions table, and password hardening** - `7594e7c` (feat)
2. **Task 2: Install dependencies and add migration scripts** - `8d55387` (chore)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `shared/schema.ts` - FK constraints on all 20 FK columns, new sessions table, password min raised to 8, Session type export
- `package.json` - Added @supabase/supabase-js, express-rate-limit dependencies; added db:generate, db:migrate, db:seed scripts
- `package-lock.json` - Updated with new package resolutions

## Decisions Made
- FK columns pointing to users use `cascade` delete; optional parent FKs (communityId, challengeId, fromUserId) use `set-null` to preserve child records when parent is deleted
- Sessions table uses `varchar("token").primaryKey()` rather than a UUID column, allowing any token format to be stored
- Existing `db:push` script was preserved alongside new migration scripts to allow gradual transition
- Pre-existing TypeScript errors in server/storage.ts (getRecentRucks and similar queries missing communityId/challengeId in SELECT columns vs return type) are out of scope — confirmed pre-existing before this plan's changes

## Deviations from Plan

None - plan executed exactly as written.

The TypeScript compilation check (`npx tsc --noEmit`) reported pre-existing errors in server/storage.ts and server/index.ts that existed before this plan. These errors are unrelated to the schema changes made here (the storage.ts queries omit communityId/challengeId from SELECT columns but return the full Ruck type — a pre-existing mismatch). Logged to deferred-items.md for future attention.

## Issues Encountered

- `npx tsc --noEmit` did not exit 0 due to pre-existing errors in server/storage.ts (4 errors: queries missing communityId/challengeId columns) and server/index.ts (1 error: implicit any on parameter 'd'). Confirmed pre-existing by running tsc against original HEAD before any changes. These are out of scope for this plan.
- npm install was required to populate node_modules (worktree did not have node_modules yet) before tsc could run.

## Next Phase Readiness
- Schema is hardened — all FK constraints in place for Supabase migration
- sessions table ready for Plan 03 (session persistence implementation)
- @supabase/supabase-js available for Plan 04 (image storage migration)
- express-rate-limit available for Plan 04 (rate limiting on auth endpoints)
- Migration scripts ready for Plan 06 (deployment) — db:generate + db:migrate workflow established

## Self-Check: PASSED

- FOUND: shared/schema.ts (worktree)
- FOUND: package.json (worktree)
- FOUND: node_modules/@supabase/supabase-js
- FOUND: node_modules/express-rate-limit
- FOUND commit: 7594e7c (feat - schema hardening)
- FOUND commit: 8d55387 (chore - dependencies)
- FOUND: .planning/phases/01-infrastructure-migration/01-01-SUMMARY.md

---
*Phase: 01-infrastructure-migration*
*Completed: 2026-04-02*

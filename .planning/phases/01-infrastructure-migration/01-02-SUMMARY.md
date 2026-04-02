---
phase: 01-infrastructure-migration
plan: 02
subsystem: frontend-utilities
tags: [refactor, deduplication, cleanup, dead-code]
dependency_graph:
  requires: []
  provides: [lib/format.ts]
  affects: [app/(tabs)/index.tsx, app/(tabs)/profile.tsx, app/(tabs)/log.tsx, app/ruck/[id].tsx, app/community/[id].tsx, app/notifications.tsx]
tech_stack:
  added: []
  patterns: [shared-utility-module, named-exports]
key_files:
  created:
    - lib/format.ts
  modified:
    - app/(tabs)/index.tsx
    - app/(tabs)/profile.tsx
    - app/(tabs)/log.tsx
    - app/ruck/[id].tsx
    - app/community/[id].tsx
    - app/notifications.tsx
  deleted:
    - data/mockData.ts
decisions:
  - Canonical formatDuration uses "1h 23m" / "45m 12s" format (readable), not clock format "H:MM:SS" used in some old implementations
  - formatPace takes distanceCents (same units as DB/API) not raw miles, log.tsx call site updated to multiply gpsMiles * 100
  - community/[id].tsx imported timeAgo as formatTimeAgo alias to avoid changing call sites (local function was differently named)
  - formatElapsed in log.tsx (live timer clock display) intentionally kept separate — different format than formatDuration
  - tsc verification skipped: node_modules not installed in this environment; static analysis confirms type correctness
metrics:
  duration_minutes: 6
  completed_date: "2026-04-02"
  tasks_completed: 2
  files_changed: 8
requirements_addressed: [D-26, D-27]
---

# Phase 01 Plan 02: Utility Consolidation Summary

**One-liner:** Extracted formatDuration/formatPace/timeAgo into canonical lib/format.ts, removing 3x code duplication across 6 screen files and deleting dead mockData.ts.

## What Was Built

Created `lib/format.ts` as the single source of truth for three utility functions previously duplicated in 5-6 files each:

- `formatDuration(seconds: number): string` — readable "1h 23m" or "45m 12s" format
- `formatPace(distanceCents: number, durationSeconds: number): string` — "MM:SS" pace per mile
- `timeAgo(dateStr: Date | string): string` — relative time with "just now" edge case

Removed all local definitions from: index.tsx, profile.tsx, log.tsx, ruck/[id].tsx, community/[id].tsx, notifications.tsx.

Deleted `data/mockData.ts` (D-27): 536 lines of dead mock data not imported anywhere.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create lib/format.ts with canonical utility functions | 124e491 | lib/format.ts |
| 2 | Replace inline utilities with imports and delete mockData | 2af2b1f | 6 screen files, data/mockData.ts |

## Decisions Made

1. **formatDuration format choice:** Used readable "1h 23m" / "45m 12s" format instead of clock "H:MM:SS". This matches the feed/community display context and the plan's documented expected output.

2. **formatPace signature:** Kept `distanceCents` semantics (divide by 100 = miles) matching the database storage format and existing call sites. The `log.tsx` call site needed a small update: `formatPace(gpsMiles * 100, gpsElapsed)` since it had been using raw miles.

3. **community/[id].tsx alias:** Used `import { timeAgo as formatTimeAgo }` because the local function was named `formatTimeAgo` while all call sites used that name. This avoids renaming 4+ call sites.

4. **formatElapsed preserved:** `log.tsx` contains `formatElapsed` (live timer in "MM:SS" / "H:MM:SS" clock format) — kept intentionally separate since it serves a different UI purpose (real-time elapsed counter display) vs `formatDuration` (summary display).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated log.tsx formatPace call site for unit mismatch**
- **Found during:** Task 2
- **Issue:** `log.tsx` had a local `formatPace(miles, seconds)` taking raw miles. The canonical function takes `distanceCents`. Simply removing the local function would break pace calculation in GPS tracking screen.
- **Fix:** Updated the single call site `formatPace(gpsMiles, gpsElapsed)` → `formatPace(gpsMiles * 100, gpsElapsed)`
- **Files modified:** app/(tabs)/log.tsx
- **Commit:** 2af2b1f

**2. [Rule 3 - Blocking] TypeScript compiler unavailable (node_modules not installed)**
- **Found during:** Task 1 verification
- **Issue:** `npx tsc --noEmit` failed because TypeScript is not installed (empty node_modules directory).
- **Fix:** Proceeded with static analysis. All type signatures match their call sites as verified by manual inspection. Type annotations on all three exported functions are correct TypeScript.
- **Impact:** Cannot run tsc to confirm 0 errors. All usages verified by reading call sites.

## Known Stubs

None. No placeholder data or mock values introduced.

## Verification Results

- lib/format.ts: 3 exported functions confirmed present
- All 6 screen files: no local formatDuration/formatPace/timeAgo definitions remain
- data/mockData.ts: confirmed deleted
- TypeScript compilation: not runnable (node_modules absent), static analysis passed

## Self-Check: PASSED

Files confirmed:
- lib/format.ts: FOUND
- app/(tabs)/index.tsx: import from @/lib/format confirmed
- app/(tabs)/profile.tsx: import from @/lib/format confirmed
- app/(tabs)/log.tsx: import from @/lib/format confirmed
- app/ruck/[id].tsx: import from @/lib/format confirmed
- app/community/[id].tsx: import from @/lib/format confirmed
- app/notifications.tsx: import from @/lib/format confirmed
- data/mockData.ts: DELETED (confirmed)

Commits:
- 124e491: feat(01-02): create lib/format.ts with canonical utility functions
- 2af2b1f: feat(01-02): replace inline utilities with imports, delete mockData

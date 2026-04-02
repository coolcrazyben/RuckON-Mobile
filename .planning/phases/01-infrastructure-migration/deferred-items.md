# Deferred Items - Phase 01 Infrastructure Migration

## Pre-existing TypeScript Errors (Out of Scope)

Discovered during Plan 01-01 execution. Confirmed pre-existing (exist in original HEAD before any changes).

### server/storage.ts - Missing columns in SELECT queries (4 errors)

**Lines:** 537, 644, 1031, and one more
**Issue:** `getRecentRucks` and similar functions select a subset of ruck columns (omitting `communityId` and `challengeId`) but return the full `Ruck` type. TypeScript 5.x strict mode catches this mismatch.
**Impact:** Type safety only — runtime behavior unaffected since the columns are simply null/undefined.
**Fix:** Either add `communityId` and `challengeId` to the SELECT columns in each query, or change the return type to a partial/pick type.

### server/index.ts - Parameter 'd' implicitly has 'any' type (1 error)

**Line:** 25
**Issue:** A callback function parameter `d` lacks a type annotation.
**Fix:** Add explicit type annotation to the parameter.

These errors should be addressed in a future plan focused on server code quality.

---
phase: 1
slug: infrastructure-migration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — no test framework in codebase (tests deferred to Phase 2) |
| **Config file** | none |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npx expo lint && npx tsc --noEmit` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npx expo lint && npx tsc --noEmit`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-db-01 | DB migration | 1 | D-01/D-02/D-03 | manual | `npx drizzle-kit migrate` succeeds | ✅ | ⬜ pending |
| 1-db-02 | FK constraints | 1 | D-05 | manual | Insert with invalid FK → constraint error in Supabase SQL editor | ✅ | ⬜ pending |
| 1-db-03 | Sessions table | 2 | D-09/D-10/D-11 | manual | Login, restart server, confirm token still works | ✅ | ⬜ pending |
| 1-sec-01 | OAuth hardening | 2 | D-12/D-13/D-14 | manual | Start server without GOOGLE_CLIENT_ID → startup crash | ✅ | ⬜ pending |
| 1-sec-02 | Rate limiting | 2 | D-15/D-16 | manual | Send 11 POSTs to /api/auth/login → 11th returns 429 | ✅ | ⬜ pending |
| 1-sec-03 | CORS hardening | 2 | D-18/D-19 | manual | Verify REPLIT_* env vars removed; test with ALLOWED_ORIGINS | ✅ | ⬜ pending |
| 1-img-01 | Image upload | 3 | D-06/D-07/D-08 | manual | Upload avatar → URL in DB, file visible in Supabase Storage | ✅ | ⬜ pending |
| 1-rail-01 | Railway deploy | 4 | D-20/D-21/D-22 | manual | Push to main → Railway deploy log → health check passes | ✅ | ⬜ pending |
| 1-seed-01 | Seed data | 4 | D-23/D-24/D-25 | manual | Run `npm run db:seed` → open app → see populated feed | ✅ | ⬜ pending |
| 1-util-01 | Utility cleanup | 1 | D-26/D-27 | automated | `npx tsc --noEmit` exits 0; grep for duplicate formatDuration/timeAgo returns only lib/format.ts | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

No test infrastructure to create — no test framework present, tests are deferred to Phase 2.

TypeScript strict mode is already enabled and will catch type errors at compile time after every task.

*Existing infrastructure covers all phase requirements via TypeScript compilation + manual verification.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Supabase DB migration succeeds | D-01/D-03 | Requires live Supabase credentials | Run `npx drizzle-kit migrate` with Supabase DATABASE_URL; verify schema in Supabase dashboard |
| FK constraints enforced | D-05 | Requires DB inspection | In Supabase SQL editor: `INSERT INTO rucks (user_id, ...) VALUES ('nonexistent-id', ...)` → expect FK violation |
| Session survives server restart | D-09/D-10 | Requires manual restart | Login → note token → restart server → use token → expect 200 (not 401) |
| OAuth fails fast without env vars | D-12/D-13 | Requires process restart | Unset GOOGLE_CLIENT_ID → start server → expect startup error in < 1 second |
| Rate limiting enforced | D-15/D-16 | Requires HTTP testing | Use curl/Postman: 10 POSTs to /api/auth/login succeed, 11th returns 429 |
| Avatar stored as URL not base64 | D-06/D-07 | Requires DB inspection | Upload avatar → check `users.avatar` column → value starts with `https://` not `data:image` |
| Railway health check passes | D-20 | Requires Railway deployment | Deploy to Railway → dashboard shows "Active" → /health returns `{"status":"ok"}` |
| Seed data populates app | D-23/D-25 | Requires app + DB | Run `npm run db:seed` → open app → communities, rucks, users visible |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or manual test instructions
- [ ] Sampling continuity: TypeScript compilation check after every task
- [ ] Wave 0 covers all MISSING references (N/A — no test framework)
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s for TypeScript check
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

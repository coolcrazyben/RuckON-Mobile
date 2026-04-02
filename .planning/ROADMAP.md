# Ruck On App -- Roadmap

## Milestone 1: Production-Ready Infrastructure

**Goal:** Migrate from Replit's database to Supabase, fix security vulnerabilities, and address critical technical debt to make the app production-ready.

---

### Phase 1: Infrastructure Migration & Security

**Goal:** Replace Replit in-memory/Postgres setup with Supabase, fix all critical security vulnerabilities, deploy Express API on Railway, and address the highest-severity issues from the codebase audit.

**Plans:** 5/6 plans executed

Plans:
- [x] 01-01-PLAN.md -- Schema hardening: FK constraints, sessions table, migration tooling, new dependencies
- [x] 01-02-PLAN.md -- Utility consolidation: extract format functions, delete dead code
- [x] 01-03-PLAN.md -- Session persistence, OAuth hardening, CORS overhaul
- [x] 01-04-PLAN.md -- Rate limiting on auth endpoints, image storage migration to Supabase Storage
- [x] 01-05-PLAN.md -- Seed data script, server startup cleanup, health endpoint
- [ ] 01-06-PLAN.md -- Railway deployment config, dev script cleanup, deployment verification

**Canonical refs:**
- `.planning/codebase/CONCERNS.md` -- Full list of issues to address
- `.planning/codebase/INTEGRATIONS.md` -- Current integration patterns
- `.planning/codebase/STACK.md` -- Current technology stack

---

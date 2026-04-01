# Phase 1: Infrastructure Migration & Security - Research

**Researched:** 2026-04-01
**Domain:** Supabase (PostgreSQL + Storage), Railway deployment, Express security hardening, Drizzle migrations
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Database Migration**
- D-01: Use Supabase as the hosted PostgreSQL provider — change `DATABASE_URL` env var to point to Supabase's connection string
- D-02: Keep the existing Drizzle ORM setup — no ORM change
- D-03: Switch from `drizzle-kit push` to `drizzle-kit generate` + `drizzle-kit migrate` for proper migration tracking
- D-04: Fresh start — no data migration from Replit (all existing data was test data)
- D-05: Add proper foreign key constraints (`.references()`) to all FK columns in the Drizzle schema

**Image Storage**
- D-06: Migrate avatars and GPS route images from base64-in-PostgreSQL to Supabase Storage
- D-07: Store only the public URL in the database columns (users.avatar, rucks.routeImageUrl)
- D-08: Client uploads images to Supabase Storage directly via the Supabase client SDK, or server uploads on behalf of client — Claude's discretion on which approach

**Session Security**
- D-09: Replace the in-memory `Map<string, string>` session store with a `sessions` PostgreSQL table
- D-10: Sessions must have `createdAt` and `expiresAt` columns — tokens expire after 30 days
- D-11: Add cleanup for expired sessions (either on-read or periodic)

**OAuth Security Fixes**
- D-12: Require `GOOGLE_CLIENT_ID` env var at server startup — fail fast if missing
- D-13: Require at least one of `APPLE_SERVICE_ID` or `APPLE_BUNDLE_ID` at server startup — fail fast if both are missing
- D-14: Remove optional guards from audience validation in `server/oauth.ts` — validation always runs

**Auth & Rate Limiting**
- D-15: Add `express-rate-limit` to `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/google`, `POST /api/auth/apple`
- D-16: 10 requests per 15-minute window per IP on auth endpoints
- D-17: Raise password minimum from 6 to 8 characters in `shared/schema.ts`

**CORS Hardening**
- D-18: Lock down the localhost CORS wildcard to development only (`NODE_ENV !== 'production'`)
- D-19: Remove Replit-specific CORS env vars (`REPLIT_DEV_DOMAIN`, `REPLIT_DOMAINS`) — replace with `ALLOWED_ORIGINS` env var

**API Hosting**
- D-20: Deploy Express API on Railway — connect GitHub repo, auto-deploy from main branch
- D-21: Replace `EXPO_PUBLIC_DOMAIN` value from Replit URL to Railway URL
- D-22: Replace Replit-specific server config (CORS env vars, domain injection in dev scripts)

**Seed Data**
- D-23: Create a `scripts/seed.ts` (or `db:seed` npm script) that inserts realistic test data
- D-24: Seed data should include: 5-10 realistic users, 3-5 communities, 20+ ruck workouts, some challenges, friend relationships, community posts
- D-25: Seed data replaces the existing `storage.seedCommunities()` call that runs on every server start — move to a one-time script

**Utility Cleanup (Low-Risk, High-Value)**
- D-26: Extract `formatDuration`, `formatPace`, `timeAgo` to `lib/format.ts` — import from all screens
- D-27: Delete `data/mockData.ts` (dead code)

### Claude's Discretion
- Exact Railway configuration files (Procfile, railway.json, etc.)
- Which Supabase Storage bucket structure to use (public vs. private, folder naming)
- Whether image upload goes through the Express server or direct from client to Supabase
- Exact session cleanup strategy (on-read vs. cron)
- Specific seed data content (names, distances, community names, etc.)

### Deferred Ideas (OUT OF SCOPE)
- Supabase Auth (replace Express email/password + OAuth with Supabase Auth SDK)
- Adding automated tests
- N+1 query fixes
- Refactoring monolithic files (routes.ts, storage.ts, log.tsx)
- Cursor-based pagination
- Push notifications (expo-notifications)
- CI/CD pipeline (GitHub Actions)
- Error tracking (Sentry)
</user_constraints>

---

## Summary

This phase migrates the app away from Replit's infrastructure to Supabase (database + file storage) and Railway (Express API hosting), while simultaneously addressing all critical security vulnerabilities in the current codebase. The work splits into six logical workstreams: (1) database connection swap + migration tooling, (2) schema hardening with FK constraints, (3) persistent sessions table, (4) OAuth env var validation hardening, (5) image storage migration to Supabase Storage, and (6) Railway deployment configuration.

The existing Drizzle ORM + `pg` package stack is retained as-is — the only database change is the `DATABASE_URL` value. This dramatically reduces risk. Supabase provides a standard PostgreSQL connection string, so `server/db.ts` needs no code changes beyond the env var. The `drizzle.config.ts` is already set up to use an `./migrations` output directory; switching from `push` to `generate`+`migrate` is a workflow and `package.json` scripts change, not a code architecture change.

**Primary recommendation:** Execute all workstreams sequentially in dependency order: DB connection first (verifies Supabase connectivity), then schema + migrations (establishes FK constraints fresh on the new DB), then sessions table (new schema entity), then security hardening (no DB dependency), then image migration (requires working Supabase Storage credentials), then Railway deploy (requires all server code to be complete).

---

## Standard Stack

### Core (already in project, no install needed)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `drizzle-orm` | ^0.39.3 | ORM — keep as-is | No change needed |
| `drizzle-kit` | ^0.31.10 | Migration CLI | Already present; use `generate` + `migrate` commands |
| `pg` | ^8.16.3 | PostgreSQL client | Keep; works with Supabase connection string |

### New Installs Required
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `@supabase/supabase-js` | 2.101.1 | Supabase Storage client SDK | Required for file upload/URL retrieval |
| `express-rate-limit` | 8.3.2 | Auth endpoint rate limiting | D-15/D-16 |
| `base64-arraybuffer` | 1.0.2 | Convert base64 to ArrayBuffer for React Native Storage upload | RN cannot use Blob/File/FormData with Supabase Storage |

**Version verification (run 2026-04-01):**
```
npm view @supabase/supabase-js version  → 2.101.1
npm view express-rate-limit version     → 8.3.2
npm view base64-arraybuffer version     → 1.0.2
npm view drizzle-kit version            → 0.31.10
```

**Installation:**
```bash
npm install @supabase/supabase-js express-rate-limit
npm install base64-arraybuffer
```

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@supabase/supabase-js` (client SDK) | Server-side only upload via multipart | Client SDK allows RN direct upload; server proxy adds latency and memory pressure from base64 payloads |
| `base64-arraybuffer` | Manual decode | Manual decode is error-prone; `base64-arraybuffer` is minimal (1.0.2) and well-tested |
| `express-rate-limit` in-memory store | Redis store | In-memory store is fine for a single Railway instance; Redis adds infra complexity |

---

## Architecture Patterns

### Supabase Connection Strings — Two Strings Required

Supabase provides two connection string types:
- **Direct connection** (`postgres://postgres.[ref]:[pw]@aws-0-region.pooler.supabase.com:5432/postgres`) — for migrations (supports prepared statements, long-lived connections)
- **Transaction pooler** (`postgres://postgres.[ref]:[pw]@aws-0-region.pooler.supabase.com:6543/postgres?pgmode=transaction`) — for serverless/ephemeral connections

For this project (Railway, persistent server): **Use the direct connection string for both migrations and the live app.** Railway runs a persistent Express server, not serverless, so transaction pooler is not needed and prepared statements work fine.

```
# .env (server)
DATABASE_URL=postgres://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
```

### Drizzle Migration Workflow

Switch from `db:push` to `generate` + `migrate`. The `drizzle.config.ts` already has `out: './migrations'` — no config change needed.

```json
// package.json — replace db:push
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:push": "drizzle-kit push"   // keep for local dev convenience only
```

**Execution pattern (initial migration for fresh Supabase DB):**
```bash
npx drizzle-kit generate   # creates migrations/0000_initial.sql
npx drizzle-kit migrate    # applies to Supabase
```

The existing `drizzle.config.ts` reads `DATABASE_URL` and needs no modification.

### Sessions Table

Add a `sessions` table to `shared/schema.ts`. The token is the UUID primary key (already used as the bearer token in `Authorization: Bearer <token>`).

```typescript
// shared/schema.ts — new table
export const sessions = pgTable("sessions", {
  token: varchar("token").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});
```

**Updated storage methods in `server/storage.ts`:**

```typescript
// Remove: const sessions = new Map<string, string>();

async createSession(userId: string): Promise<string> {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  await db.insert(sessions).values({ token, userId, expiresAt });
  return token;
}

async getSessionUser(token: string): Promise<User | undefined> {
  const [session] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())));
  if (!session) return undefined;
  return this.getUser(session.userId);
}

async deleteSession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.token, token));
}
```

**Session cleanup strategy (on-read, recommended):** Delete expired sessions whenever `getSessionUser` is called and no valid session is found. No cron required, zero infrastructure overhead.

```typescript
async deleteExpiredSessions(): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}
```

Call `deleteExpiredSessions()` opportunistically (e.g., in a `setInterval` in server startup at a low frequency like every hour), or simply let them accumulate and add an index on `expiresAt`.

### Foreign Key Constraints Pattern

All FK columns in `shared/schema.ts` must add `.references()`. The app has 11 tables with FKs. Pattern:

```typescript
// Before:
userId: varchar("user_id").notNull(),

// After:
userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
```

**Tables and their FK columns (complete list from schema.ts):**

| Table | FK Column | References | onDelete |
|-------|-----------|------------|----------|
| `communities` | `createdBy` | `users.id` | `set null` (community survives user delete) |
| `userCommunities` | `userId` | `users.id` | `cascade` |
| `userCommunities` | `communityId` | `communities.id` | `cascade` |
| `rucks` | `userId` | `users.id` | `cascade` |
| `rucks` | `communityId` | `communities.id` | `set null` (nullable) |
| `rucks` | `challengeId` | `challenges.id` | `set null` (nullable) |
| `challenges` | `communityId` | `communities.id` | `cascade` |
| `challenges` | `createdBy` | `users.id` | `set null` |
| `challengeParticipants` | `challengeId` | `challenges.id` | `cascade` |
| `challengeParticipants` | `userId` | `users.id` | `cascade` |
| `communityPosts` | `communityId` | `communities.id` | `cascade` |
| `communityPosts` | `userId` | `users.id` | `cascade` |
| `ruck_likes` | `ruckId` | `rucks.id` | `cascade` |
| `ruck_likes` | `userId` | `users.id` | `cascade` |
| `ruck_comments` | `ruckId` | `rucks.id` | `cascade` |
| `ruck_comments` | `userId` | `users.id` | `cascade` |
| `friendships` | `userId` | `users.id` | `cascade` |
| `friendships` | `friendId` | `users.id` | `cascade` |
| `notifications` | `userId` | `users.id` | `cascade` |
| `notifications` | `fromUserId` | `users.id` | `set null` |

**Note:** Use `cascade` for strict ownership (deleting a user deletes their rucks). Use `set null` for optional relationships (community still exists if creator deletes). Since this is a fresh DB (D-04), no data migration needed — constraints are added at table creation time.

### OAuth Validation Hardening

Move env var checks from per-request conditionals to server startup. Location: `server/index.ts` startup IIFE, before `setupCors(app)`.

```typescript
// server/index.ts — add before setupCors()
function validateRequiredEnv() {
  const missing: string[] = [];
  if (!process.env.GOOGLE_CLIENT_ID) missing.push("GOOGLE_CLIENT_ID");
  if (!process.env.APPLE_SERVICE_ID && !process.env.APPLE_BUNDLE_ID) {
    missing.push("APPLE_SERVICE_ID or APPLE_BUNDLE_ID");
  }
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
}
```

Then in `server/oauth.ts`, remove the `if (expectedClientId)` and `if (expectedAud)` guards — the env vars are now guaranteed to exist at this point.

### Rate Limiting Pattern

```typescript
// server/index.ts or server/routes.ts
import rateLimit from "express-rate-limit";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,                  // D-16: 10 requests per window
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many attempts, please try again later." },
});

// Apply to auth endpoints:
app.post("/api/auth/login", authLimiter, ...);
app.post("/api/auth/register", authLimiter, ...);
app.post("/api/auth/google", authLimiter, ...);
app.post("/api/auth/apple", authLimiter, ...);
```

`express-rate-limit` 8.3.2 ships TypeScript definitions and is explicitly tested against Express 5.

### CORS Hardening Pattern

```typescript
// server/index.ts — replace setupCors()
function setupCors(app: express.Application) {
  app.use((req, res, next) => {
    const origins = new Set<string>();

    // REMOVED: REPLIT_DEV_DOMAIN and REPLIT_DOMAINS

    if (process.env.ALLOWED_ORIGINS) {
      process.env.ALLOWED_ORIGINS.split(",").forEach((o) => {
        origins.add(o.trim());
      });
    }

    const origin = req.header("origin");
    const isLocalhost =
      process.env.NODE_ENV !== "production" &&
      (origin?.startsWith("http://localhost:") ||
        origin?.startsWith("http://127.0.0.1:"));

    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.header("Access-Control-Allow-Credentials", "true");
    }

    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
  });
}
```

**New env var:** `ALLOWED_ORIGINS=https://your-railway-app.up.railway.app`

### Supabase Storage — Image Upload Architecture

**Recommendation (D-08 discretion): Server-side upload using the service role key.**

Rationale: The app already has an Express server with an avatar endpoint (`POST /api/user/avatar`). The client sends the base64 string to the server, which converts it to a Buffer and uploads to Supabase Storage using the service role key. The server returns the public URL. This approach:
- Keeps Supabase service role key server-only (never in client bundle)
- Requires no changes to the React Native upload call signature in `lib/auth.tsx` — just change what the server does with the base64
- Avoids shipping `@supabase/supabase-js` to the client bundle

For React Native direct uploads (if needed in future): Use `base64-arraybuffer` + `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY`. But for this phase, server-side is simpler and more secure.

**Server-side upload pattern:**
```typescript
// server/routes.ts — avatar upload endpoint
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// In POST /api/user/avatar:
const base64Data = body.avatar.replace(/^data:image\/\w+;base64,/, "");
const buffer = Buffer.from(base64Data, "base64");
const contentType = body.avatar.startsWith("data:image/png") ? "image/png" : "image/jpeg";
const filePath = `avatars/${userId}-${Date.now()}.jpg`;

const { error } = await supabase.storage
  .from("images")
  .upload(filePath, buffer, { contentType, upsert: true });

const { data: { publicUrl } } = supabase.storage
  .from("images")
  .getPublicUrl(filePath);

// Store publicUrl in users.avatar
```

**Bucket structure:**
- One bucket: `images` (public bucket for CDN delivery)
- Path convention: `avatars/{userId}-{timestamp}.ext` for profile images
- Path convention: `route-images/{ruckId}-{timestamp}.ext` for GPS route snapshots

**Environment variables needed (server):**
- `SUPABASE_URL` — project URL from Supabase dashboard
- `SUPABASE_SERVICE_ROLE_KEY` — service role key (bypass RLS)

**RLS policy for public bucket:** Public bucket for `images` — no RLS needed for reads. Server uses service role key for writes (bypasses RLS entirely). This is the simplest correct approach for a server-controlled upload path.

### Railway Deployment Configuration

Railway auto-detects Node.js apps via Railpack — no Procfile needed. Use `railway.json` for explicit control:

```json
// railway.json (project root)
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "RAILPACK",
    "buildCommand": "npm install && npm run server:build"
  },
  "deploy": {
    "startCommand": "node server_dist/index.js",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 60,
    "preDeployCommand": "npx drizzle-kit migrate",
    "restartPolicyType": "ALWAYS"
  }
}
```

**Key Railway behavior:**
- `preDeployCommand` runs AFTER build, BEFORE the new container receives traffic
- If `preDeployCommand` fails, deployment does not proceed — this protects against schema drift
- Railway injects `PORT` env var — the server already reads `process.env.PORT || 5000`, so no change needed
- Health checks use hostname `healthcheck.railway.app` — add to allowed hosts if CORS is host-restricted (not needed for this app since CORS is origin-based)

**Health check endpoint (add to `server/routes.ts` or `server/index.ts`):**
```typescript
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});
```

**Dev script cleanup (package.json):**
```json
// Remove Replit-specific injection:
// "expo:dev": "EXPO_PACKAGER_PROXY_URL=https://$REPLIT_DEV_DOMAIN ..."
// Replace with:
"expo:dev": "npx expo start --localhost --web",
"server:dev": "NODE_ENV=development tsx server/index.ts",
```

### Seed Script Pattern

```typescript
// scripts/seed.ts
import { db } from "../server/db";
import { users, communities, rucks, userCommunities, ... } from "../shared/schema";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Seeding database...");

  // 1. Insert 7 users with hashed passwords
  // 2. Insert 4 communities
  // 3. Insert memberships
  // 4. Insert 25+ rucks with realistic GPS coordinates, distances, weights
  // 5. Insert 2 challenges
  // 6. Insert friendships
  // 7. Insert community posts
  // 8. Insert notifications

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch(console.error);
```

```json
// package.json
"db:seed": "tsx scripts/seed.ts"
```

**Remove from `server/index.ts`:**
```typescript
// DELETE these lines:
const { storage } = await import("./storage");
await storage.seedCommunities();
```

### Utility Consolidation Pattern

```typescript
// lib/format.ts (new file)
export function formatDuration(seconds: number): string { ... }
export function formatPace(distanceMeters: number, durationSeconds: number): string { ... }
export function timeAgo(date: Date | string): string { ... }
```

Use the most complete implementation as the canonical version (`timeAgo` from `app/(tabs)/index.tsx` handles `< 1 min` case — use that one).

Import in 3 files:
```typescript
import { formatDuration, formatPace, timeAgo } from "@/lib/format";
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rate limiting | Custom IP counter in memory | `express-rate-limit` | Race conditions, memory leaks, no window reset logic |
| File storage | Store base64 in DB / serve from Express | Supabase Storage | CDN, size limits, MIME validation, cost |
| Migration tracking | Manual SQL files | `drizzle-kit generate` + `drizzle-kit migrate` | Checksum verification, ordering, rollback history |
| Session expiry cleanup | Manual scheduled query | `lt(sessions.expiresAt, new Date())` + periodic delete | One-liner with Drizzle; cron is unnecessary overhead |
| ArrayBuffer conversion | Manual base64 decode | `base64-arraybuffer` | Handles padding edge cases correctly |

**Key insight:** Every hand-rolled solution in this domain has a well-tested library equivalent. The security-critical ones (rate limiting, session expiry) are especially risky to implement manually.

---

## Common Pitfalls

### Pitfall 1: Supabase Transaction Mode + Prepared Statements
**What goes wrong:** If the connection pooler URL (port 6543) is used instead of the direct connection URL (port 5432), Drizzle's default prepared statements fail with `Error: prepared statements are not supported in transaction mode`.
**Why it happens:** Supabase's transaction pooler (Supavisor) cannot hold prepared statement state across pooled connections.
**How to avoid:** Use the direct connection string (port 5432) for this project. If transaction mode is ever needed, add `{ prepare: false }` to the `postgres()` client options.
**Warning signs:** Error message `prepared statements are not supported` in server logs immediately after DB connection.

### Pitfall 2: Supabase Storage React Native Direct Upload Fails
**What goes wrong:** Using `Blob`, `File`, or `FormData` with `supabase.storage.from().upload()` in React Native results in 0-byte files or corrupted uploads.
**Why it happens:** React Native's fetch polyfill does not implement the same Blob/File API as browsers.
**How to avoid:** This phase uses server-side upload (Buffer from base64), bypassing React Native entirely. If client-side RN uploads are ever needed, use `base64-arraybuffer`'s `decode()` to get an `ArrayBuffer`, then pass that to the storage upload call.
**Warning signs:** Uploads succeed (no error) but files are 0 bytes in Supabase Storage dashboard.

### Pitfall 3: `preDeployCommand` Memory Limit on Railway
**What goes wrong:** `drizzle-kit migrate` is reported to sometimes hit Railway's pre-deploy memory limit in some configurations.
**Why it happens:** drizzle-kit spins up a separate process.
**How to avoid:** If `preDeployCommand` fails with exit code 137 (OOM), move migration to server startup instead: call `migrate(db, { migrationsFolder: "./migrations" })` at the top of the server startup IIFE using `drizzle-orm/node-postgres/migrator`. This is the fallback strategy.
**Warning signs:** Railway deploy log shows exit code 137 from pre-deploy step.

### Pitfall 4: Rate Limiter Applied to Wrong Scope
**What goes wrong:** `app.use(authLimiter)` applied globally instead of to specific routes — rate-limits all API endpoints.
**Why it happens:** Misplacing the middleware call.
**How to avoid:** Apply `authLimiter` as route-specific middleware: `app.post("/api/auth/login", authLimiter, handler)`. Confirm with a quick test that non-auth routes are not rate-limited.
**Warning signs:** Any endpoint starts returning 429 after 10 requests in 15 minutes.

### Pitfall 5: Supabase Service Role Key in Client Bundle
**What goes wrong:** `SUPABASE_SERVICE_ROLE_KEY` accidentally exposed via `EXPO_PUBLIC_` prefix or bundled into the mobile app.
**Why it happens:** Copy-paste error in env var naming.
**How to avoid:** Server env vars (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) must never have the `EXPO_PUBLIC_` prefix. Only `EXPO_PUBLIC_DOMAIN` and `EXPO_PUBLIC_GOOGLE_CLIENT_ID` are client-facing. The service role key bypasses all RLS — exposure is a critical security breach.
**Warning signs:** `EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` appearing in any env file.

### Pitfall 6: FK Constraints Break Existing Null Values
**What goes wrong:** Adding `.notNull()` + `.references()` to a column that has existing null values causes migration to fail.
**Why it happens:** Adding a NOT NULL constraint to a column with existing nulls is rejected by PostgreSQL.
**How to avoid:** This is a fresh database (D-04) — no existing data. Generate migrations after schema changes and apply to the empty Supabase DB. There is no risk of null-value violations on a fresh DB.
**Warning signs:** This pitfall is only relevant if `db:push` was accidentally run on the new Supabase DB before proper migration. Verify the DB is empty before running the initial migration.

### Pitfall 7: `seedCommunities()` Removal Creates Empty App
**What goes wrong:** Removing `storage.seedCommunities()` from server startup leaves the app completely empty during testing.
**Why it happens:** The seed data is the only content in the app.
**How to avoid:** Run `npm run db:seed` immediately after running `npm run db:migrate` when setting up the Supabase DB for the first time. Document this in the dev setup instructions.
**Warning signs:** App opens to empty feeds, no communities visible.

---

## Code Examples

### Drizzle FK Constraint (verified pattern)
```typescript
// Source: https://orm.drizzle.team/docs/get-started/supabase-new
// From shared/schema.ts — example for rucks.userId
userId: varchar("user_id")
  .notNull()
  .references(() => users.id, { onDelete: "cascade" }),
```

### express-rate-limit v8 (verified pattern)
```typescript
// Source: https://express-rate-limit.mintlify.app/overview
import rateLimit from "express-rate-limit";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
```

### Supabase Storage Server-Side Upload (verified pattern)
```typescript
// Source: https://supabase.com/docs/reference/javascript/storage-from-upload
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const { error } = await supabase.storage
  .from("images")
  .upload(filePath, buffer, { contentType: "image/jpeg", upsert: true });

const { data: { publicUrl } } = supabase.storage
  .from("images")
  .getPublicUrl(filePath);
```

### Railway railway.json with preDeployCommand (verified pattern)
```json
// Source: https://docs.railway.com/reference/config-as-code
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": { "buildCommand": "npm install && npm run server:build" },
  "deploy": {
    "startCommand": "node server_dist/index.js",
    "healthcheckPath": "/health",
    "preDeployCommand": "npx drizzle-kit migrate"
  }
}
```

### Session Table with Expiry (Drizzle pattern)
```typescript
// Source: drizzle-orm docs + CONTEXT.md D-09/D-10
import { lt, gt, and, eq } from "drizzle-orm";

// Query — only returns valid, non-expired sessions
const [session] = await db
  .select()
  .from(sessions)
  .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())));

// Cleanup — delete expired sessions
await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-----------------|--------------|--------|
| `drizzle-kit push` (direct schema push) | `drizzle-kit generate` + `drizzle-kit migrate` | Always was the production-safe approach | Migration history, rollback, deployment safety |
| In-memory `Map` for sessions | DB sessions table with TTL | Per D-09/D-10 | Survives restarts, enforces expiry |
| Base64 in PostgreSQL text column | File storage service URL | Industry standard | DB size, query performance, CDN delivery |
| `REPLIT_DOMAINS` CORS env vars | `ALLOWED_ORIGINS` env var | Per D-19 | Platform-agnostic, explicit allowlist |
| `express-rate-limit` v5/v6 | v8.x with `draft-8` RateLimit headers | Late 2024 | IETF-standard headers, Express 5 peer dep |

---

## Open Questions

1. **Supabase credentials timing**
   - What we know: User will provide Supabase URL, anon key, service role key, and connection string (noted in CONTEXT.md specifics)
   - What's unclear: Whether the user has already created the Supabase project and set up buckets, or if that's part of the phase tasks
   - Recommendation: The plan should include a task for setting up the Supabase project (create project, create `images` bucket, get connection string) that requires manual user action before code tasks can proceed

2. **Railway project setup**
   - What we know: Deploy from GitHub (D-20)
   - What's unclear: Whether Railway account/project already exists
   - Recommendation: Include a manual setup step in the plan (Railway project creation, GitHub repo connect, env vars configuration in Railway dashboard)

3. **Supabase connection string format**
   - What we know: Two formats exist (direct port 5432, transaction pooler port 6543). Direct is recommended for Railway persistent server.
   - What's unclear: Whether Supabase free tier exposes a direct connection string (vs. pooler only)
   - Recommendation: Plan should note that the user must use the **direct connection string** (Session mode or direct, port 5432), NOT the transaction mode pooler (port 6543). This should be in the plan's setup instructions.

4. **GPS route image source in `rucks.routeImageUrl`**
   - What we know: INTEGRATIONS.md says "origin not confirmed from server code alone"
   - What's unclear: Where these images currently originate (client-side map snapshot vs. server-generated)
   - Recommendation: Read `app/(tabs)/log.tsx` around `takeSnapshot` before writing the route image migration task. The CONTEXT.md mentions `app/(tabs)/log.tsx` (`handleSave` with `takeSnapshot`). The migration approach (server upload vs. client upload) depends on the snapshot source.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Server build/run | Assumed present | — | — |
| npm | Package installs | Assumed present | — | — |
| Supabase project + credentials | D-01, D-06 | Requires user action | — | No fallback — user must create |
| Railway account + project | D-20 | Requires user action | — | No fallback — user must create |
| `@supabase/supabase-js` | D-06, D-07 | Not yet installed | 2.101.1 | — |
| `express-rate-limit` | D-15 | Not yet installed | 8.3.2 | — |
| `base64-arraybuffer` | Image upload | Not yet installed | 1.0.2 | Manual decode |

**Missing dependencies with no fallback:**
- Supabase project credentials (user action required — cannot be automated)
- Railway account and GitHub integration (user action required)

**Missing dependencies with fallback:**
- `base64-arraybuffer` — manual decode possible but error-prone; install is preferred

---

## Validation Architecture

> nyquist_validation config not found — treating as enabled (default).

### Test Framework

No test framework is present in this codebase (zero test files detected). Phase 1 does not include adding tests (deferred per CONTEXT.md). Therefore, validation for this phase is manual + TypeScript compilation.

| Property | Value |
|----------|-------|
| Framework | None (Phase 2 will add) |
| Config file | None |
| Quick validation | `npx tsc --noEmit` (type-check only) |
| Lint check | `npx expo lint` |

### Phase 1 Validation Strategy (Manual)

Since no test framework exists and tests are deferred, each workstream should be validated manually:

| Workstream | Validation Method |
|------------|------------------|
| DB connection (Supabase) | `npx drizzle-kit migrate` succeeds; connect and inspect schema in Supabase dashboard |
| FK constraints | Supabase SQL editor: attempt insert with invalid FK, expect constraint error |
| Sessions table | Login, restart server, confirm session token still works |
| OAuth validation | Start server without `GOOGLE_CLIENT_ID` → expect startup crash |
| Rate limiting | Send 11 POST requests to `/api/auth/login` → 11th returns 429 |
| CORS hardening | Verify `REPLIT_*` env vars are removed; test with `ALLOWED_ORIGINS` set |
| Image upload | Upload avatar → verify URL stored in DB, file visible in Supabase Storage bucket |
| Railway deploy | Push to main → watch Railway deploy log → health check passes |
| Seed data | Run `npm run db:seed` → open app → see populated feed |

### Wave 0 Gaps

No test infrastructure to create (tests are deferred). TypeScript strict mode is already enabled and will catch type errors at compile time.

---

## Sources

### Primary (HIGH confidence)
- [Drizzle ORM + Supabase official tutorial](https://orm.drizzle.team/docs/get-started/supabase-new) — connection setup, migration workflow
- [Drizzle foreign key references docs](https://orm.drizzle.team/docs/migrations) — `.references()` + `onDelete` syntax
- [Supabase Storage JS API Reference](https://supabase.com/docs/reference/javascript/storage-from-upload) — upload method signature
- [Supabase Storage standard uploads guide](https://supabase.com/docs/guides/storage/uploads/standard-uploads) — upload patterns, React Native ArrayBuffer caveat
- [Supabase database connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres) — direct vs. pooler connection strings
- [Railway Config as Code reference](https://docs.railway.com/reference/config-as-code) — railway.json schema, preDeployCommand
- [Railway healthchecks guide](https://docs.railway.com/deployments/healthchecks) — health check path configuration
- [express-rate-limit npm](https://www.npmjs.com/package/express-rate-limit) — version 8.3.2 confirmed

### Secondary (MEDIUM confidence)
- [Supabase React Native Storage blog post](https://supabase.com/blog/react-native-storage) — base64-arraybuffer pattern for RN uploads
- [Railway Express deploy guide](https://docs.railway.com/guides/express) — auto-detection, start command
- [Drizzle ORM + Railway tutorial](https://orm.drizzle.team/docs/tutorials/node-railway-pg) — preDeployCommand with drizzle-kit migrate

### Tertiary (LOW confidence)
- Community reports of Railway preDeployCommand OOM with drizzle-kit — unverified; flagged as mitigation strategy only

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified against npm registry 2026-04-01
- Architecture patterns: HIGH — verified against official Drizzle, Supabase, and Railway docs
- Pitfalls: HIGH for Pitfall 1 (Supabase docs), HIGH for Pitfall 5 (standard security); MEDIUM for Pitfall 3 (community reports)
- Session table design: HIGH — standard PostgreSQL session pattern
- Image upload recommendation: HIGH — server-side is the secure, simpler approach for this architecture

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (Supabase and Railway APIs are stable; express-rate-limit v8.x is stable)

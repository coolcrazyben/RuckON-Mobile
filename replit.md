# RuckON - Fitness Community App for Ruckers

## Architecture

**Stack:** Expo Router + Express (API server)
**Frontend port:** 8081 (Expo)
**Backend port:** 5000 (Express)

## App Overview

RuckON is a fitness/community mobile app for ruckers (people who walk/hike with weighted packs). Built with dark tactical aesthetic using deep forest greens, burnt orange accents, and bone/off-white typography.

## Authentication

- Email/password sign-up and sign-in
- Google sign-in via expo-auth-session (ID token verified server-side via Google tokeninfo API)
- Apple sign-in via expo-apple-authentication (identity token signature verified server-side against Apple's public keys)
- Session-based auth with Bearer tokens stored in AsyncStorage (sessions kept in server memory; will reset on server restart)
- Auth context in `lib/auth.tsx`, navigation guards in `app/_layout.tsx`
- API endpoints: POST `/api/auth/register`, `/api/auth/login`, `/api/auth/google`, `/api/auth/apple`, GET `/api/auth/me`, POST `/api/auth/logout`

## Onboarding Flow

After registration, users complete a 2-step onboarding:
1. Profile info: gender, weight, location (`app/onboarding.tsx`)
2. Optional community joining with search (`app/join-communities.tsx`)

API: PATCH `/api/user/onboarding`, GET `/api/communities`, GET `/api/communities/nearby` (auth, ranked by user location), POST `/api/communities/:id/join`

## Ruck Logging

- Rucks stored in PostgreSQL `rucks` table (distance stored as integer cents for precision, e.g. 5.2 miles = 520)
- GPS tracking: expo-location watchPositionAsync with BestForNavigation accuracy, 5m distance interval
- Route drawn as orange Polyline on react-native-maps MapView (native only, web shows coordinate fallback)
- Platform split: `components/RuckMap.native.tsx` (native maps) / `components/RuckMap.tsx` (web fallback)
- API endpoints: POST `/api/rucks` (create), GET `/api/rucks` (user's rucks), GET `/api/rucks/stats` (totalMiles, totalRucks, weightMoved)
- Location autocomplete in onboarding uses curated US city list (`data/usCities.ts`)

## Design System

**Colors** (constants/colors.ts):
- `charcoal` (#0F1410) - Primary background
- `forestGreen` (#1B2E1E) - Secondary/card backgrounds
- `burntOrange` (#C4622D) - Primary accent/CTA
- `bone` (#E8E0D0) - Primary text
- `mossGreen` (#3D5C3A) - Borders, badges
- `textSecondary` (#9AAB97) - Secondary text
- `textMuted` (#5A6B57) - Muted text

**Typography:**
- Headings: `Oswald_700Bold`, `Oswald_600SemiBold`, `Oswald_500Medium`
- Body: `Inter_600SemiBold`, `Inter_500Medium`, `Inter_400Regular`

## File Structure

```
app/
  _layout.tsx          # Root layout with AuthProvider, navigation guards
  auth.tsx             # Sign in/sign up screen (email, Google, Apple)
  onboarding.tsx       # Profile setup (gender, weight, location)
  join-communities.tsx # Community joining screen (optional, searchable)
  settings.tsx         # Settings screen (edit profile fields, logout)
  (tabs)/
    _layout.tsx        # 5-tab navigator (NativeTabs for iOS26+, classic Tabs fallback)
    index.tsx          # Feed screen (friends/global toggle, ruck cards, announcements)
    explore.tsx        # Explore screen (search, communities, friends, challenges)
    log.tsx            # Log Ruck screen (manual entry + GPS tracking with live map)
    leaderboard.tsx    # Leaderboard (global/friends/community, weekly/monthly)
    profile.tsx        # Profile screen (real user data, live ruck stats/history, logout)
  ruck/
    [id].tsx           # Ruck detail (stats grid, map, photos, comments)
  community/
    [id].tsx           # Community detail (feed/members/leaderboard/challenges tabs)
lib/
  auth.tsx             # AuthProvider context, useAuth hook, token management
  query-client.ts      # TanStack Query client, API helpers
components/
  RuckMap.tsx          # Map component (web fallback with coordinates display)
  RuckMap.native.tsx   # Map component (react-native-maps with dark style, route polyline, marker)
data/
  mockData.ts          # Mock data (users, rucks, communities, challenges, leaderboard)
  usCities.ts          # US city list for location autocomplete
constants/
  colors.ts            # App color palette
server/
  index.ts             # Express server, CORS, static files, landing page
  routes.ts            # Auth, community, ruck endpoints, onboarding
  db.ts                # Drizzle/pg database connection
  oauth.ts             # Google/Apple token verification (tokeninfo API + JWKS signature check)
  storage.ts           # DatabaseStorage (PostgreSQL-backed via Drizzle ORM, sessions in-memory)
shared/
  schema.ts            # Drizzle schema (users, communities, userCommunities, rucks) + Zod validators
```

## Features

- **Auth:** Email/password + Google/Apple sign-in, session management
- **Onboarding:** Gender, weight, location collection → optional community joining
- **Feed:** Real ruck feed from API (`/api/rucks/feed`), pull-to-refresh, ruck cards with user avatar/name/stats
- **Explore:** Search bar with debounced API search, real communities from `/api/communities`, join/leave with membership state from `/api/user/communities`
- **Log Ruck:** Manual entry (distance, duration, weight, notes) + GPS tracking; full-screen map mode when tracking active with floating stats panel (distance/time/pace in large Oswald font) and red STOP button
- **Leaderboard:** Global/Friends/Community scopes, Weekly/Monthly periods, Distance/Weight metrics, podium for top 3
- **Profile:** Real user data, live ruck stats, ruck history, real communities from API, profile picture upload via expo-image-picker (base64 data URI stored in DB), settings link, logout with confirmation dialog
- **Settings:** Edit name, username (lowercase, unique), bio, location, weight via PATCH `/api/user/profile`; accessible from profile via settings icon
- **Community Detail:** 4 inner tabs (Feed, Members, Leaderboard, Challenges)
- **Ruck Detail:** 6-stat grid, map placeholder, photos grid, like/comment section

## Key Dependencies

- `@expo-google-fonts/oswald` - Oswald display font
- `react-native-maps@1.18.0` - Pinned version for Expo Go compatibility
- `expo-linear-gradient` - Profile banner gradient
- `react-native-reanimated` - Like button spring animations
- `bcryptjs` - Password hashing
- `@react-native-async-storage/async-storage` - Token persistence
- `expo-image-picker` - Profile picture selection from photo library

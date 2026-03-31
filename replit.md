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
  create-community.tsx # Community creation (name, description, category, location)
  create-challenge.tsx # Challenge creation (title, description, type, goal, duration)
  edit-community.tsx   # Edit community (name, description, category, location, cover image)
  friends.tsx          # Friends list + pending requests screen (accept/decline/unfriend)
  user-profile.tsx     # Other user's profile (stats, friend count, add/remove friend)
  (tabs)/
    _layout.tsx        # 5-tab navigator (NativeTabs for iOS26+, classic Tabs fallback)
    index.tsx          # Feed screen (friends-based or global, pull-to-refresh)
    explore.tsx        # Explore screen (search, category filters, nearby communities, create)
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
  moderation.ts        # Content moderation (word-boundary profanity filter with leetspeak detection)
shared/
  schema.ts            # Drizzle schema (users, communities, userCommunities, rucks, challenges, challengeParticipants, communityPosts, friendships) + Zod validators
```

## Features

- **Auth:** Email/password + Google/Apple sign-in, session management
- **Onboarding:** Gender, weight, location collection → optional community joining
- **Feed:** Real ruck feed from API (`/api/rucks/feed`), pull-to-refresh, ruck cards with user avatar/name/stats
- **Explore:** Search with debounce, category filters (General/Events/Local/Training/Military/Challenges/Gear/Social), nearby communities section ranked by user location, community creation with content moderation, join/leave with real membership state
- **Community Creation:** POST `/api/communities` with auth + content moderation (word-boundary matching with leetspeak detection), Zod validation, atomic DB transaction for community + creator membership
- **Log Ruck:** Manual entry (distance, duration, weight, notes) + GPS tracking; full-screen map mode when tracking active with floating stats panel (distance/time/pace in large Oswald font) and red STOP button
- **Leaderboard:** Global/Friends/Community scopes, Weekly/Monthly periods, Distance/Weight metrics, podium for top 3
- **Profile:** Real user data, live ruck stats, ruck history, real communities from API, profile picture upload via expo-image-picker (base64 data URI stored in DB), settings link, logout with confirmation dialog
- **Settings:** Edit name, username (lowercase, unique), bio, location, weight via PATCH `/api/user/profile`; accessible from profile via settings icon
- **Community Detail:** Consolidated single-endpoint loading (GET `/api/communities/:id/detail` returns community+joined+feed+challenges). 4 tabs (Feed, Members, Leaderboard, Challenges). Feed shows rucks + challenge announcements from community members with active challenges pinned at top. Members/Leaderboard lazy-loaded only when tab is tapped. Creator sees edit button. Members tab with creator badge and kick functionality.
- **Community Editing:** PUT `/api/communities/:id` (creator-only) — edit name, description, category, location, cover image. Content moderation on name/description. Edit screen at `app/edit-community.tsx` with image picker for cover photo.
- **Challenge Creation:** POST `/api/communities/:id/challenges` (creator-only), auto-creates announcement in community feed. Type picker (distance/weight/rucks), goal value + unit, duration presets (1wk/2wk/1mo/2mo), content moderation.
- **Community Posts:** `community_posts` table for announcements (challenge_announcement type). Feed merges rucks + posts sorted by date.
- **Member Management:** Creator can remove members via DELETE `/api/communities/:id/members/:userId` with auth check
- **Friends System:** Send/accept/decline friend requests, unfriend. Friend count visible on profiles. Friends list + pending requests screen accessible from profile. Tappable member names in communities navigate to user profiles with friend actions.
- **Friends Feed:** Main feed shows rucks from friends + self when user has friends, falls back to global recent rucks otherwise. Auth token passed to feed endpoint.
- **User Profiles:** GET `/api/users/:id/profile` returns public profile with friend count and ruck stats. Dedicated user-profile screen with Add Friend/Pending/Friends/Accept button based on relationship state.
- **Ruck Detail:** 6-stat grid, map placeholder, photos grid, like/comment section

## Key Dependencies

- `@expo-google-fonts/oswald` - Oswald display font
- `react-native-maps@1.18.0` - Pinned version for Expo Go compatibility
- `expo-linear-gradient` - Profile banner gradient
- `react-native-reanimated` - Like button spring animations
- `bcryptjs` - Password hashing
- `@react-native-async-storage/async-storage` - Token persistence
- `expo-image-picker` - Profile picture selection from photo library

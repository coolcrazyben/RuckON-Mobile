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
  (tabs)/
    _layout.tsx        # 5-tab navigator (NativeTabs for iOS26+, classic Tabs fallback)
    index.tsx          # Feed screen (friends/global toggle, ruck cards, announcements)
    explore.tsx        # Explore screen (search, communities, friends, challenges)
    log.tsx            # Log Ruck screen (manual entry + GPS mode)
    leaderboard.tsx    # Leaderboard (global/friends/community, weekly/monthly)
    profile.tsx        # Profile screen (stats, achievements, communities, history, logout)
  ruck/
    [id].tsx           # Ruck detail (stats grid, map, photos, comments)
  community/
    [id].tsx           # Community detail (feed/members/leaderboard/challenges tabs)
lib/
  auth.tsx             # AuthProvider context, useAuth hook, token management
  query-client.ts      # TanStack Query client, API helpers
data/
  mockData.ts          # All mock data (users, rucks, communities, challenges, leaderboard)
constants/
  colors.ts            # App color palette
server/
  index.ts             # Express server, CORS, static files, landing page
  routes.ts            # Auth endpoints, community endpoints, onboarding
  db.ts                # Drizzle/pg database connection
  oauth.ts             # Google/Apple token verification (tokeninfo API + JWKS signature check)
  storage.ts           # DatabaseStorage (PostgreSQL-backed via Drizzle ORM, sessions in-memory)
shared/
  schema.ts            # Drizzle schema (users, communities, userCommunities) + Zod validators
```

## Features

- **Auth:** Email/password + Google/Apple sign-in, session management
- **Onboarding:** Gender, weight, location collection → optional community joining
- **Feed:** Friends/Global toggle, ruck activity cards with stats, community announcements, like/comment actions, pull-to-refresh
- **Explore:** Search bar, trending communities carousel, suggested friends carousel, active challenges list
- **Log Ruck:** Manual entry (distance, duration, weight, notes, photos) + GPS tracking mode with live stats UI
- **Leaderboard:** Global/Friends/Community scopes, Weekly/Monthly periods, Distance/Weight metrics, podium for top 3
- **Profile:** Stats row, achievements shelf with locked states, communities list, ruck history, logout
- **Community Detail:** 4 inner tabs (Feed, Members, Leaderboard, Challenges)
- **Ruck Detail:** 6-stat grid, map placeholder, photos grid, like/comment section

## Key Dependencies

- `@expo-google-fonts/oswald` - Oswald display font
- `react-native-maps@1.18.0` - Pinned version for Expo Go compatibility
- `expo-linear-gradient` - Profile banner gradient
- `react-native-reanimated` - Like button spring animations
- `bcryptjs` - Password hashing
- `@react-native-async-storage/async-storage` - Token persistence

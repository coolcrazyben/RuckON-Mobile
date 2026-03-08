# RuckON - Fitness Community App for Ruckers

## Architecture

**Stack:** Expo Router + Express (API server)
**Frontend port:** 8081 (Expo)
**Backend port:** 5000 (Express)

## App Overview

RuckON is a fitness/community mobile app for ruckers (people who walk/hike with weighted packs). Built with dark tactical aesthetic using deep forest greens, burnt orange accents, and bone/off-white typography.

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
  _layout.tsx          # Root layout, loads fonts (Oswald + Inter), sets dark theme
  (tabs)/
    _layout.tsx        # 5-tab navigator (NativeTabs for iOS26+, classic Tabs fallback)
    index.tsx          # Feed screen (friends/global toggle, ruck cards, announcements)
    explore.tsx        # Explore screen (search, communities, friends, challenges)
    log.tsx            # Log Ruck screen (manual entry + GPS mode)
    leaderboard.tsx    # Leaderboard (global/friends/community, weekly/monthly)
    profile.tsx        # Profile screen (stats, achievements, communities, history)
  ruck/
    [id].tsx           # Ruck detail (stats grid, map, photos, comments)
  community/
    [id].tsx           # Community detail (feed/members/leaderboard/challenges tabs)
data/
  mockData.ts          # All mock data (users, rucks, communities, challenges, leaderboard)
constants/
  colors.ts            # App color palette
```

## Features

- **Feed:** Friends/Global toggle, ruck activity cards with stats, community announcements, like/comment actions, pull-to-refresh
- **Explore:** Search bar, trending communities carousel, suggested friends carousel, active challenges list
- **Log Ruck:** Manual entry (distance, duration, weight, notes, photos) + GPS tracking mode with live stats UI
- **Leaderboard:** Global/Friends/Community scopes, Weekly/Monthly periods, Distance/Weight metrics, podium for top 3
- **Profile:** Stats row, achievements shelf with locked states, communities list, ruck history
- **Community Detail:** 4 inner tabs (Feed, Members, Leaderboard, Challenges)
- **Ruck Detail:** 6-stat grid, map placeholder, photos grid, like/comment section

## Key Dependencies

- `@expo-google-fonts/oswald` - Oswald display font
- `react-native-maps@1.18.0` - Pinned version for Expo Go compatibility
- `expo-linear-gradient` - Profile banner gradient
- `react-native-reanimated` - Like button spring animations

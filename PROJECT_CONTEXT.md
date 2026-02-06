# Project Context - Quick Catch-Up Guide

**Last Updated:** 2026-02-06
**Project:** Golf Tournament Manager
**Status:** Active development with focus on scoring accuracy

---

## 30-Second Summary

Full-stack golf tournament app (React + Express + PostgreSQL). Manages multi-round tournaments with real-time scoring, team leaderboards, and automatic net score calculations based on handicaps. Recently fixed critical issues with score calculations and migrated to cloud database.

---

## Current State & Recent Work

### What Was Just Done (Latest Commits)
1. **Fixed Score Calculations** - Added `recalculateAllScores` endpoint to fix missing net scores
2. **Multi-Round Score Loading** - Created dedicated hook to properly load scores across rounds
3. **Handicap Sync** - Scores auto-recalculate when course handicaps are updated
4. **React Hooks Fix** - Fixed violation causing scores not to display on individual leaderboard
5. **Database Migration** - Moved from SQLite → PostgreSQL (Neon), added seed script

### Current Focus Areas
- **Score Calculation Accuracy** - Ensuring net scores and Stableford points calculate correctly
- **Round Handicaps** - Recently implemented per-round course handicaps via `roundHandicaps` table
- **Cloud Deployment** - Database on Neon PostgreSQL, ready for Railway deployment

---

## Architecture At a Glance

### Frontend (client/)
- **Framework:** React 18 + TypeScript
- **Build:** Vite
- **State:** React Query (TanStack Query) + localStorage auth
- **Pages:** 9 main pages (see below)
- **Key Hook:** `useGetMultiRoundScores()` - loads all scores across all rounds

### Backend (server/)
- **Framework:** Express 5
- **Key Files:**
  - `routes.ts` (~350 lines) - API endpoints
  - `storage.ts` (646 lines) - Database logic & calculations
  - `auth.ts` - Simple passcode verification ("Tour2026")
- **Database:** PostgreSQL via Drizzle ORM

### Database (shared/schema.ts)
- **Key Tables:**
  - `teams` → `players` (teams have many players)
  - `courses` → `holes` (courses have 18 holes)
  - `rounds` → `scores` (rounds contain many scores)
  - `roundHandicaps` - **NEW:** Per-round course handicaps
  - `roundTeamPoints` - Final round points by team

---

## Essential Files to Know

### If you're working on...

**Scoring Logic**
- `server/storage.ts:calculateNetScore()` - Net score calculation
- `server/storage.ts:calculateStablefordPoints()` - Stableford points
- `client/src/pages/Scoring.tsx` - Score entry UI
- `client/src/hooks/use-tournament.ts` - API calls

**Handicaps**
- `shared/schema.ts:roundHandicaps` - Database table
- `client/src/pages/RoundSetup.tsx` - UI for configuring
- `server/routes.ts:PUT /api/rounds/:roundId/handicaps` - Update endpoint

**Leaderboards**
- `server/storage.ts:generateLeaderboard()` - Leaderboard calculation
- `client/src/pages/Leaderboard.tsx` - Tournament leaderboard
- `client/src/pages/IndividualLeaderboard.tsx` - Player rankings

**Score Display**
- `client/src/pages/PlayerScorecard.tsx` - Detailed scorecard
- `client/src/hooks/use-tournament.ts:useGetMultiRoundScores()` - Critical hook!

**Database Queries**
- `server/storage.ts` - All database operations

---

## Critical Things to Know

### 1. Course Handicaps Are NEW
The `roundHandicaps` table was recently added. This allows each player to have different course handicaps for different rounds. **This is essential for net score calculation.**

```typescript
// roundHandicaps table structure:
{
  id: number,
  roundId: number,        // Which round
  playerId: number,       // Which player
  courseHandicap: number  // Their handicap for this round
}
```

**Important:** When updating handicaps, you MUST call `POST /api/admin/recalculate-scores` to update all scores.

### 2. Scoring Formats Support Multiple Types
The app supports these scoring formats (stored in `rounds.format`):
- **individual_net** - Net score (most common)
- **better_ball** - Best 2 scores per team
- **combined_stableford** - Stableford points
- **championship** - Championship format
- **pick_9** - Best 9 holes
- **best_worst** - Best + worst scoring

Net score calculation: `Gross Score - (Course Handicap ÷ 18)`

### 3. Authentication is Simple
- **Method:** Hardcoded passcode "Tour2026"
- **Token:** Simple bearer token stored in localStorage
- **Scope:** All `/api/*` endpoints require Authorization header
- **No user roles:** Either authenticated or not

### 4. React Query is the Data Layer
All server communication goes through React Query (TanStack Query). Hooks defined in:
- `client/src/hooks/use-tournament.ts`

Key hooks:
- `useGetTeams()` - Teams list
- `useGetPlayers()` - Players list
- `useGetRounds()` - Tournament rounds
- `useGetMultiRoundScores()` - **Critical for displaying scores**
- `useGetLeaderboard()` - Tournament leaderboard

### 5. Recent Bug Pattern: Score Display Issues
Multiple recent commits fixed "scores not displaying" problems:
- Issue was React Hooks violations
- Issue was missing score data from incomplete queries
- Solution: Created dedicated `useGetMultiRoundScores()` hook

**If scores don't show:** Check the hook, verify query is enabled, check roundHandicaps are set.

---

## Common Tasks & Where to Do Them

### Add a New Scoring Format
1. Update `shared/routes.ts` - Add format type
2. Update `server/storage.ts:generateLeaderboard()` - Add calculation logic
3. Update `shared/schema.ts` - If adding to database

### Fix a Score Calculation Bug
1. Check `server/storage.ts:calculateNetScore()` or relevant function
2. Add test case
3. Run `POST /api/admin/recalculate-scores` to verify fix

### Add a New API Endpoint
1. Define type in `shared/routes.ts`
2. Implement in `server/routes.ts`
3. Create React Query hook in `client/src/hooks/use-tournament.ts`
4. Use hook in component

### Debug Score Loading Issue
1. Check `client/src/pages/PlayerScorecard.tsx` or `IndividualLeaderboard.tsx`
2. Verify `useGetMultiRoundScores()` is enabled and returning data
3. Check React Query DevTools (add if needed)
4. Verify database has `roundHandicaps` for the round

---

## Database Connection

**Environment Variable:** `DATABASE_URL`

Format: `postgresql://user:password@host/database`

Example (Neon):
```
postgresql://user:password@ep-xyz.neon.tech/dbname?sslmode=require
```

To test connection:
```bash
# Push migrations
npm run db:push

# Query database
psql $DATABASE_URL -c "SELECT COUNT(*) FROM teams;"
```

---

## Development Workflow

```bash
# Start dev server (Vite + Express both hot-reload)
npm run dev

# TypeScript check (run before committing)
npm run check

# Database migrations (if schema changes)
npm run db:push

# Production build & run
npm run build
npm start
```

Dev server:
- Frontend: http://localhost:5173
- API: http://localhost:3000/api/*
- Vite proxy handles /api routing

---

## Scoring Calculation Deep Dive

### Net Score Calculation
```
Net Score = Gross Score - Course Handicap
```

Where:
- **Gross Score** = Sum of strokes per hole
- **Course Handicap** = Player's round-specific handicap (from `roundHandicaps`)

### Stableford Points (if format = 'combined_stableford')
```
Points based on net score vs. par:
- Double bogey or worse: 0 points
- Bogey: 1 point
- Par: 2 points
- Birdie: 3 points
- Eagle: 4 points
- Albatross: 5 points
```

### Leaderboard Points (round-specific)
- 1st place: 10 points
- 2nd place: 8 points
- 3rd place: 6 points
- etc.

---

## Known Issues & Workarounds

### Scores Not Displaying After Update
**Workaround:** Call `POST /api/admin/recalculate-scores`

### Course Handicaps Not Applied
**Check:**
1. `roundHandicaps` table has entries for the round
2. Round setup page shows handicaps configured
3. Run recalculate endpoint

### Mobile (iOS) Build Issues
```bash
# Rebuild and sync
npm run build:ios

# If that fails, manually sync
npx cap sync ios

# Then open and build in Xcode
npm run open:ios
```

---

## Code Patterns to Follow

### API Call Pattern
```typescript
// shared/routes.ts - Define type
export type GetTeamsResponse = Team[];

// server/routes.ts - Implement
app.get('/api/teams', requireAuth, (req, res) => {
  const teams = storage.getTeams();
  res.json(teams);
});

// client/hooks/use-tournament.ts - Create hook
export function useGetTeams() {
  return useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/teams');
      return response as GetTeamsResponse;
    },
  });
}

// Component - Use hook
const { data: teams } = useGetTeams();
```

### Error Handling Pattern
- API errors return `{ error: string }`
- Frontend checks for error in response
- Toast notification for user feedback
- Console logging for debugging

---

## Testing the App

### Manual Testing Checklist
1. Login with "Tour2026"
2. View leaderboard - verify team totals
3. View individual leaderboard - verify net scores
4. Enter a score - verify it calculates immediately
5. Change handicap - run recalculate - verify scores update
6. View player scorecard - verify all holes show

### Test Data
The app auto-seeds with demo data if empty:
- 4 teams (Red, Blue, Green, Yellow)
- Multiple players per team
- 2 sample rounds
- Sample scores (some rounds may need manual entry)

---

## Deployment Checklist

Before deploying:
1. `npm run check` - No TS errors
2. Test all scoring formats work
3. Test leaderboards display correctly
4. Verify handicap updates trigger recalculation
5. Test on mobile (Capacitor)

Deploy:
```bash
npm run build
# Push to Railway or host of choice
# Set DATABASE_URL env var
# Run: npm start
```

---

## Quick Reference: Table of Contents

| Topic | File | Lines |
|-------|------|-------|
| Score calculation | `server/storage.ts` | Lines ~100-200 |
| Leaderboard generation | `server/storage.ts` | Lines ~250-350 |
| API routes | `server/routes.ts` | All |
| Database schema | `shared/schema.ts` | All |
| React hooks | `client/src/hooks/use-tournament.ts` | All |
| Leaderboard UI | `client/src/pages/Leaderboard.tsx` | All |
| Score entry UI | `client/src/pages/Scoring.tsx` | All |

---

## Questions to Ask When Adding Features

1. **Does this need a database schema change?** If yes, update `shared/schema.ts` and run `npm run db:push`
2. **Does this affect scoring?** If yes, test with `POST /api/admin/recalculate-scores`
3. **Does this need a new API endpoint?** If yes, follow API Call Pattern above
4. **Does this display across rounds?** If yes, use `useGetMultiRoundScores()` hook
5. **Does this affect leaderboards?** If yes, test all scoring formats

---

## Useful Commands

```bash
# Development
npm run dev                    # Start dev (Vite + Express)
npm run check                  # TypeScript check
npm run db:push                # Database migrations

# Production
npm run build                  # Build React + compile server
npm start                      # Run production server

# Mobile
npm run build:ios              # Build iOS
npm run open:ios               # Open Xcode

# Database
psql $DATABASE_URL             # Connect to database
npm run db:push                # Run migrations
```

---

## Contact/Context

When context-switching back to this project:
1. Read this file (5 min)
2. Check latest commits: `git log --oneline | head -10`
3. Check active branches/PRs
4. Review any open issues or TODOs in code

This file should be updated when:
- New major features are added
- Database schema changes significantly
- New patterns are established
- Major bugs are discovered and fixed

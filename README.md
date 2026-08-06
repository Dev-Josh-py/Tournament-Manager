# Golf Tournament Manager

A full-stack web and mobile application for managing multi-round golf tournaments with real-time scoring, handicap management, and flexible scoring formats.

## Overview

**Golf Tournament Manager** is designed to manage team-based golf tournaments with multiple rounds. It tracks scores, calculates net scores based on handicaps, supports various scoring formats (Better Ball, Stableford, etc.), and displays live leaderboards for both teams and individual players.

**Tech Stack:**
- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** Express 5 + Node.js + TypeScript
- **Database:** PostgreSQL (Neon)
- **Mobile:** Capacitor (iOS)
- **UI:** Radix UI + Tailwind CSS

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL (or use Neon cloud)
- npm

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL (Neon PostgreSQL)

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173` with Express API on port 3000.

### Default Login
- **Passcode:** `Tour2026`

## Project Structure

```
Tournament-Manager/
├── client/              # React frontend (Vite)
│   ├── src/
│   │   ├── pages/      # 9 main pages (Leaderboard, Scoring, etc.)
│   │   ├── components/ # UI components
│   │   ├── hooks/      # Custom React hooks (data fetching)
│   │   └── lib/        # Utilities, auth, API config
│   └── requirements.md
│
├── server/              # Express backend
│   ├── index.ts        # Server initialization
│   ├── routes.ts       # API endpoints
│   ├── storage.ts      # Database operations & scoring logic
│   ├── seed.ts         # Seeds an empty database
│   └── auth.ts         # Passcode authentication
│
├── shared/              # Shared types & schemas
│   ├── schema.ts       # Database schema (Drizzle ORM)
│   ├── seed-data.ts    # GENERATED snapshot of tournament data
│   └── routes.ts       # API type definitions
│
├── script/              # Maintenance scripts (not part of the app)
│   ├── seed.ts         # CLI wrapper around server/seed.ts
│   ├── generate-seed-data.ts  # Regenerates shared/seed-data.ts from the DB
│   ├── backup-db.ts    # Full database snapshot (JSON + restore.sql)
│   └── build.ts        # Production build
│
└── ios/                 # Capacitor iOS config
```

## Key Features

### Tournament Management
- **Multi-round tournaments** with flexible round scheduling
- **Multiple golf courses** with 18-hole configurations
- **Flexible scoring formats:** `individual_match_play`, `better_ball_stableford`,
  `combined_stableford`, `individual_stableford`, `individual_net`, `pick_9`,
  `best_worst` and `team_scramble` (9 holes)

### Scoring System
- **Real-time score entry** with hole-by-hole input
- **Automatic net score calculation** based on player handicaps and course handicaps
- **Stableford points** calculation
- **Score history & audit trails**

### Handicap System
- **Player base handicaps** stored with player records
- **Course handicaps** configured per round (stored in `roundHandicaps` table)
- **Round-specific customization** allowing different handicaps for different rounds

### Leaderboards
- **Tournament leaderboard** with team totals across all rounds
- **Individual leaderboard** showing net scores per player
- **Round-specific leaderboards** with per-format point allocation
  (e.g. 18/12/9 for combined Stableford, 8 to the winner and 3 to the loser per
  match in match play)
- **Team rankings** with color coding

## Available Pages

| Page | Route | Purpose |
|------|-------|---------|
| **Leaderboard** | `/` | Tournament standings by team |
| **Individual Leaderboard** | `/individual` | Net scores by player across all rounds |
| **Scoring** | `/scoring` | Real-time score entry interface |
| **Player Scorecard** | `/player/:id` | Detailed player scorecard |
| **Schedule** | `/schedule` | Tournament rounds and courses |
| **Round Setup** | `/setup` | Configure round handicaps (admin) |
| **Rules** | `/rules` | Tournament rules and formats |
| **Login** | `/login` | Authentication |

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with passcode

### Data Fetching
- `GET /api/teams` - All teams
- `GET /api/players` - All players
- `GET /api/rounds` - All tournament rounds
- `GET /api/rounds/:id` - Round details with holes

### Scoring
- `POST /api/scores` - Submit a score
- `GET /api/rounds/:roundId/scores` - Get round scores
- `GET /api/leaderboard` - Tournament leaderboard
- `GET /api/rounds/:roundId/leaderboard` - Round leaderboard

### Admin
- `GET /api/rounds/:roundId/handicaps` - Get round handicaps
- `PUT /api/rounds/:roundId/handicaps` - Update handicaps
- `POST /api/admin/recalculate-scores` - Recalculate all scores

## Development Scripts

```bash
npm run dev              # Start dev server (Vite + Express)
npm run build           # Production build
npm run start           # Run production server
npm run check           # TypeScript validation
npm run build:ios       # Build & sync iOS
npm run open:ios        # Open iOS in Xcode
npm run db:push         # Apply database migrations

# Not in package.json — run directly:
npx tsx script/seed.ts               # Seed an empty database
npx tsx script/backup-db.ts          # Back up all tables to backups/<timestamp>/
npx tsx script/generate-seed-data.ts # Refresh shared/seed-data.ts from the DB
```

### Seeding

`shared/seed-data.ts` is a **generated** snapshot of the live tournament data —
teams, players, courses, holes, rounds, scores, handicaps, groupings, pairings
and pick 9 assignments. Do not edit it by hand. After changing tournament data
in the database, refresh it:

```bash
DATABASE_URL=... npx tsx script/generate-seed-data.ts
```

`server/seed.ts` inserts that snapshot into an empty database and is the only
seeding implementation — the server calls it on startup (no-op if any teams
exist) and `script/seed.ts` is a thin CLI wrapper. Only gross scores are seeded;
net and Stableford are recalculated afterwards from the handicaps and stroke
indexes.

### Backups

`pg_dump` will not work against the Neon database unless your local client
matches its major version, so use the script instead:

```bash
npx tsx script/backup-db.ts
# restore with:
psql "$DATABASE_URL" -f backups/<timestamp>/restore.sql
```

`backups/` is gitignored.

## Database Schema

**Core Tables:**
- `teams` - Tournament teams with colors
- `players` - Players with base handicaps
- `courses` - Golf courses
- `holes` - 18 holes per course (par, stroke index)
- `rounds` - Tournament rounds with date, course, format
- `scores` - Individual scores (gross, net, stableford)
- `roundHandicaps` - Per-round course handicaps for each player
- `roundGroupings` / `roundGroupingPlayers` - Player groups for group scoring
- `matchPairings` - 1v1 pairings for match play rounds
- `pick9Assignments` - Which 9 holes a player is scored on

**Unused tables/columns.** `roundTeamPoints` and `teams.totalPoints` are defined
in the schema but never read or written — team points are calculated live from
`scores` on every request. The stored `matchPairings` holes-won columns are
likewise never written during scoring; they are recalculated on read.

### Derived, not stored

Several values look like columns but are computed at read time, because storing
them meant keeping them in sync and they drifted:

- **Round completion** — a round is complete when every player has a score for
  every hole it plays (18, or 9 for a team scramble). `rounds.isCompleted` is
  ignored; see `getRoundCompletion()` in `server/storage.ts`.
- **Match play holes won / completion** — derived from each pair's Stableford
  points hole by hole in `getMatchPairingsForRound()`. A drawn match is only
  complete once `winnerId` records a playoff result, which cannot be derived.
- **Team points per round** — calculated by `calculateLeaderboards()` from the
  round's format.

## Recent Changes

- **Kingswood score offset fix:** Round 6 scores for Jethro, Keagan, Matt, Ross
  and Jaun were entered one hole late (a rotate-by-one over all 18 holes).
  Corrected by `script/fix-kingswood-offset.ts`, with gir/fir/putts moved
  alongside the gross scores and net/Stableford recalculated.
- **Derived round & match completion:** replaced never-written status columns
  with values computed from score coverage.
- **Generated seed:** the seed was duplicated across two files and had drifted
  from production; it is now generated from the live database.
- **Score Calculation:** Fixed net score calculations and display issues
- **Database Migration:** Moved from SQLite to PostgreSQL (Neon)
- **Handicap System:** Implemented round-specific course handicaps
- **Score Recalculation:** Added endpoint to recalculate all scores when handicaps change
- **Deployment:** Configured for Vercel serverless (see `docs/DEPLOY_VERCEL.md`)

See git log for full history:
```bash
git log --oneline | head -20
```

## Deployment

The app is configured for cloud deployment:
- **Database:** Neon PostgreSQL (managed)
- **Platform:** Vercel serverless (`vercel.json`, `api/`); any Node.js host also works
- **Environment:** Set `DATABASE_URL` environment variable
- **Build:** `npm run build` → `npm start`

See `docs/DEPLOY_VERCEL.md` for the Vercel setup.

## Troubleshooting

### Scores not displaying?
1. Check that `roundHandicaps` are configured for the round
2. Run `POST /api/admin/recalculate-scores` to recalculate
3. Verify database connection with `npm run db:push`

### Mobile app issues?
```bash
npm run build:ios
npm run open:ios
# Check Xcode build settings
```

### Database issues?
```bash
# Push migrations
npm run db:push

# Check connection
echo "SELECT version();" | psql $DATABASE_URL
```

Take a backup before any data repair — see the Backups section above.

### A round shows as "Upcoming" when it's finished?
Completion is derived, not toggled: every player needs a score on every hole.
Check for gaps with:
```sql
SELECT round_id, player_id, count(DISTINCT hole_number)
FROM scores GROUP BY 1, 2 ORDER BY 3;
```

## Contributing

When working on this project:
1. Review `PROJECT_CONTEXT.md` for quick catch-up on recent work
2. Check recent git commits for context on active issues
3. Run `npm run check` before committing
4. Test scoring calculations thoroughly (complex business logic)

## License

Internal project for 2026 golf tournament.

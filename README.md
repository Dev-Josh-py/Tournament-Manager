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
│   ├── storage.ts      # Database operations
│   └── auth.ts         # Passcode authentication
│
├── shared/              # Shared types & schemas
│   ├── schema.ts       # Database schema (Drizzle ORM)
│   └── routes.ts       # API type definitions
│
└── ios/                 # Capacitor iOS config
```

## Key Features

### Tournament Management
- **Multi-round tournaments** with flexible round scheduling
- **Multiple golf courses** with 18-hole configurations
- **Flexible scoring formats:** Individual Net, Better Ball, Stableford, Championship, Pick 9, etc.

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
- **Round-specific leaderboards** with point allocation (10, 8, 6 points)
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
```

## Database Schema

**Core Tables:**
- `teams` - Tournament teams with colors
- `players` - Players with base handicaps
- `courses` - Golf courses
- `holes` - 18 holes per course (par, stroke index)
- `rounds` - Tournament rounds with date, course, format
- `scores` - Individual scores (gross, net, stableford)
- `roundHandicaps` - Per-round course handicaps for each player
- `roundTeamPoints` - Final points per team per round

## Recent Changes

The project has been actively developed with a focus on:
- **Score Calculation:** Fixed net score calculations and display issues
- **Database Migration:** Moved from SQLite to PostgreSQL (Neon)
- **Handicap System:** Implemented round-specific course handicaps
- **Score Recalculation:** Added endpoint to recalculate all scores when handicaps change
- **Deployment:** Configured for Railway/Neon cloud deployment

See git log for full history:
```bash
git log --oneline | head -20
```

## Deployment

The app is configured for cloud deployment:
- **Database:** Neon PostgreSQL (managed)
- **Platform:** Railway (or similar Node.js host)
- **Environment:** Set `DATABASE_URL` environment variable
- **Build:** `npm run build` → `npm start`

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

## Contributing

When working on this project:
1. Review `PROJECT_CONTEXT.md` for quick catch-up on recent work
2. Check recent git commits for context on active issues
3. Run `npm run check` before committing
4. Test scoring calculations thoroughly (complex business logic)

## License

Internal project for 2026 golf tournament.

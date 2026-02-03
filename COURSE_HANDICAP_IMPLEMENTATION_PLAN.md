# Course Handicap Implementation Plan

## Overview
Add round-specific course handicaps to the golf tournament app. Currently, players have a single base handicap used for all rounds. We need each player to have a different course handicap for each round (since course difficulty varies).

**Working Directory:** `/Users/primary/Documents/Projects/Golf/Tournament-Manager/`

---

## Current Implementation Analysis

### Database Schema
- `players` table has single `handicap: integer` field (base handicap)
- `scores` table stores calculated `net_score` and `stableford_points` but NOT the handicap used
- No round-specific handicap storage exists

### Scoring Flow
1. User enters gross score via `/client/src/pages/Scoring.tsx`
2. Frontend calls API with `{roundId, playerId, holeNumber, grossScore}`
3. Server's `storage.ts:submitScore()` retrieves player's **base handicap** from database
4. Server's `calculatePoints()` calculates strokes received based on handicap + stroke index
5. Net score and stableford points calculated and stored

### Key Files
- `/shared/schema.ts` - Drizzle ORM schema
- `/server/storage.ts` - Scoring calculations (line 145-168: calculatePoints, line 98: submitScore)
- `/server/routes.ts` - API endpoints
- `/client/src/pages/Scoring.tsx` - Score entry UI
- `/client/src/pages/PlayerScorecard.tsx` - Scorecard display

---

## Recommended Approach

**Design Decision: Hybrid Junction Table + Audit Column**

Create new `round_handicaps` table for pre-configuration + store `handicap_used` in scores for audit trail.

**Why this approach:**
- ✅ Handicaps can be set up ahead of time (before scoring starts)
- ✅ Audit trail preserved (handicap_used column shows what was actually used)
- ✅ Backward compatible (falls back to base handicap if no round handicap exists)
- ✅ Easy to query and validate
- ✅ Separates concerns: setup vs. transactional data

---

## Implementation Steps

### Step 1: Database Schema Changes

**A. Create new `round_handicaps` table**

Add to `/shared/schema.ts`:

```typescript
export const roundHandicaps = sqliteTable("round_handicaps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  roundId: integer("round_id").references(() => rounds.id).notNull(),
  playerId: integer("player_id").references(() => players.id).notNull(),
  courseHandicap: integer("course_handicap").notNull(),
});

// Ensure unique constraint
export const roundHandicapsRelations = relations(roundHandicaps, ({ one }) => ({
  round: one(rounds, {
    fields: [roundHandicaps.roundId],
    references: [rounds.id],
  }),
  player: one(players, {
    fields: [roundHandicaps.playerId],
    references: [players.id],
  }),
}));
```

**B. Add `handicap_used` column to scores table**

Modify `scores` table in `/shared/schema.ts`:

```typescript
export const scores = sqliteTable("scores", {
  // ... existing columns
  handicapUsed: integer("handicap_used"), // NEW - audit trail
});
```

**C. Create and run migration**

Create migration file `drizzle/0001_add_round_handicaps.sql`:

```sql
-- Create round_handicaps table
CREATE TABLE `round_handicaps` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `round_id` integer NOT NULL,
  `player_id` integer NOT NULL,
  `course_handicap` integer NOT NULL,
  FOREIGN KEY (`round_id`) REFERENCES `rounds`(`id`),
  FOREIGN KEY (`player_id`) REFERENCES `players`(`id`)
);

CREATE UNIQUE INDEX `idx_round_player` ON `round_handicaps`(`round_id`, `player_id`);

-- Add handicap_used column to scores
ALTER TABLE `scores` ADD COLUMN `handicap_used` integer;

-- Backfill existing scores (Rounds 1 & 2) with base handicap
UPDATE scores
SET handicap_used = (SELECT handicap FROM players WHERE players.id = scores.player_id)
WHERE handicap_used IS NULL;

-- Create round_handicaps entries for Rounds 1 & 2 based on what was used
INSERT INTO round_handicaps (round_id, player_id, course_handicap)
SELECT DISTINCT s.round_id, s.player_id, p.handicap
FROM scores s
JOIN players p ON s.player_id = p.id
WHERE s.round_id IN (1, 2);
```

Run migration:
```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

---

### Step 2: Backend - Storage Layer Updates

**File: `/server/storage.ts`**

**A. Add type definitions (around line 27)**

```typescript
type RoundHandicapDisplay = {
  playerId: number;
  playerName: string;
  courseHandicap: number;
  baseHandicap: number;
};

type RoundHandicapInput = {
  playerId: number;
  courseHandicap: number;
};
```

**B. Add to IStorage interface**

```typescript
interface IStorage {
  // ... existing methods
  getRoundHandicaps(roundId: number): Promise<RoundHandicapDisplay[]>;
  updateRoundHandicaps(roundId: number, handicaps: RoundHandicapInput[]): Promise<{ success: boolean; updated: number }>;
}
```

**C. Implement new methods in DatabaseStorage class (after line 96)**

```typescript
async getRoundHandicaps(roundId: number): Promise<RoundHandicapDisplay[]> {
  const players = await this.getPlayers();

  // Get existing round handicaps
  const existingHandicaps = await db
    .select()
    .from(roundHandicaps)
    .where(eq(roundHandicaps.roundId, roundId));

  // Map to display format with fallback to base handicap
  return players.map(player => {
    const roundHandicap = existingHandicaps.find(h => h.playerId === player.id);
    return {
      playerId: player.id,
      playerName: player.name,
      courseHandicap: roundHandicap?.courseHandicap ?? player.handicap ?? 0,
      baseHandicap: player.handicap ?? 0,
    };
  });
}

async updateRoundHandicaps(
  roundId: number,
  handicaps: RoundHandicapInput[]
): Promise<{ success: boolean; updated: number }> {
  let updated = 0;

  for (const { playerId, courseHandicap } of handicaps) {
    // Check if exists
    const existing = await db
      .select()
      .from(roundHandicaps)
      .where(
        and(
          eq(roundHandicaps.roundId, roundId),
          eq(roundHandicaps.playerId, playerId)
        )
      );

    if (existing.length > 0) {
      // Update existing
      await db
        .update(roundHandicaps)
        .set({ courseHandicap })
        .where(eq(roundHandicaps.id, existing[0].id));
    } else {
      // Insert new
      await db.insert(roundHandicaps).values({
        roundId,
        playerId,
        courseHandicap,
      });
    }
    updated++;
  }

  return { success: true, updated };
}
```

**D. Modify submitScore method (line 98)**

Replace the handicap retrieval logic:

```typescript
async submitScore(data: SubmitScoreRequest): Promise<Score> {
  // ... existing validation code (lines 100-116)

  // Get player
  const player = await db.query.players.findFirst({
    where: eq(players.id, data.playerId)
  });
  if (!player) throw new Error("Player not found");

  // NEW: Get round-specific handicap
  const roundHandicapRecord = await db
    .select()
    .from(roundHandicaps)
    .where(
      and(
        eq(roundHandicaps.roundId, data.roundId),
        eq(roundHandicaps.playerId, data.playerId)
      )
    );

  // Use round handicap if exists, otherwise fall back to base handicap
  const handicapToUse = roundHandicapRecord.length > 0
    ? roundHandicapRecord[0].courseHandicap
    : (player.handicap || 0);

  const hole = (round as any).holes?.find((h: any) => h.number === data.holeNumber);
  if (!hole) throw new Error("Hole not found");

  const { netScore, stablefordPoints } = this.calculatePoints(
    data.grossScore,
    hole.par,
    hole.strokeIndex,
    handicapToUse  // CHANGED: use round-specific handicap
  );

  const values = {
    ...data,
    netScore,
    stablefordPoints,
    handicapUsed: handicapToUse,  // NEW: Store audit trail
  };

  // ... rest of existing upsert code
}
```

---

### Step 3: Backend - API Endpoints

**File: `/server/routes.ts`**

**A. Add new endpoints (after line 74)**

```typescript
// GET /api/rounds/:roundId/handicaps
app.get('/api/rounds/:roundId/handicaps', async (req, res) => {
  try {
    const roundId = Number(req.params.roundId);
    const handicaps = await storage.getRoundHandicaps(roundId);
    res.json(handicaps);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// PUT /api/rounds/:roundId/handicaps
app.put('/api/rounds/:roundId/handicaps', async (req, res) => {
  try {
    const roundId = Number(req.params.roundId);
    const handicaps = req.body; // Array of {playerId, courseHandicap}
    const result = await storage.updateRoundHandicaps(roundId, handicaps);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
```

---

### Step 4: Frontend - React Query Hooks

**File: `/client/src/hooks/use-tournament.ts`**

Add new hooks (around line 154):

```typescript
// Fetch round handicaps
export function useRoundHandicaps(roundId: number) {
  return useQuery({
    queryKey: ['/api/rounds/:roundId/handicaps', roundId],
    queryFn: async () => {
      const url = `/api/rounds/${roundId}/handicaps`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch round handicaps");
      return res.json() as Promise<Array<{
        playerId: number;
        playerName: string;
        courseHandicap: number;
        baseHandicap: number;
      }>>;
    },
    enabled: !!roundId && roundId > 0,
  });
}

// Update round handicaps
export function useUpdateRoundHandicaps() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      roundId,
      handicaps
    }: {
      roundId: number;
      handicaps: Array<{ playerId: number; courseHandicap: number }>
    }) => {
      const res = await fetch(`/api/rounds/${roundId}/handicaps`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(handicaps),
      });
      if (!res.ok) throw new Error("Failed to update handicaps");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['/api/rounds/:roundId/handicaps', variables.roundId]
      });
    },
  });
}
```

---

### Step 5: Frontend - Round Setup Page (NEW)

**File: `/client/src/pages/RoundSetup.tsx` (create new file)**

```typescript
import { useState, useEffect } from "react";
import { useRounds, useRoundHandicaps, useUpdateRoundHandicaps } from "@/hooks/use-tournament";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/Navigation";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Settings } from "lucide-react";

export default function RoundSetup() {
  const [selectedRoundId, setSelectedRoundId] = useState<string>("");
  const { data: rounds } = useRounds();
  const { data: roundHandicaps } = useRoundHandicaps(Number(selectedRoundId));
  const updateHandicaps = useUpdateRoundHandicaps();
  const { toast } = useToast();

  const [handicapValues, setHandicapValues] = useState<Record<number, number>>({});

  // Initialize values when data loads
  useEffect(() => {
    if (roundHandicaps) {
      const initialValues: Record<number, number> = {};
      roundHandicaps.forEach(h => {
        initialValues[h.playerId] = h.courseHandicap;
      });
      setHandicapValues(initialValues);
    }
  }, [roundHandicaps]);

  const handleSave = async () => {
    if (!selectedRoundId) return;

    const updates = Object.entries(handicapValues).map(([playerId, courseHandicap]) => ({
      playerId: Number(playerId),
      courseHandicap,
    }));

    try {
      await updateHandicaps.mutateAsync({
        roundId: Number(selectedRoundId),
        handicaps: updates,
      });

      toast({
        title: "Handicaps Saved",
        description: `Updated course handicaps for all players in this round.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save handicaps",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (playerId: number, value: string) => {
    const numValue = parseInt(value) || 0;
    setHandicapValues(prev => ({
      ...prev,
      [playerId]: numValue,
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      <Header
        title="Round Setup"
        subtitle="Set Course Handicaps"
      />

      <PageTransition>
        <main className="max-w-2xl mx-auto px-4 space-y-6">

          {/* Round Selector */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground ml-1">Select Round</Label>
            <Select value={selectedRoundId} onValueChange={setSelectedRoundId}>
              <SelectTrigger className="bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700">
                <SelectValue placeholder="Choose a round..." />
              </SelectTrigger>
              <SelectContent className="z-[100] bg-white dark:bg-slate-800 dark:border-slate-700">
                {rounds?.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    R{r.roundNumber}: {r.course.name} - {r.date}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Handicap Entry Grid */}
          {selectedRoundId && roundHandicaps && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
                <Settings className="w-4 h-4" />
                <span>Set course handicaps for each player</span>
              </div>

              {roundHandicaps.map(h => (
                <Card key={h.playerId} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-grow">
                        <div className="font-bold text-lg">{h.playerName}</div>
                        <div className="text-sm text-muted-foreground">
                          Base Handicap: {h.baseHandicap}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Label htmlFor={`hcp-${h.playerId}`} className="text-sm font-medium whitespace-nowrap">
                          Course HCP:
                        </Label>
                        <Input
                          id={`hcp-${h.playerId}`}
                          type="number"
                          min="0"
                          max="54"
                          value={handicapValues[h.playerId] ?? h.courseHandicap}
                          onChange={(e) => handleInputChange(h.playerId, e.target.value)}
                          className="w-20 text-center font-bold text-lg"
                        />
                      </div>
                    </div>

                    {/* Show difference from base */}
                    {handicapValues[h.playerId] !== h.baseHandicap && (
                      <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                        {handicapValues[h.playerId] > h.baseHandicap ? '+' : ''}
                        {handicapValues[h.playerId] - h.baseHandicap} from base
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              <Button
                onClick={handleSave}
                size="lg"
                className="w-full h-14 text-lg font-bold shadow-xl"
                disabled={updateHandicaps.isPending}
              >
                {updateHandicaps.isPending ? "Saving..." : "Save All Handicaps"}
              </Button>
            </div>
          )}

          {!selectedRoundId && (
            <div className="text-center py-20 text-muted-foreground">
              <Settings className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Select a round to configure course handicaps</p>
            </div>
          )}

        </main>
      </PageTransition>

      <BottomNav />
    </div>
  );
}
```

---

### Step 6: Frontend - Update Scoring Page

**File: `/client/src/pages/Scoring.tsx`**

**A. Import the new hook (around line 2)**

```typescript
import { useRounds, useRound, usePlayers, useSubmitScore, useScores, useRoundHandicaps } from "@/hooks/use-tournament";
```

**B. Add hook call (around line 28)**

```typescript
const { data: roundHandicaps } = useRoundHandicaps(Number(selectedRoundId));
```

**C. Update player selector display (around line 117)**

```typescript
<SelectItem key={p.id} value={String(p.id)}>
  {p.name} (Base HCP: {p.handicap})
</SelectItem>
```

**D. Add handicap validation and display (after player selector, around line 123)**

```typescript
{/* Check if handicaps are set for this round */}
{selectedRoundId && roundHandicaps && selectedPlayerId && (() => {
  const allHandicapsSet = roundHandicaps.every(h => h.courseHandicap !== undefined);
  const currentPlayerHandicap = roundHandicaps.find(h => h.playerId === Number(selectedPlayerId));

  if (!allHandicapsSet) {
    // BLOCK SCORING - handicaps not set
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-900">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div className="font-bold text-red-900 dark:text-red-100">
              Course Handicaps Not Set
            </div>
          </div>
          <p className="text-sm text-red-800 dark:text-red-200 mb-3">
            Course handicaps must be configured before entering scores for this round.
          </p>
          <Link href={`/round-setup?round=${selectedRoundId}`}>
            <Button variant="outline" size="sm" className="w-full">
              <Settings className="w-4 h-4 mr-2" />
              Set Handicaps Now
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Show current course handicap
  return currentPlayerHandicap && (
    <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-900">
      <CardContent className="p-3">
        <div className="text-sm flex items-center justify-between">
          <span className="text-muted-foreground">Course Handicap:</span>
          <div>
            <span className="text-lg font-bold text-primary ml-2">
              {currentPlayerHandicap.courseHandicap}
            </span>
            {currentPlayerHandicap.courseHandicap !== currentPlayerHandicap.baseHandicap && (
              <span className="text-xs text-muted-foreground ml-2">
                (Base: {currentPlayerHandicap.baseHandicap})
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
})()}
```

Add imports at top:
```typescript
import { AlertCircle, Settings } from "lucide-react";
import { Link } from "wouter";
```

**E. Disable score entry if handicaps not set (around line 125)**

Wrap the score entry UI section with conditional:

```typescript
{selectedRoundId && selectedPlayerId && currentHoleData && (() => {
  const allHandicapsSet = roundHandicaps?.every(h => h.courseHandicap !== undefined);

  if (!allHandicapsSet) {
    return null; // Don't show hole navigator and score input
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Existing hole navigator and score input UI */}
    </div>
  );
})()}
```

---

### Step 7: Frontend - Update Player Scorecard

**File: `/client/src/pages/PlayerScorecard.tsx`**

**A. Modify RoundSummaryCard (around line 225)**

```typescript
<div className="text-center">
  <div className="text-xs text-muted-foreground">Course HCP</div>
  <div className="font-bold text-lg">
    {playerScores[0]?.handicapUsed ?? playerHandicap}
  </div>
</div>
```

**B. Modify RoundDetailCard (around line 341)**

```typescript
<div className="text-center">
  <div className="text-xs text-muted-foreground mb-1">COURSE HANDICAP</div>
  <div className="text-3xl font-bold">
    {playerScores[0]?.handicapUsed ?? playerHandicap}
  </div>
  {playerScores[0]?.handicapUsed !== playerHandicap && (
    <div className="text-xs text-muted-foreground mt-1">
      (Base: {playerHandicap})
    </div>
  )}
</div>
```

---

### Step 8: Frontend - Add Navigation

**File: `/client/src/App.tsx`**

Add route (around line 26):

```typescript
<Route path="/round-setup" component={RoundSetup} />
```

**File: `/client/src/pages/Schedule.tsx`**

Add "Set Handicaps" button for each round:

```typescript
<Link href={`/round-setup?round=${round.id}`}>
  <Button variant="outline" size="sm" className="w-full mt-2">
    <Settings className="w-4 h-4 mr-2" />
    Set Course Handicaps
  </Button>
</Link>
```

Import Settings and Link:
```typescript
import { Settings } from "lucide-react";
import { Link } from "wouter";
```

**File: `/client/src/pages/RoundSetup.tsx`**

Update component to read round ID from URL params:

```typescript
import { useLocation } from "wouter";

export default function RoundSetup() {
  const [location] = useLocation();
  const urlParams = new URLSearchParams(location.split('?')[1]);
  const roundIdFromUrl = urlParams.get('round');

  const [selectedRoundId, setSelectedRoundId] = useState<string>(roundIdFromUrl || "");
  // ... rest of component
}
```

---

## User Workflow

### Pre-Round Setup (Tournament Organizer)
1. Navigate to Schedule page
2. Click "Set Course Handicaps" button for upcoming round
3. Enter course handicap for each of 6 players based on course difficulty
4. Click "Save All Handicaps"
5. System stores handicaps in `round_handicaps` table

### During Round (Score Entry)
1. Scorer selects round and player on Scoring page
2. System displays course handicap being used (with base handicap reference)
3. Scorer enters gross scores for each hole
4. System automatically calculates net scores and stableford points using **course handicap**
5. System stores `handicap_used` in scores table for audit trail

### Post-Round (Review)
1. Players view scorecard on PlayerScorecard page
2. Scorecard shows which course handicap was used
3. If different from base, shows both: "Course: 12 (Base: 10)"
4. Leaderboards calculate using correct round-specific handicaps

---

## Backward Compatibility

**Existing Rounds 1 & 2:**
- Migration backfills `handicap_used` column with player's base handicap
- Creates `round_handicaps` entries matching what was used
- All historical calculations remain accurate
- No re-calculation needed

**Missing Handicaps:**
- If scoring for a round without course handicaps set:
  - Score entry is **BLOCKED** on Scoring page
  - Clear message displayed: "Course handicaps must be set before scoring"
  - Link provided to Round Setup page for that round
  - Enforces proper tournament workflow

---

## Verification Checklist

### Database
- [ ] Run migration successfully
- [ ] Verify `round_handicaps` table created
- [ ] Verify `handicap_used` column added to scores
- [ ] Check backfill: `SELECT COUNT(*) FROM scores WHERE handicap_used IS NULL` (should be 0)
- [ ] Check Round 1-2 handicaps created: `SELECT * FROM round_handicaps WHERE round_id IN (1,2)` (should be 12 rows)

### API
- [ ] Test GET `/api/rounds/3/handicaps` - returns 6 players
- [ ] Test PUT `/api/rounds/3/handicaps` - updates database
- [ ] Verify database after PUT: `SELECT * FROM round_handicaps WHERE round_id = 3`

### UI - Round Setup Page
- [ ] Navigate to Round Setup page from Schedule
- [ ] Select Round 3
- [ ] All 6 players displayed with base handicaps
- [ ] Change handicaps, click Save
- [ ] Success toast appears
- [ ] Reload page - handicaps persisted

### Scoring Flow
- [ ] Navigate to Scoring page, select Round 3 (with handicaps set)
- [ ] Course handicap displayed correctly in blue info card
- [ ] Enter score, verify `handicap_used` in database matches course handicap
- [ ] Test with Round 4 (no handicaps set):
  - [ ] Red warning card appears: "Course Handicaps Not Set"
  - [ ] "Set Handicaps Now" button shown
  - [ ] Score entry UI hidden/disabled
  - [ ] Click button, navigates to Round Setup page
- [ ] After setting Round 4 handicaps, return to Scoring page
- [ ] Verify score entry now enabled

### Scorecard Display
- [ ] View Round 3 scorecard
- [ ] Verify "Course Handicap" shows round-specific value
- [ ] Verify base handicap shown if different
- [ ] Check Round 1-2 scorecards still display correctly

### Edge Cases
- [ ] Handicap = 0
- [ ] Handicap > 18 (e.g., Ross with 21)
- [ ] Changing handicaps after some scores entered

---

## Critical Files Summary

### Backend
- `/shared/schema.ts` - Add `roundHandicaps` table, modify `scores` table
- `/server/storage.ts` - Add `getRoundHandicaps()`, `updateRoundHandicaps()`, modify `submitScore()`
- `/server/routes.ts` - Add GET/PUT endpoints for `/api/rounds/:roundId/handicaps`

### Frontend
- `/client/src/hooks/use-tournament.ts` - Add `useRoundHandicaps()`, `useUpdateRoundHandicaps()`
- `/client/src/pages/RoundSetup.tsx` - NEW PAGE for handicap management
- `/client/src/pages/Scoring.tsx` - Display course handicap being used, add validation
- `/client/src/pages/PlayerScorecard.tsx` - Show handicap used in scorecard
- `/client/src/App.tsx` - Add route for RoundSetup
- `/client/src/pages/Schedule.tsx` - Add "Set Handicaps" button per round

### Database
- Create migration file in `/drizzle/` directory
- Run: `npx drizzle-kit generate && npx drizzle-kit migrate`

---

**Ready to implement when you are. Pick this up anytime!**

# GIR, FIR, and Putts Tracking Implementation Plan

## Overview

Add golf statistics tracking (Greens in Regulation, Fairways in Regulation, and Putts) to the Tournament Manager. Stats will be displayed inline during scoring (always visible) and are optional to enter.

## Design Decisions

- **Input Style**: Always visible inline alongside gross score entry
- **Required**: Optional - players can skip, shows "-" for missing data
- **Stats Tracked**: Putts + FIR stored in database, GIR calculated from putts + gross score

## Data Model

### New Database Columns (scores table)

```typescript
// Add to shared/schema.ts scores table
putts: integer("putts"),              // Number of putts (nullable, optional)
fairwayHit: boolean("fairway_hit"),   // FIR - only applies to par 4/5 (nullable)
```

### GIR Calculation Formula

```typescript
// GIR = player reached green in (par - 2) strokes
// If putts tracked: GIR = (grossScore - putts) <= (par - 2)
const isGIR = (grossScore: number, putts: number, par: number): boolean => {
  const strokesToGreen = grossScore - putts;
  return strokesToGreen <= (par - 2);
};
```

## Implementation Steps

### Phase 1: Database Schema

**File**: `shared/schema.ts`

Add to scores table definition (around line 47-57):
```typescript
export const scores = pgTable("scores", {
  // ... existing fields ...
  putts: integer("putts"),              // NEW
  fairwayHit: boolean("fairway_hit"),   // NEW
});
```

Update SubmitScoreRequest type (around line 222-228):
```typescript
export type SubmitScoreRequest = {
  roundId: number;
  playerId: number;
  holeNumber: number;
  grossScore: number;
  isPick9?: boolean;
  putts?: number;           // NEW
  fairwayHit?: boolean;     // NEW
};
```

### Phase 2: API Schema

**File**: `shared/routes.ts`

Update scores.submit input schema:
```typescript
input: z.object({
  roundId: z.number(),
  playerId: z.number(),
  holeNumber: z.number(),
  grossScore: z.number(),
  isPick9: z.boolean().optional(),
  putts: z.number().min(0).max(10).optional(),     // NEW
  fairwayHit: z.boolean().optional(),              // NEW
}),
```

### Phase 3: Backend Storage

**File**: `server/storage.ts`

Update submitScore method to include new fields in the values object:
```typescript
const values = {
  ...data,
  netScore,
  stablefordPoints,
  handicapUsed: handicapToUse,
  putts: data.putts ?? null,           // NEW
  fairwayHit: data.fairwayHit ?? null, // NEW
};
```

### Phase 4: Scoring Input UI

**File**: `client/src/pages/Scoring.tsx`

#### 4.1 Add State Variables

For Single Player mode:
```typescript
const [putts, setPutts] = useState<number | null>(null);
const [fairwayHit, setFairwayHit] = useState<boolean | null>(null);
```

For Group mode - extend groupScores state type.
For Match Play mode - extend matchScores state type.

#### 4.2 Create Inline Stats Input Component

```tsx
function StatsInput({
  par,
  putts,
  fairwayHit,
  onPuttsChange,
  onFairwayHitChange
}: StatsInputProps) {
  const showFairway = par >= 4; // FIR only for Par 4 and Par 5

  return (
    <div className="flex items-center gap-4 mt-3">
      {/* Putts: +/- buttons */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Putts</span>
        <Button size="sm" onClick={() => onPuttsChange(Math.max(0, (putts ?? 2) - 1))}>-</Button>
        <span className="w-6 text-center font-bold">{putts ?? "-"}</span>
        <Button size="sm" onClick={() => onPuttsChange((putts ?? 1) + 1)}>+</Button>
      </div>

      {/* FIR: Yes/No toggle (only for par 4/5) */}
      {showFairway && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">FIR</span>
          <Button
            size="sm"
            variant={fairwayHit === true ? "default" : "outline"}
            onClick={() => onFairwayHitChange(fairwayHit === true ? null : true)}
          >
            Y
          </Button>
          <Button
            size="sm"
            variant={fairwayHit === false ? "default" : "outline"}
            onClick={() => onFairwayHitChange(fairwayHit === false ? null : false)}
          >
            N
          </Button>
        </div>
      )}
    </div>
  );
}
```

#### 4.3 Integration Points in Scoring.tsx

- **Single Player Mode** (~line 757-807): Add StatsInput below the strokes +/- buttons
- **Group Mode** (~line 932-1018): Add compact stats inputs in each player row
- **Match Play Mode** (~line 1158-1241): Add stats inputs for each player side

#### 4.4 Update Submit Handler

```typescript
await submitScore.mutateAsync({
  roundId: Number(selectedRoundId),
  playerId: Number(selectedPlayerId),
  holeNumber: currentHole,
  grossScore: strokes,
  isPick9: isPick9,
  putts: putts ?? undefined,           // NEW
  fairwayHit: fairwayHit ?? undefined, // NEW
});
```

### Phase 5: Display UI - ScoreboardTable

**File**: `client/src/components/ScoreboardTable.tsx`

#### 5.1 Add Helper Functions

```typescript
// GIR calculation
const calculateGIR = (score: Score | undefined, hole: Hole | undefined): boolean | null => {
  if (!score || !hole || score.putts === null || score.putts === undefined) return null;
  return (score.grossScore - score.putts) <= (hole.par - 2);
};

// Totals and percentages
const calculatePuttsTotal = (holeNumbers: number[]): number => { ... };
const calculateFIRPercentage = (holeNumbers: number[]): string => { ... };
const calculateGIRPercentage = (holeNumbers: number[]): string => { ... };
```

#### 5.2 Add New Table Rows (after Pts row)

```tsx
{/* Putts row */}
<tr className="border-t border-slate-200">
  <td className="px-2 py-2 font-semibold text-xs">Putts</td>
  {holeNumbers.map(h => (
    <td key={h} className="text-center text-xs">{getScore(h)?.putts ?? '-'}</td>
  ))}
  <td className="text-center font-bold text-xs">{puttsTotal}</td>
</tr>

{/* FIR row */}
<tr className="border-t border-slate-200">
  <td className="px-2 py-2 font-semibold text-xs">FIR</td>
  {holeNumbers.map(h => {
    const hole = getHole(h);
    const score = getScore(h);
    if (!hole || hole.par < 4) return <td key={h} className="text-center text-xs">-</td>;
    return <td key={h} className="text-center text-xs">
      {score?.fairwayHit === null ? '-' : score?.fairwayHit ? '✓' : '✗'}
    </td>;
  })}
  <td className="text-center font-bold text-xs">{firPercentage}</td>
</tr>

{/* GIR row (calculated) */}
<tr className="border-t border-slate-200">
  <td className="px-2 py-2 font-semibold text-xs">GIR</td>
  {holeNumbers.map(h => {
    const gir = calculateGIR(getScore(h), getHole(h));
    return <td key={h} className="text-center text-xs">
      {gir === null ? '-' : gir ? '✓' : '✗'}
    </td>;
  })}
  <td className="text-center font-bold text-xs">{girPercentage}</td>
</tr>
```

#### 5.3 Update Summary Stats Section

Add to the summary grid (around line 220-246):
```tsx
<div className="text-center">
  <div className="text-xs text-muted-foreground mb-1">Putts</div>
  <div className="text-2xl font-bold">{totalPutts}</div>
</div>
<div className="text-center">
  <div className="text-xs text-muted-foreground mb-1">GIR %</div>
  <div className="text-2xl font-bold text-green-600">{girPercentage}</div>
</div>
<div className="text-center">
  <div className="text-xs text-muted-foreground mb-1">FIR %</div>
  <div className="text-2xl font-bold text-blue-600">{firPercentage}</div>
</div>
```

## Files to Modify

| File | Changes |
|------|---------|
| `shared/schema.ts` | Add putts, fairwayHit columns to scores table |
| `shared/routes.ts` | Add putts, fairwayHit to API input schema |
| `server/storage.ts` | Update submitScore to persist new fields |
| `client/src/pages/Scoring.tsx` | Add inline stats inputs to all 3 modes |
| `client/src/components/ScoreboardTable.tsx` | Add Putts/FIR/GIR rows and summary stats |

## Database Migration

After schema changes, run:
```bash
npm run db:push
```

## Verification Steps

1. **Schema Migration**: Verify new columns exist in database
2. **API Test**: Submit score with putts/fairwayHit via API
3. **Single Player Mode**: Enter score with stats, verify saved
4. **Group Mode**: Enter stats for multiple players
5. **Match Play Mode**: Enter stats for both players
6. **Par 3 Holes**: Verify FIR input is hidden (not applicable)
7. **Par 4/5 Holes**: Verify FIR input is shown
8. **ScoreboardTable**: Verify Putts/FIR/GIR rows display
9. **GIR Calculation**: Verify correct calculation from putts + gross
10. **Old Scores**: Verify "-" shown for missing stats
11. **Summary Stats**: Verify percentages calculate correctly

## Edge Cases

- Putt count of 0 (chip-in/hole-out)
- High putt counts (4+)
- Mixed data (some holes have stats, others don't)
- Par 3 holes (no FIR tracking)
- Existing scores with null stats

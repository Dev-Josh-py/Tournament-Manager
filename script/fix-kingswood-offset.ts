/**
 * One-off fix: Kingswood (course 6) / Round 6 scores were entered one hole late for
 * Keagan, Matt, Ross and Jaun. Josh and Jethro were already corrected by hand.
 *
 * The offset is a rotate-left-by-one over all 18 holes: the value stored against
 * hole N belongs on hole N-1, and hole 1's value belongs on hole 18. Confirmed
 * against Matt's official card (OUT 45 / IN 47 / 92) and by the `fir` column,
 * which is null on par 3s (holes 1, 5, 11, 17) but was stored on 2, 6, 12, 18.
 *
 * gir/fir/putts rotate with the gross score. net_score, stableford_points and
 * handicap_used are then recalculated with the same formula as
 * storage.ts:calculatePoints().
 *
 * Usage: npx tsx script/fix-kingswood-offset.ts [--players=3,4,5,6] [--apply]
 * Without --apply it prints the diff and rolls back.
 */
import { Pool } from "pg";

const ROUND_ID = 6;
const COURSE_ID = 6;
const DEFAULT_PLAYERS_TO_SHIFT = [3, 4, 5, 6]; // Keagan, Matt, Ross, Jaun

// Matt's official card, used as a guard so the rotation can't be applied twice.
const MATT_EXPECTED = [4, 7, 6, 5, 3, 5, 5, 4, 6, 4, 5, 5, 6, 5, 7, 5, 4, 6];

type ScoreRow = {
  id: number;
  player_id: number;
  hole_number: number;
  gross_score: number;
  gir: boolean | null;
  fir: boolean | null;
  putts: number | null;
};

/** Mirrors storage.ts:calculatePoints(). */
function calculatePoints(gross: number, par: number, strokeIndex: number, handicap: number) {
  let strokesReceived = Math.floor(handicap / 18);
  if (handicap % 18 >= strokeIndex) strokesReceived += 1;
  const netScore = gross - strokesReceived;
  const stablefordPoints = Math.max(0, par - netScore + 2);
  return { netScore, stablefordPoints };
}

const fmt = (v: number[]) =>
  `${v.slice(0, 9).join(" ")} | ${v.slice(9).join(" ")}  (${sum(v.slice(0, 9))}/${sum(v.slice(9))}/${sum(v)})`;
const sum = (v: number[]) => v.reduce((a, b) => a + b, 0);

async function main() {
  const apply = process.argv.includes("--apply");
  const playersArg = process.argv.find((a) => a.startsWith("--players="));
  const playersToShift = playersArg
    ? playersArg.slice("--players=".length).split(",").map((n) => parseInt(n, 10))
    : DEFAULT_PLAYERS_TO_SHIFT;
  if (playersToShift.some(Number.isNaN)) throw new Error(`Bad --players value: ${playersArg}`);
  console.log(`Rotating players: ${playersToShift.join(", ")}\n`);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows: holes } = await client.query<{ number: number; par: number; stroke_index: number }>(
      `select number, par, stroke_index from public.holes where course_id = $1 order by number`,
      [COURSE_ID],
    );
    if (holes.length !== 18) throw new Error(`Expected 18 holes for course ${COURSE_ID}, got ${holes.length}`);
    const holeByNumber = new Map(holes.map((h) => [h.number, h]));

    const { rows: hcps } = await client.query<{ player_id: number; course_handicap: number }>(
      `select player_id, course_handicap from public.round_handicaps where round_id = $1`,
      [ROUND_ID],
    );
    const handicapByPlayer = new Map(hcps.map((h) => [h.player_id, h.course_handicap]));

    const { rows: names } = await client.query<{ id: number; name: string }>(
      `select id, name from public.players order by id`,
    );
    const nameById = new Map(names.map((p) => [p.id, p.name]));

    const { rows: allScores } = await client.query<ScoreRow>(
      `select id, player_id, hole_number, gross_score, gir, fir, putts
         from public.scores where round_id = $1 order by player_id, hole_number`,
      [ROUND_ID],
    );

    // --- Rotate the four affected players ---
    for (const playerId of playersToShift) {
      const rows = allScores.filter((s) => s.player_id === playerId);
      if (rows.length !== 18) throw new Error(`Player ${playerId} has ${rows.length} scores, expected 18`);

      const before = rows.map((r) => r.gross_score);
      // rotate left by one: hole N takes what is currently on hole N+1, hole 18 takes hole 1
      const rotated = [...rows.slice(1), rows[0]];

      if (playerId === 4) {
        const after = rotated.map((r) => r.gross_score);
        if (JSON.stringify(before) === JSON.stringify(MATT_EXPECTED)) {
          throw new Error("Matt already matches his official card — the rotation looks applied. Aborting.");
        }
        if (JSON.stringify(after) !== JSON.stringify(MATT_EXPECTED)) {
          throw new Error(`Rotation does not reproduce Matt's card.\n  got: ${after}\n  want: ${MATT_EXPECTED}`);
        }
      }

      for (let i = 0; i < 18; i++) {
        const target = rows[i]; // row that owns hole i+1
        const src = rotated[i]; // values that belong on hole i+1
        await client.query(
          `update public.scores set gross_score=$1, gir=$2, fir=$3, putts=$4 where id=$5`,
          [src.gross_score, src.gir, src.fir, src.putts, target.id],
        );
      }

      console.log(`${nameById.get(playerId)}:`);
      console.log(`  before: ${fmt(before)}`);
      console.log(`  after : ${fmt(rotated.map((r) => r.gross_score))}`);
    }

    // --- Recalculate derived values for the whole round ---
    const { rows: refreshed } = await client.query<ScoreRow>(
      `select id, player_id, hole_number, gross_score, gir, fir, putts
         from public.scores where round_id = $1`,
      [ROUND_ID],
    );
    let recalculated = 0;
    for (const s of refreshed) {
      const hole = holeByNumber.get(s.hole_number);
      if (!hole) continue;
      const handicap = handicapByPlayer.get(s.player_id) ?? 0;
      const { netScore, stablefordPoints } = calculatePoints(
        s.gross_score ?? 0,
        hole.par ?? 4,
        hole.stroke_index ?? 1,
        handicap,
      );
      await client.query(
        `update public.scores set net_score=$1, stableford_points=$2, handicap_used=$3 where id=$4`,
        [netScore, stablefordPoints, handicap, s.id],
      );
      recalculated++;
    }
    console.log(`\nRecalculated net/stableford/handicap_used for ${recalculated} scores in round ${ROUND_ID}.`);

    // --- Post-change summary ---
    const { rows: summary } = await client.query<{ name: string; gross: string; stbl: string; net: string }>(
      `select p.name, sum(s.gross_score)::text gross, sum(s.stableford_points)::text stbl, sum(s.net_score)::text net
         from public.scores s join public.players p on p.id = s.player_id
        where s.round_id = $1 group by p.id, p.name order by p.id`,
      [ROUND_ID],
    );
    console.log("\nRound totals:");
    for (const r of summary) {
      console.log(`  ${r.name.padEnd(8)} gross ${r.gross}  net ${r.net}  stableford ${r.stbl}`);
    }

    if (apply) {
      await client.query("COMMIT");
      console.log("\nCOMMITTED.");
    } else {
      await client.query("ROLLBACK");
      console.log("\nDRY RUN — rolled back. Re-run with --apply to commit.");
    }
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("\nFAILED:", err.message);
  process.exit(1);
});

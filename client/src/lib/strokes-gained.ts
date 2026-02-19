import type { Score } from "@shared/schema";

export interface PlayerStrokesGained {
  playerId: number;
  sgTotal: number;
  sgPutting: number | null;
  sgTeeToGreen: number | null;
  sgByPar: { par: number; sg: number; holes: number }[];
  sgByRound: { roundIndex: number; sg: number; holes: number }[];
  holesPlayed: number;
}

/**
 * Calculate Strokes Gained vs field for all players.
 *
 * SG: Total     = field_avg_gross − player_gross  (positive = better)
 * SG: Putting   = field_avg_putts − player_putts
 * SG: Tee2Green = SG:Total − SG:Putting  (only on holes where both are available)
 */
export function calculateStrokesGained(
  allScoresData: Score[][],
  rounds: { holes?: { number: number; par: number }[] }[],
): Map<number, PlayerStrokesGained> {
  // Build field averages per (roundIndex, holeNumber)
  type HoleKey = string; // "roundIndex-holeNumber"
  const key = (ri: number, hn: number): HoleKey => `${ri}-${hn}`;

  interface HoleFieldData {
    grossScores: { playerId: number; gross: number }[];
    puttsScores: { playerId: number; putts: number }[];
    par: number;
  }

  const fieldData = new Map<HoleKey, HoleFieldData>();

  allScoresData.forEach((roundScores, roundIndex) => {
    const round = rounds[roundIndex];
    if (!round) return;

    roundScores.forEach((score: Score) => {
      if (score.playerId == null || !score.grossScore) return;
      const hole = round.holes?.find(h => h.number === score.holeNumber);
      if (!hole) return;

      const k = key(roundIndex, score.holeNumber);
      if (!fieldData.has(k)) {
        fieldData.set(k, { grossScores: [], puttsScores: [], par: hole.par });
      }
      const fd = fieldData.get(k)!;
      fd.grossScores.push({ playerId: score.playerId, gross: score.grossScore });
      if (score.putts !== null && score.putts !== undefined) {
        fd.puttsScores.push({ playerId: score.playerId, putts: score.putts });
      }
    });
  });

  // For each hole, compute field averages (need >= 2 players)
  interface HoleAvg {
    avgGross: number;
    avgPutts: number | null;
    par: number;
    grossByPlayer: Map<number, number>;
    puttsByPlayer: Map<number, number>;
  }

  const holeAvgs = new Map<HoleKey, HoleAvg>();

  fieldData.forEach((fd, k) => {
    if (fd.grossScores.length < 2) return;

    const avgGross = fd.grossScores.reduce((s, e) => s + e.gross, 0) / fd.grossScores.length;
    const avgPutts = fd.puttsScores.length >= 2
      ? fd.puttsScores.reduce((s, e) => s + e.putts, 0) / fd.puttsScores.length
      : null;

    const grossByPlayer = new Map<number, number>();
    fd.grossScores.forEach(e => grossByPlayer.set(e.playerId, e.gross));

    const puttsByPlayer = new Map<number, number>();
    fd.puttsScores.forEach(e => puttsByPlayer.set(e.playerId, e.putts));

    holeAvgs.set(k, { avgGross, avgPutts, par: fd.par, grossByPlayer, puttsByPlayer });
  });

  // Collect all player IDs
  const playerIds = new Set<number>();
  allScoresData.forEach(rs => rs.forEach(s => { if (s.playerId != null) playerIds.add(s.playerId); }));

  // Calculate per-player SG
  const results = new Map<number, PlayerStrokesGained>();

  playerIds.forEach(playerId => {
    let sgTotal = 0;
    let sgPutting = 0;
    let sgTeeToGreen = 0;
    let holesPlayed = 0;
    let puttingHoles = 0;
    let t2gHoles = 0;

    const parBuckets = new Map<number, { sg: number; holes: number }>();
    const roundBuckets = new Map<number, { sg: number; holes: number }>();

    allScoresData.forEach((_rs, roundIndex) => {
      const round = rounds[roundIndex];
      if (!round?.holes) return;

      round.holes.forEach(hole => {
        const k = key(roundIndex, hole.number);
        const avg = holeAvgs.get(k);
        if (!avg) return;

        const playerGross = avg.grossByPlayer.get(playerId);
        if (playerGross === undefined) return;

        const holeSG = avg.avgGross - playerGross;
        sgTotal += holeSG;
        holesPlayed++;

        // Par bucket
        if (!parBuckets.has(hole.par)) parBuckets.set(hole.par, { sg: 0, holes: 0 });
        const pb = parBuckets.get(hole.par)!;
        pb.sg += holeSG;
        pb.holes++;

        // Round bucket
        if (!roundBuckets.has(roundIndex)) roundBuckets.set(roundIndex, { sg: 0, holes: 0 });
        const rb = roundBuckets.get(roundIndex)!;
        rb.sg += holeSG;
        rb.holes++;

        // Putting SG — only on holes where both player and field have putts
        if (avg.avgPutts !== null) {
          const playerPutts = avg.puttsByPlayer.get(playerId);
          if (playerPutts !== undefined) {
            const holePuttSG = avg.avgPutts - playerPutts;
            sgPutting += holePuttSG;
            puttingHoles++;

            // T2G only on holes where we have both gross and putting for this player
            const holeT2G = holeSG - holePuttSG;
            sgTeeToGreen += holeT2G;
            t2gHoles++;
          }
        }
      });
    });

    if (holesPlayed === 0) return;

    results.set(playerId, {
      playerId,
      sgTotal,
      sgPutting: puttingHoles > 0 ? sgPutting : null,
      sgTeeToGreen: t2gHoles > 0 ? sgTeeToGreen : null,
      sgByPar: Array.from(parBuckets.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([par, data]) => ({ par, sg: data.sg, holes: data.holes })),
      sgByRound: Array.from(roundBuckets.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([roundIndex, data]) => ({ roundIndex, sg: data.sg, holes: data.holes })),
      holesPlayed,
    });
  });

  return results;
}

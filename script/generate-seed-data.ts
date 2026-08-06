/**
 * Regenerates shared/seed-data.ts from the live database.
 *
 * The seed used to be hand-maintained in two places and had drifted badly from
 * production (stale handicaps, a round on the wrong course, invented sample
 * scores). Generating it means it can't silently drift again — re-run this
 * whenever the tournament data changes:
 *
 *   DATABASE_URL=... npx tsx script/generate-seed-data.ts
 *
 * Everything is keyed by natural keys (course name, round number, player name)
 * rather than serial ids, so a fresh seed does not depend on id assignment.
 */
import { Pool } from "pg";
import { writeFileSync } from "fs";

const OUT = "shared/seed-data.ts";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const q = async <T>(text: string): Promise<T[]> => (await pool.query(text)).rows as T[];

  const teams = await q<any>(`select id, name, color from public.teams order by id`);
  const players = await q<any>(`select p.id, p.name, p.handicap, t.name as team_name
                                  from public.players p join public.teams t on t.id = p.team_id
                                 order by p.id`);
  const courses = await q<any>(`select id, name from public.courses order by id`);
  const holes = await q<any>(`select course_id, number, par, stroke_index from public.holes order by course_id, number`);
  const rounds = await q<any>(`select r.id, r.round_number, r.date, r.tee_time, r.format_type, r.description,
                                      r.awards_team_points, c.name as course_name
                                 from public.rounds r join public.courses c on c.id = r.course_id
                                order by r.round_number`);
  const scores = await q<any>(`select r.round_number, p.name as player_name, s.hole_number, s.gross_score,
                                      s.is_pick_9, s.gir, s.fir, s.putts
                                 from public.scores s
                                 join public.rounds r on r.id = s.round_id
                                 join public.players p on p.id = s.player_id
                                order by r.round_number, p.id, s.hole_number`);
  const handicaps = await q<any>(`select r.round_number, p.name as player_name, rh.course_handicap
                                    from public.round_handicaps rh
                                    join public.rounds r on r.id = rh.round_id
                                    join public.players p on p.id = rh.player_id
                                   order by r.round_number, p.id`);
  const groupings = await q<any>(`select r.round_number, g.group_number, g.group_name,
                                         coalesce(array_agg(p.name order by p.id)
                                           filter (where p.name is not null), '{}') as player_names
                                    from public.round_groupings g
                                    join public.rounds r on r.id = g.round_id
                                    left join public.round_grouping_players gp on gp.grouping_id = g.id
                                    left join public.players p on p.id = gp.player_id
                                   group by r.round_number, g.group_number, g.group_name
                                   order by r.round_number, g.group_number`);
  const pairings = await q<any>(`select r.round_number, m.match_number,
                                        p1.name as player1_name, p2.name as player2_name,
                                        w.name as winner_name
                                   from public.match_pairings m
                                   join public.rounds r on r.id = m.round_id
                                   join public.players p1 on p1.id = m.player1_id
                                   join public.players p2 on p2.id = m.player2_id
                                   left join public.players w on w.id = m.winner_id
                                  order by r.round_number, m.match_number`);
  const pick9 = await q<any>(`select r.round_number, p.name as player_name, a.hole_range
                                from public.pick9_assignments a
                                join public.rounds r on r.id = a.round_id
                                join public.players p on p.id = a.player_id
                               order by r.round_number, p.id`);


  const data = {
    teams: teams.map((t) => ({ name: t.name, color: t.color })),
    players: players.map((p) => ({ name: p.name, handicap: String(p.handicap), teamName: p.team_name })),
    courses: courses.map((c) => ({
      name: c.name,
      holes: holes
        .filter((h) => h.course_id === c.id)
        .map((h) => ({ number: h.number, par: h.par, strokeIndex: h.stroke_index })),
    })),
    rounds: rounds.map((r) => ({
      roundNumber: r.round_number,
      courseName: r.course_name,
      date: r.date,
      teeTime: r.tee_time,
      formatType: r.format_type,
      description: r.description,
      awardsTeamPoints: r.awards_team_points,
    })),
    scores: scores.map((s) => ({
      roundNumber: s.round_number,
      playerName: s.player_name,
      holeNumber: s.hole_number,
      grossScore: s.gross_score,
      isPick9: s.is_pick_9,
      gir: s.gir,
      fir: s.fir,
      putts: s.putts,
    })),
    roundHandicaps: handicaps.map((h) => ({
      roundNumber: h.round_number,
      playerName: h.player_name,
      courseHandicap: h.course_handicap,
    })),
    groupings: groupings.map((g) => ({
      roundNumber: g.round_number,
      groupNumber: g.group_number,
      groupName: g.group_name,
      playerNames: g.player_names,
    })),
    matchPairings: pairings.map((m) => ({
      roundNumber: m.round_number,
      matchNumber: m.match_number,
      player1Name: m.player1_name,
      player2Name: m.player2_name,
      winnerName: m.winner_name,
    })),
    pick9Assignments: pick9.map((a) => ({
      roundNumber: a.round_number,
      playerName: a.player_name,
      holeRange: a.hole_range,
    })),
  };

  const header = `// GENERATED FILE — do not edit by hand.
// Regenerate with: DATABASE_URL=... npx tsx script/generate-seed-data.ts
// Snapshot of the live tournament database taken ${new Date().toISOString().slice(0, 10)}.

export type SeedData = typeof seedData;

export const seedData = ${JSON.stringify(data, null, 2)} as const;
`;

  writeFileSync(OUT, header);
  await pool.end();

  console.log(`Wrote ${OUT}`);
  console.log(
    `  ${data.teams.length} teams, ${data.players.length} players, ${data.courses.length} courses ` +
      `(${holes.length} holes), ${data.rounds.length} rounds, ${data.scores.length} scores,\n` +
      `  ${data.roundHandicaps.length} round handicaps, ${data.groupings.length} groupings, ` +
      `${data.matchPairings.length} match pairings, ${data.pick9Assignments.length} pick9 assignments`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

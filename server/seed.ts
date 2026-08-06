/**
 * Seeds an empty database from shared/seed-data.ts, which is a generated
 * snapshot of the live tournament data (see script/generate-seed-data.ts).
 *
 * This is the single seeding implementation — both the server's startup check
 * and `npx tsx script/seed.ts` call it, so there is only one definition of what
 * a fresh database looks like.
 */
import { db } from "./db.js";
import {
  teams, players, courses, holes, rounds, scores,
  roundHandicaps, roundGroupings, roundGroupingPlayers, matchPairings, pick9Assignments,
} from "../shared/schema.js";
import { seedData } from "../shared/seed-data.js";
import { storage } from "./storage.js";

export async function seedDatabase(): Promise<{ seeded: boolean }> {
  const existingTeams = await db.select({ id: teams.id }).from(teams);
  if (existingTeams.length > 0) return { seeded: false };

  console.log("Seeding database...");

  const teamIdByName = new Map<string, number>();
  for (const team of seedData.teams) {
    const [row] = await db.insert(teams).values({ name: team.name, color: team.color }).returning();
    teamIdByName.set(team.name, row.id);
  }

  const playerIdByName = new Map<string, number>();
  for (const player of seedData.players) {
    const [row] = await db
      .insert(players)
      .values({
        name: player.name,
        handicap: player.handicap,
        teamId: teamIdByName.get(player.teamName)!,
      })
      .returning();
    playerIdByName.set(player.name, row.id);
  }

  const courseIdByName = new Map<string, number>();
  for (const course of seedData.courses) {
    const [row] = await db.insert(courses).values({ name: course.name }).returning();
    courseIdByName.set(course.name, row.id);
    for (const hole of course.holes) {
      await db.insert(holes).values({
        courseId: row.id,
        number: hole.number,
        par: hole.par,
        strokeIndex: hole.strokeIndex,
      });
    }
  }

  const roundIdByNumber = new Map<number, number>();
  for (const round of seedData.rounds) {
    const [row] = await db
      .insert(rounds)
      .values({
        courseId: courseIdByName.get(round.courseName)!,
        roundNumber: round.roundNumber,
        date: round.date,
        teeTime: round.teeTime,
        formatType: round.formatType,
        description: round.description,
        awardsTeamPoints: round.awardsTeamPoints,
        // isCompleted is derived from score coverage at read time, never stored.
        isCompleted: false,
      })
      .returning();
    roundIdByNumber.set(round.roundNumber, row.id);
  }

  for (const handicap of seedData.roundHandicaps) {
    await db.insert(roundHandicaps).values({
      roundId: roundIdByNumber.get(handicap.roundNumber)!,
      playerId: playerIdByName.get(handicap.playerName)!,
      courseHandicap: handicap.courseHandicap,
    });
  }

  // Net and Stableford are recalculated below once handicaps and holes exist.
  for (const score of seedData.scores) {
    await db.insert(scores).values({
      roundId: roundIdByNumber.get(score.roundNumber)!,
      playerId: playerIdByName.get(score.playerName)!,
      holeNumber: score.holeNumber,
      grossScore: score.grossScore,
      isPick9: score.isPick9,
      gir: score.gir,
      fir: score.fir,
      putts: score.putts,
    });
  }

  for (const grouping of seedData.groupings) {
    const [row] = await db
      .insert(roundGroupings)
      .values({
        roundId: roundIdByNumber.get(grouping.roundNumber)!,
        groupNumber: grouping.groupNumber,
        groupName: grouping.groupName,
      })
      .returning();
    for (const playerName of grouping.playerNames) {
      await db.insert(roundGroupingPlayers).values({
        groupingId: row.id,
        playerId: playerIdByName.get(playerName)!,
      });
    }
  }

  for (const pairing of seedData.matchPairings) {
    await db.insert(matchPairings).values({
      roundId: roundIdByNumber.get(pairing.roundNumber)!,
      matchNumber: pairing.matchNumber,
      player1Id: playerIdByName.get(pairing.player1Name)!,
      player2Id: playerIdByName.get(pairing.player2Name)!,
      // Holes won and completion are derived from the scores at read time.
      // winnerId is only set manually, to settle a drawn match by playoff.
      winnerId: pairing.winnerName ? playerIdByName.get(pairing.winnerName)! : null,
    });
  }

  for (const assignment of seedData.pick9Assignments) {
    await db.insert(pick9Assignments).values({
      roundId: roundIdByNumber.get(assignment.roundNumber)!,
      playerId: playerIdByName.get(assignment.playerName)!,
      holeRange: assignment.holeRange,
    });
  }

  // Only gross scores are seeded; net and Stableford are derived from the
  // round handicaps and hole stroke indexes now that both exist.
  await storage.recalculateAllScores();

  console.log(
    `Seeded ${seedData.teams.length} teams, ${seedData.players.length} players, ` +
      `${seedData.courses.length} courses, ${seedData.rounds.length} rounds, ${seedData.scores.length} scores.`,
  );

  return { seeded: true };
}

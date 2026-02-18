
import { db } from "./db";
import {
  teams, players, rounds, courses, holes, scores, roundTeamPoints, roundHandicaps,
  roundGroupings, roundGroupingPlayers, matchPairings, pick9Assignments,
  type Team, type Player, type Round, type Course, type Hole, type Score, type SubmitScoreRequest,
  type PlayerBreakdown, type RoundLeaderboardEntry, type LeaderboardEntry, type RoundWithCourse,
  type RoundGrouping, type RoundGroupingPlayer, type RoundGroupingWithPlayers,
  type MatchPairing, type Pick9Assignment, type MatchPairingWithPlayers
} from "@shared/schema";
import { eq, and, asc, desc, sum, sql, inArray } from "drizzle-orm";

export type RoundHandicapDisplay = {
  playerId: number;
  playerName: string;
  courseHandicap: number | null;
  baseHandicap: string | number;
};

export type RoundHandicapInput = {
  playerId: number;
  courseHandicap: number;
};

export interface IStorage {
  // Read
  getTeams(): Promise<Team[]>;
  getPlayers(): Promise<(Player & { team: Team | null })[]>;
  getRounds(): Promise<RoundWithCourse[]>;
  getRound(id: number): Promise<RoundWithCourse & { holes: Hole[] } | undefined>;
  getRoundScores(roundId: number): Promise<Score[]>;

  // Write
  createTeam(team: any): Promise<Team>;
  createPlayer(player: any): Promise<Player>;
  createRound(round: any): Promise<Round>;
  createCourse(course: any): Promise<Course>;
  createHole(hole: any): Promise<Hole>;

  // Scoring
  submitScore(data: SubmitScoreRequest): Promise<Score>;
  calculateLeaderboards(): Promise<{ tournament: LeaderboardEntry[], rounds: Record<number, RoundLeaderboardEntry[]> }>;
  recalculateAllScores(): Promise<{ success: boolean; updated: number }>;

  // Round Handicaps
  getRoundHandicaps(roundId: number): Promise<RoundHandicapDisplay[]>;
  updateRoundHandicaps(roundId: number, handicaps: RoundHandicapInput[]): Promise<{ success: boolean; updated: number }>;

  // Player Handicap
  updatePlayerHandicap(playerId: number, handicap: number): Promise<Player>;

  // Groupings
  getGroupingsForRound(roundId: number): Promise<RoundGroupingWithPlayers[]>;
  upsertGroupings(roundId: number, groupings: Array<{ groupNumber: number; groupName?: string; playerIds: number[] }>): Promise<{ success: boolean }>;
  deleteGroupings(roundId: number): Promise<{ success: boolean }>;

  // Match Pairings
  getMatchPairingsForRound(roundId: number): Promise<MatchPairingWithPlayers[]>;
  upsertMatchPairings(roundId: number, pairings: Array<{ matchNumber: number; player1Id: number; player2Id: number }>): Promise<{ success: boolean }>;
  deleteMatchPairings(roundId: number): Promise<{ success: boolean }>;
  setMatchWinner(matchId: number, winnerId: number): Promise<MatchPairing>;

  // Pick 9 Assignments
  getPick9Assignments(roundId: number): Promise<Pick9Assignment[]>;
  upsertPick9Assignments(roundId: number, assignments: Array<{ playerId: number; holeRange: "1-9" | "10-18" }>): Promise<{ success: boolean }>;
}

export class DatabaseStorage implements IStorage {
  async getTeams(): Promise<Team[]> {
    return await db.select().from(teams).orderBy(asc(teams.id));
  }

  async getPlayers(): Promise<(Player & { team: Team | null })[]> {
    const result = await db.query.players.findMany({
      with: { team: true },
      orderBy: asc(players.id)
    });
    return result;
  }

  async getRounds(): Promise<(RoundWithCourse & { holes: Hole[] })[]> {
    const allRounds = await db.query.rounds.findMany({
      with: { course: true },
      orderBy: asc(rounds.roundNumber)
    });

    // Fetch holes for each round
    const roundsWithHoles = await Promise.all(
      allRounds.map(async (round) => {
        const courseHoles = await db.select().from(holes).where(eq(holes.courseId, round.course.id));
        return {
          ...round,
          holes: courseHoles
        };
      })
    );

    return roundsWithHoles as any;
  }

  async getRound(id: number): Promise<RoundWithCourse & { holes: Hole[] } | undefined> {
    const round = await db.query.rounds.findFirst({
      where: eq(rounds.id, id),
      with: { course: true }
    });

    if (!round || !round.course) {
      return undefined;
    }

    // Fetch holes separately to avoid nested relation issues with SQLite
    const courseHoles = await db.select().from(holes).where(eq(holes.courseId, round.course.id));

    return {
      ...round,
      holes: courseHoles
    } as any;
  }

  async getRoundScores(roundId: number): Promise<Score[]> {
    return await db.select().from(scores).where(eq(scores.roundId, roundId));
  }

  async createTeam(data: any): Promise<Team> {
    const [team] = await db.insert(teams).values(data).returning();
    return team;
  }

  async createPlayer(data: any): Promise<Player> {
    const [player] = await db.insert(players).values(data).returning();
    return player;
  }

  async createRound(data: any): Promise<Round> {
    const [round] = await db.insert(rounds).values(data).returning();
    return round;
  }

  async createCourse(data: any): Promise<Course> {
    const [course] = await db.insert(courses).values(data).returning();
    return course;
  }

  async createHole(data: any): Promise<Hole> {
    const [hole] = await db.insert(holes).values(data).returning();
    return hole;
  }

  async getRoundHandicaps(roundId: number): Promise<RoundHandicapDisplay[]> {
    const playersList = await this.getPlayers();

    // Get existing round handicaps
    const existingHandicaps = await db
      .select()
      .from(roundHandicaps)
      .where(eq(roundHandicaps.roundId, roundId));

    // Map to display format - NO fallback to base handicap
    // Course handicap must be explicitly set for each round
    return playersList.map(player => {
      const roundHandicap = existingHandicaps.find(h => h.playerId === player.id);
      return {
        playerId: player.id,
        playerName: player.name,
        courseHandicap: roundHandicap?.courseHandicap ?? null,
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

    // Recalculate all scores for affected players in this round
    await this.recalculateRoundScores(roundId, handicaps.map(h => h.playerId));

    return { success: true, updated };
  }

  async updatePlayerHandicap(playerId: number, handicap: number): Promise<Player> {
    const [updatedPlayer] = await db
      .update(players)
      .set({ handicap })
      .where(eq(players.id, playerId))
      .returning();
    return updatedPlayer;
  }

  private async recalculateRoundScores(roundId: number, playerIds: number[]): Promise<void> {
    // Get the round with holes
    const round = await this.getRound(roundId);
    if (!round) return;

    // Get all scores for these players in this round
    const roundScores = await db
      .select()
      .from(scores)
      .where(
        and(
          eq(scores.roundId, roundId),
          inArray(scores.playerId, playerIds)
        )
      );

    // Get round handicaps for these players
    const roundHandicapRecords = await db
      .select()
      .from(roundHandicaps)
      .where(
        and(
          eq(roundHandicaps.roundId, roundId),
          inArray(roundHandicaps.playerId, playerIds)
        )
      );

    const handicapMap = new Map(
      roundHandicapRecords.map(rh => [rh.playerId, rh.courseHandicap])
    );

    // Recalculate and update each score
    for (const score of roundScores) {
      const hole = (round as any).holes?.find((h: any) => h.number === score.holeNumber);
      if (!hole) continue;

      // Use course handicap if set, otherwise use 0 (course handicap should be set before scoring)
      const handicapToUse: number = handicapMap.get(score.playerId) ?? 0;

      const { netScore, stablefordPoints } = this.calculatePoints(
        (score.grossScore as number) || 0,
        (hole.par as number) ?? 4,
        (hole.strokeIndex as number) ?? 1,
        handicapToUse
      );

      // Update the score with recalculated values
      await db
        .update(scores)
        .set({ netScore, stablefordPoints, handicapUsed: handicapToUse })
        .where(eq(scores.id, score.id));
    }
  }

  async recalculateAllScores(): Promise<{ success: boolean; updated: number }> {
    // Get all rounds and their holes
    const allRounds = await this.getRounds();
    let totalUpdated = 0;

    // Process each round
    for (const round of allRounds) {
      const roundWithHoles = await this.getRound(round.id);
      if (!roundWithHoles) continue;

      // Get all scores for this round
      const roundScores = await db.select().from(scores).where(eq(scores.roundId, round.id));

      // Get round handicaps for this round
      const roundHandicapRecords = await db
        .select()
        .from(roundHandicaps)
        .where(eq(roundHandicaps.roundId, round.id));

      const handicapMap = new Map(
        roundHandicapRecords
          .filter(rh => rh.courseHandicap !== null)
          .map(rh => [rh.playerId, rh.courseHandicap as number])
      );

      // Recalculate and update each score
      for (const score of roundScores) {
        const hole = (roundWithHoles as any).holes?.find((h: any) => h.number === score.holeNumber);
        if (!hole) continue;

        // Use course handicap if set, otherwise use 0 (course handicap should be set before scoring)
        const handicapToUse: number = handicapMap.get(score.playerId) ?? 0;

        const { netScore, stablefordPoints } = this.calculatePoints(
          (score.grossScore as number) || 0,
          (hole.par as number) ?? 4,
          (hole.strokeIndex as number) ?? 1,
          handicapToUse
        );

        // Update the score with recalculated values
        await db
          .update(scores)
          .set({ netScore, stablefordPoints, handicapUsed: handicapToUse })
          .where(eq(scores.id, score.id));

        totalUpdated++;
      }
    }

    return { success: true, updated: totalUpdated };
  }

  async submitScore(data: SubmitScoreRequest): Promise<Score> {
    // Check if score exists, update if so
    const existing = await db.select().from(scores).where(
      and(
        eq(scores.roundId, data.roundId),
        eq(scores.playerId, data.playerId),
        eq(scores.holeNumber, data.holeNumber)
      )
    );

    // Calculate Net and Stableford points immediately
    const round = await this.getRound(data.roundId);
    if (!round) throw new Error("Round not found");

    const player = await db.query.players.findFirst({ where: eq(players.id, data.playerId) });
    if (!player) throw new Error("Player not found");

    // Get round-specific handicap
    const roundHandicapRecord = await db
      .select()
      .from(roundHandicaps)
      .where(
        and(
          eq(roundHandicaps.roundId, data.roundId),
          eq(roundHandicaps.playerId, data.playerId)
        )
      );

    // Use round-specific course handicap (should always be set before scoring)
    // If not set, use 0 as fallback (frontend blocks scoring if not set)
    const handicapToUse = roundHandicapRecord.length > 0 && roundHandicapRecord[0].courseHandicap !== null
      ? roundHandicapRecord[0].courseHandicap
      : 0;

    const hole = (round as any).holes?.find((h: any) => h.number === data.holeNumber);
    if (!hole) throw new Error("Hole not found");

    const { netScore, stablefordPoints } = this.calculatePoints(
      data.grossScore,
      hole.par,
      hole.strokeIndex,
      handicapToUse
    );

    const values: any = {
      roundId: data.roundId,
      playerId: data.playerId,
      holeNumber: data.holeNumber,
      grossScore: data.grossScore,
      isPick9: data.isPick9,
      netScore,
      stablefordPoints,
      handicapUsed: handicapToUse,
    };
    if (data.gir !== undefined) values.gir = data.gir;
    if (data.fir !== undefined) values.fir = data.fir;
    if (data.putts !== undefined) values.putts = data.putts;

    if (existing.length > 0) {
      const [updated] = await db.update(scores)
        .set(values)
        .where(eq(scores.id, existing[0].id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(scores).values(values).returning();
      return created;
    }
  }

  // === SCORING LOGIC ===

  private calculatePoints(gross: number, par: number, strokeIndex: number, handicap: number) {
    // Calculate strokes received
    // Basic logic: 1 stroke if handicap >= strokeIndex. 
    // If handicap > 18, they get extra strokes. 
    // Assuming max handicap < 36 for simplicity, but formula handles it.
    let strokesReceived = Math.floor(handicap / 18);
    const remainder = handicap % 18;
    if (remainder >= strokeIndex) {
      strokesReceived += 1;
    }

    const netScore = gross - strokesReceived;
    
    // Stableford:
    // Net Par = 2 pts
    // Net Birdie (Par - 1) = 3 pts
    // Net Bogey (Par + 1) = 1 pt
    // Double Bogey or worse = 0 pts
    // Formula: Par - NetScore + 2
    let stablefordPoints = par - netScore + 2;
    if (stablefordPoints < 0) stablefordPoints = 0;

    return { netScore, stablefordPoints };
  }

  async calculateLeaderboards(): Promise<{ tournament: LeaderboardEntry[], rounds: Record<number, RoundLeaderboardEntry[]> }> {
    const allTeams = await this.getTeams();
    const allRounds = await this.getRounds();
    const tournamentLeaderboard: Map<number, LeaderboardEntry> = new Map();

    // Initialize tournament leaderboard
    allTeams.forEach(t => {
      tournamentLeaderboard.set(t.id, {
        teamId: t.id,
        teamName: t.name,
        teamColor: t.color,
        totalPoints: 0,
        rank: 0
      });
    });

    const roundLeaderboards: Record<number, RoundLeaderboardEntry[]> = {};

    for (const round of allRounds) {
      const roundScores = await this.getRoundScores(round.id);
      if (roundScores.length === 0) continue;

      const playersWithTeams = await this.getPlayers();
      const scoresWithData = roundScores.map(s => ({
        ...s,
        player: playersWithTeams.find(p => p.id === s.playerId)
      }));

      let results: RoundLeaderboardEntry[] = [];

      // Logic per format
      switch (round.formatType) {
        case 'individual_net':
          results = this.calculateIndividualNet(scoresWithData, allTeams, round.id);
          break;
        case 'individual_match_play':
          results = await this.calculateIndividualMatchPlay(scoresWithData, allTeams, round.id);
          break;
        case 'combined_stableford':
          results = this.calculateCombinedStableford(scoresWithData, allTeams);
          break;
        case 'best_worst':
          results = this.calculateBestWorst(scoresWithData, allTeams);
          break;
        case 'pick_9':
          // Round 6 is Pick 9 Better Ball Stableford
          results = await this.calculatePick9Stableford(scoresWithData, allTeams, round.id);
          break;
        case 'better_ball_stableford':
          results = this.calculateBetterBallStableford(scoresWithData, allTeams);
          break;
        case 'individual_stableford':
          results = this.calculateIndividualStableford(scoresWithData, allTeams);
          break;
      }

      roundLeaderboards[round.id] = results;

      // Update tournament totals
      results.forEach(res => {
        const team = tournamentLeaderboard.get(res.teamId);
        if (team) {
          team.totalPoints += res.points;
        }
      });
    }

    // Sort Tournament Leaderboard
    const sortedTournament = Array.from(tournamentLeaderboard.values()).sort((a, b) => b.totalPoints - a.totalPoints);
    sortedTournament.forEach((t, i) => t.rank = i + 1);

    return {
      tournament: sortedTournament,
      rounds: roundLeaderboards
    };
  }

  // --- Helper Calculations ---

  private calculateIndividualNet(scores: any[], teams: Team[], roundId: number): RoundLeaderboardEntry[] {
    // 1. Calculate total net score per player
    const playerTotals = new Map<number, number>();
    scores.forEach(s => {
      const current = playerTotals.get(s.playerId) || 0;
      playerTotals.set(s.playerId, current + (s.netScore || 0));
    });

    // 2. Rank players 1-6
    const rankedPlayers = Array.from(playerTotals.entries())
      .sort(([, scoreA], [, scoreB]) => scoreA - scoreB) // Low is good for Net Stroke
      .map(([playerId], index) => ({ playerId, rank: index + 1 }));

    // 3. Allocate points to TEAMS based on player ranks
    // 1st: 10pts, 2nd: 8, 3rd: 6, 4th: 4, 5th: 2, 6th: 1
    const pointsMap = [10, 8, 6, 4, 2, 1];

    const teamPoints = new Map<number, number>();
    const teamBreakdowns = new Map<number, PlayerBreakdown[]>();
    teams.forEach(t => {
      teamPoints.set(t.id, 0);
      teamBreakdowns.set(t.id, []);
    });

    const ordinalSuffix = (n: number) => {
      if (n === 1) return "1st";
      if (n === 2) return "2nd";
      if (n === 3) return "3rd";
      return `${n}th`;
    };

    rankedPlayers.forEach((rp, idx) => {
      const player = scores.find(s => s.playerId === rp.playerId)?.player;
      if (player && player.teamId) {
        const points = pointsMap[idx] || 0;
        const current = teamPoints.get(player.teamId) || 0;
        teamPoints.set(player.teamId, current + points);

        const breakdowns = teamBreakdowns.get(player.teamId) || [];
        breakdowns.push({
          playerId: player.id,
          playerName: player.name,
          teamId: player.teamId,
          pointsEarned: points,
          metric: playerTotals.get(rp.playerId) || 0,
          metricLabel: "Net",
          description: `${ordinalSuffix(idx + 1)} place`,
        });
        teamBreakdowns.set(player.teamId, breakdowns);
      }
    });

    // Return team results
    return teams.map(t => ({
      teamId: t.id,
      teamName: t.name,
      points: teamPoints.get(t.id) || 0,
      scoreMetric: teamPoints.get(t.id) || 0,
      rank: 0,
      playerBreakdown: teamBreakdowns.get(t.id) || [],
    })).sort((a, b) => b.points - a.points).map((r, i) => ({ ...r, rank: i + 1 }));
  }

  private async calculateIndividualMatchPlay(scores: any[], teams: Team[], roundId: number): Promise<RoundLeaderboardEntry[]> {
    // Get match pairings for this round
    const pairings = await this.getMatchPairingsForRound(roundId);

    if (pairings.length === 0) {
      // No pairings set up yet, return empty leaderboard
      return teams.map(t => ({
        teamId: t.id,
        teamName: t.name,
        points: 0,
        scoreMetric: 0,
        rank: 0,
        playerBreakdown: [],
      }));
    }

    const teamPoints = new Map<number, number>();
    const teamBreakdowns = new Map<number, PlayerBreakdown[]>();
    teams.forEach(t => {
      teamPoints.set(t.id, 0);
      teamBreakdowns.set(t.id, []);
    });

    // Process each match
    for (const pairing of pairings) {
      // Get player info
      const player1Data = scores.find(s => s.playerId === pairing.player1Id)?.player;
      const player2Data = scores.find(s => s.playerId === pairing.player2Id)?.player;
      const player1Team = player1Data?.teamId;
      const player2Team = player2Data?.teamId;

      if (!player1Team || !player2Team) continue;

      const player1Name = player1Data?.name || `Player ${pairing.player1Id}`;
      const player2Name = player2Data?.name || `Player ${pairing.player2Id}`;

      // Compare Stableford points hole-by-hole
      let player1HolesWon = 0;
      let player2HolesWon = 0;
      let holesHalved = 0;

      for (let hole = 1; hole <= 18; hole++) {
        const player1Score = scores.find(s => s.playerId === pairing.player1Id && s.holeNumber === hole);
        const player2Score = scores.find(s => s.playerId === pairing.player2Id && s.holeNumber === hole);

        if (!player1Score || !player2Score) continue;

        const p1Points = player1Score.stablefordPoints || 0;
        const p2Points = player2Score.stablefordPoints || 0;

        if (p1Points > p2Points) {
          player1HolesWon++;
        } else if (p2Points > p1Points) {
          player2HolesWon++;
        } else {
          holesHalved++;
        }
      }

      // Determine match winner and award team points
      let p1Earned = 0;
      let p2Earned = 0;
      let p1Desc = "";
      let p2Desc = "";

      if (player1HolesWon > player2HolesWon) {
        p1Earned = 8; p2Earned = 3;
        p1Desc = `Won vs ${player2Name}`;
        p2Desc = `Lost vs ${player1Name}`;
        teamPoints.set(player1Team, (teamPoints.get(player1Team) || 0) + 8);
        teamPoints.set(player2Team, (teamPoints.get(player2Team) || 0) + 3);
      } else if (player2HolesWon > player1HolesWon) {
        p1Earned = 3; p2Earned = 8;
        p1Desc = `Lost vs ${player2Name}`;
        p2Desc = `Won vs ${player1Name}`;
        teamPoints.set(player1Team, (teamPoints.get(player1Team) || 0) + 3);
        teamPoints.set(player2Team, (teamPoints.get(player2Team) || 0) + 8);
      } else {
        // Match is drawn
        if (pairing.winnerId) {
          const winnerTeam = pairing.winnerId === pairing.player1Id ? player1Team : player2Team;
          const loserTeam = pairing.winnerId === pairing.player1Id ? player2Team : player1Team;
          teamPoints.set(winnerTeam, (teamPoints.get(winnerTeam) || 0) + 8);
          teamPoints.set(loserTeam, (teamPoints.get(loserTeam) || 0) + 3);
          if (pairing.winnerId === pairing.player1Id) {
            p1Earned = 8; p2Earned = 3;
            p1Desc = `Playoff win vs ${player2Name}`;
            p2Desc = `Playoff loss vs ${player1Name}`;
          } else {
            p1Earned = 3; p2Earned = 8;
            p1Desc = `Playoff loss vs ${player2Name}`;
            p2Desc = `Playoff win vs ${player1Name}`;
          }
        } else {
          p1Desc = `Pending playoff vs ${player2Name}`;
          p2Desc = `Pending playoff vs ${player1Name}`;
        }
      }

      const b1 = teamBreakdowns.get(player1Team) || [];
      b1.push({
        playerId: pairing.player1Id,
        playerName: player1Name,
        teamId: player1Team,
        pointsEarned: p1Earned,
        metric: player1HolesWon,
        metricLabel: "holes won",
        description: p1Desc,
      });
      teamBreakdowns.set(player1Team, b1);

      const b2 = teamBreakdowns.get(player2Team) || [];
      b2.push({
        playerId: pairing.player2Id,
        playerName: player2Name,
        teamId: player2Team,
        pointsEarned: p2Earned,
        metric: player2HolesWon,
        metricLabel: "holes won",
        description: p2Desc,
      });
      teamBreakdowns.set(player2Team, b2);
    }

    // Return team results
    return teams.map(t => ({
      teamId: t.id,
      teamName: t.name,
      points: teamPoints.get(t.id) || 0,
      scoreMetric: teamPoints.get(t.id) || 0,
      rank: 0,
      playerBreakdown: teamBreakdowns.get(t.id) || [],
    })).sort((a, b) => b.points - a.points).map((r, i) => ({ ...r, rank: i + 1 }));
  }

  private calculateBetterBallStroke(scores: any[], teams: Team[]): RoundLeaderboardEntry[] {
    // Round 2: Better Ball Medal Format
    // Each player has netScore (gross - handicap strokes)
    // Team score per hole = min(player1.netScore, player2.netScore) - BETTER (lower) net score
    // Lowest total wins
    const teamResults = teams.map(team => {
      let totalScore = 0;
      const teamPlayers = scores.filter(s => s.player?.teamId === team.id);

      // Group by hole
      for (let hole = 1; hole <= 18; hole++) {
        const holeScores = teamPlayers.filter(s => s.holeNumber === hole);
        if (holeScores.length === 0) continue;

        // Take the BETTER (lower) net score per hole
        const minNetScore = Math.min(...holeScores.map(s => s.netScore || 999));
        totalScore += minNetScore;
      }

      return { team, totalScore };
    });

    // Rank teams - LOWER score is better
    const sorted = teamResults.sort((a, b) => a.totalScore - b.totalScore);
    const pointsDist = [12, 6, 3]; // Round 2 points

    return sorted.map((res, idx) => ({
      teamId: res.team.id,
      teamName: res.team.name,
      points: pointsDist[idx] || 0,
      scoreMetric: res.totalScore,
      rank: idx + 1
    }));
  }

  private calculateBetterBallStableford(scores: any[], teams: Team[]): RoundLeaderboardEntry[] {
    // Better Ball Stableford (max stableford per hole per team)
    const teamResults = teams.map(team => {
      let totalPoints = 0;
      const teamPlayers = scores.filter(s => s.player?.teamId === team.id);

      // Calculate individual player stableford totals
      const playerTotals = new Map<number, number>();
      teamPlayers.forEach(s => {
        const current = playerTotals.get(s.playerId) || 0;
        playerTotals.set(s.playerId, current + (s.stablefordPoints || 0));
      });

      // Group by hole
      for (let hole = 1; hole <= 18; hole++) {
        const holeScores = teamPlayers.filter(s => s.holeNumber === hole);
        if (holeScores.length === 0) continue;

        const maxPoints = Math.max(...holeScores.map(s => s.stablefordPoints || 0));
        totalPoints += maxPoints;
      }

      // Build player breakdowns
      const uniquePlayers = new Map<number, any>();
      teamPlayers.forEach(s => {
        if (s.player && !uniquePlayers.has(s.playerId)) {
          uniquePlayers.set(s.playerId, s.player);
        }
      });

      const breakdowns: PlayerBreakdown[] = Array.from(uniquePlayers.entries()).map(([playerId, player]) => ({
        playerId,
        playerName: player.name,
        teamId: team.id,
        pointsEarned: 0,
        metric: playerTotals.get(playerId) || 0,
        metricLabel: "Stableford",
        description: "",
      }));

      return { team, totalPoints, breakdowns };
    });

    // Rank teams - HIGHER stableford is better
    const sorted = teamResults.sort((a, b) => b.totalPoints - a.totalPoints);
    const pointsDist = [12, 9, 6];

    return sorted.map((res, idx) => ({
      teamId: res.team.id,
      teamName: res.team.name,
      points: pointsDist[idx] || 0,
      scoreMetric: res.totalPoints,
      rank: idx + 1,
      playerBreakdown: res.breakdowns,
    }));
  }

  private async calculatePick9Stableford(scores: any[], teams: Team[], roundId: number): Promise<RoundLeaderboardEntry[]> {
    // Round 6: Pick 9 Consecutive Holes Stableford
    // Get pick 9 assignments to determine which holes count for each player
    const assignments = await this.getPick9Assignments(roundId);

    // Create a map of player ID to hole range
    const playerHoleRangeMap = new Map<number, "1-9" | "10-18">();
    assignments.forEach(a => {
      playerHoleRangeMap.set(a.playerId, a.holeRange);
    });

    // Helper function to determine if a hole counts for a player
    const holeCountsForPlayer = (playerId: number, holeNumber: number): boolean => {
      const range = playerHoleRangeMap.get(playerId);
      if (!range) return false; // Player doesn't have an assignment
      if (range === "1-9") return holeNumber >= 1 && holeNumber <= 9;
      if (range === "10-18") return holeNumber >= 10 && holeNumber <= 18;
      return false;
    };

    const teamResults = teams.map(team => {
      let totalPoints = 0;
      const teamPlayers = scores.filter(s => s.player?.teamId === team.id);

      // Calculate individual player stableford totals for their assigned 9 holes
      const playerTotals = new Map<number, number>();
      teamPlayers.forEach(s => {
        if (holeCountsForPlayer(s.playerId, s.holeNumber)) {
          const current = playerTotals.get(s.playerId) || 0;
          playerTotals.set(s.playerId, current + (s.stablefordPoints || 0));
        }
      });

      // Group by hole
      for (let hole = 1; hole <= 18; hole++) {
        const holeScores = teamPlayers.filter(s => s.holeNumber === hole);
        if (holeScores.length === 0) continue;

        // Filter scores to only those whose designated 9 includes this hole
        const countingScores = holeScores.filter(s => holeCountsForPlayer(s.playerId, hole));
        if (countingScores.length === 0) continue;

        // Take the max stableford points among players for whom this hole counts
        const maxPoints = Math.max(...countingScores.map(s => s.stablefordPoints || 0));
        totalPoints += maxPoints;
      }

      // Build player breakdowns
      const uniquePlayers = new Map<number, any>();
      teamPlayers.forEach(s => {
        if (s.player && !uniquePlayers.has(s.playerId)) {
          uniquePlayers.set(s.playerId, s.player);
        }
      });

      const breakdowns: PlayerBreakdown[] = Array.from(uniquePlayers.entries()).map(([playerId, player]) => {
        const range = playerHoleRangeMap.get(playerId);
        return {
          playerId,
          playerName: player.name,
          teamId: team.id,
          pointsEarned: 0,
          metric: playerTotals.get(playerId) || 0,
          metricLabel: "Stableford",
          description: range === "1-9" ? "Holes 1-9" : range === "10-18" ? "Holes 10-18" : "",
        };
      });

      return { team, totalPoints, breakdowns };
    });

    // Rank teams - HIGHER stableford is better
    const sorted = teamResults.sort((a, b) => b.totalPoints - a.totalPoints);
    const pointsDist = [14, 10, 7]; // Pick 9 points

    return sorted.map((res, idx) => ({
      teamId: res.team.id,
      teamName: res.team.name,
      points: pointsDist[idx] || 0,
      scoreMetric: res.totalPoints,
      rank: idx + 1,
      playerBreakdown: res.breakdowns,
    }));
  }

  private calculateCombinedStableford(scores: any[], teams: Team[]): RoundLeaderboardEntry[] {
    // Sum of both teammates points per hole
    const teamResults = teams.map(team => {
      let totalPoints = 0;
      const teamPlayers = scores.filter(s => s.player?.teamId === team.id);

      // Calculate individual player stableford totals
      const playerTotals = new Map<number, number>();
      teamPlayers.forEach(s => {
        const current = playerTotals.get(s.playerId) || 0;
        playerTotals.set(s.playerId, current + (s.stablefordPoints || 0));
      });

      for (let hole = 1; hole <= 18; hole++) {
        const holeScores = teamPlayers.filter(s => s.holeNumber === hole);
        const sumPoints = holeScores.reduce((sum, s) => sum + (s.stablefordPoints || 0), 0);
        totalPoints += sumPoints;
      }

      // Build player breakdowns
      const uniquePlayers = new Map<number, any>();
      teamPlayers.forEach(s => {
        if (s.player && !uniquePlayers.has(s.playerId)) {
          uniquePlayers.set(s.playerId, s.player);
        }
      });

      const breakdowns: PlayerBreakdown[] = Array.from(uniquePlayers.entries()).map(([playerId, player]) => ({
        playerId,
        playerName: player.name,
        teamId: team.id,
        pointsEarned: 0,
        metric: playerTotals.get(playerId) || 0,
        metricLabel: "Stableford",
        description: "",
      }));

      return { team, totalPoints, breakdowns };
    });

    const sorted = teamResults.sort((a, b) => b.totalPoints - a.totalPoints);
    const pointsDist = [18, 12, 9];

    return sorted.map((res, idx) => ({
      teamId: res.team.id,
      teamName: res.team.name,
      points: pointsDist[idx] || 0,
      scoreMetric: res.totalPoints,
      rank: idx + 1,
      playerBreakdown: res.breakdowns,
    }));
  }

  private calculateBestWorst(scores: any[], teams: Team[]): RoundLeaderboardEntry[] {
    // Even: Best Score. Odd: Worst Score.
    const teamResults = teams.map(team => {
      let totalPoints = 0;
      const teamPlayers = scores.filter(s => s.player?.teamId === team.id);

      // Calculate individual player stableford totals
      const playerTotals = new Map<number, number>();
      teamPlayers.forEach(s => {
        const current = playerTotals.get(s.playerId) || 0;
        playerTotals.set(s.playerId, current + (s.stablefordPoints || 0));
      });

      for (let hole = 1; hole <= 18; hole++) {
        const holeScores = teamPlayers.filter(s => s.holeNumber === hole);
        if (holeScores.length < 2) continue;

        const p1 = holeScores[0]?.stablefordPoints || 0;
        const p2 = holeScores[1]?.stablefordPoints || 0;

        if (hole % 2 === 0) {
          totalPoints += Math.max(p1, p2);
        } else {
          totalPoints += Math.min(p1, p2);
        }
      }

      // Build player breakdowns
      const uniquePlayers = new Map<number, any>();
      teamPlayers.forEach(s => {
        if (s.player && !uniquePlayers.has(s.playerId)) {
          uniquePlayers.set(s.playerId, s.player);
        }
      });

      const breakdowns: PlayerBreakdown[] = Array.from(uniquePlayers.entries()).map(([playerId, player]) => ({
        playerId,
        playerName: player.name,
        teamId: team.id,
        pointsEarned: 0,
        metric: playerTotals.get(playerId) || 0,
        metricLabel: "Stableford",
        description: "",
      }));

      return { team, totalPoints, breakdowns };
    });

    const sorted = teamResults.sort((a, b) => b.totalPoints - a.totalPoints);
    const pointsDist = [15, 8, 4];

    return sorted.map((res, idx) => ({
      teamId: res.team.id,
      teamName: res.team.name,
      points: pointsDist[idx] || 0,
      scoreMetric: res.totalPoints,
      rank: idx + 1,
      playerBreakdown: res.breakdowns,
    }));
  }

  private calculateIndividualStableford(scores: any[], teams: Team[]): RoundLeaderboardEntry[] {
    // Individual Stableford: Rank all 6 players by total Stableford points (higher is better)
    // Award individual placement points: [10, 8, 6, 5, 3, 2]
    // Sum each player's earned points into their team's total
    const playerTotals = new Map<number, number>();
    scores.forEach(s => {
      const current = playerTotals.get(s.playerId) || 0;
      playerTotals.set(s.playerId, current + (s.stablefordPoints || 0));
    });

    // Rank players by total stableford (higher is better)
    const rankedPlayers = Array.from(playerTotals.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([playerId], index) => ({ playerId, rank: index + 1 }));

    const placementPoints = [10, 8, 6, 5, 3, 2];

    const teamPoints = new Map<number, number>();
    const teamBreakdowns = new Map<number, PlayerBreakdown[]>();
    teams.forEach(t => {
      teamPoints.set(t.id, 0);
      teamBreakdowns.set(t.id, []);
    });

    const ordinalSuffix = (n: number) => {
      if (n === 1) return "1st";
      if (n === 2) return "2nd";
      if (n === 3) return "3rd";
      return `${n}th`;
    };

    rankedPlayers.forEach((rp, idx) => {
      const player = scores.find(s => s.playerId === rp.playerId)?.player;
      if (player && player.teamId) {
        const points = placementPoints[idx] || 0;
        const current = teamPoints.get(player.teamId) || 0;
        teamPoints.set(player.teamId, current + points);

        const breakdowns = teamBreakdowns.get(player.teamId) || [];
        breakdowns.push({
          playerId: player.id,
          playerName: player.name,
          teamId: player.teamId,
          pointsEarned: points,
          metric: playerTotals.get(rp.playerId) || 0,
          metricLabel: "Stableford",
          description: `${ordinalSuffix(idx + 1)} place`,
        });
        teamBreakdowns.set(player.teamId, breakdowns);
      }
    });

    return teams.map(t => ({
      teamId: t.id,
      teamName: t.name,
      points: teamPoints.get(t.id) || 0,
      scoreMetric: teamPoints.get(t.id) || 0,
      rank: 0,
      playerBreakdown: teamBreakdowns.get(t.id) || [],
    })).sort((a, b) => b.points - a.points).map((r, i) => ({ ...r, rank: i + 1 }));
  }

  // === GROUPINGS ===

  async getGroupingsForRound(roundId: number): Promise<RoundGroupingWithPlayers[]> {
    const groupings = await db.query.roundGroupings.findMany({
      where: eq(roundGroupings.roundId, roundId),
      with: {
        players: {
          with: { player: true }
        }
      },
      orderBy: asc(roundGroupings.groupNumber)
    });
    return groupings as RoundGroupingWithPlayers[];
  }

  async upsertGroupings(
    roundId: number,
    groupings: Array<{ groupNumber: number; groupName?: string; playerIds: number[] }>
  ): Promise<{ success: boolean }> {
    // Validate all playerIds are valid
    const allPlayerIds = groupings.flatMap(g => g.playerIds);
    const uniquePlayerIds = [...new Set(allPlayerIds)];

    // Check for duplicate players in different groups
    if (uniquePlayerIds.length !== allPlayerIds.length) {
      throw new Error("Player cannot be in multiple groupings for the same round");
    }

    // Verify all players exist
    const validPlayers = await db.select({ id: players.id }).from(players).where(
      inArray(players.id, uniquePlayerIds)
    );

    if (validPlayers.length !== uniquePlayerIds.length) {
      throw new Error("One or more players do not exist");
    }

    // Verify groupNumbers are sequential starting from 1
    const groupNumbers = groupings.map(g => g.groupNumber).sort((a, b) => a - b);
    for (let i = 0; i < groupNumbers.length; i++) {
      if (groupNumbers[i] !== i + 1) {
        throw new Error("Group numbers must be sequential starting from 1");
      }
    }

    // Delete existing groupings for this round
    const existingGroupings = await db.select({ id: roundGroupings.id })
      .from(roundGroupings)
      .where(eq(roundGroupings.roundId, roundId));

    if (existingGroupings.length > 0) {
      await db.delete(roundGroupingPlayers)
        .where(
          inArray(
            roundGroupingPlayers.groupingId,
            existingGroupings.map(g => g.id)
          )
        );

      await db.delete(roundGroupings)
        .where(eq(roundGroupings.roundId, roundId));
    }

    // Insert new groupings
    for (const grouping of groupings) {
      const [newGrouping] = await db.insert(roundGroupings).values({
        roundId,
        groupNumber: grouping.groupNumber,
        groupName: grouping.groupName || null,
      }).returning();

      // Insert players for this grouping
      if (grouping.playerIds.length > 0) {
        await db.insert(roundGroupingPlayers).values(
          grouping.playerIds.map(playerId => ({
            groupingId: newGrouping.id,
            playerId,
          }))
        );
      }
    }

    return { success: true };
  }

  async deleteGroupings(roundId: number): Promise<{ success: boolean }> {
    // Get all groupings for this round
    const groupingsToDelete = await db.select({ id: roundGroupings.id })
      .from(roundGroupings)
      .where(eq(roundGroupings.roundId, roundId));

    if (groupingsToDelete.length > 0) {
      // Delete all players in these groupings
      await db.delete(roundGroupingPlayers)
        .where(
          inArray(
            roundGroupingPlayers.groupingId,
            groupingsToDelete.map(g => g.id)
          )
        );

      // Delete the groupings
      await db.delete(roundGroupings)
        .where(eq(roundGroupings.roundId, roundId));
    }

    return { success: true };
  }

  // === MATCH PAIRINGS ===

  async getMatchPairingsForRound(roundId: number): Promise<MatchPairingWithPlayers[]> {
    const pairings = await db.query.matchPairings.findMany({
      where: eq(matchPairings.roundId, roundId),
      with: {
        player1: true,
        player2: true,
        winner: true
      },
      orderBy: asc(matchPairings.matchNumber)
    });
    return pairings as MatchPairingWithPlayers[];
  }

  async upsertMatchPairings(
    roundId: number,
    pairings: Array<{ matchNumber: number; player1Id: number; player2Id: number }>
  ): Promise<{ success: boolean }> {
    // Validate all playerIds exist
    const allPlayerIds = pairings.flatMap(p => [p.player1Id, p.player2Id]);
    const uniquePlayerIds = [...new Set(allPlayerIds)];

    // Check for duplicate players
    if (uniquePlayerIds.length !== allPlayerIds.length) {
      throw new Error("Player cannot be in multiple matches for the same round");
    }

    // Verify all players exist
    const validPlayers = await db.select({ id: players.id }).from(players).where(
      inArray(players.id, uniquePlayerIds)
    );

    if (validPlayers.length !== uniquePlayerIds.length) {
      throw new Error("One or more players do not exist");
    }

    // Verify matchNumbers are sequential starting from 1
    const matchNumbers = pairings.map(p => p.matchNumber).sort((a, b) => a - b);
    for (let i = 0; i < matchNumbers.length; i++) {
      if (matchNumbers[i] !== i + 1) {
        throw new Error("Match numbers must be sequential starting from 1");
      }
    }

    // Delete existing pairings for this round
    await db.delete(matchPairings)
      .where(eq(matchPairings.roundId, roundId));

    // Insert new pairings
    for (const pairing of pairings) {
      await db.insert(matchPairings).values({
        roundId,
        matchNumber: pairing.matchNumber,
        player1Id: pairing.player1Id,
        player2Id: pairing.player2Id,
        player1HolesWon: 0,
        player2HolesWon: 0,
        holesHalved: 0,
        winnerId: null,
        isCompleted: false,
      });
    }

    return { success: true };
  }

  async deleteMatchPairings(roundId: number): Promise<{ success: boolean }> {
    await db.delete(matchPairings)
      .where(eq(matchPairings.roundId, roundId));

    return { success: true };
  }

  async setMatchWinner(matchId: number, winnerId: number): Promise<MatchPairing> {
    const pairing = await db.query.matchPairings.findFirst({
      where: eq(matchPairings.id, matchId),
    });
    if (!pairing) throw new Error("Match pairing not found");
    if (winnerId !== pairing.player1Id && winnerId !== pairing.player2Id) {
      throw new Error("Winner must be one of the players in this match");
    }
    const [updated] = await db
      .update(matchPairings)
      .set({ winnerId, isCompleted: true })
      .where(eq(matchPairings.id, matchId))
      .returning();
    return updated;
  }

  // === PICK 9 ASSIGNMENTS ===

  async getPick9Assignments(roundId: number): Promise<Pick9Assignment[]> {
    return await db.select().from(pick9Assignments)
      .where(eq(pick9Assignments.roundId, roundId));
  }

  async upsertPick9Assignments(
    roundId: number,
    assignments: Array<{ playerId: number; holeRange: "1-9" | "10-18" }>
  ): Promise<{ success: boolean }> {
    // Validate all playerIds exist
    const playerIds = assignments.map(a => a.playerId);
    const uniquePlayerIds = [...new Set(playerIds)];

    // Check for duplicate players
    if (uniquePlayerIds.length !== playerIds.length) {
      throw new Error("Player cannot have multiple hole range assignments");
    }

    // Verify all players exist
    const validPlayers = await db.select({ id: players.id }).from(players).where(
      inArray(players.id, uniquePlayerIds)
    );

    if (validPlayers.length !== uniquePlayerIds.length) {
      throw new Error("One or more players do not exist");
    }

    // Delete existing assignments for this round
    await db.delete(pick9Assignments)
      .where(eq(pick9Assignments.roundId, roundId));

    // Insert new assignments
    for (const assignment of assignments) {
      await db.insert(pick9Assignments).values({
        roundId,
        playerId: assignment.playerId,
        holeRange: assignment.holeRange,
      });
    }

    return { success: true };
  }
}

export const storage = new DatabaseStorage();

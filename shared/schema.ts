
import { pgTable, text, integer, boolean, serial, numeric } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(), // Hex code for UI
  totalPoints: integer("total_points").default(0),
});

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  handicap: numeric("handicap").default("0"),
  teamId: integer("team_id").references(() => teams.id),
});

export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

export const holes = pgTable("holes", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").references(() => courses.id),
  number: integer("number").notNull(), // 1-18
  par: integer("par").notNull(),
  strokeIndex: integer("stroke_index").notNull(),
});

export const rounds = pgTable("rounds", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").references(() => courses.id),
  roundNumber: integer("round_number").notNull(),
  date: text("date").notNull(), // Storing as string for display (e.g., "Saturday Feb 21")
  formatType: text("format_type").notNull(), // 'individual_net', 'individual_match_play', 'combined_stableford', 'better_ball_stableford', 'pick_9'
  description: text("description").notNull(),
  isCompleted: boolean("is_completed").default(false),
  awardsTeamPoints: boolean("awards_team_points").default(true),
});

export const scores = pgTable("scores", {
  id: serial("id").primaryKey(),
  roundId: integer("round_id").references(() => rounds.id),
  playerId: integer("player_id").references(() => players.id),
  holeNumber: integer("hole_number").notNull(),
  grossScore: integer("gross_score").notNull(), // Raw strokes
  netScore: integer("net_score"), // Calculated based on handicap
  stablefordPoints: integer("stableford_points"), // Calculated based on format
  isPick9: boolean("is_pick_9").default(false), // For Round 5
  handicapUsed: integer("handicap_used"), // Audit trail - handicap used for this score
});

// To store the final point allocation for the tournament leaderboard
export const roundTeamPoints = pgTable("round_team_points", {
  id: serial("id").primaryKey(),
  roundId: integer("round_id").references(() => rounds.id),
  teamId: integer("team_id").references(() => teams.id),
  points: integer("points").notNull(), // The 10, 8, 6 etc. allocated points
  rank: integer("rank").notNull(),
});

// To store round-specific course handicaps for each player
export const roundHandicaps = pgTable("round_handicaps", {
  id: serial("id").primaryKey(),
  roundId: integer("round_id").references(() => rounds.id).notNull(),
  playerId: integer("player_id").references(() => players.id).notNull(),
  courseHandicap: integer("course_handicap").notNull(),
});

// To store player groupings for rounds (group scoring mode)
export const roundGroupings = pgTable("round_groupings", {
  id: serial("id").primaryKey(),
  roundId: integer("round_id").references(() => rounds.id).notNull(),
  groupNumber: integer("group_number").notNull(),
  groupName: text("group_name"), // Optional custom name (e.g., "Morning Group")
});

// To store which players are in which grouping
export const roundGroupingPlayers = pgTable("round_grouping_players", {
  id: serial("id").primaryKey(),
  groupingId: integer("grouping_id").references(() => roundGroupings.id).notNull(),
  playerId: integer("player_id").references(() => players.id).notNull(),
});

// Match pairings for match play rounds
export const matchPairings = pgTable("match_pairings", {
  id: serial("id").primaryKey(),
  roundId: integer("round_id").references(() => rounds.id).notNull(),
  matchNumber: integer("match_number").notNull(),
  player1Id: integer("player1_id").references(() => players.id).notNull(),
  player2Id: integer("player2_id").references(() => players.id).notNull(),
  player1HolesWon: integer("player1_holes_won").default(0),
  player2HolesWon: integer("player2_holes_won").default(0),
  holesHalved: integer("holes_halved").default(0),
  winnerId: integer("winner_id").references(() => players.id),
  isCompleted: boolean("is_completed").default(false),
});

// Pick 9 assignments for Round 6
export const pick9Assignments = pgTable("pick9_assignments", {
  id: serial("id").primaryKey(),
  roundId: integer("round_id").references(() => rounds.id).notNull(),
  playerId: integer("player_id").references(() => players.id).notNull(),
  holeRange: text("hole_range").notNull(), // "1-9" or "10-18"
});

// === RELATIONS ===
export const teamsRelations = relations(teams, ({ many }) => ({
  players: many(players),
  roundPoints: many(roundTeamPoints),
}));

export const playersRelations = relations(players, ({ one, many }) => ({
  team: one(teams, {
    fields: [players.teamId],
    references: [teams.id],
  }),
  scores: many(scores),
}));

export const roundsRelations = relations(rounds, ({ one, many }) => ({
  course: one(courses, {
    fields: [rounds.courseId],
    references: [courses.id],
  }),
  scores: many(scores),
  teamPoints: many(roundTeamPoints),
}));

export const coursesRelations = relations(courses, ({ many }) => ({
  holes: many(holes),
}));

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

export const roundGroupingsRelations = relations(roundGroupings, ({ one, many }) => ({
  round: one(rounds, {
    fields: [roundGroupings.roundId],
    references: [rounds.id],
  }),
  players: many(roundGroupingPlayers),
}));

export const roundGroupingPlayersRelations = relations(roundGroupingPlayers, ({ one }) => ({
  grouping: one(roundGroupings, {
    fields: [roundGroupingPlayers.groupingId],
    references: [roundGroupings.id],
  }),
  player: one(players, {
    fields: [roundGroupingPlayers.playerId],
    references: [players.id],
  }),
}));

export const matchPairingsRelations = relations(matchPairings, ({ one }) => ({
  round: one(rounds, {
    fields: [matchPairings.roundId],
    references: [rounds.id],
  }),
  player1: one(players, {
    fields: [matchPairings.player1Id],
    references: [players.id],
  }),
  player2: one(players, {
    fields: [matchPairings.player2Id],
    references: [players.id],
  }),
  winner: one(players, {
    fields: [matchPairings.winnerId],
    references: [players.id],
  }),
}));

export const pick9AssignmentsRelations = relations(pick9Assignments, ({ one }) => ({
  round: one(rounds, {
    fields: [pick9Assignments.roundId],
    references: [rounds.id],
  }),
  player: one(players, {
    fields: [pick9Assignments.playerId],
    references: [players.id],
  }),
}));

// === BASE SCHEMAS ===
export const insertScoreSchema = createInsertSchema(scores).omit({ id: true });
export const insertRoundSchema = createInsertSchema(rounds).omit({ id: true });
export const insertPlayerSchema = createInsertSchema(players).omit({ id: true });
export const insertTeamSchema = createInsertSchema(teams).omit({ id: true });

// === EXPLICIT API TYPES ===
export type Team = typeof teams.$inferSelect;
export type Player = typeof players.$inferSelect;
export type Round = typeof rounds.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type Hole = typeof holes.$inferSelect;
export type Score = typeof scores.$inferSelect;
export type RoundTeamPoint = typeof roundTeamPoints.$inferSelect;
export type RoundHandicap = typeof roundHandicaps.$inferSelect;

export type PlayerWithTeam = Player & { team?: Team };
export type RoundWithCourse = Round & { course?: Course };

export type ScoreInput = z.infer<typeof insertScoreSchema>;

// Input for submitting a score (single hole)
export type SubmitScoreRequest = {
  roundId: number;
  playerId: number;
  holeNumber: number;
  grossScore: number;
  isPick9?: boolean;
};

// Response types
export type LeaderboardEntry = {
  teamId: number;
  teamName: string;
  teamColor?: string;
  totalPoints: number;
  rank: number;
};

export type RoundLeaderboardEntry = {
  teamId: number;
  teamName: string;
  points: number; // Allocated points (e.g., 10, 8, 6)
  scoreMetric: number; // The raw metric used to rank (Net score, total stableford, etc.)
  rank: number;
};

// Grouping Types
export type RoundGrouping = typeof roundGroupings.$inferSelect;
export type RoundGroupingPlayer = typeof roundGroupingPlayers.$inferSelect;

export type RoundGroupingWithPlayers = RoundGrouping & {
  players: (RoundGroupingPlayer & { player: Player })[];
};

// Match Play Types
export type MatchPairing = typeof matchPairings.$inferSelect;
export type Pick9Assignment = typeof pick9Assignments.$inferSelect;

export type MatchPairingWithPlayers = MatchPairing & {
  player1: Player;
  player2: Player;
  winner?: Player;
};


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
  formatType: text("format_type").notNull(), // 'individual_net', 'better_ball', 'combined_stableford', 'best_worst', 'pick_9', 'championship'
  description: text("description").notNull(),
  isCompleted: boolean("is_completed").default(false),
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

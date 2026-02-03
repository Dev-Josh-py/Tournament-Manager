
import { z } from 'zod';
import { 
  insertScoreSchema, 
  teams, 
  players, 
  rounds, 
  courses, 
  holes, 
  scores,
  roundTeamPoints
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  teams: {
    list: {
      method: 'GET' as const,
      path: '/api/teams',
      responses: {
        200: z.array(z.custom<typeof teams.$inferSelect>()),
      },
    },
  },
  players: {
    list: {
      method: 'GET' as const,
      path: '/api/players',
      responses: {
        200: z.array(z.custom<typeof players.$inferSelect>()),
      },
    },
  },
  rounds: {
    list: {
      method: 'GET' as const,
      path: '/api/rounds',
      responses: {
        200: z.array(z.custom<typeof rounds.$inferSelect & { course: typeof courses.$inferSelect }>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/rounds/:id',
      responses: {
        200: z.custom<typeof rounds.$inferSelect & { course: typeof courses.$inferSelect; holes: typeof holes.$inferSelect[] }>(),
        404: errorSchemas.notFound,
      },
    },
  },
  scores: {
    submit: {
      method: 'POST' as const,
      path: '/api/scores',
      input: z.object({
        roundId: z.number(),
        playerId: z.number(),
        holeNumber: z.number(),
        grossScore: z.number(),
        isPick9: z.boolean().optional(),
      }),
      responses: {
        200: z.custom<typeof scores.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/rounds/:roundId/scores',
      responses: {
        200: z.array(z.custom<typeof scores.$inferSelect>()),
      },
    },
  },
  leaderboard: {
    tournament: {
      method: 'GET' as const,
      path: '/api/leaderboard',
      responses: {
        200: z.array(z.object({
          teamId: z.number(),
          teamName: z.string(),
          teamColor: z.string(),
          totalPoints: z.number(),
          rank: z.number(),
        })),
      },
    },
    round: {
      method: 'GET' as const,
      path: '/api/rounds/:roundId/leaderboard',
      responses: {
        200: z.array(z.object({
          teamId: z.number(),
          teamName: z.string(),
          points: z.number(), // Allocated tournament points
          scoreMetric: z.number(), // The raw score used for ranking
          rank: z.number(),
        })),
      },
    },
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

// Type Helpers
export type TeamResponse = z.infer<typeof api.teams.list.responses[200]>[number];
export type PlayerResponse = z.infer<typeof api.players.list.responses[200]>[number];
export type RoundResponse = z.infer<typeof api.rounds.list.responses[200]>[number];
export type SubmitScoreInput = z.infer<typeof api.scores.submit.input>;

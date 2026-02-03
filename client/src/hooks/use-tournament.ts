import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type SubmitScoreInput } from "@shared/routes";
import { getToken } from "@/lib/auth";

// Helper to add auth header to requests
function getAuthHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ============================================
// Teams & Players
// ============================================

export function useTeams() {
  return useQuery({
    queryKey: [api.teams.list.path],
    queryFn: async () => {
      const res = await fetch(api.teams.list.path, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch teams");
      return api.teams.list.responses[200].parse(await res.json());
    },
  });
}

export function usePlayers() {
  return useQuery({
    queryKey: [api.players.list.path],
    queryFn: async () => {
      const res = await fetch(api.players.list.path, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch players");
      return api.players.list.responses[200].parse(await res.json());
    },
  });
}

// ============================================
// Rounds
// ============================================

export function useRounds() {
  return useQuery({
    queryKey: [api.rounds.list.path],
    queryFn: async () => {
      const res = await fetch(api.rounds.list.path, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch rounds");
      return api.rounds.list.responses[200].parse(await res.json());
    },
  });
}

export function useRound(id: number) {
  return useQuery({
    queryKey: [api.rounds.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.rounds.get.path, { id });
      const res = await fetch(url, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch round details");
      return api.rounds.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

// ============================================
// Scoring
// ============================================

export function useScores(roundId: number) {
  return useQuery({
    queryKey: [api.scores.list.path, roundId],
    queryFn: async () => {
      const url = buildUrl(api.scores.list.path, { roundId });
      const res = await fetch(url, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch scores");
      return api.scores.list.responses[200].parse(await res.json());
    },
    enabled: !!roundId,
  });
}

export function useAllRoundsScores(roundIds: number[]) {
  return useQuery({
    queryKey: ['all-rounds-scores', roundIds.join(',')],
    queryFn: async () => {
      // Fetch scores for all rounds in parallel
      const scorePromises = roundIds
        .filter(id => id > 0)
        .map(roundId => {
          const url = buildUrl(api.scores.list.path, { roundId });
          return fetch(url, { headers: getAuthHeaders() })
            .then(res => {
              if (!res.ok) throw new Error(`Failed to fetch scores for round ${roundId}`);
              return res.json();
            })
            .then(data => api.scores.list.responses[200].parse(data))
            .then(scores => ({ roundId, scores }));
        });

      const results = await Promise.all(scorePromises);

      // Create a map for easy lookup
      const scoresMap = new Map<number, any[]>();
      results.forEach(({ roundId, scores }) => {
        scoresMap.set(roundId, scores);
      });

      // Return array aligned with input roundIds
      return roundIds.map(id => scoresMap.get(id) || []);
    },
    enabled: roundIds.length > 0 && roundIds.some(id => id > 0),
  });
}

export function useSubmitScore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: SubmitScoreInput) => {
      const res = await fetch(api.scores.submit.path, {
        method: api.scores.submit.method,
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = api.scores.submit.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to submit score");
      }
      return api.scores.submit.responses[200].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      // Invalidate scores for the round and leaderboards
      queryClient.invalidateQueries({ queryKey: [api.scores.list.path, variables.roundId] });
      queryClient.invalidateQueries({ queryKey: [api.leaderboard.tournament.path] });
      queryClient.invalidateQueries({ queryKey: [api.leaderboard.round.path, variables.roundId] });
    },
  });
}

// ============================================
// Leaderboards
// ============================================

export function useTournamentLeaderboard() {
  return useQuery({
    queryKey: [api.leaderboard.tournament.path],
    queryFn: async () => {
      const res = await fetch(api.leaderboard.tournament.path, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch tournament leaderboard");
      return api.leaderboard.tournament.responses[200].parse(await res.json());
    },
  });
}

export function useRoundLeaderboard(roundId: number) {
  return useQuery({
    queryKey: [api.leaderboard.round.path, roundId],
    queryFn: async () => {
      const url = buildUrl(api.leaderboard.round.path, { roundId });
      const res = await fetch(url, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch round leaderboard");
      return api.leaderboard.round.responses[200].parse(await res.json());
    },
    enabled: !!roundId,
  });
}

// ============================================
// Round Handicaps
// ============================================

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


import type { Express } from "express";
import { storage } from "./storage.js";
import { api } from "../shared/routes.js";
import { verifyPasscode, loginHandler } from "./auth.js";
import { seedDatabase } from "./seed.js";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<void> {

  // Favicon - golf ball PNG, served with no-cache to override stale browser cache
  const faviconPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAn0lEQVR4nO2W0Q2AIAxEmcIt3MX9l9F/Q46760XU0IQfaXwvhZS2tkKI/dhOZk0Dx0XuP2QjIuKAkcjjcFsiCbcknPNWJGx47zuqFsqXBVzQfQ8KjEqv3glUya5E+uIhsSVQEhjlMPu2wKhJMU3s2xVIxBKwu2GiE777LWAkKmLyPKC880zOtKlo6lxow3sS6phWhiMRdpXBrkgc/Ou4APTHKeEwF1z5AAAAAElFTkSuQmCC", "base64");
  app.get("/favicon.ico", (req, res) => {
    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.type("image/png");
    res.send(faviconPng);
  });
  app.get("/apple-touch-icon.png", (req, res) => {
    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    res.type("image/png");
    res.send(faviconPng);
  });

  // Public auth endpoint
  app.post("/api/auth/login", loginHandler);

  // Apply passcode auth to all API endpoints
  app.use("/api", verifyPasscode);

  // Teams
  app.get(api.teams.list.path, async (req, res) => {
    const teams = await storage.getTeams();
    res.json(teams);
  });

  // Players
  app.get(api.players.list.path, async (req, res) => {
    const players = await storage.getPlayers();
    res.json(players);
  });

  // Rounds
  app.get(api.rounds.list.path, async (req, res) => {
    const rounds = await storage.getRounds();
    res.json(rounds);
  });

  app.get(api.rounds.get.path, async (req, res) => {
    const round = await storage.getRound(Number(req.params.id));
    if (!round) return res.status(404).json({ message: "Round not found" });
    res.json(round);
  });

  // Scores
  app.post(api.scores.submit.path, async (req, res) => {
    try {
      const input = api.scores.submit.input.parse(req.body);
      const score = await storage.submitScore(input);
      res.json(score);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: (err as Error).message });
      }
    }
  });

  app.get(api.scores.list.path, async (req, res) => {
    const scores = await storage.getRoundScores(Number(req.params.roundId));
    res.json(scores);
  });

  // Leaderboard
  app.get(api.leaderboard.tournament.path, async (req, res) => {
    const { tournament } = await storage.calculateLeaderboards();
    res.json(tournament);
  });

  app.get(api.leaderboard.round.path, async (req, res) => {
    const { rounds } = await storage.calculateLeaderboards();
    const roundData = rounds[Number(req.params.roundId)] || [];
    res.json(roundData);
  });

  // Round Handicaps
  app.get('/api/rounds/:roundId/handicaps', async (req, res) => {
    try {
      const roundId = Number(req.params.roundId);
      const handicaps = await storage.getRoundHandicaps(roundId);
      res.json(handicaps);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.put('/api/rounds/:roundId/handicaps', async (req, res) => {
    try {
      const roundId = Number(req.params.roundId);
      const handicaps = req.body; // Array of {playerId, courseHandicap}
      const result = await storage.updateRoundHandicaps(roundId, handicaps);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Groupings
  app.get(api.groupings.list.path, async (req, res) => {
    try {
      const roundId = Number(req.params.roundId);
      const groupings = await storage.getGroupingsForRound(roundId);
      res.json(groupings);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post(api.groupings.upsert.path, async (req, res) => {
    try {
      const roundId = Number(req.params.roundId);
      const input = api.groupings.upsert.input.parse(req.body);
      const result = await storage.upsertGroupings(roundId, input);
      res.json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ error: (err as Error).message });
      }
    }
  });

  app.delete(api.groupings.delete.path, async (req, res) => {
    try {
      const roundId = Number(req.params.roundId);
      const result = await storage.deleteGroupings(roundId);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Match Pairings
  app.get('/api/rounds/:roundId/match-pairings', async (req, res) => {
    try {
      const roundId = Number(req.params.roundId);
      const pairings = await storage.getMatchPairingsForRound(roundId);
      res.json(pairings);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post('/api/rounds/:roundId/match-pairings', async (req, res) => {
    try {
      const roundId = Number(req.params.roundId);
      const input = req.body; // Array of {matchNumber, player1Id, player2Id}
      const result = await storage.upsertMatchPairings(roundId, input);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.delete('/api/rounds/:roundId/match-pairings', async (req, res) => {
    try {
      const roundId = Number(req.params.roundId);
      const result = await storage.deleteMatchPairings(roundId);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.put(api.matchPairings.setWinner.path, async (req, res) => {
    try {
      const matchId = Number(req.params.matchId);
      const { winnerId } = api.matchPairings.setWinner.input.parse(req.body);
      const updated = await storage.setMatchWinner(matchId, winnerId);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: (err as Error).message });
      }
    }
  });

  // Pick 9 Assignments
  app.get('/api/rounds/:roundId/pick9-assignments', async (req, res) => {
    try {
      const roundId = Number(req.params.roundId);
      const assignments = await storage.getPick9Assignments(roundId);
      res.json(assignments);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post('/api/rounds/:roundId/pick9-assignments', async (req, res) => {
    try {
      const roundId = Number(req.params.roundId);
      const input = req.body; // Array of {playerId, holeRange: "1-9" | "10-18"}
      const result = await storage.upsertPick9Assignments(roundId, input);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Update player handicap index
  app.put('/api/players/:id/handicap', async (req, res) => {
    try {
      const playerId = Number(req.params.id);
      const { handicap } = req.body;

      // Validation - allow decimals for handicap index
      if (typeof handicap !== 'number' || handicap < 0 || handicap > 54) {
        return res.status(400).json({ error: 'Handicap index must be between 0 and 54' });
      }

      const updatedPlayer = await storage.updatePlayerHandicap(playerId, handicap);
      res.json(updatedPlayer);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Recalculate all scores (admin endpoint)
  app.post('/api/admin/recalculate-scores', async (req, res) => {
    try {
      const result = await storage.recalculateAllScores();
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // SEED DATA
  // Initialize standard data if empty
  await seedDatabase();
}

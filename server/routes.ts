
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { verifyPasscode, loginHandler } from "./auth";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

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

  // SEED DATA
  // Initialize standard data if empty
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existingTeams = await storage.getTeams();
  if (existingTeams.length > 0) return;

  console.log("Seeding Database...");

  // 1. Create Teams
  const t1 = await storage.createTeam({ name: "Team Josh/Jethro", color: "#ef4444" }); // Red
  const t2 = await storage.createTeam({ name: "Team Keagan/Matt", color: "#3b82f6" }); // Blue
  const t3 = await storage.createTeam({ name: "Team Ross/Jaun", color: "#22c55e" }); // Green

  // 2. Create Players
  await storage.createPlayer({ name: "Josh", teamId: t1.id, handicap: 10 });
  await storage.createPlayer({ name: "Jethro", teamId: t1.id, handicap: 12 });

  await storage.createPlayer({ name: "Keagan", teamId: t2.id, handicap: 8 });
  await storage.createPlayer({ name: "Matt", teamId: t2.id, handicap: 15 });

  await storage.createPlayer({ name: "Ross", teamId: t3.id, handicap: 21 });
  await storage.createPlayer({ name: "Jaun", teamId: t3.id, handicap: 18 });

  // 3. Create Courses with actual data
  const coursesData = [
    {
      name: "Oubaai GC",
      holes: [
        { number: 1, par: 4, strokeIndex: 9 },
        { number: 2, par: 4, strokeIndex: 15 },
        { number: 3, par: 3, strokeIndex: 11 },
        { number: 4, par: 5, strokeIndex: 5 },
        { number: 5, par: 4, strokeIndex: 1 },
        { number: 6, par: 3, strokeIndex: 7 },
        { number: 7, par: 5, strokeIndex: 3 },
        { number: 8, par: 4, strokeIndex: 17 },
        { number: 9, par: 5, strokeIndex: 13 },
        { number: 10, par: 4, strokeIndex: 10 },
        { number: 11, par: 3, strokeIndex: 14 },
        { number: 12, par: 5, strokeIndex: 8 },
        { number: 13, par: 4, strokeIndex: 16 },
        { number: 14, par: 3, strokeIndex: 12 },
        { number: 15, par: 4, strokeIndex: 2 },
        { number: 16, par: 4, strokeIndex: 4 },
        { number: 17, par: 3, strokeIndex: 18 },
        { number: 18, par: 5, strokeIndex: 6 },
      ]
    },
    {
      name: "Fancourt Outeniqua",
      holes: [
        { number: 1, par: 4, strokeIndex: 17 },
        { number: 2, par: 5, strokeIndex: 15 },
        { number: 3, par: 4, strokeIndex: 3 },
        { number: 4, par: 3, strokeIndex: 7 },
        { number: 5, par: 4, strokeIndex: 5 },
        { number: 6, par: 4, strokeIndex: 13 },
        { number: 7, par: 3, strokeIndex: 9 },
        { number: 8, par: 5, strokeIndex: 11 },
        { number: 9, par: 4, strokeIndex: 1 },
        { number: 10, par: 4, strokeIndex: 12 },
        { number: 11, par: 5, strokeIndex: 8 },
        { number: 12, par: 3, strokeIndex: 14 },
        { number: 13, par: 4, strokeIndex: 6 },
        { number: 14, par: 4, strokeIndex: 2 },
        { number: 15, par: 3, strokeIndex: 16 },
        { number: 16, par: 4, strokeIndex: 4 },
        { number: 17, par: 5, strokeIndex: 18 },
        { number: 18, par: 4, strokeIndex: 10 },
      ]
    },
    {
      name: "Fancourt Links",
      holes: [
        { number: 1, par: 4, strokeIndex: 16 },
        { number: 2, par: 3, strokeIndex: 6 },
        { number: 3, par: 4, strokeIndex: 2 },
        { number: 4, par: 4, strokeIndex: 8 },
        { number: 5, par: 5, strokeIndex: 18 },
        { number: 6, par: 4, strokeIndex: 14 },
        { number: 7, par: 4, strokeIndex: 4 },
        { number: 8, par: 3, strokeIndex: 12 },
        { number: 9, par: 5, strokeIndex: 10 },
        { number: 10, par: 4, strokeIndex: 3 },
        { number: 11, par: 3, strokeIndex: 17 },
        { number: 12, par: 4, strokeIndex: 1 },
        { number: 13, par: 5, strokeIndex: 13 },
        { number: 14, par: 4, strokeIndex: 15 },
        { number: 15, par: 4, strokeIndex: 5 },
        { number: 16, par: 5, strokeIndex: 7 },
        { number: 17, par: 3, strokeIndex: 9 },
        { number: 18, par: 5, strokeIndex: 11 },
      ]
    },
    {
      name: "George GC",
      holes: [
        { number: 1, par: 4, strokeIndex: 7 },
        { number: 2, par: 5, strokeIndex: 9 },
        { number: 3, par: 4, strokeIndex: 5 },
        { number: 4, par: 4, strokeIndex: 17 },
        { number: 5, par: 4, strokeIndex: 11 },
        { number: 6, par: 3, strokeIndex: 13 },
        { number: 7, par: 4, strokeIndex: 1 },
        { number: 8, par: 4, strokeIndex: 15 },
        { number: 9, par: 4, strokeIndex: 3 },
        { number: 10, par: 4, strokeIndex: 6 },
        { number: 11, par: 5, strokeIndex: 14 },
        { number: 12, par: 4, strokeIndex: 16 },
        { number: 13, par: 3, strokeIndex: 10 },
        { number: 14, par: 5, strokeIndex: 18 },
        { number: 15, par: 3, strokeIndex: 8 },
        { number: 16, par: 5, strokeIndex: 12 },
        { number: 17, par: 3, strokeIndex: 4 },
        { number: 18, par: 4, strokeIndex: 2 },
      ]
    },
    {
      name: "Fancourt Montagu",
      holes: [
        { number: 1, par: 4, strokeIndex: 11 },
        { number: 2, par: 3, strokeIndex: 15 },
        { number: 3, par: 4, strokeIndex: 3 },
        { number: 4, par: 5, strokeIndex: 17 },
        { number: 5, par: 4, strokeIndex: 9 },
        { number: 6, par: 4, strokeIndex: 1 },
        { number: 7, par: 4, strokeIndex: 5 },
        { number: 8, par: 3, strokeIndex: 7 },
        { number: 9, par: 5, strokeIndex: 13 },
        { number: 10, par: 5, strokeIndex: 12 },
        { number: 11, par: 4, strokeIndex: 16 },
        { number: 12, par: 3, strokeIndex: 14 },
        { number: 13, par: 4, strokeIndex: 2 },
        { number: 14, par: 4, strokeIndex: 6 },
        { number: 15, par: 4, strokeIndex: 4 },
        { number: 16, par: 4, strokeIndex: 18 },
        { number: 17, par: 3, strokeIndex: 8 },
        { number: 18, par: 5, strokeIndex: 10 },
      ]
    },
    {
      name: "Kingswood Golf Estate",
      holes: [
        { number: 1, par: 5, strokeIndex: 10 },
        { number: 2, par: 3, strokeIndex: 14 },
        { number: 3, par: 5, strokeIndex: 6 },
        { number: 4, par: 4, strokeIndex: 2 },
        { number: 5, par: 4, strokeIndex: 12 },
        { number: 6, par: 3, strokeIndex: 16 },
        { number: 7, par: 5, strokeIndex: 4 },
        { number: 8, par: 4, strokeIndex: 18 },
        { number: 9, par: 4, strokeIndex: 8 },
        { number: 10, par: 4, strokeIndex: 7 },
        { number: 11, par: 4, strokeIndex: 5 },
        { number: 12, par: 3, strokeIndex: 15 },
        { number: 13, par: 4, strokeIndex: 17 },
        { number: 14, par: 4, strokeIndex: 9 },
        { number: 15, par: 4, strokeIndex: 1 },
        { number: 16, par: 5, strokeIndex: 11 },
        { number: 17, par: 4, strokeIndex: 3 },
        { number: 18, par: 3, strokeIndex: 13 },
      ]
    },
  ];

  const createdCourses = [];

  for (const courseData of coursesData) {
    const course = await storage.createCourse({ name: courseData.name });
    createdCourses.push(course);

    // Create 18 Holes with actual data
    for (const holeData of courseData.holes) {
      await storage.createHole({
        courseId: course.id,
        number: holeData.number,
        par: holeData.par,
        strokeIndex: holeData.strokeIndex,
      });
    }
  }

  // 4. Create Rounds
  const schedule = [
    { day: "Saturday Feb 21", courseIdx: 0, format: "individual_net", desc: "Individual Net Stroke Play" },
    { day: "Sunday Feb 22 (AM)", courseIdx: 1, format: "better_ball", desc: "Better Ball Stroke Play" },
    { day: "Sunday Feb 22 (PM)", courseIdx: 2, format: "combined_stableford", desc: "Combined Stableford" },
    { day: "Monday Feb 23 (AM)", courseIdx: 3, format: "best_worst", desc: "Best/Worst Ball Stableford" },
    { day: "Monday Feb 23 (PM)", courseIdx: 4, format: "pick_9", desc: "Pick 9 Better Ball Stableford" },
    { day: "Tuesday Feb 24", courseIdx: 5, format: "championship", desc: "Championship Round" },
  ];

  for (let i = 0; i < schedule.length; i++) {
    const item = schedule[i];
    await storage.createRound({
      courseId: createdCourses[item.courseIdx].id,
      roundNumber: i + 1,
      date: item.day,
      formatType: item.format,
      description: item.desc,
      isCompleted: false
    });
  }

  // Add sample Round 1 scores (Oubaai GC - Par 72)
  const round1 = await storage.getRounds();
  const round1Id = round1.find(r => r.roundNumber === 1)?.id;

  if (round1Id) {
    // Josh - 80 total
    const joshScores = [4, 4, 3, 5, 5, 3, 5, 5, 5, 4, 3, 5, 4, 3, 4, 5, 3, 5];
    // Jethro - 74 total
    const jethroScores = [4, 4, 3, 5, 4, 3, 5, 4, 5, 4, 3, 5, 4, 3, 4, 4, 3, 5];
    // Keagan - 84 total
    const keaganScores = [5, 5, 3, 6, 5, 3, 6, 5, 5, 5, 3, 6, 5, 3, 5, 5, 3, 5];
    // Matt - 88 total
    const mattScores = [5, 5, 3, 6, 5, 4, 6, 5, 5, 5, 3, 6, 5, 4, 5, 5, 4, 5];
    // Ross - 95 total
    const rossScores = [6, 6, 4, 7, 6, 5, 7, 6, 6, 6, 4, 7, 6, 5, 6, 6, 4, 6];
    // Jaun - 89 total
    const juanScores = [5, 5, 4, 6, 5, 4, 6, 5, 5, 5, 4, 6, 5, 4, 5, 5, 4, 5];

    const scoresByPlayer = [
      { playerId: 1, scores: joshScores },
      { playerId: 2, scores: jethroScores },
      { playerId: 3, scores: keaganScores },
      { playerId: 4, scores: mattScores },
      { playerId: 5, scores: rossScores },
      { playerId: 6, scores: juanScores }
    ];

    for (const { playerId, scores } of scoresByPlayer) {
      for (let hole = 1; hole <= 18; hole++) {
        await storage.submitScore({
          roundId: round1Id,
          playerId,
          holeNumber: hole,
          grossScore: scores[hole - 1]
        });
      }
    }
    console.log("Sample Round 1 scores added!");
  }

  // Add sample Round 2 scores (Fancourt Outeniqua - Par 72 - Better Ball Stroke Play)
  const round2 = await storage.getRounds();
  const round2Id = round2.find(r => r.roundNumber === 2)?.id;

  if (round2Id) {
    // Josh - 79 total (better form)
    const joshScores = [4, 5, 4, 4, 4, 3, 5, 4, 4, 4, 4, 5, 4, 3, 4, 4, 3, 4];
    // Jethro - 76 total (excellent round)
    const jethroScores = [4, 5, 4, 3, 4, 3, 4, 4, 4, 4, 4, 4, 4, 3, 4, 4, 3, 4];
    // Keagan - 82 total
    const keaganScores = [5, 5, 4, 4, 5, 4, 5, 5, 5, 4, 4, 5, 5, 3, 4, 5, 4, 4];
    // Matt - 86 total
    const mattScores = [5, 5, 5, 5, 5, 4, 6, 5, 5, 5, 4, 5, 5, 4, 5, 5, 4, 5];
    // Ross - 93 total
    const rossScores = [6, 6, 5, 5, 6, 5, 6, 6, 6, 5, 5, 6, 6, 4, 5, 6, 5, 5];
    // Jaun - 87 total
    const juanScores = [5, 5, 5, 5, 5, 4, 5, 5, 5, 5, 4, 5, 5, 4, 5, 5, 4, 5];

    const scoresByPlayer = [
      { playerId: 1, scores: joshScores },
      { playerId: 2, scores: jethroScores },
      { playerId: 3, scores: keaganScores },
      { playerId: 4, scores: mattScores },
      { playerId: 5, scores: rossScores },
      { playerId: 6, scores: juanScores }
    ];

    for (const { playerId, scores } of scoresByPlayer) {
      for (let hole = 1; hole <= 18; hole++) {
        await storage.submitScore({
          roundId: round2Id,
          playerId,
          holeNumber: hole,
          grossScore: scores[hole - 1]
        });
      }
    }
    console.log("Sample Round 2 scores added!");
  }

  console.log("Database seeded!");
}

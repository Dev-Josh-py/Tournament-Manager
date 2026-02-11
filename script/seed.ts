import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
import { teams, players, courses, holes, scores } from "@shared/schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle({ client: pool, schema });

class Storage {
  async createTeam(data: any) {
    const [team] = await db.insert(teams).values(data).returning();
    return team;
  }

  async createPlayer(data: any) {
    const [player] = await db.insert(players).values(data).returning();
    return player;
  }

  async createCourse(data: any) {
    const [course] = await db.insert(courses).values(data).returning();
    return course;
  }

  async createHole(data: any) {
    const [hole] = await db.insert(holes).values(data).returning();
    return hole;
  }

  async createRound(data: any) {
    const [round] = await db.insert(schema.rounds).values(data).returning();
    return round;
  }

  async submitScore(data: any) {
    const [score] = await db.insert(scores).values({
      roundId: data.roundId,
      playerId: data.playerId,
      holeNumber: data.holeNumber,
      grossScore: data.grossScore,
      netScore: null,
      stablefordPoints: null,
      isPick9: false,
      handicapUsed: null,
    }).returning();
    return score;
  }

  async getRounds() {
    return await db.query.rounds.findMany({
      with: { course: true },
    });
  }
}

async function seed() {
  const storage = new Storage();

  console.log("Seeding Database...");

  // 1. Create Teams
  const t1 = await storage.createTeam({ name: "Team Josh/Jethro", color: "#ef4444" });
  const t2 = await storage.createTeam({ name: "Team Keagan/Matt", color: "#3b82f6" });
  const t3 = await storage.createTeam({ name: "Team Ross/Jaun", color: "#22c55e" });

  // 2. Create Players
  await storage.createPlayer({ name: "Josh", teamId: t1.id, handicap: 10 });
  await storage.createPlayer({ name: "Jethro", teamId: t1.id, handicap: 12 });
  await storage.createPlayer({ name: "Keagan", teamId: t2.id, handicap: 8 });
  await storage.createPlayer({ name: "Matt", teamId: t2.id, handicap: 15 });
  await storage.createPlayer({ name: "Ross", teamId: t3.id, handicap: 21 });
  await storage.createPlayer({ name: "Jaun", teamId: t3.id, handicap: 18 });

  // 3. Create Courses
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
    {
      name: "Mossel Bay GC",
      holes: [
        { number: 1, par: 4, strokeIndex: 13 },
        { number: 2, par: 5, strokeIndex: 9 },
        { number: 3, par: 4, strokeIndex: 5 },
        { number: 4, par: 3, strokeIndex: 17 },
        { number: 5, par: 5, strokeIndex: 1 },
        { number: 6, par: 4, strokeIndex: 11 },
        { number: 7, par: 4, strokeIndex: 7 },
        { number: 8, par: 3, strokeIndex: 15 },
        { number: 9, par: 4, strokeIndex: 3 },
        { number: 10, par: 4, strokeIndex: 14 },
        { number: 11, par: 5, strokeIndex: 6 },
        { number: 12, par: 3, strokeIndex: 8 },
        { number: 13, par: 4, strokeIndex: 12 },
        { number: 14, par: 4, strokeIndex: 2 },
        { number: 15, par: 5, strokeIndex: 18 },
        { number: 16, par: 4, strokeIndex: 10 },
        { number: 17, par: 5, strokeIndex: 4 },
        { number: 18, par: 4, strokeIndex: 16 },
      ]
    },
  ];

  const createdCourses = [];

  for (const courseData of coursesData) {
    const course = await storage.createCourse({ name: courseData.name });
    createdCourses.push(course);

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
    { day: "Saturday Feb 21", courseIdx: 0, format: "individual_net", desc: "Individual Net Stroke Play (6 players)" },
    { day: "Sunday Feb 22 (AM)", courseIdx: 1, format: "individual_match_play", desc: "Match Play Stableford 1v1 (3 matches)" },
    { day: "Sunday Feb 22 (PM)", courseIdx: 4, format: "individual_match_play", desc: "Match Play Stableford 1v1 (3 matches)" },
    { day: "Monday Feb 23 (AM)", courseIdx: 3, format: "combined_stableford", desc: "Combined Stableford (Add both players' points)" },
    { day: "Monday Feb 23 (PM)", courseIdx: 5, format: "better_ball_stableford", desc: "Better Ball Stableford (Best score per hole)" },
    { day: "Tuesday Feb 24", courseIdx: 6, format: "pick_9", desc: "Pick 9 Consecutive Holes Stableford" },
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

  // Add sample Round 1 scores
  const allRounds = await storage.getRounds();
  const round1Id = allRounds.find(r => r.roundNumber === 1)?.id;

  if (round1Id) {
    const joshScores = [4, 4, 3, 5, 5, 3, 5, 5, 5, 4, 3, 5, 4, 3, 4, 5, 3, 5];
    const jethroScores = [4, 4, 3, 5, 4, 3, 5, 4, 5, 4, 3, 5, 4, 3, 4, 4, 3, 5];
    const keaganScores = [5, 5, 3, 6, 5, 3, 6, 5, 5, 5, 3, 6, 5, 3, 5, 5, 3, 5];
    const mattScores = [5, 5, 3, 6, 5, 4, 6, 5, 5, 5, 3, 6, 5, 4, 5, 5, 4, 5];
    const rossScores = [6, 6, 4, 7, 6, 5, 7, 6, 6, 6, 4, 7, 6, 5, 6, 6, 4, 6];
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

  console.log("Database seeded!");
  await pool.end();
}

seed().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});

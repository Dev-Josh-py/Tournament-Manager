/**
 * Seeds an empty database from the generated snapshot in shared/seed-data.ts.
 *
 *   DATABASE_URL=... npx tsx script/seed.ts
 *
 * No-ops if any teams already exist, so it is safe to re-run. The seeding logic
 * lives in server/seed.ts and is shared with the server's startup check.
 */
import { seedDatabase } from "../server/seed.js";

seedDatabase()
  .then(({ seeded }) => {
    console.log(seeded ? "Done." : "Database already contains data — nothing to do.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });

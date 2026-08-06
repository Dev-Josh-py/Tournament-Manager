/**
 * Dumps every public table to JSON + re-importable SQL INSERTs.
 *
 * Usage: npx tsx script/backup-db.ts [outDir]
 * Restore: psql "$DATABASE_URL" -f <outDir>/restore.sql
 */
import { Pool } from "pg";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const TABLES = [
  "teams",
  "players",
  "courses",
  "holes",
  "rounds",
  "scores",
  "round_team_points",
  "round_handicaps",
  "round_groupings",
  "round_grouping_players",
  "match_pairings",
  "pick9_assignments",
];

function literal(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  return `'${String(v).replace(/'/g, "''")}'`;
}

async function main() {
  const outDir = process.argv[2] ?? join("backups", new Date().toISOString().replace(/[:.]/g, "-"));
  mkdirSync(outDir, { recursive: true });

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const snapshot: Record<string, unknown[]> = {};
  const sql: string[] = ["BEGIN;", ""];

  for (const table of TABLES) {
    const { rows, fields } = await pool.query(`select * from public.${table} order by id`);
    snapshot[table] = rows;

    sql.push(`-- ${table} (${rows.length} rows)`);
    sql.push(`DELETE FROM public.${table};`);
    const cols = fields.map((f) => `"${f.name}"`).join(", ");
    for (const row of rows) {
      const vals = fields.map((f) => literal(row[f.name])).join(", ");
      sql.push(`INSERT INTO public.${table} (${cols}) VALUES (${vals});`);
    }
    // Keep serial sequences ahead of the restored ids.
    sql.push(
      `SELECT setval(pg_get_serial_sequence('public.${table}', 'id'), COALESCE((SELECT MAX(id) FROM public.${table}), 1));`,
    );
    sql.push("");
    console.log(`${table}: ${rows.length} rows`);
  }

  sql.push("COMMIT;");
  writeFileSync(join(outDir, "snapshot.json"), JSON.stringify(snapshot, null, 2));
  writeFileSync(join(outDir, "restore.sql"), sql.join("\n"));
  await pool.end();
  console.log(`\nWrote ${outDir}/snapshot.json and ${outDir}/restore.sql`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

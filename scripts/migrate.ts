/**
 * Applies the Postgres schema.
 *
 * The app applies it lazily on first use too, so this is for running it
 * deliberately — in a deploy step, or to confirm the database is reachable
 * before the first request rather than during it.
 *
 *   npm run db:migrate
 */
import { PostgresCalendarStore } from "../lib/social/storage/postgres-store.ts";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "DATABASE_URL is not set. Without it the app stores calendars as JSON\n" +
      "files on disk, which needs no migration — and does not work on a\n" +
      "read-only or multi-instance host.",
  );
  process.exit(1);
}

const store = new PostgresCalendarStore(url);

try {
  await store.healthCheck();
  console.log("Schema applied. Postgres is reachable and ready.");
} catch (err) {
  console.error(
    `Migration failed: ${err instanceof Error ? err.message : String(err)}`,
  );
  process.exitCode = 1;
} finally {
  await store.close();
}

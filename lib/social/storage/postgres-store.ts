import { readFile } from "node:fs/promises";
import path from "node:path";
import { Pool, type PoolClient } from "pg";
import { logger } from "@/lib/observability/logger";
import type { CalendarMonth, ContentItem, ProductionStage } from "../types";
import { assertMonthId, normaliseLiveLink, parseCalendar } from "../validation";
import {
  CalendarNotFoundError,
  ItemNotFoundError,
  type CalendarStore,
} from "./types";

/**
 * Postgres-backed storage. What runs anywhere real.
 *
 * The design point that matters: items live in their own table, so ticking one
 * production checkbox is a single-row `UPDATE` rather than a rewrite of the
 * whole month. That removes the lost-update race the file store can only
 * mitigate with an in-process lock, and it is why this adapter is a prerequisite
 * for more than one person editing at once — or for any serverless host, where
 * the filesystem is read-only and every request may be a different instance.
 */

/** Column name per production stage. Keyed so the mapping is exhaustive. */
const STAGE_COLUMN: Record<ProductionStage, "shoot" | "edit" | "posted"> = {
  shoot: "shoot",
  edit: "edit",
  posted: "posted",
};

interface MonthRow {
  id: string;
  year: number;
  month: number;
  theme: CalendarMonth["theme"];
  platform_notes: CalendarMonth["platformNotes"];
  created_at: Date;
  updated_at: Date;
}

interface ItemRow {
  id: string;
  post_date: Date | string;
  day: string;
  week: number;
  platform: string;
  bucket: string;
  format: string;
  topic: string;
  copy: string;
  caption: string;
  hashtags: string[];
  hook: string;
  cta: string;
  seo_keywords: string[];
  rationale: string;
  shoot: boolean;
  edit: boolean;
  posted: boolean;
  live_link: string | null;
  derived_from: string | null;
}

/** `DATE` comes back as a Date in local time; format it without shifting. */
function isoDate(value: Date | string): string {
  if (typeof value === "string") return value.slice(0, 10);
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toItem(row: ItemRow): ContentItem {
  return {
    id: row.id,
    date: isoDate(row.post_date),
    day: row.day,
    week: row.week,
    platform: row.platform as ContentItem["platform"],
    bucket: row.bucket as ContentItem["bucket"],
    format: row.format as ContentItem["format"],
    topic: row.topic,
    copy: row.copy,
    caption: row.caption,
    hashtags: row.hashtags ?? [],
    hook: row.hook,
    cta: row.cta,
    seoKeywords: row.seo_keywords ?? [],
    rationale: row.rationale,
    production: { shoot: row.shoot, edit: row.edit, posted: row.posted },
    liveLink: row.live_link,
    derivedFrom: row.derived_from,
  };
}

export class PostgresCalendarStore implements CalendarStore {
  private readonly pool: Pool;
  private migrated: Promise<void> | null = null;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      // Small: this is an internal tool with a handful of concurrent users,
      // and serverless hosts punish large pools per instance.
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      // Managed Postgres almost always terminates TLS with its own CA. Opt in
      // only when the URL asks for it, so a local socket still works.
      ssl: /sslmode=(require|verify-full|verify-ca)/.test(connectionString)
        ? { rejectUnauthorized: false }
        : undefined,
    });

    this.pool.on("error", (err) => {
      // An idle client erroring must not take the process down.
      logger.error("storage.postgres.idle_client_error", err);
    });
  }

  describe() {
    return "Postgres (DATABASE_URL)";
  }

  /**
   * Applies the schema once per process. Every statement is `IF NOT EXISTS`,
   * so concurrent instances racing here converge rather than conflict.
   */
  private ensureSchema(): Promise<void> {
    this.migrated ??= (async () => {
      const sql = await readFile(
        path.join(process.cwd(), "lib", "social", "storage", "schema.sql"),
        "utf8",
      );
      await this.pool.query(sql);
      logger.info("storage.postgres.schema_ready");
    })().catch((err) => {
      // Don't cache a failure — the next call should retry.
      this.migrated = null;
      throw err;
    });
    return this.migrated;
  }

  async healthCheck() {
    await this.ensureSchema();
    await this.pool.query("SELECT 1");
  }

  async list(): Promise<string[]> {
    await this.ensureSchema();
    const { rows } = await this.pool.query<{ id: string }>(
      "SELECT id FROM calendar_months ORDER BY id DESC",
    );
    return rows.map((r) => r.id);
  }

  async get(id: string): Promise<CalendarMonth | null> {
    assertMonthId(id);
    await this.ensureSchema();

    const monthResult = await this.pool.query<MonthRow>(
      "SELECT * FROM calendar_months WHERE id = $1",
      [id],
    );
    const month = monthResult.rows[0];
    if (!month) return null;

    const itemsResult = await this.pool.query<ItemRow>(
      `SELECT * FROM calendar_items
       WHERE month_id = $1
       ORDER BY post_date ASC, platform ASC, id ASC`,
      [id],
    );

    return parseCalendar(id, {
      id: month.id,
      year: month.year,
      month: month.month,
      theme: month.theme,
      platformNotes: month.platform_notes,
      items: itemsResult.rows.map(toItem),
      createdAt: month.created_at.toISOString(),
      updatedAt: month.updated_at.toISOString(),
    });
  }

  /**
   * Replaces a month wholesale, inside a transaction.
   *
   * Items are deleted and re-inserted rather than diffed: a save always carries
   * the complete intended state (the merge logic upstream has already decided
   * which rows survive a re-plan), and a partial application would leave the
   * month in a state no code path expects.
   */
  async save(month: CalendarMonth): Promise<void> {
    assertMonthId(month.id);
    await this.ensureSchema();

    await this.transaction(async (client) => {
      await client.query(
        `INSERT INTO calendar_months (id, year, month, theme, platform_notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, now())
         ON CONFLICT (id) DO UPDATE SET
           year = EXCLUDED.year,
           month = EXCLUDED.month,
           theme = EXCLUDED.theme,
           platform_notes = EXCLUDED.platform_notes,
           updated_at = now()`,
        [
          month.id,
          month.year,
          month.month,
          JSON.stringify(month.theme),
          JSON.stringify(month.platformNotes),
          month.createdAt,
        ],
      );

      await client.query("DELETE FROM calendar_items WHERE month_id = $1", [
        month.id,
      ]);

      // Shorts reference the reel they were cut from, so the referenced rows
      // must exist first. Insert non-derived items ahead of derived ones.
      const ordered = [...month.items].sort(
        (a, b) => Number(Boolean(a.derivedFrom)) - Number(Boolean(b.derivedFrom)),
      );

      for (const item of ordered) {
        await client.query(
          `INSERT INTO calendar_items (
             id, month_id, post_date, day, week, platform, bucket, format,
             topic, copy, caption, hashtags, hook, cta, seo_keywords, rationale,
             shoot, edit, posted, live_link, derived_from
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8,
             $9, $10, $11, $12, $13, $14, $15, $16,
             $17, $18, $19, $20, $21
           )`,
          [
            item.id,
            month.id,
            item.date,
            item.day,
            item.week,
            item.platform,
            item.bucket,
            item.format,
            item.topic,
            item.copy,
            item.caption,
            item.hashtags,
            item.hook,
            item.cta,
            item.seoKeywords,
            item.rationale,
            item.production.shoot,
            item.production.edit,
            item.production.posted,
            item.liveLink,
            item.derivedFrom ?? null,
          ],
        );
      }
    });
  }

  /**
   * The reason this adapter exists: one row, one statement, no read-modify-write
   * window for a concurrent edit to fall into.
   */
  async setProduction(
    monthId: string,
    itemId: string,
    stage: ProductionStage,
    value: boolean,
  ): Promise<void> {
    assertMonthId(monthId);
    await this.ensureSchema();

    // The column name is not interpolated from caller input — it comes from a
    // closed map keyed by the ProductionStage union.
    const column = STAGE_COLUMN[stage];
    const { rowCount } = await this.pool.query(
      `UPDATE calendar_items SET ${column} = $1 WHERE id = $2 AND month_id = $3`,
      [value, itemId, monthId],
    );

    if (rowCount === 0) await this.explainMissing(monthId, itemId);
    await this.touch(monthId);
  }

  async setLiveLink(
    monthId: string,
    itemId: string,
    link: string | null,
  ): Promise<void> {
    assertMonthId(monthId);
    await this.ensureSchema();

    const { rowCount } = await this.pool.query(
      "UPDATE calendar_items SET live_link = $1 WHERE id = $2 AND month_id = $3",
      [normaliseLiveLink(link), itemId, monthId],
    );

    if (rowCount === 0) await this.explainMissing(monthId, itemId);
    await this.touch(monthId);
  }

  /** Distinguishes "no such month" from "no such item" for the error message. */
  private async explainMissing(monthId: string, itemId: string): Promise<never> {
    const { rowCount } = await this.pool.query(
      "SELECT 1 FROM calendar_months WHERE id = $1",
      [monthId],
    );
    if (rowCount === 0) throw new CalendarNotFoundError(monthId);
    throw new ItemNotFoundError(itemId, monthId);
  }

  private async touch(monthId: string): Promise<void> {
    await this.pool.query(
      "UPDATE calendar_months SET updated_at = now() WHERE id = $1",
      [monthId],
    );
  }

  private async transaction<T>(
    fn: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

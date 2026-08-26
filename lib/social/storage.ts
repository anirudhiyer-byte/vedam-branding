import { promises as fs } from "node:fs";
import path from "node:path";
import type { CalendarMonth, ProductionStage } from "./types";

/**
 * Storage adapter. The JSON implementation below needs zero setup and is what
 * runs by default, but it writes to the local filesystem — which means it works
 * in `next dev` and on a Node host (Railway, Render, a VPS, Docker) and does
 * NOT work on serverless platforms with a read-only filesystem, including
 * Vercel. To move to Postgres, implement this interface against your database
 * and swap the export at the bottom of the file; nothing else changes.
 */
export interface CalendarStore {
  list(): Promise<string[]>;
  get(id: string): Promise<CalendarMonth | null>;
  save(month: CalendarMonth): Promise<void>;
  setProduction(
    monthId: string,
    itemId: string,
    stage: ProductionStage,
    value: boolean,
  ): Promise<void>;
  setLiveLink(
    monthId: string,
    itemId: string,
    link: string | null,
  ): Promise<void>;
}

const DATA_DIR = path.join(process.cwd(), "data", "calendars");

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function fileFor(id: string) {
  // Guard against path traversal via a crafted month id.
  if (!/^\d{4}-\d{2}$/.test(id)) throw new Error(`Invalid calendar id: ${id}`);
  return path.join(DATA_DIR, `${id}.json`);
}

class JsonCalendarStore implements CalendarStore {
  async list(): Promise<string[]> {
    await ensureDir();
    const files = await fs.readdir(DATA_DIR);
    return files
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""))
      .sort()
      .reverse();
  }

  async get(id: string): Promise<CalendarMonth | null> {
    try {
      const raw = await fs.readFile(fileFor(id), "utf8");
      return JSON.parse(raw) as CalendarMonth;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  }

  async save(month: CalendarMonth): Promise<void> {
    await ensureDir();
    const next = { ...month, updatedAt: new Date().toISOString() };
    await fs.writeFile(fileFor(month.id), JSON.stringify(next, null, 2), "utf8");
  }

  /**
   * Read-modify-write. Two teammates ticking boxes on the same month within the
   * same instant can drop one update — acceptable for a small team on a single
   * Node process, and the reason to move to Postgres as the team grows.
   */
  private async mutateItem(
    monthId: string,
    itemId: string,
    fn: (item: CalendarMonth["items"][number]) => void,
  ) {
    const month = await this.get(monthId);
    if (!month) throw new Error(`No calendar for ${monthId}`);
    const item = month.items.find((i) => i.id === itemId);
    if (!item) throw new Error(`No item ${itemId} in ${monthId}`);
    fn(item);
    await this.save(month);
  }

  async setProduction(
    monthId: string,
    itemId: string,
    stage: ProductionStage,
    value: boolean,
  ): Promise<void> {
    await this.mutateItem(monthId, itemId, (item) => {
      item.production[stage] = value;
    });
  }

  async setLiveLink(
    monthId: string,
    itemId: string,
    link: string | null,
  ): Promise<void> {
    await this.mutateItem(monthId, itemId, (item) => {
      item.liveLink = link && link.trim() !== "" ? link.trim() : null;
    });
  }
}

export const store: CalendarStore = new JsonCalendarStore();

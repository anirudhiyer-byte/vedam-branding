import { promises as fs } from "node:fs";
import path from "node:path";
import type { CalendarMonth, ProductionStage } from "../types";
import { assertMonthId, normaliseLiveLink, parseCalendar } from "../validation";
import {
  CalendarNotFoundError,
  ItemNotFoundError,
  type CalendarStore,
} from "./types";

/** Raised when the store is running somewhere it fundamentally cannot write. */
export class ReadOnlyFilesystemError extends Error {
  readonly status = 500;
  constructor(cause: NodeJS.ErrnoException) {
    super(
      "The calendar could not be saved: this host's filesystem is read-only " +
        `(${cause.code}). Serverless platforms — Vercel among them — allow ` +
        "writes only to /tmp, which does not survive a request. Attach a " +
        "Postgres database and set DATABASE_URL; the app switches adapters on " +
        "its own. Nothing else needs to change.",
    );
    this.name = "ReadOnlyFilesystemError";
    this.cause = cause;
  }
}

/**
 * Recognises the "this host will never let us write" family of errors.
 *
 * Without this the operator sees a bare `EROFS: read-only file system` after a
 * multi-minute generation run has already been paid for, with nothing pointing
 * at the actual fix.
 */
export function asReadOnlyError(err: unknown): ReadOnlyFilesystemError | null {
  const code = (err as NodeJS.ErrnoException)?.code;
  return code === "EROFS" || code === "EACCES" || code === "EPERM"
    ? new ReadOnlyFilesystemError(err as NodeJS.ErrnoException)
    : null;
}

/**
 * JSON-file storage. The zero-setup default for local development.
 *
 * Two real defects in the original version are fixed here:
 *
 * 1. **Torn writes.** `writeFile` straight onto the live path leaves a
 *    truncated, unparseable calendar if the process dies mid-write. Writes now
 *    go to a temporary file in the same directory and are moved into place with
 *    `rename`, which is atomic on POSIX — a reader sees either the old file or
 *    the new one, never half of one.
 *
 * 2. **Lost updates.** Two people ticking boxes on the same month within the
 *    same instant both read, both mutate, and the second write silently
 *    discarded the first. A per-month promise chain now serialises
 *    read-modify-write cycles.
 *
 * The mutex is per-process, so it protects a single Node server and nothing
 * more. That is the honest boundary of this adapter: on more than one instance,
 * or on any read-only filesystem host, use the Postgres store.
 */
export class JsonCalendarStore implements CalendarStore {
  private readonly dir: string;
  /** One promise chain per month id, serialising that month's mutations. */
  private readonly locks = new Map<string, Promise<unknown>>();

  constructor(dir = path.join(process.cwd(), "data", "calendars")) {
    this.dir = dir;
  }

  describe() {
    return `JSON files in ${this.dir} (single-process only)`;
  }

  async healthCheck() {
    try {
      await fs.mkdir(this.dir, { recursive: true });
      // Prove the directory is actually writable rather than merely present —
      // a read-only mount passes mkdir and fails on the first real save.
      const probe = path.join(this.dir, `.write-probe-${process.pid}`);
      await fs.writeFile(probe, "ok", "utf8");
      await fs.rm(probe, { force: true });
    } catch (err) {
      throw asReadOnlyError(err) ?? err;
    }
  }

  private fileFor(id: string) {
    return path.join(this.dir, `${assertMonthId(id)}.json`);
  }

  /** Serialises `fn` against other mutations of the same month. */
  private withLock<T>(monthId: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(monthId) ?? Promise.resolve();
    // Chain off the settled result so one failure does not poison the queue.
    const next = previous.then(fn, fn);
    this.locks.set(
      monthId,
      next.catch(() => undefined),
    );
    return next.finally(() => {
      // Drop the entry once this is the tail, so the map cannot grow forever.
      if (this.locks.get(monthId) === next) this.locks.delete(monthId);
    });
  }

  async list(): Promise<string[]> {
    await fs.mkdir(this.dir, { recursive: true });
    const files = await fs.readdir(this.dir);
    return files
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""))
      .filter((id) => /^\d{4}-(0[1-9]|1[0-2])$/.test(id))
      .sort()
      .reverse();
  }

  async get(id: string): Promise<CalendarMonth | null> {
    let raw: string;
    try {
      raw = await fs.readFile(this.fileFor(id), "utf8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
    return parseCalendar(id, JSON.parse(raw));
  }

  async save(month: CalendarMonth): Promise<void> {
    await this.withLock(month.id, () => this.writeAtomic(month));
  }

  private async writeAtomic(month: CalendarMonth): Promise<void> {
    const target = this.fileFor(month.id);
    const next = { ...month, updatedAt: new Date().toISOString() };
    // Same directory, so the rename stays within one filesystem and is atomic.
    const temp = `${target}.${process.pid}.${Date.now()}.tmp`;

    try {
      await fs.mkdir(this.dir, { recursive: true });
      await fs.writeFile(temp, JSON.stringify(next, null, 2), "utf8");
      await fs.rename(temp, target);
    } catch (err) {
      await fs.rm(temp, { force: true }).catch(() => undefined);
      throw asReadOnlyError(err) ?? err;
    }
  }

  /** Read-modify-write, serialised per month by the lock. */
  private mutateItem(
    monthId: string,
    itemId: string,
    fn: (item: CalendarMonth["items"][number]) => void,
  ): Promise<void> {
    return this.withLock(monthId, async () => {
      const month = await this.get(monthId);
      if (!month) throw new CalendarNotFoundError(monthId);

      const item = month.items.find((i) => i.id === itemId);
      if (!item) throw new ItemNotFoundError(itemId, monthId);

      fn(item);
      await this.writeAtomic(month);
    });
  }

  setProduction(
    monthId: string,
    itemId: string,
    stage: ProductionStage,
    value: boolean,
  ): Promise<void> {
    return this.mutateItem(monthId, itemId, (item) => {
      item.production[stage] = value;
    });
  }

  setLiveLink(
    monthId: string,
    itemId: string,
    link: string | null,
  ): Promise<void> {
    const normalised = normaliseLiveLink(link);
    return this.mutateItem(monthId, itemId, (item) => {
      item.liveLink = normalised;
    });
  }
}

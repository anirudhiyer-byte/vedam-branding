import { env } from "@/lib/config/env";
import { logger } from "@/lib/observability/logger";
import { JsonCalendarStore } from "./json-store";
import { PostgresCalendarStore } from "./postgres-store";
import type { CalendarStore } from "./types";

export type { CalendarStore } from "./types";
export { CalendarNotFoundError, ItemNotFoundError } from "./types";
export { JsonCalendarStore } from "./json-store";
export { PostgresCalendarStore } from "./postgres-store";

/**
 * Picks the storage backend from the environment.
 *
 * `DATABASE_URL` set means Postgres; unset means JSON files. There is no third
 * option and no silent fallback: a Postgres URL that does not work is an error
 * at startup, not a quiet demotion to a filesystem that the host may not even
 * let us write to.
 */
function build(): CalendarStore {
  if (env.DATABASE_URL) return new PostgresCalendarStore(env.DATABASE_URL);
  return new JsonCalendarStore();
}

let instance: CalendarStore | null = null;

export function getStore(): CalendarStore {
  if (!instance) {
    instance = build();
    logger.info("storage.selected", { backend: instance.describe() });
  }
  return instance;
}

/** Test seam: swaps the backend, e.g. for a temp-directory JSON store. */
export function setStore(next: CalendarStore | null): void {
  instance = next;
}

/**
 * Lazily-resolved store, so importing this module never opens a connection —
 * only actually using it does. That keeps the marketing pages, the build, and
 * the unit tests free of any database requirement.
 */
export const store: CalendarStore = new Proxy({} as CalendarStore, {
  get(_target, key: string) {
    const value = getStore()[key as keyof CalendarStore];
    return typeof value === "function" ? value.bind(getStore()) : value;
  },
});

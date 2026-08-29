import type { CalendarMonth, ProductionStage } from "../types";

/**
 * The persistence contract.
 *
 * Two implementations ship: Postgres (used whenever DATABASE_URL is set) and
 * JSON-on-disk (the zero-setup local default). Everything above this interface
 * is storage-agnostic, so moving between them is an environment variable, not
 * a refactor.
 */
export interface CalendarStore {
  /** Month ids, newest first. */
  list(): Promise<string[]>;
  get(id: string): Promise<CalendarMonth | null>;
  save(month: CalendarMonth): Promise<void>;
  /**
   * Flips one production checkbox.
   *
   * Deliberately narrower than `save`: two people ticking different boxes on
   * the same month must not overwrite each other, which a read-modify-write of
   * the whole document cannot guarantee. Implementations update the single
   * item atomically.
   */
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
  /** Human-readable description of where data is going, for the boot log. */
  describe(): string;
  /** Verifies the backend is reachable and correctly shaped. */
  healthCheck(): Promise<void>;
}

export class CalendarNotFoundError extends Error {
  readonly status = 404;
  constructor(monthId: string) {
    super(`No calendar stored for ${monthId}.`);
    this.name = "CalendarNotFoundError";
  }
}

export class ItemNotFoundError extends Error {
  readonly status = 404;
  constructor(itemId: string, monthId: string) {
    super(`No item ${itemId} in ${monthId}.`);
    this.name = "ItemNotFoundError";
  }
}

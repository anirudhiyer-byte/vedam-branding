import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Every Server Action must authenticate before it does anything.
 *
 * This is a source-level check rather than a runtime one, deliberately. The
 * failure it guards against is not an action that authenticates incorrectly —
 * it is an action added six months from now that forgets to authenticate at
 * all. That mistake is invisible in review (the file already looks like it
 * handles auth) and catastrophic in production: these actions spend money and
 * mutate the calendar, and they are reachable by direct POST.
 *
 * A runtime test would have to mock Next's request context per action and would
 * still only cover the actions someone remembered to add to it.
 */

const ACTIONS = "app/studio/actions.ts";

/** Names of every `export async function` in a module. */
function exportedActions(source: string): string[] {
  return [...source.matchAll(/export\s+async\s+function\s+(\w+)/g)].map(
    (m) => m[1],
  );
}

/** The body of one function, from its signature to the next top-level export. */
function bodyOf(source: string, name: string): string {
  const start = source.indexOf(`export async function ${name}`);
    const rest = source.slice(start + 1);
  const next = rest.search(/\nexport (async )?function |\nfunction /);
  return next === -1 ? rest : rest.slice(0, next);
}

describe("studio server actions", () => {
  const source = readFileSync(ACTIONS, "utf8");
  const actions = exportedActions(source);

  it("has actions to check", () => {
    // A rename that empties this list would make every assertion below vacuous.
    expect(actions.length).toBeGreaterThanOrEqual(4);
    expect(actions).toEqual(
      expect.arrayContaining([
        "toggleProduction",
        "saveLiveLink",
        "generateMonth",
        "replanPlatform",
      ]),
    );
  });

  it.each(["toggleProduction", "saveLiveLink", "generateMonth", "replanPlatform"])(
    "%s authenticates before reading the form",
    (name) => {
      const body = bodyOf(source, name);
      const guard = body.indexOf("requireStudioSession");
      const firstFormRead = body.indexOf("formData.get");

      expect(guard, `${name} never calls requireStudioSession()`).toBeGreaterThan(-1);
      if (firstFormRead > -1) {
        // Order matters: a forged request should not reach input parsing.
        expect(
          guard,
          `${name} reads formData before authenticating`,
        ).toBeLessThan(firstFormRead);
      }
    },
  );

  it("guards every exported action, including ones added later", () => {
    const unguarded = actions.filter(
      (name) => !bodyOf(source, name).includes("requireStudioSession"),
    );
    expect(
      unguarded,
      `These Server Actions are reachable by direct POST with no auth check: ${unguarded.join(", ")}`,
    ).toEqual([]);
  });

  it("rate-limits the two actions that spend money", () => {
    for (const name of ["generateMonth", "replanPlatform"]) {
      expect(bodyOf(source, name), `${name} is not rate limited`).toContain(
        "RATE_LIMITS.generate",
      );
    }
  });

  it("proves storage is writable before spending on model calls", () => {
    // On a read-only host — a Vercel deployment with no DATABASE_URL — a month
    // costs five calls and several minutes, then fails on save. Checking first
    // makes that a clear error and a zero bill.
    for (const name of ["generateMonth", "replanPlatform"]) {
      const body = bodyOf(source, name);
      const check = body.indexOf("assertStorageWritable");
      const spend = Math.min(
        ...[body.indexOf("generateCalendar("), body.indexOf("regeneratePlatform(")]
          .filter((i) => i > -1),
      );

      expect(check, `${name} never checks storage`).toBeGreaterThan(-1);
      expect(
        check,
        `${name} spends before confirming the result can be saved`,
      ).toBeLessThan(spend);
    }
  });
});

describe("studio route protection", () => {
  it("guards the page itself, not only the proxy", () => {
    // Next's docs are explicit that a matcher change can silently drop proxy
    // coverage, so the page must not rely on it.
    expect(readFileSync("app/studio/page.tsx", "utf8")).toContain(
      "requireStudioSession",
    );
  });

  it("leaves the login route reachable", () => {
    const proxy = readFileSync("proxy.ts", "utf8");
    // A matcher covering /studio/login would make signing in impossible.
    expect(proxy).toContain("login");
  });
});

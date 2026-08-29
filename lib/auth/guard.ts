import "server-only";

import { cookies } from "next/headers";
import { env, isProduction } from "@/lib/config/env";
import {
  SESSION_COOKIE,
  verifySessionToken,
  type SessionPayload,
} from "./session";

/**
 * The authorization boundary for the Studio.
 *
 * The route guard in `proxy.ts` stops a browser from *rendering* the Studio,
 * but Next.js documents that Server Actions are POSTs to the page route and
 * that a matcher change can silently drop proxy coverage — so the proxy is a
 * convenience, never the boundary. Every action calls `requireStudioSession()`
 * itself. Both layers must fail for an unauthenticated request to do anything.
 */

/** Thrown by `requireStudioSession`. Carries no detail the client can mine. */
export class UnauthorizedError extends Error {
  readonly status = 401;
  constructor(message = "Not signed in.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/** Thrown when the Studio is unusable because it was never configured. */
export class StudioNotConfiguredError extends Error {
  readonly status = 503;
  constructor(message: string) {
    super(message);
    this.name = "StudioNotConfiguredError";
  }
}

/**
 * Whether the Studio has the configuration it needs to authenticate anyone.
 *
 * In production a missing password is fatal: the tool spends money and mutates
 * data, so "no password configured" must mean "nobody gets in", never "anyone
 * gets in". Locally it is merely a blocked login with a clear message.
 */
export function studioAuthConfigured(): boolean {
  return Boolean(env.STUDIO_PASSWORD && env.STUDIO_SESSION_SECRET);
}

export function assertStudioConfigured(): void {
  if (studioAuthConfigured()) return;

  const missing = [
    !env.STUDIO_PASSWORD && "STUDIO_PASSWORD",
    !env.STUDIO_SESSION_SECRET && "STUDIO_SESSION_SECRET",
  ].filter(Boolean);

  throw new StudioNotConfiguredError(
    `The Studio is not configured: ${missing.join(" and ")} ${
      missing.length > 1 ? "are" : "is"
    } not set. ` +
      (isProduction()
        ? "Set them on the deployment before the Studio can be used."
        : "Copy .env.example to .env.local and fill them in."),
  );
}

/** Reads and verifies the session cookie. Returns null when absent/invalid. */
export async function getStudioSession(): Promise<SessionPayload | null> {
  if (!studioAuthConfigured()) return null;

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const result = await verifySessionToken(token);
  return result.ok ? result.payload : null;
}

/**
 * Asserts an authenticated caller. Call this first in every Server Action that
 * reads, mutates, or spends — before touching `formData`, so a forged request
 * cannot even reach input parsing.
 */
export async function requireStudioSession(): Promise<SessionPayload> {
  assertStudioConfigured();

  const session = await getStudioSession();
  if (!session) throw new UnauthorizedError();
  return session;
}

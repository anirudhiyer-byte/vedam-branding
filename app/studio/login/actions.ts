"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/config/env";
import {
  RATE_LIMITS,
  clearRateLimit,
  rateLimit,
  rateLimitMessage,
} from "@/lib/auth/rate-limit";
import { studioAuthConfigured } from "@/lib/auth/guard";
import {
  SESSION_COOKIE,
  createSessionToken,
  secretsMatch,
  sessionCookieOptions,
  sessionTtlSeconds,
} from "@/lib/auth/session";
import { logger } from "@/lib/observability/logger";

export interface LoginState {
  error?: string;
}

/**
 * Only same-origin, absolute-path destinations are honoured. Without this a
 * crafted `?next=https://evil.example` would turn the login form into an open
 * redirect that borrows Vedam's domain for a phishing landing page.
 */
function safeRedirectTarget(raw: string | null): string {
  if (!raw) return "/studio";
  // Reject protocol-relative ("//host") and absolute URLs outright.
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/studio";
  if (!raw.startsWith("/studio")) return "/studio";
  return raw;
}

/** Best-effort client identity for rate limiting. */
async function clientKey(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || "unknown";
  return `login:${ip}`;
}

export async function signIn(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  if (!studioAuthConfigured()) {
    return {
      error:
        "The Studio is not configured yet. STUDIO_PASSWORD and " +
        "STUDIO_SESSION_SECRET must be set before anyone can sign in.",
    };
  }

  const key = await clientKey();
  const decision = await rateLimit(key, RATE_LIMITS.login);
  if (!decision.allowed) {
    logger.warn("studio.login.rate_limited", { key });
    return { error: rateLimitMessage(decision, "sign-in attempts") };
  }

  const password = String(formData.get("password") ?? "");
  const next = safeRedirectTarget(
    formData.get("next") ? String(formData.get("next")) : null,
  );

  // `env.STUDIO_PASSWORD` is non-null here — studioAuthConfigured() checked it.
  const matched = await secretsMatch(env.STUDIO_PASSWORD!, password);
  if (!matched) {
    logger.warn("studio.login.failed", { key });
    // Deliberately identical to every other failure: nothing here tells an
    // attacker whether the password was close, or the account exists.
    return { error: "That password is not right." };
  }

  await clearRateLimit(key);

  const ttl = sessionTtlSeconds();
  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE,
    await createSessionToken(),
    sessionCookieOptions(ttl),
  );

  logger.info("studio.login.succeeded", { ttlSeconds: ttl });
  redirect(next);
}

export async function signOut(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", sessionCookieOptions(0));
  redirect("/studio/login");
}

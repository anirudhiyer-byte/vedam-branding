import { env, isProduction } from "@/lib/config/env";

/**
 * Stateless signed sessions for the internal Studio.
 *
 * Built on Web Crypto rather than `node:crypto` so the exact same code runs in
 * the Next.js proxy (route guard), in Server Actions, and in tests, with no
 * runtime-specific branch. There is no session store: the cookie carries its
 * own expiry and an HMAC-SHA256 signature over it, which is all a single
 * shared-password tool needs and is what keeps the deployment stateless.
 *
 * Threat model, stated plainly: this authenticates *the team*, not individual
 * people. Anyone holding STUDIO_PASSWORD is indistinguishable from anyone else
 * holding it. That is a deliberate trade for a small internal tool — if
 * per-person attribution or revocation is ever needed, the shape to move to is
 * a real identity provider, not more logic here.
 */

export const SESSION_COOKIE = "vedam_studio_session";

/** 12 hours — a working day, so the team logs in about once. */
const DEFAULT_TTL_SECONDS = 12 * 60 * 60;

const TOKEN_VERSION = "v1";

export interface SessionPayload {
  /** Who the session is for. Constant today; a seam for real identities. */
  sub: string;
  /** Issued-at, seconds since epoch. */
  iat: number;
  /** Expiry, seconds since epoch. */
  exp: number;
}

export type VerifyResult =
  | { ok: true; payload: SessionPayload }
  | { ok: false; reason: "malformed" | "bad-signature" | "expired" };

const encoder = new TextEncoder();

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array | null {
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

function sessionSecret(): string {
  const secret = env.STUDIO_SESSION_SECRET;
  if (secret) return secret;

  // Outside production a missing secret must not be silently tolerated with a
  // constant fallback — that would make forged cookies trivial the moment such
  // a build reached a shared environment. Fail loudly instead.
  throw new Error(
    "STUDIO_SESSION_SECRET is not set. Generate one with:\n" +
      `  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`,
  );
}

let keyPromise: Promise<CryptoKey> | null = null;
let keyPromiseSecret: string | null = null;

/** Imports (and caches) the HMAC key. Re-imports if the secret changes. */
function hmacKey(): Promise<CryptoKey> {
  const secret = sessionSecret();
  if (!keyPromise || keyPromiseSecret !== secret) {
    keyPromiseSecret = secret;
    keyPromise = crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
  }
  return keyPromise;
}

async function sign(data: string): Promise<Uint8Array> {
  const key = await hmacKey();
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return new Uint8Array(sig);
}

/**
 * Length-independent, content-constant-time comparison.
 *
 * `crypto.subtle.verify` would be the obvious tool, but it needs a `verify`
 * usage on the key and still leaks length; comparing fixed-size HMAC digests
 * is the portable primitive available in every runtime this code targets.
 */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/**
 * Compares two secrets without leaking their contents through timing.
 *
 * Both sides are HMAC'd first so the comparison runs over fixed-length digests
 * regardless of how long the candidate is — a plain byte loop over the raw
 * strings would reveal the password's length.
 */
export async function secretsMatch(
  expected: string,
  candidate: string,
): Promise<boolean> {
  const [a, b] = await Promise.all([sign(expected), sign(candidate)]);
  return constantTimeEqual(a, b);
}

export function sessionTtlSeconds(): number {
  return env.STUDIO_SESSION_TTL_SECONDS ?? DEFAULT_TTL_SECONDS;
}

/** Mints a signed session token valid for `sessionTtlSeconds()`. */
export async function createSessionToken(
  sub = "studio",
  now: number = Date.now(),
): Promise<string> {
  const iat = Math.floor(now / 1000);
  const payload: SessionPayload = {
    sub,
    iat,
    exp: iat + sessionTtlSeconds(),
  };
  const body = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const signature = base64UrlEncode(await sign(`${TOKEN_VERSION}.${body}`));
  return `${TOKEN_VERSION}.${body}.${signature}`;
}

/**
 * Verifies a token's signature and expiry.
 *
 * The signature is always checked before the payload is trusted, and the
 * failure reason is deliberately coarse — callers turn every failure into the
 * same redirect, so nothing distinguishes "expired" from "forged" externally.
 */
export async function verifySessionToken(
  token: string | undefined | null,
  now: number = Date.now(),
): Promise<VerifyResult> {
  if (!token) return { ok: false, reason: "malformed" };

  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) {
    return { ok: false, reason: "malformed" };
  }
  const [, body, signature] = parts;

  const provided = base64UrlDecode(signature);
  if (!provided) return { ok: false, reason: "malformed" };

  const expected = await sign(`${TOKEN_VERSION}.${body}`);
  if (!constantTimeEqual(expected, provided)) {
    return { ok: false, reason: "bad-signature" };
  }

  const raw = base64UrlDecode(body);
  if (!raw) return { ok: false, reason: "malformed" };

  let payload: SessionPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(raw)) as SessionPayload;
  } catch {
    return { ok: false, reason: "malformed" };
  }

  if (
    typeof payload?.exp !== "number" ||
    typeof payload?.iat !== "number" ||
    typeof payload?.sub !== "string"
  ) {
    return { ok: false, reason: "malformed" };
  }

  if (payload.exp * 1000 <= now) return { ok: false, reason: "expired" };

  return { ok: true, payload };
}

/** Cookie attributes shared by the login action and the sign-out action. */
export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    // Lax rather than Strict: the Studio is navigated to from bookmarks and
    // links, and Server Actions are same-origin POSTs, which Lax permits.
    sameSite: "lax" as const,
    secure: isProduction(),
    path: "/",
    maxAge,
  };
}

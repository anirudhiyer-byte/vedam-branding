import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  SESSION_COOKIE,
  constantTimeEqual,
  createSessionToken,
  secretsMatch,
  sessionCookieOptions,
  verifySessionToken,
} from "@/lib/auth/session";
import { resetEnvCache } from "@/lib/config/env";
import {
  RATE_LIMITS,
  clearRateLimit,
  rateLimit,
} from "@/lib/auth/rate-limit";

/**
 * Authentication is the finding this codebase most needed fixed, so it is the
 * part most worth testing. These assert the properties that actually matter:
 * a forged token is rejected, an expired one is rejected, and neither the
 * password nor the signing key can be swapped without invalidating sessions.
 */

const SECRET = "test-secret-at-least-32-characters-long!!";

beforeEach(() => {
  process.env.STUDIO_SESSION_SECRET = SECRET;
  process.env.STUDIO_PASSWORD = "a-sufficiently-long-password";
  resetEnvCache();
});

afterEach(() => {
  delete process.env.STUDIO_SESSION_SECRET;
  delete process.env.STUDIO_PASSWORD;
  delete process.env.STUDIO_SESSION_TTL_SECONDS;
  resetEnvCache();
});

describe("session tokens", () => {
  it("round-trips a freshly minted token", async () => {
    const result = await verifySessionToken(await createSessionToken());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.payload.sub).toBe("studio");
  });

  it("rejects a token whose payload was edited", async () => {
    const token = await createSessionToken();
    const [version, body, signature] = token.split(".");

    // Re-encode the payload with a far-future expiry, keeping the old
    // signature — the exact forgery an attacker would attempt.
    const decoded = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as Record<string, unknown>;
    decoded.exp = Math.floor(Date.now() / 1000) + 86_400 * 365;
    const forged = Buffer.from(JSON.stringify(decoded)).toString("base64url");

    const result = await verifySessionToken(`${version}.${forged}.${signature}`);
    expect(result).toEqual({ ok: false, reason: "bad-signature" });
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await createSessionToken();

    process.env.STUDIO_SESSION_SECRET = "a-completely-different-secret-key-32ch";
    resetEnvCache();

    const result = await verifySessionToken(token);
    expect(result).toEqual({ ok: false, reason: "bad-signature" });
  });

  it("rejects an expired token", async () => {
    process.env.STUDIO_SESSION_TTL_SECONDS = "60";
    resetEnvCache();

    const issuedAt = Date.now();
    const token = await createSessionToken("studio", issuedAt);

    // One second past expiry.
    const result = await verifySessionToken(token, issuedAt + 61_000);
    expect(result).toEqual({ ok: false, reason: "expired" });
  });

  it("rejects malformed and missing tokens", async () => {
    for (const bad of [undefined, null, "", "nonsense", "v1.only-two", "v9.a.b"]) {
      const result = await verifySessionToken(bad);
      expect(result.ok).toBe(false);
    }
  });

  it("refuses to sign when no secret is configured", async () => {
    delete process.env.STUDIO_SESSION_SECRET;
    resetEnvCache();
    // A constant fallback secret would make forgery trivial, so this throws
    // rather than quietly signing with a default.
    await expect(createSessionToken()).rejects.toThrow(/STUDIO_SESSION_SECRET/);
  });
});

describe("secretsMatch", () => {
  it("accepts the exact password and rejects near-misses", async () => {
    expect(await secretsMatch("hunter2hunter2", "hunter2hunter2")).toBe(true);
    expect(await secretsMatch("hunter2hunter2", "hunter2hunter3")).toBe(false);
    expect(await secretsMatch("hunter2hunter2", "hunter2hunter")).toBe(false);
    expect(await secretsMatch("hunter2hunter2", "")).toBe(false);
  });
});

describe("constantTimeEqual", () => {
  it("compares by content and rejects differing lengths", () => {
    expect(constantTimeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2]))).toBe(true);
    expect(constantTimeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 3]))).toBe(false);
    expect(constantTimeEqual(new Uint8Array([1]), new Uint8Array([1, 2]))).toBe(false);
  });
});

describe("session cookie", () => {
  it("is httpOnly and lax so it cannot be read by script", () => {
    const options = sessionCookieOptions(3600);
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
    expect(SESSION_COOKIE).toBe("vedam_studio_session");
  });
});

describe("rate limiting", () => {
  it("permits exactly `limit` attempts, then refuses", async () => {
    const key = `test:${crypto.randomUUID()}`;
    const rule = { limit: 3, windowMs: 60_000 };

    for (let i = 0; i < 3; i++) {
      expect((await rateLimit(key, rule)).allowed).toBe(true);
    }

    const refused = await rateLimit(key, rule);
    expect(refused.allowed).toBe(false);
    expect(refused.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("starts a fresh window once the old one lapses", async () => {
    const key = `test:${crypto.randomUUID()}`;
    const rule = { limit: 1, windowMs: 1_000 };
    const now = Date.now();

    expect((await rateLimit(key, rule, now)).allowed).toBe(true);
    expect((await rateLimit(key, rule, now + 100)).allowed).toBe(false);
    expect((await rateLimit(key, rule, now + 1_500)).allowed).toBe(true);
  });

  it("clears a key so one typo does not cost the whole window", async () => {
    const key = `test:${crypto.randomUUID()}`;
    await rateLimit(key, RATE_LIMITS.login);
    await clearRateLimit(key);

    const after = await rateLimit(key, RATE_LIMITS.login);
    expect(after.remaining).toBe(RATE_LIMITS.login.limit - 1);
  });

  it("tracks keys independently", async () => {
    const rule = { limit: 1, windowMs: 60_000 };
    const a = `a:${crypto.randomUUID()}`;
    const b = `b:${crypto.randomUUID()}`;

    await rateLimit(a, rule);
    expect((await rateLimit(a, rule)).allowed).toBe(false);
    expect((await rateLimit(b, rule)).allowed).toBe(true);
  });
});

"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Studio error boundary.
 *
 * The Studio's most common failure is an expired session, which surfaces as an
 * UnauthorizedError thrown from a Server Action. That is a normal end-of-day
 * event rather than a fault, so it gets its own explanation and a way back in.
 */
export default function StudioError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(
      JSON.stringify({
        level: "error",
        event: "studio.render_failed",
        time: new Date().toISOString(),
        digest: error.digest,
        message: error.message,
      }),
    );
  }, [error]);

  const looksUnauthorized = /unauthor|not signed in|session/i.test(
    error.message,
  );

  return (
    <div className="mx-auto max-w-lg py-24">
      <div className="card p-8">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {looksUnauthorized ? "Your session expired" : "Something broke"}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          {looksUnauthorized
            ? "Studio sessions last twelve hours. Sign in again to carry on — nothing you saved has been lost."
            : "The error has been logged. Try again, or reload the page."}
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-xs text-ink-faint">
            Reference: {error.digest}
          </p>
        )}
        <div className="mt-6 flex gap-3">
          {looksUnauthorized ? (
            <a
              href="/studio/login"
              className="inline-flex h-12 items-center justify-center rounded-full bg-violet px-6 text-sm font-medium text-on-dark"
            >
              Sign in
            </a>
          ) : (
            <Button onClick={reset}>Try again</Button>
          )}
        </div>
      </div>
    </div>
  );
}

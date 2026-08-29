"use client";

import { useEffect } from "react";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary.
 *
 * Without one, an unhandled render error showed the framework's default page.
 * `error.message` is deliberately not rendered — it can carry internal detail —
 * but `error.digest` is, because that is the token that ties what the visitor
 * saw to the line in the server log.
 */
export default function Error({
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
        event: "page.render_failed",
        time: new Date().toISOString(),
        digest: error.digest,
        message: error.message,
      }),
    );
  }, [error]);

  return (
    <main id="main" className="flex flex-1 items-center py-24">
      <Container>
        <p className="eyebrow">Something went wrong</p>
        <h1 className="mt-4 max-w-2xl font-display text-4xl leading-tight tracking-tight text-balance md:text-5xl">
          This page didn&rsquo;t load.
        </h1>
        <p className="mt-6 max-w-md leading-relaxed text-ink-muted">
          The error has been logged. Try again, and if it keeps happening let us
          know.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-xs text-ink-faint">
            Reference: {error.digest}
          </p>
        )}
        <div className="mt-10">
          <Button onClick={reset}>Try again</Button>
        </div>
      </Container>
    </main>
  );
}

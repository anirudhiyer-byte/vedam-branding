import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/studio/login-form";
import { getStudioSession, studioAuthConfigured } from "@/lib/auth/guard";
import { Wordmark } from "@/components/wordmark";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

// Reads a cookie, so it must never be cached.
export const dynamic = "force-dynamic";

export default async function StudioLoginPage(
  props: PageProps<"/studio/login">,
) {
  const sp = await props.searchParams;

  // Already signed in? Don't make them type it again.
  if (await getStudioSession()) redirect("/studio");

  const rawNext = Array.isArray(sp.next) ? sp.next[0] : sp.next;
  const configured = studioAuthConfigured();

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="card w-full max-w-md p-8">
        <Wordmark />

        <h1 className="mt-8 font-display text-2xl font-bold tracking-tight">
          Content Studio
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Internal tool. Planning a month makes billed model calls, so it sits
          behind a password.
        </p>

        {configured ? (
          <LoginForm next={rawNext ?? null} />
        ) : (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-rule bg-paper-alt p-4 text-sm leading-relaxed text-ink-muted"
          >
            <p className="font-semibold text-ink">Not configured yet</p>
            <p className="mt-1.5">
              Set <code className="font-mono text-xs">STUDIO_PASSWORD</code> and{" "}
              <code className="font-mono text-xs">STUDIO_SESSION_SECRET</code>{" "}
              before anyone can sign in. See{" "}
              <code className="font-mono text-xs">.env.example</code>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

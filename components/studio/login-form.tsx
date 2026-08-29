"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "@/app/studio/login/actions";
import { Button } from "@/components/ui/button";

const initial: LoginState = {};

export function LoginForm({ next }: { next: string | null }) {
  const [state, action, pending] = useActionState(signIn, initial);

  return (
    <form action={action} className="mt-6">
      {next && <input type="hidden" name="next" value={next} />}

      <label className="block">
        <span className="eyebrow">Studio password</span>
        <input
          type="password"
          name="password"
          required
          autoFocus
          autoComplete="current-password"
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "login-error" : undefined}
          className="mt-1.5 w-full rounded-xl border border-rule bg-paper-alt px-3.5 py-3 text-sm focus:border-accent focus:bg-paper"
        />
      </label>

      {state.error && (
        <p
          id="login-error"
          role="alert"
          className="mt-3 rounded-xl border border-accent/40 bg-accent-soft px-3 py-2 text-sm"
        >
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="mt-5 w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

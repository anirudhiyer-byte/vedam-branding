import { signOut } from "@/app/studio/login/actions";

/**
 * There has to be a way out.
 *
 * Sessions are stateless and last twelve hours, so on a shared machine the
 * only way to end one early is to clear the cookie deliberately.
 */
export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="min-h-11 w-full rounded-2xl border border-rule px-4 py-2.5 text-sm font-bold text-ink-muted transition-colors hover:border-ink hover:text-ink"
      >
        Sign out
      </button>
    </form>
  );
}

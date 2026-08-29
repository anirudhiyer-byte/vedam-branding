/**
 * Shown while the Studio page reads storage. The page is force-dynamic, so on
 * a cold Postgres connection this is the difference between a blank tab and
 * visible progress.
 */
export default function StudioLoading() {
  return (
    <div className="studio-ui mx-auto w-full max-w-[104rem] animate-pulse space-y-6">
      <div className="h-12 w-64 rounded-2xl bg-paper-alt" />
      <div className="h-40 rounded-3xl bg-paper-alt" />
      <div className="h-72 rounded-3xl bg-paper-alt" />
      <span className="sr-only" role="status">
        Loading the calendar
      </span>
    </div>
  );
}

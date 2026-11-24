/**
 * App-level loading state: auth-gated pages block on the session lookup
 * and DB queries, so this shell keeps the studio responsive in between.
 */
export default function AppLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <div className="flex items-center gap-3 text-muted-foreground">
        <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/60" />
        <span className="font-ui-mono text-[10px] uppercase tracking-[0.2em]">
          Loading
        </span>
      </div>
    </div>
  );
}

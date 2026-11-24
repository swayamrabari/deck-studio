"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

/**
 * App-level error boundary: keeps failures (DB unavailable, migration
 * error, render crash) inside the studio shell instead of the raw
 * framework error page.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface server errors where the logs are.
    console.error(error);
  }, [error]);

  const router = useRouter();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="font-ui-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Something broke
      </p>
      <h1 className="text-3xl font-medium tracking-tight">
        The studio hit an error
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        The page failed to render. Retrying usually helps; if it persists,
        check the server log.
      </p>
      <div className="flex items-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button
          variant="outline"
          onClick={() => {
            router.push("/decks");
          }}
        >
          Back to decks
        </Button>
      </div>
      {error.digest ? (
        <p className="font-ui-mono text-[10px] text-muted-foreground">
          {error.digest}
        </p>
      ) : null}
    </div>
  );
}

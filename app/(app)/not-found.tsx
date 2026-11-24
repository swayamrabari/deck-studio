import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="font-ui-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
        404
      </p>
      <h1 className="text-3xl font-medium tracking-tight">
        This page doesn&apos;t exist
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        The deck you&apos;re looking for was moved, deleted, or never existed.
      </p>
      <Link href="/decks" className={cn(buttonVariants({ variant: "outline" }))}>
        Back to your decks
      </Link>
    </div>
  );
}

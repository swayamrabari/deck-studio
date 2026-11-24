import Link from "next/link";
import { redirect } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { requireUser, signupsOpen } from "@/lib/auth";
import { cn } from "cn";

// Auth-aware: reads the session cookie, so the route blocks on the server
// instead of prerendering a shell.
export const instant = false;

export default async function Home() {
  const user = await requireUser();
  if (user) redirect("/decks");

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
        pptxgen · code-first decks
      </p>
      <h1 className="mt-6 text-5xl font-medium tracking-tight text-balance sm:text-6xl">
        Slides as code.
      </h1>
      <p className="mt-6 max-w-xl text-balance text-muted-foreground">
        Log in, create a deck, and author it in the browser like a Next.js
        app — React components, Tailwind, a live preview, and a built-in
        presenter. No exports, ever.
      </p>
      <div className="mt-10 flex items-center gap-3">
        {signupsOpen() ? (
          <Link href="/signup" className={cn(buttonVariants())}>
            Create account
          </Link>
        ) : null}
        <Link
          href="/login"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Sign in
        </Link>
      </div>
      <p className="absolute bottom-8 font-ui-mono text-[10px] text-muted-foreground">
        react · tailwind · token auth · postgres · zero pptx
      </p>
    </div>
  );
}

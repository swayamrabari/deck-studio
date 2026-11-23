import Link from "next/link";
import { PlayIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { SlideCard, deckSlides, slideCount } from "@/components/deck";
import { cn } from "cn";
import { deck } from "@/lib/deck.config";

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:px-10">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Deck · {slideCount} slides · {deck.aspect}
          </p>
          <h1 className="text-3xl font-medium tracking-tight">
            {deck.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {deck.fonts.display} · {deck.fonts.body} · {deck.fonts.mono}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/present" className={cn(buttonVariants())}>
            <PlayIcon />
            Present
          </Link>
          <Link
            href="/style"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Design system
          </Link>
        </div>
      </header>

      {slideCount === 0 ? (
        <div className="mt-16 rounded-lg border border-dashed border-border p-12 text-center">
          <p className="font-medium">No slides yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Add{" "}
            <span className="font-ui-mono text-xs">slides/01-title.tsx</span>{" "}
            and register it in{" "}
            <span className="font-ui-mono text-xs">slides/index.ts</span>.
          </p>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {deckSlides.map((slide, i) => {
            const Slide = slide.component;
            return (
              <SlideCard
                key={i}
                index={i}
                total={slideCount}
                title={slide.title}
                notes={slide.notes}
              >
                <Slide />
              </SlideCard>
            );
          })}
        </div>
      )}

      <footer className="mt-16 border-t border-border pt-6 text-xs text-muted-foreground">
        pptxgen · slides are React components · click a slide to preview
      </footer>
    </div>
  );
}

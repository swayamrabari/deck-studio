import type { Metadata } from "next";
import {
  ArrowRightIcon,
  InfoIcon,
  MaximizeIcon,
  PlayIcon,
  TimerIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { fontRegistry } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Design system — pptxgen",
  description: "Studio tokens, typography, and UI primitives.",
};

const PANGRAM = "Sphinx of black quartz, judge my vow — 0123456789";

const CATEGORY_ORDER = ["sans", "display", "serif", "mono"] as const;

const fontEntries = Object.entries(fontRegistry).sort(
  (a, b) =>
    CATEGORY_ORDER.indexOf(a[1].category) -
      CATEGORY_ORDER.indexOf(b[1].category) || a[0].localeCompare(b[0])
);

function SectionHeading({ index, title }: { index: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-ui-mono text-[10px] text-muted-foreground">
        {index}
      </span>
      <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </h2>
    </div>
  );
}

function Swatch({
  name,
  utility,
  className,
}: {
  name: string;
  utility: string;
  className: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className={`h-14 rounded-md border border-border ${className}`} />
      <p className="mt-3 text-sm font-medium">{name}</p>
      <p className="mt-0.5 font-ui-mono text-[10px] text-muted-foreground">
        {utility}
      </p>
    </div>
  );
}

function Specimen({
  label,
  note,
  className,
  children,
}: {
  label: string;
  note: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{note}</p>
      </div>
      <div className={`mt-4 ${className}`}>{children}</div>
    </div>
  );
}

export default function StylePage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-12 px-6 py-16 sm:px-10">
      <header className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Design system
        </p>
        <h1 className="text-3xl font-medium tracking-tight">Studio</h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          The monochrome language every chrome surface inherits — tokens,
          typography, and primitives. Deck content reads the separate deck
          palette; chrome never touches it, and vice versa.
        </p>
      </header>

      {/* 01 — Studio surfaces */}
      <section className="space-y-4">
        <SectionHeading index="01" title="Surfaces" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Swatch name="Background" utility="bg-background" className="bg-background" />
          <Swatch name="Card" utility="bg-card" className="bg-card" />
          <Swatch name="Popover" utility="bg-popover" className="bg-popover" />
          <Swatch name="Primary" utility="bg-primary" className="bg-primary" />
          <Swatch name="Secondary" utility="bg-secondary" className="bg-secondary" />
          <Swatch name="Muted" utility="bg-muted" className="bg-muted" />
          <Swatch name="Accent" utility="bg-accent" className="bg-accent" />
          <Swatch name="Border" utility="border-border" className="border-2 border-border bg-transparent" />
        </div>
        <div className="flex flex-wrap gap-8 pt-1 text-sm">
          <p className="text-foreground">
            Foreground — the quick brown fox jumps over the lazy dog.
          </p>
          <p className="text-muted-foreground">
            Muted foreground — secondary chrome text, captions, hints.
          </p>
        </div>
      </section>

      {/* 02 — Deck palette */}
      <section className="space-y-4">
        <SectionHeading index="02" title="Deck palette · midnight" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Swatch name="Deck bg" utility="bg-deck-bg" className="bg-deck-bg" />
          <Swatch name="Deck surface" utility="bg-deck-surface" className="bg-deck-surface" />
          <Swatch name="Deck accent" utility="bg-deck-accent" className="bg-deck-accent" />
          <Swatch name="Deck fg / muted" utility="text-deck-fg" className="bg-deck-surface" />
        </div>
        <div className="rounded-lg border border-border p-3">
          <div className="space-y-2 rounded-md bg-deck-bg p-5">
            <p className="text-2xl font-medium text-deck-fg">
              Slides are the only colored citizen.
            </p>
            <p className="text-sm text-deck-muted">
              Chrome stays grayscale; the deck palette is reserved for
              slide content rendered inside the canvas.
            </p>
            <span className="inline-block rounded-sm bg-deck-accent px-2 py-0.5 text-xs font-medium text-deck-bg">
              accent
            </span>
          </div>
        </div>
      </section>

      {/* 03 — Chrome type */}
      <section className="space-y-4">
        <SectionHeading index="03" title="Chrome type" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Specimen label="Geist" note="font-sans · font-heading" className="space-y-2">
            <p className="text-4xl tracking-tight">Aa</p>
            <p className="text-sm text-muted-foreground">{PANGRAM}</p>
          </Specimen>
          <Specimen label="Geist Mono" note="font-ui-mono" className="space-y-2">
            <p className="font-ui-mono text-4xl tracking-tight">Aa</p>
            <p className="font-ui-mono text-sm text-muted-foreground">
              const slides: SlideModule[] = deck;
            </p>
          </Specimen>
        </div>
      </section>

      {/* 04 — Font registry */}
      <section className="space-y-4">
        <SectionHeading index="04" title={`Font registry · ${fontEntries.length} families`} />
        <div className="grid gap-4 sm:grid-cols-2">
          {fontEntries.map(([name, entry]) => (
            <div
              key={entry.varName}
              className="rounded-lg border border-border bg-card p-5"
            >
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-sm font-medium">{name}</p>
                <Badge variant="outline">{entry.category}</Badge>
              </div>
              <p
                className="mt-4 text-5xl tracking-tight"
                style={{ fontFamily: `var(${entry.varName})` }}
              >
                Aa
              </p>
              <p
                className="mt-3 text-base text-muted-foreground"
                style={{ fontFamily: `var(${entry.varName})` }}
              >
                {PANGRAM}
              </p>
              <p className="mt-2 font-ui-mono text-[10px] text-muted-foreground">
                {entry.varName}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 05 — Type slots */}
      <section className="space-y-4">
        <SectionHeading index="05" title="Type slots · app defaults" />
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="space-y-3">
            <p className="text-3xl font-display tracking-tight">
              Display · Space Grotesk
            </p>
            <p className="text-base font-body text-muted-foreground">
              Body · Inter — these are the app&apos;s font slots. Hosted decks
              define their own typography in{" "}
              <span className="font-ui-mono text-sm">deck/styles.css</span>.
            </p>
            <p className="font-mono text-sm text-muted-foreground">
              mono · JetBrains Mono — export const answer = 42;
            </p>
          </div>
        </div>
      </section>

      {/* 06 — Buttons */}
      <section className="space-y-4">
        <SectionHeading index="06" title="Buttons" />
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
            <Button variant="destructive">Destructive</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="xs">XS</Button>
            <Button size="sm">Small</Button>
            <Button>Default</Button>
            <Button size="lg">Large</Button>
            <Button variant="outline">
              Present
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
            <Button variant="outline" size="icon">
              <PlayIcon />
            </Button>
            <Button variant="ghost" size="icon-sm">
              <MaximizeIcon />
            </Button>
          </div>
        </div>
      </section>

      {/* 07 — Badges & Kbd */}
      <section className="space-y-4">
        <SectionHeading index="07" title="Badges &amp; keys" />
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">
              <TimerIcon />
              12:34
            </Badge>
            <Badge variant="ghost">Ghost</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <KbdGroup>
              <Kbd>→</Kbd>
              <Kbd>Space</Kbd>
              <Kbd>N</Kbd>
            </KbdGroup>
            <span>next step</span>
            <KbdGroup>
              <Kbd>Ctrl</Kbd>
              <Kbd>K</Kbd>
            </KbdGroup>
            <span>command</span>
            <Kbd>?</Kbd>
            <span>shortcuts</span>
          </div>
        </div>
      </section>

      {/* 08 — Overlays & feedback */}
      <section className="space-y-4">
        <SectionHeading index="08" title="Overlays &amp; feedback" />
        <div className="flex flex-wrap items-center gap-3">
          <Dialog>
            <DialogTrigger render={<Button variant="outline">Help preview</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Presenter shortcuts</DialogTitle>
                <DialogDescription>
                  A preview of the help overlay that ships with the
                  presenter.
                </DialogDescription>
              </DialogHeader>
              <ul className="space-y-2">
                {(
                  [
                    ["Next step", ["→", "Space", "N"]],
                    ["Previous", ["←", "P"]],
                    ["Fullscreen", ["F"]],
                    ["Overview grid", ["O"]],
                  ] as Array<[string, string[]]>
                ).map(([action, keys]) => (
                  <li
                    key={action}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-muted-foreground">{action}</span>
                    <KbdGroup>
                      {keys.map((k) => (
                        <Kbd key={k}>{k}</Kbd>
                      ))}
                    </KbdGroup>
                  </li>
                ))}
              </ul>
              <DialogFooter showCloseButton />
            </DialogContent>
          </Dialog>

          <Tooltip>
            <TooltipTrigger render={<Button variant="outline" size="icon-sm" />}>
              <InfoIcon />
            </TooltipTrigger>
            <TooltipContent>
              Presenter help <Kbd>?</Kbd>
            </TooltipContent>
          </Tooltip>

          <div className="w-56 space-y-2">
            <Progress value={34} />
            <Progress value={64}>
              <ProgressLabel>Deck progress</ProgressLabel>
              <ProgressValue />
            </Progress>
          </div>

          <Separator orientation="vertical" className="h-8" />
          <span className="text-xs text-muted-foreground">separator</span>
        </div>
      </section>

      <footer className="border-t border-border pt-6 text-xs text-muted-foreground">
        pptxgen · always-dark studio · tokens over hues — every chrome
        surface reads only these tokens and primitives.
      </footer>
    </div>
  );
}

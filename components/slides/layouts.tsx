import type { ReactNode } from "react";

import { cn } from "cn";

/**
 * Engine layout helpers — compose these inside `deck/<NN-name>/page.tsx`.
 * The deck's `layout.tsx` owns the frame; these compose content within it.
 */

export function TitleSlide({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col justify-center">
      {eyebrow ? (
        <p className="font-mono text-sm uppercase tracking-[0.35em] text-deck-muted">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="mt-6 font-display text-8xl font-medium leading-[1.05] tracking-tight text-deck-fg">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-8 max-w-3xl font-body text-2xl leading-relaxed text-deck-muted">
          {subtitle}
        </p>
      ) : null}
      {children ? <div className="mt-12">{children}</div> : null}
    </div>
  );
}

export function SectionSlide({
  number,
  title,
  subtitle,
}: {
  number?: string;
  title: ReactNode;
  subtitle?: ReactNode;
}) {
  return (
    <div className="flex flex-col justify-center">
      {number ? (
        <p className="font-mono text-sm tracking-[0.2em] text-deck-accent">
          {number}
        </p>
      ) : null}
      <h2 className="mt-4 font-display text-7xl font-medium tracking-tight text-deck-fg">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-6 max-w-2xl font-body text-2xl text-deck-muted">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export function Statement({
  children,
  attribution,
}: {
  children: ReactNode;
  attribution?: string;
}) {
  return (
    <div className="flex h-full flex-col justify-center">
      <p className="font-display text-6xl font-medium leading-tight tracking-tight text-deck-fg">
        {children}
      </p>
      {attribution ? (
        <p className="mt-8 font-mono text-sm uppercase tracking-[0.2em] text-deck-muted">
          {attribution}
        </p>
      ) : null}
    </div>
  );
}

const TWO_COLUMN_RATIOS = {
  "1/1": "grid-cols-2",
  "1/2": "grid-cols-[1fr_2fr]",
  "2/1": "grid-cols-[2fr_1fr]",
  "2/3": "grid-cols-[2fr_3fr]",
  "3/2": "grid-cols-[3fr_2fr]",
} as const;

export function TwoColumn({
  children,
  ratio = "1/1",
  className,
}: {
  children: ReactNode;
  ratio?: keyof typeof TWO_COLUMN_RATIOS;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid items-center gap-16",
        TWO_COLUMN_RATIOS[ratio],
        className
      )}
    >
      {children}
    </div>
  );
}

const GRID_COLUMNS = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
} as const;

export function Grid({
  children,
  cols = 3,
  className,
}: {
  children: ReactNode;
  cols?: keyof typeof GRID_COLUMNS;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-8", GRID_COLUMNS[cols], className)}>
      {children}
    </div>
  );
}

export function FullBleed({
  src,
  alt = "",
  overlay = true,
  children,
  className,
}: {
  src: string;
  alt?: string;
  overlay?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex h-full w-full items-end overflow-hidden bg-deck-bg",
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {overlay ? (
        <div className="absolute inset-0 bg-gradient-to-t from-deck-bg via-deck-bg/60 to-transparent" />
      ) : null}
      {children ? <div className="relative z-10 p-2">{children}</div> : null}
    </div>
  );
}

import type { ReactNode } from "react";

import { cn } from "cn";
import { Appear } from "./step";

/**
 * Engine content primitives — deck-token styled, ready to drop into any
 * slide. All monochrome except the deck accent.
 */

export type Bullet = string | { text: string; detail?: string };

export function Bullets({
  items,
  marker = "dot",
  size = "lg",
  reveal = false,
}: {
  items: Bullet[];
  marker?: "dot" | "number" | "dash";
  size?: "md" | "lg";
  /** Reveal bullets one by one (each becomes an `<Appear>` fragment). */
  reveal?: boolean;
}) {
  const textSize = size === "lg" ? "text-2xl" : "text-xl";
  return (
    <ul className="space-y-5">
      {items.map((item, index) => {
        const text = typeof item === "string" ? item : item.text;
        const detail = typeof item === "string" ? undefined : item.detail;
        const content = (
          <div className="flex items-start gap-4">
            {marker === "number" ? (
              <span className="w-8 shrink-0 pt-1.5 font-mono text-sm text-deck-accent">
                {String(index + 1).padStart(2, "0")}
              </span>
            ) : marker === "dash" ? (
              <span className="shrink-0 pt-1 font-mono text-deck-accent">—</span>
            ) : (
              <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-deck-accent" />
            )}
            <div>
              <p className={cn("font-body leading-snug text-deck-fg", textSize)}>
                {text}
              </p>
              {detail ? (
                <p className="mt-1 font-body text-lg leading-snug text-deck-muted">
                  {detail}
                </p>
              ) : null}
            </div>
          </div>
        );
        return (
          <li key={index}>
            {reveal ? <Appear>{content}</Appear> : content}
          </li>
        );
      })}
    </ul>
  );
}

export function Quote({
  children,
  attribution,
}: {
  children: ReactNode;
  attribution?: string;
}) {
  return (
    <div className="flex h-full flex-col justify-center">
      <blockquote className="max-w-4xl font-body text-4xl leading-snug text-deck-fg">
        <span className="text-deck-accent">“</span>
        {children}
        <span className="text-deck-accent">”</span>
      </blockquote>
      {attribution ? (
        <p className="mt-8 font-mono text-sm uppercase tracking-[0.2em] text-deck-muted">
          {attribution}
        </p>
      ) : null}
    </div>
  );
}

export function Stat({
  value,
  label,
  hint,
}: {
  value: ReactNode;
  label: string;
  hint?: string;
}) {
  return (
    <div>
      <p className="font-display text-7xl font-medium tracking-tight text-deck-fg">
        {value}
      </p>
      <p className="mt-3 font-mono text-sm leading-snug text-deck-muted">
        {label}
      </p>
      {hint ? (
        <p className="mt-1 font-body text-sm text-deck-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function StatRow({
  items,
}: {
  items: Array<{ value: ReactNode; label: string; hint?: string }>;
}) {
  return (
    <div
      className="grid gap-10"
      style={{
        gridTemplateColumns: `repeat(${Math.min(Math.max(items.length, 1), 4)}, minmax(0, 1fr))`,
      }}
    >
      {items.map((item) => (
        <Stat
          key={item.label}
          value={item.value}
          label={item.label}
          hint={item.hint}
        />
      ))}
    </div>
  );
}

export function Table({
  head,
  rows,
  align = "left",
}: {
  head: string[];
  rows: Array<Array<string | number>>;
  align?: "left" | "right";
}) {
  return (
    <div className="w-full">
      <table className="w-full border-collapse text-left font-body">
        <thead>
          <tr className="border-b border-deck-surface">
            {head.map((cell) => (
              <th
                key={cell}
                className="pb-3 pr-6 font-mono text-xs font-medium uppercase tracking-[0.18em] text-deck-muted"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-deck-surface/60">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={cn(
                    "py-3 pr-6 text-xl text-deck-fg",
                    align === "right" && cellIndex > 0 && "text-right tabular-nums"
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FitImage({
  src,
  alt = "",
  caption,
}: {
  src: string;
  alt?: string;
  caption?: string;
}) {
  return (
    <figure className="flex h-full w-full flex-col items-center justify-center gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="max-h-full w-auto max-w-full rounded-lg object-contain"
      />
      {caption ? (
        <figcaption className="font-mono text-xs text-deck-muted">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

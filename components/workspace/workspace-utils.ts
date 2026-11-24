/**
 * Pure workspace helpers — no React, safe to unit-test. Extracted from
 * deck-workspace.tsx to keep the component focused on state and layout.
 */

export interface DeckMediaItem {
  name: string;
  size: number;
  mime: string;
}

export type WorkspaceDialog =
  | { kind: "new-slide" }
  | { kind: "start-fresh" }
  /** `base` is the folder the new file lands in (no trailing slash). */
  | { kind: "new-file"; base: string }
  | { kind: "new-folder" }
  | { kind: "rename"; path: string; folder: boolean }
  | { kind: "rename-deck" }
  | { kind: "delete"; path: string; folder: boolean }
  | { kind: "media"; name: string }
  | null;

/** Slugifies a slide name into a folder-segment-safe form. */
export function slideSlug(name: string) {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "new-slide"
  );
}

/** Next free slide number: one past the highest existing `deck/NN-` prefix. */
export function nextSlideNumber(files: Record<string, string>) {
  const usedNumbers = Object.keys(files)
    .map((path) => /^deck\/(\d+)-/.exec(path)?.[1])
    .filter((n): n is string => Boolean(n))
    .map(Number);
  const next = (usedNumbers.length > 0 ? Math.max(...usedNumbers) : 0) + 1;
  return String(next).padStart(2, "0");
}

/** Renames the last path segment; slide folders keep their number prefix. */
export function renamedFolderPath(path: string, value: string) {
  const parent = path.split("/").slice(0, -1).join("/");
  let name = slideSlug(value);
  const number = /^deck\/(\d+)-/.exec(path)?.[1];
  if (number && !/^\d+-/.test(name)) name = `${number}-${name}`;
  return `${parent}/${name}`;
}

/** Starter source for a newly created slide. */
export function newSlideContent(title: string) {
  return `import { SparklesIcon } from "lucide-react";
import type { SlideMeta } from "@/lib/types";

export const meta: SlideMeta = {
  title: ${JSON.stringify(title)},
  notes: "",
};

export default function NewSlide() {
  return (
    <div className="flex h-full flex-col justify-center">
      <div className="flex size-14 items-center justify-center rounded-2xl border border-deck-surface bg-deck-surface/40 text-deck-accent">
        <SparklesIcon className="size-6" />
      </div>
      <p className="mt-8 font-mono text-sm uppercase tracking-[0.3em] text-deck-muted">
        New slide
      </p>
      <h2 className="mt-3 font-display text-7xl font-medium tracking-tight text-deck-fg">
        {${JSON.stringify(title)}}
      </h2>
      <p className="mt-6 max-w-2xl font-body text-xl leading-relaxed text-deck-muted">
        Replace this with your story. Everything here is a React component.
      </p>
    </div>
  );
}
`;
}

/** The last segment of a deck path. */
export function baseName(path: string) {
  return path.split("/").pop() ?? path;
}

/** Rewrites map keys under `from` (the path or its subtree) to start at `to`. */
export function rewriteKeys(
  map: Record<string, string>,
  from: string,
  to: string
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(map)) {
    if (key === from || key.startsWith(`${from}/`)) {
      out[to + key.slice(from.length)] = value;
    } else {
      out[key] = value;
    }
  }
  return out;
}

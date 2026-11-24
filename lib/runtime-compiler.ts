import * as React from "react";
import * as JsxRuntime from "react/jsx-runtime";
import type { ComponentType, ReactNode } from "react";

import * as Slides from "@/components/slides";
import { slideFilePaths } from "./runtime-protocol";
import type { DeckConfig, DeckProgressConfig, SlideMeta } from "./types";

/**
 * In-browser deck compiler: TSX → CommonJS (Babel standalone), a virtual
 * module map (deck files + host-provided engine modules), and a tiny CJS
 * loader. Everything runs in the runtime frame — never on the server.
 */

type BabelStandalone = typeof import("@babel/standalone");

/**
 * @babel/standalone is a ~3 MB payload. Like lucide-react, it is a lazy
 * chunk fetched the first time a deck actually compiles; the promise is
 * cached for the lifetime of the frame.
 */
let babelPromise: Promise<BabelStandalone> | null = null;

function loadBabel(): Promise<BabelStandalone> {
  babelPromise ??= import("@babel/standalone");
  return babelPromise;
}

export interface CompiledSlide {
  path: string;
  Component: ComponentType;
  meta: SlideMeta;
}

export interface CompiledDeck {
  slides: CompiledSlide[];
  Layout:
    | ComponentType<{
        children: ReactNode;
        index: number;
        total: number;
        meta: SlideMeta;
        slideNumbers: boolean;
      }>
    | null;
  /** Deck config from `deck/deck.config.ts` (defaults applied). */
  config: DeckConfig & { progress: DeckProgressConfig };
  /** Concatenated deck CSS (`deck/styles.css` + other top-level `*.css`). */
  styles: string;
}

function normalizeProgress(raw: unknown): DeckProgressConfig {
  const source = (raw ?? {}) as Partial<DeckProgressConfig>;
  const height =
    typeof source.height === "number" && Number.isFinite(source.height)
      ? Math.min(Math.max(source.height, 0), 24)
      : 2;
  return {
    show: typeof source.show === "boolean" ? source.show : true,
    position: source.position === "bottom" ? "bottom" : "top",
    height,
    color:
      typeof source.color === "string" && source.color.length <= 80
        ? source.color
        : "rgba(255, 255, 255, 0.7)",
    trackColor:
      typeof source.trackColor === "string" && source.trackColor.length <= 80
        ? source.trackColor
        : "rgba(255, 255, 255, 0.1)",
  };
}

function normalizeConfig(
  raw: unknown
): DeckConfig & { progress: DeckProgressConfig } {
  const source = (raw ?? {}) as Partial<DeckConfig>;
  const aspect = source.aspect === "4:3" ? "4:3" : "16:9";
  return {
    title: typeof source.title === "string" ? source.title : "",
    aspect,
    slideNumbers:
      typeof source.slideNumbers === "boolean" ? source.slideNumbers : true,
    progress: normalizeProgress(source.progress),
  };
}

const ENGINE_MODULES: Record<string, unknown> = {
  react: React,
  "react/jsx-runtime": JsxRuntime,
  "@/lib/types": {},
  // The reusable deck library — layouts + content primitives.
  "@/components/slides": Slides,
};

function normalizePath(path: string): string {
  const parts: string[] = [];
  for (const part of path.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  return parts.join("/");
}

function compileModule(
  Babel: BabelStandalone,
  path: string,
  source: string
): string {
  const result = Babel.transform(source, {
    filename: path,
    sourceType: "module",
    presets: [
      ["react", { runtime: "automatic" }],
      ["typescript"],
    ],
    plugins: ["transform-modules-commonjs"],
  });
  return result?.code ?? "";
}

/**
 * Compiles the whole deck; throws a readable error on failure.
 *
 * `hostModules` lets the frame inject extra virtual modules that are
 * expensive to load (lazily imported icon libraries, for example) only
 * when the deck actually imports them.
 */
export async function compileDeck(
  files: Record<string, string>,
  hostModules: Record<string, unknown> = {}
): Promise<CompiledDeck> {
  const Babel = await loadBabel();
  const modules = { ...ENGINE_MODULES, ...hostModules };
  const slidePaths = slideFilePaths(files);
  if (slidePaths.length === 0) {
    throw new Error(
      "No slides found. Add a deck/<NN-name>/page.tsx file (e.g. deck/01-title/page.tsx)."
    );
  }

  const cache = new Map<string, unknown>();

  function resolveSpecifier(specifier: string, fromPath: string): string {
    if (modules[specifier]) return specifier;

    let target: string;
    if (specifier.startsWith("@/")) {
      target = normalizePath(specifier.slice(2));
    } else if (specifier.startsWith(".")) {
      const baseDir = fromPath.split("/").slice(0, -1).join("/");
      target = normalizePath(`${baseDir}/${specifier}`);
    } else {
      // Unknown bare import — leave it to fail loudly in require().
      return specifier;
    }

    const candidates = [
      target,
      `${target}.tsx`,
      `${target}.ts`,
      `${target}.jsx`,
      `${target}.js`,
      `${target}/index.tsx`,
      `${target}/index.ts`,
    ];
    for (const candidate of candidates) {
      if (files[candidate] !== undefined) return candidate;
    }
    return target;
  }

  function requireModule(id: string): unknown {
    if (modules[id]) return modules[id];
    if (cache.has(id)) return cache.get(id);

    const source = files[id];
    if (source === undefined) {
      throw new Error(`Cannot find module "${id}".`);
    }

    const code = compileModule(Babel, id, source);
    const mod = { exports: {} as Record<string, unknown> };
    // Register before evaluating so circular imports resolve.
    cache.set(id, mod.exports);
    const factory = new Function("require", "module", "exports", code);
    factory(
      (specifier: string) => requireModule(resolveSpecifier(specifier, id)),
      mod,
      mod.exports
    );
    cache.set(id, mod.exports);
    return mod.exports;
  }

  const slides = slidePaths.map((path) => {
    const slideModule = requireModule(path) as {
      default?: unknown;
      meta?: SlideMeta;
    };
    if (typeof slideModule.default !== "function") {
      throw new Error(`${path} must default-export a slide component.`);
    }
    return {
      path,
      Component: slideModule.default as ComponentType,
      meta: slideModule.meta ?? {},
    };
  });

  const layoutPath = files["deck/layout.tsx"] !== undefined ? "deck/layout.tsx" : null;
  const layoutModule = layoutPath
    ? (requireModule(layoutPath) as { default?: unknown })
    : null;
  const Layout =
    layoutModule && typeof layoutModule.default === "function"
      ? (layoutModule.default as CompiledDeck["Layout"])
      : null;

  // Deck-wide config drives aspect, theme, fonts, and chrome.
  let config = normalizeConfig(undefined);
  if (files["deck/deck.config.ts"] !== undefined) {
    try {
      const configModule = requireModule("deck/deck.config.ts") as {
        deck?: unknown;
      };
      config = normalizeConfig(configModule.deck);
    } catch {
      // Unreadable config falls back to defaults rather than failing the deck.
    }
  }

  // Deck CSS: raw stylesheets injected into the frame — the reusable-class
  // escape hatch next to Tailwind. `deck/styles.css` is the canonical file;
  // any other top-level `deck/*.css` is included too (sorted).
  const styles = Object.keys(files)
    .filter((path) => /^deck\/[^/]+\.css$/.test(path))
    .sort()
    .map((path) => `/* ${path} */\n${files[path]}`)
    .join("\n\n");

  return { slides, Layout, config, styles };
}

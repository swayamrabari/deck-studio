"use client";

import {
  Component,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { SlideCanvas } from "@/components/deck/slide-canvas";
import { SlideStepProvider } from "@/components/slides";
import { setMediaBase } from "@/components/slides/media";
import { compileDeck, type CompiledDeck } from "@/lib/runtime-compiler";
import type {
  RuntimeInMessage,
  RuntimeOutMessage,
} from "@/lib/runtime-protocol";
import { DEFAULT_DECK_PROGRESS } from "@/lib/types";

/**
 * The runtime frame — loaded inside a sandboxed iframe by the workspace
 * preview and (later) the presenter. It compiles deck files in the
 * browser, renders the deck inside the fixed canvas, and reports status
 * back to the host via postMessage.
 */

/**
 * lucide-react is huge (~2,000 icons), so it is a separate lazy chunk
 * loaded the first time a deck actually imports it. The promise is cached
 * for the lifetime of the frame.
 */
let lucideModulePromise: Promise<typeof import("lucide-react")> | null = null;

function loadLucideModule(): Promise<typeof import("lucide-react")> {
  lucideModulePromise ??= import("lucide-react");
  return lucideModulePromise;
}

function deckUsesLucide(files: Record<string, string>): boolean {
  return Object.values(files).some(
    (source) =>
      source.includes('"lucide-react"') || source.includes("'lucide-react'")
  );
}

/**
 * Static bridge from the deck's own CSS variables to Tailwind utility
 * names. This is plumbing only — it defines no palette and no fonts.
 * `deck/styles.css` owns the values (`--deck-bg`, `--deck-font-mono`, …);
 * this block simply lets engine classes like `bg-deck-bg` and
 * `font-display` resolve to them.
 */
const TAILWIND_BRIDGE = `@theme {
  --color-deck-bg: var(--deck-bg);
  --color-deck-surface: var(--deck-surface);
  --color-deck-fg: var(--deck-fg);
  --color-deck-muted: var(--deck-muted);
  --color-deck-accent: var(--deck-accent);
  --font-display: var(--deck-font-display);
  --font-body: var(--deck-font-body);
  --font-mono: var(--deck-font-mono);
}`;

class SlideErrorBoundary extends Component<
  { children: ReactNode; onError: (message: string) => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    this.props.onError(
      error instanceof Error ? error.message : "The slide crashed while rendering."
    );
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function RuntimeFramePage() {
  const [deck, setDeck] = useState<CompiledDeck | null>(null);
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const filesJsonRef = useRef<string>("");
  const stepCountRef = useRef(0);
  // Guards against out-of-order compiles now that `deck:load` can await a
  // lazy module (lucide) before compiling.
  const loadSeqRef = useRef(0);

  // Tailwind's browser build touches `document` — client-only import.
  useEffect(() => {
    void import("@tailwindcss/browser");
  }, []);

  useEffect(() => {
    function post(message: RuntimeOutMessage) {
      window.parent.postMessage(message, window.location.origin);
    }

    async function onMessage(event: MessageEvent) {
      // Only same-origin hosts may drive this frame. Without the origin
      // check any third-party page could embed /runtime, become its
      // window.parent, and load attacker-authored deck code that then
      // executes with full same-origin access (session cookies included).
      if (event.source !== window.parent) return;
      if (event.origin !== window.location.origin) return;
      const message = event.data as RuntimeInMessage | null;
      if (!message || typeof message !== "object") return;

      if (message.type === "deck:ping") {
        // The host may hydrate after our announce — answer its pings.
        post({ type: "deck:frame-ready" });
        return;
      }

      if (message.type === "deck:index") {
        setIndex(Math.max(message.index, 0));
        setStep(Math.max(message.step ?? 0, 0));
        return;
      }
      if (message.type === "deck:step") {
        setStep(Math.max(message.step, 0));
        return;
      }
      if (message.type !== "deck:load") return;

      if (message.deckId) {
        setMediaBase(`/api/decks/${message.deckId}/media/`);
      }

      const filesJson = JSON.stringify(message.files);
      if (filesJson === filesJsonRef.current) {
        setIndex(Math.max(message.index, 0));
        setStep(Math.max(message.step ?? 0, 0));
        return;
      }
      filesJsonRef.current = filesJson;
      const loadSeq = ++loadSeqRef.current;

      try {
        // Lazily fetch lucide-react only for decks that import it, then
        // expose it to the deck's virtual module loader.
        const hostModules = deckUsesLucide(message.files)
          ? { "lucide-react": await loadLucideModule() }
          : {};
        if (loadSeq !== loadSeqRef.current) return;

        const compiled = await compileDeck(message.files, hostModules);
        setDeck(compiled);
        setError(null);
        setVersion((current) => current + 1);
        setIndex(
          Math.min(Math.max(message.index, 0), compiled.slides.length - 1)
        );
        setStep(Math.max(message.step ?? 0, 0));
        post({
          type: "deck:ready",
          slideCount: compiled.slides.length,
          progress: compiled.config.progress ?? DEFAULT_DECK_PROGRESS,
        });
      } catch (cause) {
        const messageText =
          cause instanceof Error ? cause.message : "Failed to compile the deck.";
        setError(messageText);
        post({ type: "deck:error", message: messageText });
      }
    }

    window.addEventListener("message", onMessage);
    // Handshake: tell the host we are listening so it can safely send decks.
    window.parent.postMessage(
      { type: "deck:frame-ready" } satisfies RuntimeOutMessage,
      window.location.origin
    );
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Report the current slide's fragment count once it has rendered.
  const lastStepsSignatureRef = useRef<string>("");
  useEffect(() => {
    if (!deck) return;
    const totalSteps = stepCountRef.current;
    const signature = `${index}:${totalSteps}`;
    if (lastStepsSignatureRef.current === signature) return;
    lastStepsSignatureRef.current = signature;
    window.parent.postMessage(
      { type: "deck:steps", index, totalSteps } satisfies RuntimeOutMessage,
      window.location.origin
    );
  }, [deck, index, version, step]);

  // Forward presenter navigation keys so the host keeps working while the
  // frame (a separate document) holds keyboard focus. Nothing here acts on
  // the key — the presenter decides; the preview host ignores it.
  useEffect(() => {
    const PRESENTER_KEYS = new Set([
      "ArrowRight",
      "ArrowLeft",
      "PageDown",
      "PageUp",
      "Home",
      "End",
      " ",
      "n",
      "N",
      "p",
      "P",
      "f",
      "F",
    ]);
    function onKeyDown(event: KeyboardEvent) {
      if (!PRESENTER_KEYS.has(event.key)) return;
      if (event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      window.parent.postMessage(
        { type: "deck:keydown", key: event.key } satisfies RuntimeOutMessage,
        window.location.origin
      );
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const current = deck?.slides[index] ?? null;
  const Layout = deck?.Layout ?? null;
  const Slide = current?.Component ?? null;
  const config = deck?.config;
  const canvasWidth = config?.aspect === "4:3" ? 960 : 1280;
  const canvasHeight = 720;

  return (
    <div className="deck-frame">
      <style type="text/tailwindcss" data-deck-tailwind>
        {TAILWIND_BRIDGE}
      </style>
      {deck?.styles ? (
        <style data-deck-styles>{deck.styles}</style>
      ) : null}
      <SlideCanvas
        width={canvasWidth}
        height={canvasHeight}
      >
        {deck && Slide ? (
          <SlideErrorBoundary
            key={`${index}-${version}`}
            onError={(message) => {
              setError(message);
              window.parent.postMessage(
                { type: "deck:error", message } satisfies RuntimeOutMessage,
                window.location.origin
              );
            }}
          >
            <SlideStepProvider step={step} countRef={stepCountRef}>
              {Layout ? (
                <Layout
                  index={index}
                  total={deck.slides.length}
                  meta={current?.meta ?? {}}
                  slideNumbers={config?.slideNumbers ?? true}
                >
                  <Slide />
                </Layout>
              ) : (
                <div className="deck-slide-fallback">
                  <Slide />
                </div>
              )}
            </SlideStepProvider>
          </SlideErrorBoundary>
        ) : null}
      </SlideCanvas>
      {error ? (
        <div className="deck-error">
          <p className="deck-error-text">{error}</p>
        </div>
      ) : null}
    </div>
  );
}

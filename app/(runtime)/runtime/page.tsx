"use client";

import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { SlideCanvas } from "@/components/deck/slide-canvas";
import { SlideStepProvider } from "@/components/slides";
import { setMediaBase } from "@/components/slides/media";
import { DECK_THEMES } from "@/lib/deck-themes";
import { fontVar } from "@/lib/fonts";
import { compileDeck, type CompiledDeck } from "@/lib/runtime-compiler";
import type {
  RuntimeInMessage,
  RuntimeOutMessage,
} from "@/lib/runtime-protocol";

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
      if (event.source !== window.parent) return;
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

        const compiled = compileDeck(message.files, hostModules);
        setDeck(compiled);
        setError(null);
        setVersion((current) => current + 1);
        setIndex(
          Math.min(Math.max(message.index, 0), compiled.slides.length - 1)
        );
        setStep(Math.max(message.step ?? 0, 0));
        post({ type: "deck:ready", slideCount: compiled.slides.length });
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

  const current = deck?.slides[index] ?? null;
  const Layout = deck?.Layout ?? null;
  const Slide = current?.Component ?? null;
  const config = deck?.config;
  const canvasWidth = config?.aspect === "4:3" ? 960 : 1280;
  const canvasHeight = 720;

  const frameCss = useMemo(() => {
    const theme = DECK_THEMES[config?.theme ?? "midnight"] ?? DECK_THEMES.midnight;
    // The frame is CSS-independent from the app: Tailwind's browser build
    // generates utilities from the deck's DOM, and the deck palette is
    // registered here so `bg-deck-bg` etc. only exist for deck content.
    return `@theme {
  --color-deck-bg: ${theme.bg};
  --color-deck-surface: ${theme.surface};
  --color-deck-fg: ${theme.fg};
  --color-deck-muted: ${theme.muted};
  --color-deck-accent: ${theme.accent};
  --font-display: var(--deck-font-display);
  --font-body: var(--deck-font-body);
  --font-mono: var(--deck-font-mono);
}`;
  }, [config]);

  // Font slots live at :root in their own stylesheet; `deck/styles.css`
  // loads after both, so brand overrides still win.
  const fontCss = useMemo(() => {
    const display = fontVar(config?.fonts.display, "--font-geist-sans");
    const body = fontVar(config?.fonts.body, "--font-geist-sans");
    const mono = fontVar(config?.fonts.mono, "--font-geist-mono");
    return `:root {
  --deck-font-display: ${display};
  --deck-font-body: ${body};
  --deck-font-mono: ${mono};
}`;
  }, [config]);

  return (
    <div className="deck-frame">
      <style type="text/tailwindcss" data-deck-theme>
        {frameCss}
      </style>
      <style data-deck-fonts>{fontCss}</style>
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

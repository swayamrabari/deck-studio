"use client";

import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { SlideCanvas } from "@/components/deck/slide-canvas";
import { SlideStepProvider } from "@/components/slides";
import { setMediaBase } from "@/components/slides/media";
import { DECK_THEMES } from "@/lib/deck-themes";
import { fontRegistry } from "@/lib/fonts";
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

// Theme tokens for Tailwind's browser build: deck palette + semantic font
// slots, so user-written utilities compile inside the frame.
const THEME_CSS = `
@theme {
  --color-deck-bg: #0b0e14;
  --color-deck-surface: #131826;
  --color-deck-fg: #e8ecf3;
  --color-deck-muted: #9aa4b8;
  --color-deck-accent: #7aa2f7;
  --font-display: var(--deck-font-display);
  --font-body: var(--deck-font-body);
  --font-mono: var(--deck-font-mono);
}
`;

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

  // Tailwind's browser build touches `document` — client-only import.
  useEffect(() => {
    void import("@tailwindcss/browser");
  }, []);

  useEffect(() => {
    function post(message: RuntimeOutMessage) {
      window.parent.postMessage(message, window.location.origin);
    }

    function onMessage(event: MessageEvent) {
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

      try {
        const compiled = compileDeck(message.files);
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

  const themeVars = useMemo<CSSProperties>(() => {
    const theme = DECK_THEMES[config?.theme ?? "midnight"] ?? DECK_THEMES.midnight;
    const registry = fontRegistry as Record<string, { varName: string }>;
    const font = (key: string | undefined, fallback: string) =>
      `var(${key && registry[key] ? registry[key].varName : fallback})`;
    const display = font(config?.fonts.display, "--font-geist-sans");
    const body = font(config?.fonts.body, "--font-geist-sans");
    const mono = font(config?.fonts.mono, "--font-geist-mono");
    return {
      "--color-deck-bg": theme.bg,
      "--color-deck-surface": theme.surface,
      "--color-deck-fg": theme.fg,
      "--color-deck-muted": theme.muted,
      "--color-deck-accent": theme.accent,
      // Semantic deck slots…
      "--deck-font-display": display,
      "--deck-font-body": body,
      "--deck-font-mono": mono,
      // …and the direct utility vars (Tailwind's browser build resolves its
      // intermediate `--font-*` vars at :root, so override them here too).
      "--font-display": display,
      "--font-body": body,
      "--font-mono": mono,
    } as CSSProperties;
  }, [config]);

  return (
    <div className="relative h-dvh w-full" style={themeVars}>
      <style type="text/tailwindcss">{THEME_CSS}</style>
      {deck?.styles ? (
        <style data-deck-styles>{deck.styles}</style>
      ) : null}
      <SlideCanvas
        className="h-full w-full"
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
                <div className="h-full w-full bg-deck-bg p-20 text-deck-fg">
                  <Slide />
                </div>
              )}
            </SlideStepProvider>
          </SlideErrorBoundary>
        ) : null}
      </SlideCanvas>
      {error ? (
        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="max-h-32 overflow-auto rounded-md border border-destructive/40 bg-background/95 p-2 font-ui-mono text-[10px] leading-relaxed whitespace-pre-wrap text-destructive">
            {error}
          </p>
        </div>
      ) : null}
    </div>
  );
}

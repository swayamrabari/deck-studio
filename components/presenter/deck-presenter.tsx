"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MaximizeIcon,
  MinimizeIcon,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "cn";
import type {
  RuntimeInMessage,
  RuntimeOutMessage,
} from "@/lib/runtime-protocol";

/**
 * Hosted presenter: the runtime frame at full viewport, driven by host
 * state. Keyboard control, fullscreen, ?s= URL sync, progress bar, and a
 * cross-frame fade between slides.
 */
export function DeckPresenter({
  deckId,
  title,
  files,
  initialSlide,
}: {
  deckId: string;
  title: string;
  files: Record<string, string>;
  initialSlide: number;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [slideCount, setSlideCount] = useState(0);
  const [index, setIndex] = useState(initialSlide);
  const [fading, setFading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const indexRef = useRef(index);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const send = useCallback((message: RuntimeInMessage) => {
    frameRef.current?.contentWindow?.postMessage(
      message,
      window.location.origin
    );
  }, []);

  // Runtime handshake + status.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== frameRef.current?.contentWindow) return;
      const message = event.data as RuntimeOutMessage | null;
      if (!message || typeof message !== "object") return;

      if (message.type === "deck:frame-ready") {
        setReady(true);
      } else if (message.type === "deck:ready") {
        setError(null);
        setSlideCount(message.slideCount);
      } else if (message.type === "deck:error") {
        setError(message.message);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Load the deck once the frame is listening.
  useEffect(() => {
    if (!ready) return;
    send({ type: "deck:load", files, index: indexRef.current });
  }, [ready, files, send]);

  // Handshake retry: the iframe may hydrate before this host does, so ping
  // until the frame answers (either side may win the race).
  useEffect(() => {
    if (ready) return;
    const ping = () => send({ type: "deck:ping" });
    ping();
    const interval = window.setInterval(ping, 500);
    const stop = window.setTimeout(() => window.clearInterval(interval), 15000);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(stop);
    };
  }, [ready, send]);

  const syncUrl = useCallback((next: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("s", String(next + 1));
    window.history.replaceState(null, "", `?${params.toString()}`);
  }, []);

  const goTo = useCallback(
    (target: number) => {
      if (fading) return;
      const count = slideCount || 1;
      const next = Math.min(Math.max(target, 0), count - 1);
      if (next === indexRef.current) return;

      // Fade out, swap the slide, fade back in.
      setFading(true);
      window.setTimeout(() => {
        setIndex(next);
        indexRef.current = next;
        send({ type: "deck:index", index: next });
        syncUrl(next);
        setFading(false);
      }, 140);
    },
    [fading, slideCount, send, syncUrl]
  );

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await rootRef.current?.requestFullscreen();
      }
    } catch {
      // Fullscreen can be denied (permissions/iframes) — presentation still works.
    }
  }, []);

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  // Keyboard map: arrows/Space/N/P, Home/End, F, digits + Enter.
  useEffect(() => {
    let jumpBuffer = "";
    let jumpTimer: ReturnType<typeof setTimeout> | null = null;

    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      const key = event.key;
      const lower = key.toLowerCase();

      if (key === "ArrowRight" || key === "PageDown" || key === " ") {
        event.preventDefault();
        goTo(indexRef.current + 1);
      } else if (key === "ArrowLeft" || key === "PageUp") {
        event.preventDefault();
        goTo(indexRef.current - 1);
      } else if (lower === "n") {
        event.preventDefault();
        goTo(indexRef.current + 1);
      } else if (lower === "p") {
        event.preventDefault();
        goTo(indexRef.current - 1);
      } else if (key === "Home") {
        event.preventDefault();
        goTo(0);
      } else if (key === "End") {
        event.preventDefault();
        goTo(Number.MAX_SAFE_INTEGER);
      } else if (lower === "f") {
        event.preventDefault();
        void toggleFullscreen();
      } else if (key === "Escape") {
        jumpBuffer = "";
      } else if (/^[0-9]$/.test(key)) {
        jumpBuffer += key;
        if (jumpTimer) clearTimeout(jumpTimer);
        jumpTimer = setTimeout(() => {
          jumpBuffer = "";
        }, 1500);
      } else if (key === "Enter" && jumpBuffer) {
        event.preventDefault();
        const number = Number.parseInt(jumpBuffer, 10);
        jumpBuffer = "";
        if (Number.isFinite(number) && number > 0) goTo(number - 1);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (jumpTimer) clearTimeout(jumpTimer);
    };
  }, [goTo, toggleFullscreen]);

  const progress =
    slideCount > 0 ? ((Math.min(index, slideCount - 1) + 1) / slideCount) * 100 : 0;

  return (
    <div ref={rootRef} className="flex h-dvh w-full flex-col bg-black">
      <div className="h-0.5 w-full shrink-0 bg-white/10">
        <div
          className="h-full bg-white/70 transition-[width] duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="relative min-h-0 flex-1">
        <iframe
          ref={frameRef}
          src="/runtime"
          title="Deck presentation"
          sandbox="allow-scripts allow-same-origin"
          className={cn(
            "h-full w-full border-0 transition-opacity duration-150",
            fading ? "opacity-0" : "opacity-100"
          )}
        />
        {error ? (
          <div className="absolute inset-x-0 bottom-0 p-4">
            <p className="mx-auto max-w-2xl rounded-md border border-destructive/40 bg-black/90 p-3 font-ui-mono text-xs leading-relaxed whitespace-pre-wrap text-destructive">
              {error}
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-4 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={`/decks/${deckId}/edit`}
            aria-label="Back to workspace"
            className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
          >
            <ArrowLeftIcon />
          </Link>
          <p className="truncate text-sm font-medium text-white/80">{title}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Previous slide"
            onClick={() => goTo(index - 1)}
            disabled={slideCount === 0 || index <= 0}
          >
            <ChevronLeftIcon />
          </Button>
          <span className="min-w-16 text-center font-ui-mono text-xs tabular-nums text-white/60">
            {slideCount > 0
              ? `${String(index + 1).padStart(2, "0")} / ${String(slideCount).padStart(2, "0")}`
              : "— / —"}
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Next slide"
            onClick={() => goTo(index + 1)}
            disabled={slideCount === 0 || index >= slideCount - 1}
          >
            <ChevronRightIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            onClick={() => void toggleFullscreen()}
          >
            {isFullscreen ? <MinimizeIcon /> : <MaximizeIcon />}
          </Button>
        </div>
      </div>
    </div>
  );
}

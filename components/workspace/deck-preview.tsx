"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "cn";
import {
  slideFilePaths,
  slideIndexForPath,
  type RuntimeInMessage,
  type RuntimeOutMessage,
} from "@/lib/runtime-protocol";

/** Reads the authored aspect straight from the deck config source. */
function previewAspect(files: Record<string, string>): "16:9" | "4:3" {
  const source = files["deck/deck.config.ts"] ?? "";
  return /aspect\s*:\s*["']4:3["']/.test(source) ? "4:3" : "16:9";
}

/**
 * The workspace's live preview: a sandboxed same-origin iframe running the
 * runtime frame. Deck files flow in via postMessage (debounced); compile
 * status and errors flow back.
 */
export function DeckPreview({
  deckId,
  files,
  activePath,
}: {
  deckId: string;
  files: Record<string, string>;
  activePath: string | null;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slideCount, setSlideCount] = useState<number | null>(null);
  const aspect = previewAspect(files);

  const slideIndex = useMemo(() => {
    const slides = slideFilePaths(files);
    if (activePath && slides.includes(activePath)) {
      return slides.indexOf(activePath);
    }
    return slideIndexForPath(files, activePath);
  }, [files, activePath]);

  const send = useCallback((message: RuntimeInMessage) => {
    frameRef.current?.contentWindow?.postMessage(
      message,
      window.location.origin
    );
  }, []);

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

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(
      () =>
        // Preview shows the finished slide: a huge step reveals all fragments.
        send({
          type: "deck:load",
          files,
          index: slideIndex,
          step: 999,
          deckId,
        }),
      400
    );
    return () => clearTimeout(timer);
  }, [files, slideIndex, ready, send, deckId]);

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

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
      <div
        data-aspect={aspect}
        className={cn(
          "w-full shrink-0 overflow-hidden rounded-md border border-border bg-deck-bg",
          aspect === "4:3" ? "aspect-[4/3]" : "aspect-video"
        )}
      >
        <iframe
          ref={frameRef}
          src="/runtime"
          title="Deck preview"
          sandbox="allow-scripts allow-same-origin"
          className="h-full w-full border-0"
        />
      </div>
      {error ? (
        <p className="max-h-28 overflow-auto font-ui-mono text-[10px] leading-relaxed whitespace-pre-wrap text-destructive">
          {error}
        </p>
      ) : (
        <p className="font-ui-mono text-[10px] text-muted-foreground">
          Live · {slideCount ?? "—"} slides
        </p>
      )}
    </div>
  );
}

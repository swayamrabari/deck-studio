"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  slideFilePaths,
  slideIndexForPath,
  type RuntimeInMessage,
  type RuntimeOutMessage,
} from "@/lib/runtime-protocol";

/**
 * The workspace's live preview: a sandboxed same-origin iframe running the
 * runtime frame. Deck files flow in via postMessage (debounced); compile
 * status and errors flow back.
 */
export function DeckPreview({
  files,
  activePath,
}: {
  files: Record<string, string>;
  activePath: string | null;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slideCount, setSlideCount] = useState<number | null>(null);

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
      () => send({ type: "deck:load", files, index: slideIndex }),
      400
    );
    return () => clearTimeout(timer);
  }, [files, slideIndex, ready, send]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
      <div className="aspect-video w-full shrink-0 overflow-hidden rounded-md border border-border bg-deck-bg">
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

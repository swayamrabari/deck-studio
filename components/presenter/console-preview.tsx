"use client";

import { useEffect, useRef, useState } from "react";

import type { RuntimeInMessage, RuntimeOutMessage } from "@/lib/runtime-protocol";

/**
 * A minimal headless runtime frame for the speaker console: renders one
 * slide (at a given step) with the standard ping handshake.
 */
export function ConsolePreview({
  files,
  index,
  step,
}: {
  files: Record<string, string>;
  index: number;
  step: number;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== frameRef.current?.contentWindow) return;
      const message = event.data as RuntimeOutMessage | null;
      if (message?.type === "deck:frame-ready") setReady(true);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    function send(message: RuntimeInMessage) {
      frameRef.current?.contentWindow?.postMessage(
        message,
        window.location.origin
      );
    }

    if (!ready) {
      const ping = () => send({ type: "deck:ping" });
      ping();
      const interval = window.setInterval(ping, 500);
      const stop = window.setTimeout(
        () => window.clearInterval(interval),
        15000
      );
      return () => {
        window.clearInterval(interval);
        window.clearTimeout(stop);
      };
    }

    send({ type: "deck:load", files, index, step });
  }, [ready, files, index, step]);

  return (
    <iframe
      ref={frameRef}
      src="/runtime"
      title={`Slide ${index + 1} preview`}
      sandbox="allow-scripts allow-same-origin"
      className="h-full w-full border-0"
    />
  );
}

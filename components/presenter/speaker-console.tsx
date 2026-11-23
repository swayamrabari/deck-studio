"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PresentationIcon,
  TimerIcon,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "cn";
import {
  speakerChannelName,
  type SpeakerChannelMessage,
  type SpeakerState,
} from "@/lib/speaker-channel";
import { ConsolePreview } from "./console-preview";

function formatElapsed(ms: number): string {
  const total = Math.max(Math.floor(ms / 1000), 0);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Speaker console: current + next slide previews, speaker notes, and the
 * elapsed timer — driven by BroadcastChannel state from the presenter.
 * Controls send navigation commands back.
 */
export function SpeakerConsole({
  deckId,
  title,
  files,
}: {
  deckId: string;
  title: string;
  files: Record<string, string>;
}) {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const lastSeenRef = useRef(0);
  const [state, setState] = useState<SpeakerState | null>(null);
  const [connected, setConnected] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const channel = new BroadcastChannel(speakerChannelName(deckId));
    channelRef.current = channel;

    channel.onmessage = (event: MessageEvent) => {
      const message = event.data as SpeakerChannelMessage | null;
      if (message?.type !== "state") return;
      lastSeenRef.current = Date.now();
      setConnected(true);
      setState(message);
    };

    // Ask an already-running presenter for the current state.
    channel.postMessage({ type: "hello" } satisfies SpeakerChannelMessage);

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [deckId]);

  // Timer + connection heartbeat check.
  useEffect(() => {
    const tick = () => {
      if (lastSeenRef.current > 0) {
        setElapsed(Date.now() - lastSeenRef.current);
        setConnected(Date.now() - lastSeenRef.current < 4500);
      }
    };
    tick();
    const interval = window.setInterval(tick, 500);
    return () => window.clearInterval(interval);
  }, []);

  const sendCommand = useCallback((command: "next" | "prev") => {
    channelRef.current?.postMessage({
      type: "command",
      command,
    } satisfies SpeakerChannelMessage);
  }, []);

  const index = state?.index ?? 0;
  const step = state?.step ?? 0;
  const totalSteps = state?.totalSteps ?? 0;
  const slideCount = state?.slideCount ?? 0;
  const notes = state?.slides[index]?.notes ?? "";
  const nextIndex = index + 1;
  const hasNext = slideCount > 0 && nextIndex < slideCount;

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-border px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={`/decks/${deckId}/present`}
            aria-label="Back to presenter"
            className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
          >
            <ArrowLeftIcon />
          </Link>
          <div className="min-w-0">
            <p className="font-ui-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Speaker console
            </p>
            <h1 className="truncate text-sm leading-tight font-medium">{title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex items-center gap-1.5 font-ui-mono text-[10px] uppercase tracking-wider",
              connected ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                connected ? "bg-foreground" : "bg-muted-foreground/40"
              )}
            />
            {connected ? "Live" : "Waiting for presenter…"}
          </span>
          <span className="flex items-center gap-1.5 font-ui-mono text-xs tabular-nums text-muted-foreground">
            <TimerIcon className="size-3.5" />
            {formatElapsed(state ? elapsed : 0)}
          </span>
          <span className="font-ui-mono text-xs tabular-nums text-muted-foreground">
            {slideCount > 0
              ? `${pad(index + 1)} / ${pad(slideCount)}${totalSteps > 0 ? ` · ${step}/${totalSteps}` : ""}`
              : "— / —"}
          </span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <section className="flex min-w-0 flex-1 flex-col gap-4 p-4">
          <div className="min-h-0 flex-1">
            <p className="mb-2 font-ui-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Current
            </p>
            <div className="aspect-video overflow-hidden rounded-md border border-border bg-deck-bg">
              {files && Object.keys(files).length > 0 ? (
                <ConsolePreview files={files} index={index} step={step} />
              ) : null}
            </div>
          </div>

          <div className="flex items-end gap-5">
            <div className="w-2/3">
              <p className="mb-2 font-ui-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Next
              </p>
              <div className="aspect-video overflow-hidden rounded-md border border-border bg-deck-bg">
                {hasNext && files && Object.keys(files).length > 0 ? (
                  <ConsolePreview files={files} index={nextIndex} step={999} />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="font-ui-mono text-[10px] uppercase tracking-[0.2em] text-deck-muted">
                      {slideCount > 0 ? "End of deck" : "—"}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 pb-1">
              <Button
                variant="outline"
                size="icon"
                aria-label="Previous step"
                onClick={() => sendCommand("prev")}
                disabled={!connected}
              >
                <ChevronLeftIcon />
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="Next step"
                onClick={() => sendCommand("next")}
                disabled={!connected}
              >
                <ChevronRightIcon />
              </Button>
            </div>
          </div>
        </section>

        <aside className="flex w-[360px] shrink-0 flex-col border-l border-border">
          <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-4">
            <PresentationIcon className="size-3.5 text-muted-foreground" />
            <span className="font-ui-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Notes
            </span>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <p className="p-4 font-body text-base leading-relaxed whitespace-pre-wrap">
              {state ? notes || "No notes for this slide." : "Open the presenter to see notes."}
            </p>
          </ScrollArea>
        </aside>
      </div>
    </div>
  );
}

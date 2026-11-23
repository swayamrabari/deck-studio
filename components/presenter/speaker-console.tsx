"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
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
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const mmss = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return hours > 0 ? `${hours}:${mmss}` : mmss;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Speaker console: current + next slide previews, speaker notes, and the
 * elapsed timer — driven by BroadcastChannel state from the presenter.
 * Navigation commands flow back to the presenter.
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
  const startedAtRef = useRef<number | null>(null);
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
      startedAtRef.current = message.startedAt;
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

  // Elapsed timer anchored to the presenter session start + a heartbeat
  // freshness check for the connection indicator.
  useEffect(() => {
    const tick = () => {
      setConnected(
        lastSeenRef.current > 0 && Date.now() - lastSeenRef.current < 4500
      );
      if (startedAtRef.current !== null) {
        setElapsed(Date.now() - startedAtRef.current);
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

  // Console-side keyboard control (synced to the presenter).
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "n") {
        event.preventDefault();
        sendCommand("next");
      } else if (event.key === "ArrowLeft" || event.key.toLowerCase() === "p") {
        event.preventDefault();
        sendCommand("prev");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sendCommand]);

  const index = state?.index ?? 0;
  const step = state?.step ?? 0;
  const totalSteps = state?.totalSteps ?? 0;
  const slideCount = state?.slideCount ?? 0;
  const currentTitle = state?.slides[index]?.title ?? "";
  const notes = state?.slides[index]?.notes ?? "";
  const nextIndex = index + 1;
  const hasNext = slideCount > 0 && nextIndex < slideCount;
  const nextTitle = hasNext ? (state?.slides[nextIndex]?.title ?? "") : "";
  const ready = Object.keys(files).length > 0;

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
        <div className="flex items-center gap-4">
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
            {connected ? "Live" : "Waiting"}
          </span>
          <span className="flex items-center gap-1.5 font-ui-mono text-xs tabular-nums text-muted-foreground">
            <TimerIcon className="size-3.5" />
            {formatElapsed(elapsed)}
          </span>
          <span className="min-w-24 text-right font-ui-mono text-xs tabular-nums text-muted-foreground">
            {slideCount > 0
              ? `${pad(index + 1)} / ${pad(slideCount)}${totalSteps > 0 ? ` · ${step}/${totalSteps}` : ""}`
              : "— / —"}
          </span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Left: previews + controls */}
        <section className="flex min-w-0 flex-1 flex-col gap-4 p-5">
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <div className="flex items-baseline justify-between gap-4">
              <span className="font-ui-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Current
              </span>
              {currentTitle ? (
                <span className="truncate font-ui-mono text-[10px] text-muted-foreground">
                  {currentTitle}
                </span>
              ) : null}
            </div>
            <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-black">
              {ready ? (
                <ConsolePreview files={files} index={index} step={step} />
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-end gap-6">
            <div className="w-2/5 max-w-96 min-w-40">
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <span className="font-ui-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Next
                </span>
                {nextTitle ? (
                  <span className="truncate font-ui-mono text-[10px] text-muted-foreground">
                    {nextTitle}
                  </span>
                ) : null}
              </div>
              <div className="aspect-video overflow-hidden rounded-md border border-border bg-black">
                {hasNext && ready ? (
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

            <div className="flex flex-1 flex-col items-end gap-2 pb-1">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-9"
                  aria-label="Previous step"
                  onClick={() => sendCommand("prev")}
                  disabled={!connected}
                >
                  <ChevronLeftIcon />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-9"
                  aria-label="Next step"
                  onClick={() => sendCommand("next")}
                  disabled={!connected}
                >
                  <ChevronRightIcon />
                </Button>
              </div>
              <p className="font-ui-mono text-[10px] text-muted-foreground">
                ← → drive the presenter
              </p>
            </div>
          </div>
        </section>

        {/* Right: notes */}
        <aside className="flex w-[380px] shrink-0 flex-col border-l border-border xl:w-[420px]">
          <div className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-border px-5">
            <span className="font-ui-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Speaker notes
            </span>
            <span className="truncate font-ui-mono text-[10px] text-muted-foreground">
              {state ? pad(index + 1) : "—"}
            </span>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <p className="p-6 font-body text-lg leading-relaxed whitespace-pre-wrap">
              {state
                ? notes || "No notes for this slide."
                : "Open the presenter to see notes."}
            </p>
          </ScrollArea>
          <div className="shrink-0 border-t border-border px-5 py-3">
            <p className="font-ui-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Up next
            </p>
            <p className="mt-1 truncate text-sm">
              {hasNext ? nextTitle || "Untitled slide" : "End of deck"}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

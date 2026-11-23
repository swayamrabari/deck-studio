"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MaximizeIcon,
  MinimizeIcon,
  MonitorIcon,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "cn";
import type {
  RuntimeInMessage,
  RuntimeOutMessage,
} from "@/lib/runtime-protocol";
import {
  speakerChannelName,
  type SpeakerChannelMessage,
  type SpeakerState,
} from "@/lib/speaker-channel";

/**
 * Hosted presenter: the runtime frame at full viewport, driven by host
 * state. Keyboard control, fullscreen, ?s=&st= URL sync, progress bar,
 * cross-frame fades, and step-aware navigation through `<Appear>`
 * fragments.
 */
export function DeckPresenter({
  deckId,
  title,
  files,
  initialSlide,
  initialStep,
}: {
  deckId: string;
  title: string;
  files: Record<string, string>;
  initialSlide: number;
  initialStep: number;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [slideCount, setSlideCount] = useState(0);
  const [index, setIndex] = useState(initialSlide);
  const [step, setStep] = useState(initialStep);
  const [totalSteps, setTotalSteps] = useState(0);
  const [fading, setFading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [slideMetas, setSlideMetas] = useState<
    Array<{ title: string; notes: string }>
  >([]);

  /** Fragment counts discovered per slide (for backward navigation). */
  const stepsBySlide = useRef(new Map<number, number>());

  const indexRef = useRef(index);
  const stepRef = useRef(step);
  const totalStepsRef = useRef(totalSteps);
  const slideCountRef = useRef(slideCount);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);
  useEffect(() => {
    stepRef.current = step;
  }, [step]);
  useEffect(() => {
    totalStepsRef.current = totalSteps;
  }, [totalSteps]);
  useEffect(() => {
    slideCountRef.current = slideCount;
  }, [slideCount]);

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
        setIndex((previous) => Math.min(previous, message.slideCount - 1));
      } else if (message.type === "deck:steps") {
        stepsBySlide.current.set(message.index, message.totalSteps);
        if (message.index === indexRef.current) {
          setTotalSteps(message.totalSteps);
          setStep((previous) => Math.min(previous, message.totalSteps));
        }
      } else if (message.type === "deck:meta") {
        setSlideMetas(message.slides);
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
    send({
      type: "deck:load",
      files,
      index: indexRef.current,
      step: stepRef.current,
    });
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

  // URL as the source of truth for deep links (?s=slide&st=step).
  useEffect(() => {
    if (slideCount === 0) return;
    const params = new URLSearchParams(window.location.search);
    params.set("s", String(index + 1));
    params.set("st", String(step));
    window.history.replaceState(null, "", `?${params.toString()}`);
  }, [index, step, slideCount]);

  const advanceStep = useCallback(
    (next: number) => {
      setStep(next);
      send({ type: "deck:step", step: next });
    },
    [send]
  );

  const goToSlide = useCallback(
    (next: number, startStep: number) => {
      setFading(true);
      window.setTimeout(() => {
        setIndex(next);
        setStep(startStep);
        setTotalSteps(stepsBySlide.current.get(next) ?? 0);
        send({ type: "deck:index", index: next, step: startStep });
        setFading(false);
      }, 140);
    },
    [send]
  );

  const goNext = useCallback(() => {
    if (fading) return;
    if (stepRef.current < totalStepsRef.current) {
      advanceStep(stepRef.current + 1);
      return;
    }
    if (indexRef.current < slideCountRef.current - 1) {
      goToSlide(indexRef.current + 1, 0);
    }
  }, [fading, advanceStep, goToSlide]);

  const goPrev = useCallback(() => {
    if (fading) return;
    if (stepRef.current > 0) {
      advanceStep(stepRef.current - 1);
      return;
    }
    if (indexRef.current > 0) {
      // Going back lands on the previous slide fully revealed.
      goToSlide(
        indexRef.current - 1,
        stepsBySlide.current.get(indexRef.current - 1) ?? 0
      );
    }
  }, [fading, advanceStep, goToSlide]);

  // ── Speaker console sync (BroadcastChannel) ──────────────────────────
  const channelRef = useRef<BroadcastChannel | null>(null);
  const startedAtRef = useRef(Date.now());
  const actionsRef = useRef({ next: () => {}, prev: () => {} });
  const broadcastRef = useRef<() => void>(() => {});

  broadcastRef.current = () => {
    channelRef.current?.postMessage({
      type: "state",
      index,
      step,
      totalSteps,
      slideCount,
      slides: slideMetas,
      startedAt: startedAtRef.current,
    } satisfies SpeakerState);
  };

  useEffect(() => {
    actionsRef.current = { next: goNext, prev: goPrev };
  }, [goNext, goPrev]);

  useEffect(() => {
    const channel = new BroadcastChannel(speakerChannelName(deckId));
    channelRef.current = channel;
    channel.onmessage = (event: MessageEvent) => {
      const message = event.data as SpeakerChannelMessage | null;
      if (!message || typeof message !== "object") return;
      if (message.type === "hello") {
        broadcastRef.current();
        return;
      }
      if (message.type === "command") {
        if (message.command === "next") actionsRef.current.next();
        else actionsRef.current.prev();
      }
    };
    // Heartbeat keeps the console's "Live" indicator truthful.
    const heartbeat = window.setInterval(() => broadcastRef.current(), 2000);
    return () => {
      window.clearInterval(heartbeat);
      channel.close();
      channelRef.current = null;
    };
  }, [deckId]);

  useEffect(() => {
    broadcastRef.current();
  }, [index, step, totalSteps, slideCount, slideMetas]);

  const openSpeakerConsole = useCallback(() => {
    window.open(
      `/decks/${deckId}/presenter`,
      `pptxgen-speaker-${deckId}`,
      "width=1000,height=720"
    );
  }, [deckId]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await rootRef.current?.requestFullscreen();
      }
    } catch {
      // Fullscreen can be denied (permissions) — presentation still works.
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
        goNext();
      } else if (key === "ArrowLeft" || key === "PageUp") {
        event.preventDefault();
        goPrev();
      } else if (lower === "n") {
        event.preventDefault();
        goNext();
      } else if (lower === "p") {
        event.preventDefault();
        goPrev();
      } else if (key === "Home") {
        event.preventDefault();
        goToSlide(0, 0);
      } else if (key === "End") {
        event.preventDefault();
        const last = Math.max(slideCountRef.current - 1, 0);
        goToSlide(last, stepsBySlide.current.get(last) ?? 0);
      } else if (lower === "s") {
        event.preventDefault();
        openSpeakerConsole();
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
        if (Number.isFinite(number) && number > 0) goToSlide(number - 1, 0);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (jumpTimer) clearTimeout(jumpTimer);
    };
  }, [goNext, goPrev, goToSlide, toggleFullscreen, openSpeakerConsole]);

  const progress =
    slideCount > 0
      ? ((index + (totalSteps > 0 ? step / totalSteps : 1)) / slideCount) * 100
      : 0;

  const counter =
    slideCount > 0
      ? `${String(index + 1).padStart(2, "0")} / ${String(slideCount).padStart(2, "0")}${
          totalSteps > 0 ? ` · ${step}/${totalSteps}` : ""
        }`
      : "— / —";

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
            aria-label="Previous step"
            onClick={goPrev}
            disabled={slideCount === 0 || (index === 0 && step === 0)}
          >
            <ChevronLeftIcon />
          </Button>
          <span className="min-w-20 text-center font-ui-mono text-xs tabular-nums text-white/60">
            {counter}
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Next step"
            onClick={goNext}
            disabled={
              slideCount === 0 ||
              (index === slideCount - 1 && step >= totalSteps)
            }
          >
            <ChevronRightIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Open speaker console"
            onClick={openSpeakerConsole}
          >
            <MonitorIcon />
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

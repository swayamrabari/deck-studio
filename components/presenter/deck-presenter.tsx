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
import { DEFAULT_DECK_PROGRESS } from "@/lib/types";
import type {
  RuntimeInMessage,
  RuntimeOutMessage,
} from "@/lib/runtime-protocol";

/**
 * Hosted presenter: the runtime frame at full viewport, driven by host
 * state. Keyboard control, fullscreen, ?s=&st= URL sync, progress bar,
 * and step-aware navigation through `<Appear>` fragments. Slide changes
 * are instant cuts — there are no transition effects by design.
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
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [progressConfig, setProgressConfig] = useState(DEFAULT_DECK_PROGRESS);

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

  // Load the deck once the frame is listening.
  useEffect(() => {
    if (!ready) return;
    send({
      type: "deck:load",
      files,
      index: indexRef.current,
      step: stepRef.current,
      deckId,
    });
  }, [ready, files, send, deckId]);

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
    (requested: number, startStep: number) => {
      // Clamp every jump (digit entry can exceed the deck) so the host
      // index can never desync from the frame's clamped view. Slide
      // changes are instant — no transition to schedule.
      const last = Math.max(slideCountRef.current - 1, 0);
      const next = Math.min(Math.max(requested, 0), last);
      setIndex(next);
      setStep(startStep);
      setTotalSteps(stepsBySlide.current.get(next) ?? 0);
      send({ type: "deck:index", index: next, step: startStep });
    },
    [send]
  );

  const goNext = useCallback(() => {
    if (stepRef.current < totalStepsRef.current) {
      advanceStep(stepRef.current + 1);
      return;
    }
    if (indexRef.current < slideCountRef.current - 1) {
      goToSlide(indexRef.current + 1, 0);
    }
  }, [advanceStep, goToSlide]);

  const goPrev = useCallback(() => {
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
  }, [advanceStep, goToSlide]);

  const toggleFullscreen = useCallback(async () => {
    try {
      const doc = document as Document & {
        webkitFullscreenElement?: Element | null;
        webkitExitFullscreen?: () => Promise<void> | void;
      };
      if (document.fullscreenElement || doc.webkitFullscreenElement) {
        if (typeof document.exitFullscreen === "function") {
          await document.exitFullscreen();
        } else {
          await doc.webkitExitFullscreen?.();
        }
      } else {
        const el = rootRef.current;
        if (!el) return;
        if (typeof el.requestFullscreen === "function") {
          await el.requestFullscreen();
        } else {
          // Safari < 16.4 exposes only the webkit-prefixed API.
          const legacy = el as HTMLElement & {
            webkitRequestFullscreen?: () => Promise<void> | void;
          };
          await legacy.webkitRequestFullscreen?.();
        }
      }
    } catch {
      // Fullscreen can be denied (permissions) — presentation still works.
    }
  }, []);

  useEffect(() => {
    function onFullscreenChange() {
      const doc = document as Document & {
        webkitFullscreenElement?: Element | null;
      };
      setIsFullscreen(
        Boolean(document.fullscreenElement || doc.webkitFullscreenElement)
      );
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener(
      "webkitfullscreenchange",
      onFullscreenChange as EventListener
    );
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        onFullscreenChange as EventListener
      );
    };
  }, []);

  // One key handler for both input paths: the host window's keydown and
  // keys forwarded from the runtime frame when it holds focus. Returns
  // whether the default action should be prevented.
  const jumpRef = useRef<{ buffer: string; timer: ReturnType<typeof setTimeout> | null }>({
    buffer: "",
    timer: null,
  });

  const handlePresenterKey = useCallback(
    (key: string): boolean => {
      const lower = key.toLowerCase();

      if (key === "ArrowRight" || key === "PageDown" || key === " ") {
        goNext();
        return true;
      }
      if (key === "ArrowLeft" || key === "PageUp") {
        goPrev();
        return true;
      }
      if (lower === "n") {
        goNext();
        return true;
      }
      if (lower === "p") {
        goPrev();
        return true;
      }
      if (key === "Home") {
        goToSlide(0, 0);
        return true;
      }
      if (key === "End") {
        const last = Math.max(slideCountRef.current - 1, 0);
        goToSlide(last, stepsBySlide.current.get(last) ?? 0);
        return true;
      }
      if (lower === "f") {
        void toggleFullscreen();
        return true;
      }
      if (key === "Escape") {
        jumpRef.current.buffer = "";
        return false;
      }
      if (/^[0-9]$/.test(key)) {
        jumpRef.current.buffer += key;
        if (jumpRef.current.timer) clearTimeout(jumpRef.current.timer);
        jumpRef.current.timer = setTimeout(() => {
          jumpRef.current.buffer = "";
        }, 1500);
        return false;
      }
      if (key === "Enter" && jumpRef.current.buffer) {
        const number = Number.parseInt(jumpRef.current.buffer, 10);
        jumpRef.current.buffer = "";
        if (Number.isFinite(number) && number > 0) goToSlide(number - 1, 0);
        return true;
      }
      return false;
    },
    [goNext, goPrev, goToSlide, toggleFullscreen]
  );

  // Keyboard map: arrows/Space/N/P, Home/End, F, digits + Enter.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
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
      if (handlePresenterKey(event.key)) event.preventDefault();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handlePresenterKey]);

  // Clear any pending digit-jump timer on unmount.
  useEffect(() => {
    const jump = jumpRef.current;
    return () => {
      if (jump.timer) clearTimeout(jump.timer);
    };
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
        setProgressConfig(message.progress ?? DEFAULT_DECK_PROGRESS);
        setIndex((previous) => Math.min(previous, message.slideCount - 1));
      } else if (message.type === "deck:steps") {
        stepsBySlide.current.set(message.index, message.totalSteps);
        if (message.index === indexRef.current) {
          setTotalSteps(message.totalSteps);
          setStep((previous) => Math.min(previous, message.totalSteps));
        }
      } else if (message.type === "deck:keydown") {
        // Key pressed inside the frame (it owns focus) — route it through
        // the same handler the host window uses.
        handlePresenterKey(message.key);
      } else if (message.type === "deck:error") {
        setError(message.message);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [handlePresenterKey]);

  const progress =
    slideCount > 0
      ? ((index + (totalSteps > 0 ? step / totalSteps : 1)) / slideCount) * 100
      : 0;

  const counter =
    slideCount > 0
      ? `${String(index + 1).padStart(2, "0")} / ${String(slideCount).padStart(2, "0")}${
          totalSteps > 0 ? ` · ${step}/${totalSteps}` : ""
        }`
      : "– / –";

  const progressBar = progressConfig.show ? (
    <div
      role="progressbar"
      aria-label="Presentation progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
      data-slot="deck-progress"
      data-position={progressConfig.position}
      className="w-full shrink-0"
      style={{
        height: progressConfig.height,
        backgroundColor: progressConfig.trackColor,
      }}
    >
      <div
        className="h-full transition-[width] duration-200"
        style={{
          width: `${progress}%`,
          backgroundColor: progressConfig.color,
        }}
      />
    </div>
  ) : null;

  return (
    <div ref={rootRef} className="flex h-dvh w-full flex-col bg-black">
      {progressConfig.position === "top" ? progressBar : null}

      <div className="relative min-h-0 flex-1">
        <iframe
          ref={frameRef}
          src="/runtime"
          title="Deck presentation"
          sandbox="allow-scripts allow-same-origin"
          className="h-full w-full border-0"
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
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            onClick={() => void toggleFullscreen()}
          >
            {isFullscreen ? <MinimizeIcon /> : <MaximizeIcon />}
          </Button>
        </div>
      </div>
      {progressConfig.position === "bottom" ? progressBar : null}
    </div>
  );
}

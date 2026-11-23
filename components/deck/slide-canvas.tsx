"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { canvasSize } from "@/lib/canvas";

/**
 * The fixed logical canvas. Renders slide content at the authored
 * dimensions (1280×720 by default) and scales it to fit any container,
 * centered — letterboxing exactly like a real presenter.
 */
export function SlideCanvas({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      setBox({ w: rect.width, h: rect.height });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scale = box
    ? Math.min(box.w / canvasSize.w, box.h / canvasSize.h)
    : 0;
  const left = box ? (box.w - canvasSize.w * scale) / 2 : 0;
  const top = box ? (box.h - canvasSize.h * scale) / 2 : 0;

  return (
    <div
      ref={containerRef}
      data-slot="slide-canvas"
      className={`relative overflow-hidden ${className ?? ""}`}
    >
      <div
        data-slot="slide-canvas-inner"
        style={{
          position: "absolute",
          top,
          left,
          width: canvasSize.w,
          height: canvasSize.h,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
        className="overflow-hidden bg-deck-bg text-deck-fg"
      >
        {children}
      </div>
    </div>
  );
}

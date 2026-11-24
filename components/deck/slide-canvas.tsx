"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { canvasSize } from "@/lib/canvas";

import styles from "./slide-canvas.module.css";

/**
 * The fixed logical canvas. Renders slide content at the authored
 * dimensions (configurable per deck via aspect) and scales it to fit any
 * container, centered — letterboxing exactly like a real presenter.
 *
 * Root styling lives in `slide-canvas.module.css` (not in app utilities),
 * so the canvas renders identically in app thumbnails and the isolated
 * deck runtime.
 */
export function SlideCanvas({
  children,
  className,
  width = canvasSize.w,
  height = canvasSize.h,
}: {
  children: ReactNode;
  className?: string;
  /** Logical canvas width — defaults to the engine canvas. */
  width?: number;
  /** Logical canvas height — defaults to the engine canvas. */
  height?: number;
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

  const scale = box ? Math.min(box.w / width, box.h / height) : 0;
  const left = box ? (box.w - width * scale) / 2 : 0;
  const top = box ? (box.h - height * scale) / 2 : 0;

  return (
    <div
      ref={containerRef}
      data-slot="slide-canvas"
      className={`${styles.canvas} deck-canvas ${className ?? ""}`}
    >
      <div
        data-slot="slide-canvas-inner"
        style={{
          position: "absolute",
          top,
          left,
          width,
          height,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
        className={`${styles.stage} deck-canvas-stage`}
      >
        {children}
      </div>
    </div>
  );
}

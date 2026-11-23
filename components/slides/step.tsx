import {
  createContext,
  useContext,
  useId,
  useMemo,
  useRef,
  type MutableRefObject,
  type ReactNode,
} from "react";

import { cn } from "cn";

/**
 * Reveal-step plumbing shared by the runtime frame and the slide library.
 *
 * `step` = the number of fragments currently visible on the slide.
 * Fragments register during render and receive a stable zero-based index;
 * registration is idempotent per fragment instance (React may double-invoke
 * renders in development, which must not double-count fragments).
 */

export interface SlideStepContextValue {
  step: number;
  /** Registers a fragment instance during render; returns its index. */
  register: (id: string) => number;
}

export const SlideStepContext = createContext<SlideStepContextValue | null>(
  null
);

export function SlideStepProvider({
  step,
  countRef,
  children,
}: {
  step: number;
  countRef: MutableRefObject<number>;
  children: ReactNode;
}) {
  // Fresh index map per render pass; idempotent per fragment instance.
  const indicesRef = useRef(new Map<string, number>());

  const value = useMemo<SlideStepContextValue>(
    () => ({
      step,
      register: (id: string) => {
        const indices = indicesRef.current;
        const existing = indices.get(id);
        if (existing !== undefined) return existing;
        const index = indices.size;
        indices.set(id, index);
        countRef.current = indices.size;
        return index;
      },
    }),
    [step, countRef]
  );

  // Reset for the next render pass (before children render).
  indicesRef.current = new Map();
  countRef.current = 0;

  return (
    <SlideStepContext.Provider value={value}>
      {children}
    </SlideStepContext.Provider>
  );
}

/** A reveal fragment: hidden until the presenter steps to it. */
export function Appear({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const context = useContext(SlideStepContext);
  const id = useId();

  if (!context) {
    // Outside the runtime — always visible.
    return <div className={className}>{children}</div>;
  }

  const index = context.register(id);
  const visible = index < context.step;

  return (
    <div
      aria-hidden={!visible}
      className={cn(
        "transition-all duration-300 ease-out",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0",
        className
      )}
    >
      {children}
    </div>
  );
}

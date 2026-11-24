import {
  createContext,
  useContext,
  useEffect,
  useId,
  type ReactNode,
  type RefObject,
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
  /** The runtime reads the discovered fragment count after each pass. */
  countRef: RefObject<number>;
  children: ReactNode;
}) {
  // A render-local map (not a ref) keeps render pure: a fresh context value
  // below re-renders every consumer, so each pass repopulates it, and
  // registration stays idempotent for double-invoked renders.
  const indices = new Map<string, number>();

  const value: SlideStepContextValue = {
    step,
    register: (id: string) => {
      const existing = indices.get(id);
      if (existing !== undefined) return existing;
      const index = indices.size;
      indices.set(id, index);
      return index;
    },
  };

  // Report the fragment count after the pass rendered. Child effects run
  // before the runtime's own effect, which reads countRef — so the count is
  // always current by the time it is consumed.
  useEffect(() => {
    countRef.current = indices.size;
  });

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

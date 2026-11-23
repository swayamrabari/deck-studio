"use client";

import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";

/**
 * Deck navigation state. The URL becomes the source of truth in Phase 3
 * (via history.replaceState); Phase 5 extends `step` for fragments.
 */
export interface DeckState {
  index: number;
  /** Fragment step within the current slide (0 until fragments land). */
  step: number;
}

type DeckAction =
  | { type: "next" }
  | { type: "prev" }
  | { type: "goTo"; index: number };

interface DeckContextValue {
  state: DeckState;
  count: number;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
}

const DeckContext = createContext<DeckContextValue | null>(null);

export function DeckProvider({
  count,
  initialIndex = 0,
  children,
}: {
  count: number;
  initialIndex?: number;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(
    (state: DeckState, action: DeckAction): DeckState => {
      switch (action.type) {
        case "next":
          return state.index >= count - 1
            ? state
            : { index: state.index + 1, step: 0 };
        case "prev":
          return state.index <= 0
            ? state
            : { index: state.index - 1, step: 0 };
        case "goTo":
          return {
            index: Math.min(Math.max(action.index, 0), Math.max(count - 1, 0)),
            step: 0,
          };
      }
    },
    { index: initialIndex, step: 0 }
  );

  const value = useMemo<DeckContextValue>(
    () => ({
      state,
      count,
      next: () => dispatch({ type: "next" }),
      prev: () => dispatch({ type: "prev" }),
      goTo: (index) => dispatch({ type: "goTo", index }),
    }),
    [state, count]
  );

  return (
    <DeckContext.Provider value={value}>{children}</DeckContext.Provider>
  );
}

export function useDeck(): DeckContextValue {
  const ctx = useContext(DeckContext);
  if (!ctx) {
    throw new Error("useDeck must be used within <DeckProvider>.");
  }
  return ctx;
}

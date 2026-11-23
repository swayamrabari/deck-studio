/**
 * BroadcastChannel protocol between the presenter window (authoritative)
 * and the speaker console window.
 */

export interface SpeakerState {
  type: "state";
  index: number;
  step: number;
  totalSteps: number;
  slideCount: number;
  slides: Array<{ title: string; notes: string }>;
  /** Epoch ms when the presenting session started. */
  startedAt: number;
}

export type SpeakerChannelMessage =
  | SpeakerState
  | { type: "hello" }
  | { type: "command"; command: "next" | "prev" };

export function speakerChannelName(deckId: string): string {
  return `pptxgen-deck-${deckId}`;
}

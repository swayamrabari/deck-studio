import type { DeckConfig } from "@/lib/types";

export const deck: DeckConfig = {
  title: "My presentation",
  aspect: "16:9",
  defaultTransition: "fade",
  slideNumbers: true,
  progress: {
    show: true,
    position: "top",
    height: 2,
    color: "rgba(255, 255, 255, 0.7)",
    trackColor: "rgba(255, 255, 255, 0.1)",
  },
};

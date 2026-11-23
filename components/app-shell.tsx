"use client";

import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * App shell: every route scrolls through the shadcn/Base UI ScrollArea —
 * overlay thumbs only, never the browser's native scrollbar.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ScrollArea className="h-dvh">
      <div className="flex min-h-dvh flex-col">{children}</div>
    </ScrollArea>
  );
}

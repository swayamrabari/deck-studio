"use client";

import * as ResizablePrimitive from "react-resizable-panels";

import { cn } from "cn";

function ResizablePanelGroup({
  className,
  ...props
}: ResizablePrimitive.GroupProps) {
  return (
    <ResizablePrimitive.Group
      data-slot="resizable-panel-group"
      className={cn(
        "flex h-full w-full aria-[orientation=vertical]:flex-col",
        className,
      )}
      {...props}
    />
  );
}

function ResizablePanel({ ...props }: ResizablePrimitive.PanelProps) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />;
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: ResizablePrimitive.SeparatorProps & {
  withHandle?: boolean;
}) {
  return (
    <ResizablePrimitive.Separator
      data-slot="resizable-handle"
      style={{ touchAction: "none" }}
      className={cn(
        "group/handle bg-border relative flex w-px items-center justify-center transition-colors",
        "hover:bg-foreground/25 data-[separator=active]:bg-foreground/40 data-[separator=focus]:bg-foreground/30",
        "aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full [&[aria-orientation=horizontal]>div]:rotate-90",
        className,
      )}
      {...props}
    >
      {withHandle ? (
        <div className="bg-foreground/20 transition-colors group-hover/handle:bg-foreground/40 z-10 h-6 w-0.5 shrink-0 rounded-full" />
      ) : null}
    </ResizablePrimitive.Separator>
  );
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup };

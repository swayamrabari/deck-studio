"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlignLeftIcon,
  ArrowLeftIcon,
  FilePlusIcon,
  ImagePlusIcon,
  PlayIcon,
  PlusIcon,
  PresentationIcon,
  RotateCcwIcon,
  XIcon,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn } from "cn";
import { CodeEditor, type CodeEditorHandle } from "./code-editor";
import { DeckPreview } from "./deck-preview";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileTree } from "./file-tree";

function slideSlug(name: string) {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "new-slide"
  );
}

function nextSlideNumber(files: Record<string, string>) {
  const usedNumbers = Object.keys(files)
    .map((path) => /^deck\/(\d+)-/.exec(path)?.[1])
    .filter((n): n is string => Boolean(n))
    .map(Number);
  const next = (usedNumbers.length > 0 ? Math.max(...usedNumbers) : 0) + 1;
  return String(next).padStart(2, "0");
}

/** Renames the last path segment; slide folders keep their number prefix. */
function renamedFolderPath(path: string, value: string) {
  const parent = path.split("/").slice(0, -1).join("/");
  let name = slideSlug(value);
  const number = /^deck\/(\d+)-/.exec(path)?.[1];
  if (number && !/^\d+-/.test(name)) name = `${number}-${name}`;
  return `${parent}/${name}`;
}

function newSlideContent(title: string) {
  return `import { SparklesIcon } from "lucide-react";
import type { SlideMeta } from "@/lib/types";

export const meta: SlideMeta = {
  title: ${JSON.stringify(title)},
  notes: "",
};

export default function NewSlide() {
  return (
    <div className="flex h-full flex-col justify-center">
      <div className="flex size-14 items-center justify-center rounded-2xl border border-deck-surface bg-deck-surface/40 text-deck-accent">
        <SparklesIcon className="size-6" />
      </div>
      <p className="mt-8 font-mono text-sm uppercase tracking-[0.3em] text-deck-muted">
        New slide
      </p>
      <h2 className="mt-3 font-display text-7xl font-medium tracking-tight text-deck-fg">
        {${JSON.stringify(title)}}
      </h2>
      <p className="mt-6 max-w-2xl font-body text-xl leading-relaxed text-deck-muted">
        Replace this with your story. Everything here is a React component.
      </p>
    </div>
  );
}
`;
}

type WorkspaceDialog =
  | { kind: "new-slide" }
  | { kind: "start-fresh" }
  | { kind: "new-file" }
  | { kind: "rename"; path: string; folder: boolean }
  | { kind: "delete"; path: string; folder: boolean }
  | { kind: "media"; name: string }
  | null;

function baseName(path: string) {
  return path.split("/").pop() ?? path;
}

export interface DeckMediaItem {
  name: string;
  size: number;
  mime: string;
}

export function DeckWorkspace({
  deckId,
  title,
  initialFiles,
  initialMedia,
}: {
  deckId: string;
  title: string;
  initialFiles: Record<string, string>;
  initialMedia: DeckMediaItem[];
}) {
  const [files, setFiles] = useState<Record<string, string>>(initialFiles);
  const [savedFiles, setSavedFiles] = useState<Record<string, string>>(initialFiles);
  const [mediaList, setMediaList] = useState<DeckMediaItem[]>(initialMedia);
  const [openPaths, setOpenPaths] = useState<string[]>(() => {
    const first = initialFiles["deck/layout.tsx"]
      ? "deck/layout.tsx"
      : (Object.keys(initialFiles).sort()[0] ?? null);
    return first ? [first] : [];
  });
  const [activePath, setActivePath] = useState<string | null>(
    () =>
      (initialFiles["deck/layout.tsx"]
        ? "deck/layout.tsx"
        : (Object.keys(initialFiles).sort()[0] ?? null))
  );
  const [dialog, setDialog] = useState<WorkspaceDialog>(null);
  const [pending, setPending] = useState(false);
  const [savingCount, setSavingCount] = useState(0);
  const [draftValue, setDraftValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const filesRef = useRef(files);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  const mediaInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<CodeEditorHandle>(null);

  async function uploadMedia(uploads: FileList | File[]) {
    for (const file of Array.from(uploads)) {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/decks/${deckId}/media`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? "Upload failed.");
        return;
      }
      const data = (await res.json()) as DeckMediaItem;
      setMediaList((prev) => {
        const next = prev.filter((item) => item.name !== data.name);
        return [...next, data].sort((a, b) => a.name.localeCompare(b.name));
      });
      setError(null);
    }
  }

  async function deleteMedia(name: string) {
    const res = await fetch(
      `/api/decks/${deckId}/media/${encodeURIComponent(name)}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setMediaList((prev) => prev.filter((item) => item.name !== name));
      setDialog((current) =>
        current?.kind === "media" && current.name === name ? null : current
      );
    }
  }

  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
    };
  }, []);

  async function persist(path: string) {
    const content = filesRef.current[path];
    if (content === undefined) return;

    setSavingCount((count) => count + 1);
    try {
      const res = await fetch(`/api/decks/${deckId}/files`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, content }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Save failed");
      }
      const savedContent = filesRef.current[path];
      if (savedContent !== undefined) {
        setSavedFiles((prev) => ({ ...prev, [path]: savedContent }));
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingCount((count) => count - 1);
    }
  }

  function queueSave(path: string) {
    const timers = timersRef.current;
    const existing = timers.get(path);
    if (existing) clearTimeout(existing);
    timers.set(
      path,
      setTimeout(() => {
        timers.delete(path);
        void persist(path);
      }, 800)
    );
  }

  function handleEditorChange(value: string) {
    if (!activePath) return;
    setFiles((prev) => ({ ...prev, [activePath]: value }));
    queueSave(activePath);
  }

  function openFile(path: string) {
    setOpenPaths((prev) => (prev.includes(path) ? prev : [...prev, path]));
    setActivePath(path);
  }

  async function closeTab(path: string) {
    if (files[path] !== savedFiles[path]) {
      await persist(path);
    }
    const remaining = openPaths.filter((p) => p !== path);
    setOpenPaths(remaining);
    if (activePath === path) {
      setActivePath(remaining[remaining.length - 1] ?? null);
    }
  }

  function rewriteKeys(
    map: Record<string, string>,
    from: string,
    to: string
  ): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(map)) {
      if (key === from || key.startsWith(`${from}/`)) {
        out[to + key.slice(from.length)] = value;
      } else {
        out[key] = value;
      }
    }
    return out;
  }

  async function createFile(path: string, content: string) {
    setPending(true);
    try {
      const res = await fetch(`/api/decks/${deckId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, content }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Could not create the file.");
        return false;
      }
      setFiles((prev) => ({ ...prev, [path]: content }));
      setSavedFiles((prev) => ({ ...prev, [path]: content }));
      openFile(path);
      setError(null);
      return true;
    } finally {
      setPending(false);
    }
  }

  async function createSlide(name: string) {
    const title = name.trim() || "Untitled slide";
    const number = nextSlideNumber(files);
    const slug = slideSlug(title);

    let path = `deck/${number}-${slug}/page.tsx`;
    let attempt = 2;
    while (files[path]) {
      path = `deck/${number}-${slug}-${attempt}/page.tsx`;
      attempt++;
    }
    if (await createFile(path, newSlideContent(title))) {
      setDialog(null);
    }
  }

  async function startFresh(name: string) {
    setPending(true);
    try {
      const folders = new Set<string>();
      for (const path of Object.keys(files)) {
        const match = /^deck\/(\d+-[^/]+)\/page\.tsx$/.exec(path);
        if (match) folders.add(`deck/${match[1]}`);
      }

      const isRemoved = (path: string) =>
        Array.from(folders).some(
          (folder) => path === folder || path.startsWith(`${folder}/`)
        );

      for (const folder of folders) {
        const res = await fetch(
          `/api/decks/${deckId}/files?path=${encodeURIComponent(folder)}&recursive=1`,
          { method: "DELETE" }
        );
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          setError(data?.error ?? "Could not clear the slides.");
          return;
        }
      }

      for (const [path, timer] of timersRef.current) {
        if (isRemoved(path)) {
          clearTimeout(timer);
          timersRef.current.delete(path);
        }
      }

      const remaining = Object.fromEntries(
        Object.entries(files).filter(([path]) => !isRemoved(path))
      );
      const title = name.trim() || "Untitled";
      const base = `deck/01-${slideSlug(title)}`;

      let path = `${base}/page.tsx`;
      let attempt = 2;
      while (remaining[path]) {
        path = `${base}-${attempt}/page.tsx`;
        attempt++;
      }

      const content = newSlideContent(title);
      const res = await fetch(`/api/decks/${deckId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, content }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? "Could not create the fresh slide.");
        return;
      }

      const next = { ...remaining, [path]: content };
      setFiles(next);
      setSavedFiles(next);
      setOpenPaths([path]);
      setActivePath(path);
      setDialog(null);
      setError(null);
    } finally {
      setPending(false);
    }
  }

  async function renamePath(from: string, to: string) {
    if (from === to) {
      setDialog(null);
      return;
    }
    setPending(true);
    try {
      const res = await fetch(`/api/decks/${deckId}/files`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Rename failed.");
        return;
      }
      setFiles((prev) => rewriteKeys(prev, from, to));
      setSavedFiles((prev) => rewriteKeys(prev, from, to));
      setOpenPaths((prev) =>
        prev.map((path) =>
          path === from || path.startsWith(`${from}/`)
            ? to + path.slice(from.length)
            : path
        )
      );
      if (activePath && (activePath === from || activePath.startsWith(`${from}/`))) {
        setActivePath(to + activePath.slice(from.length));
      }
      setError(null);
      setDialog(null);
    } finally {
      setPending(false);
    }
  }

  async function deletePath(path: string, recursive: boolean) {
    setPending(true);
    try {
      const res = await fetch(
        `/api/decks/${deckId}/files?path=${encodeURIComponent(path)}&recursive=${recursive ? "1" : "0"}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Delete failed.");
        return;
      }
      const withoutPath = (map: Record<string, string>) =>
        Object.fromEntries(
          Object.entries(map).filter(
            ([key]) => !(key === path || key.startsWith(`${path}/`))
          )
        );
      setFiles((prev) => withoutPath(prev));
      setSavedFiles((prev) => withoutPath(prev));
      const remaining = openPaths.filter(
        (openPath) => !(openPath === path || openPath.startsWith(`${path}/`))
      );
      setOpenPaths(remaining);
      if (activePath && !remaining.includes(activePath)) {
        setActivePath(remaining[remaining.length - 1] ?? null);
      }
      setError(null);
      setDialog(null);
    } finally {
      setPending(false);
    }
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (activePath) void persist(activePath);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePath]);

  const dirtyCount = Object.keys(files).filter(
    (path) => files[path] !== savedFiles[path]
  ).length;
  const status = error
    ? "Save error"
    : savingCount > 0
      ? "Saving…"
      : dirtyCount > 0
        ? "Unsaved changes"
        : "Saved";

  const deleteSubtreeCount = dialog?.kind === "delete"
    ? Object.keys(files).filter(
        (path) =>
          path === dialog.path || path.startsWith(`${dialog.path}/`)
      ).length
    : 0;

  const nextSlide = nextSlideNumber(files);
  const newSlideFolder = draftValue.trim()
    ? `${nextSlide}-${slideSlug(draftValue)}`
    : `${nextSlide}-…`;

  const deckSlideCount = new Set(
    Object.keys(files)
      .map((path) => /^deck\/(\d+-[^/]+)\/page\.tsx$/.exec(path)?.[1])
      .filter((folder): folder is string => Boolean(folder))
  ).size;
  const freshSlideFolder = draftValue.trim()
    ? `01-${slideSlug(draftValue)}`
    : "01-…";

  const renameParent =
    dialog?.kind === "rename"
      ? dialog.path.split("/").slice(0, -1).join("/")
      : "";
  const renameFolderPreview = dialog?.kind === "rename" && dialog.folder
    ? draftValue.trim()
      ? renamedFolderPath(dialog.path, draftValue)
      : `${renameParent}/…`
    : null;

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-border px-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/decks"
            aria-label="Back to decks"
            className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
          >
            <ArrowLeftIcon />
          </Link>
          <div className="min-w-0">
            <p className="font-ui-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Workspace
            </p>
            <h1 className="truncate text-sm leading-tight font-medium">{title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {error ? (
            <span className="max-w-64 truncate text-xs text-destructive">{error}</span>
          ) : null}
          <span className="flex items-center gap-1.5 font-ui-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <span
              className={cn(
                "size-1.5 rounded-full",
                error
                  ? "bg-destructive"
                  : dirtyCount > 0 || savingCount > 0
                    ? "bg-foreground"
                    : "bg-muted-foreground/40"
              )}
            />
            {status}
          </span>
          <Link
            href={`/decks/${deckId}/present`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <PlayIcon />
            Present
          </Link>
        </div>
      </header>

      <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
        <ResizablePanel
          defaultSize={240}
          minSize={180}
          maxSize={360}
          groupResizeBehavior="preserve-pixel-size"
        >
          <aside className="flex h-full min-h-0 flex-col">
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3">
            <span className="font-ui-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              deck/
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon-xs" aria-label="Add" />
                }
              >
                <PlusIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-60">
                <DropdownMenuItem
                  onClick={() => {
                    setDraftValue("");
                    setDialog({ kind: "new-slide" });
                  }}
                >
                  <PresentationIcon />
                  New slide
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setDraftValue("deck/");
                    setDialog({ kind: "new-file" });
                  }}
                >
                  <FilePlusIcon />
                  New file…
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => mediaInputRef.current?.click()}
                >
                  <ImagePlusIcon />
                  Upload media…
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    setDraftValue("Untitled");
                    setDialog({ kind: "start-fresh" });
                  }}
                >
                  <RotateCcwIcon />
                  Start fresh…
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div className="py-2">
              <FileTree
                paths={Object.keys(files)}
                activePath={activePath}
                onOpen={openFile}
                onRename={(path, folder) => {
                  setDraftValue(
                    folder
                      ? baseName(path).replace(/^\d+-/, "")
                      : path
                  );
                  setDialog({ kind: "rename", path, folder });
                }}
                onDelete={(path, folder) => setDialog({ kind: "delete", path, folder })}
                media={mediaList}
                onOpenMedia={(name) => setDialog({ kind: "media", name })}
                onDeleteMedia={(name) => void deleteMedia(name)}
              />
            </div>
          </ScrollArea>
          <div className="shrink-0 border-t border-border px-3 py-2 font-ui-mono text-[10px] text-muted-foreground">
            {Object.keys(files).length} files
          </div>
          </aside>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize="52%" minSize={320} className="min-w-0">
          <section className="flex h-full min-h-0 min-w-0 flex-col">
          {openPaths.length > 0 ? (
            <>
              <div className="flex h-10 shrink-0 items-stretch border-b border-border">
                <ScrollArea orientation="horizontal" className="h-full min-w-0 flex-1">
                  <div className="flex h-full w-max min-w-full items-stretch">
                    {openPaths.map((path) => {
                  const isActive = path === activePath;
                  const isDirty = files[path] !== savedFiles[path];
                  return (
                    <div
                      key={path}
                      role="button"
                      tabIndex={0}
                      onClick={() => setActivePath(path)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          setActivePath(path);
                        }
                      }}
                      className={cn(
                        "group flex shrink-0 cursor-pointer items-center gap-2 border-r border-border px-3 font-ui-mono text-xs transition-colors",
                        isActive
                          ? "bg-card text-foreground"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      )}
                    >
                      <span className="max-w-44 truncate">{baseName(path)}</span>
                      {isDirty ? (
                        <span className="size-1.5 rounded-full bg-foreground" />
                      ) : null}
                      <button
                        type="button"
                        aria-label={`Close ${baseName(path)}`}
                        className="cursor-pointer rounded-sm p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-foreground"
                        onClick={(event) => {
                          event.stopPropagation();
                          void closeTab(path);
                        }}
                      >
                        <XIcon className="size-3" />
                      </button>
                    </div>
                  );
                    })}
                  </div>
                </ScrollArea>
                <div className="flex shrink-0 items-center border-l border-border px-1.5">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Format file (Shift+Alt+F)"
                    onClick={() => editorRef.current?.format()}
                    disabled={!activePath}
                  >
                    <AlignLeftIcon />
                  </Button>
                </div>
              </div>
              <div className="min-h-0 flex-1">
                {activePath && files[activePath] !== undefined ? (
                  <CodeEditor
                    key={activePath}
                    ref={editorRef}
                    path={activePath}
                    value={files[activePath]}
                    onChange={handleEditorChange}
                  />
                ) : null}
              </div>
              <div className="flex h-7 shrink-0 items-center justify-between border-t border-border px-3 font-ui-mono text-[10px] text-muted-foreground">
                <span className="truncate">{activePath}</span>
                <span>
                  {dirtyCount > 0 ? `${dirtyCount} unsaved` : "All saved"}
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-muted-foreground">
                Select a file to start editing.
              </p>
            </div>
          )}
          </section>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel
          defaultSize={360}
          minSize={240}
          maxSize={640}
          groupResizeBehavior="preserve-pixel-size"
        >
          <aside className="flex h-full min-h-0 flex-col">
            <div className="flex h-10 shrink-0 items-center border-b border-border px-3">
              <span className="font-ui-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Preview
              </span>
            </div>
            <DeckPreview deckId={deckId} files={files} activePath={activePath} />
          </aside>
        </ResizablePanel>
      </ResizablePanelGroup>

      <input
        ref={mediaInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files?.length) {
            void uploadMedia(event.target.files);
          }
          event.target.value = "";
        }}
      />

      <Dialog
        open={dialog?.kind === "start-fresh"}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start fresh</DialogTitle>
            <DialogDescription>
              This removes {deckSlideCount} slide
              {deckSlideCount === 1 ? "" : "s"} and replaces them with one
              fresh slide. Layout, styles, media, and components stay.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="fresh-slide-name">First slide name</Label>
            <Input
              id="fresh-slide-name"
              value={draftValue}
              autoFocus
              placeholder="Untitled"
              className="text-sm"
              onChange={(event) => setDraftValue(event.target.value)}
              onFocus={(event) => event.target.select()}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !pending) {
                  event.preventDefault();
                  void startFresh(draftValue);
                }
              }}
            />
            <p className="truncate font-ui-mono text-[10px] text-muted-foreground">
              deck/{freshSlideFolder}/page.tsx
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialog(null)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void startFresh(draftValue)}
              disabled={pending}
            >
              {pending ? "Starting…" : "Start fresh"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog?.kind === "new-slide"}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New slide</DialogTitle>
            <DialogDescription>
              Name the slide. The folder number is assigned automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="slide-name">Slide name</Label>
            <Input
              id="slide-name"
              value={draftValue}
              autoFocus
              placeholder="Product roadmap"
              className="text-sm"
              onChange={(event) => setDraftValue(event.target.value)}
              onFocus={(event) => event.target.select()}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !pending) {
                  event.preventDefault();
                  void createSlide(draftValue);
                }
              }}
            />
            <p className="truncate font-ui-mono text-[10px] text-muted-foreground">
              deck/{newSlideFolder}/page.tsx
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialog(null)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void createSlide(draftValue)}
              disabled={pending}
            >
              {pending ? "Creating…" : "Create slide"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PathDialog
        open={dialog?.kind === "new-file"}
        title="New file"
        description="Paths live under deck/ — folders are created implicitly. Example: deck/04-metrics/page.tsx"
        draft={draftValue}
        onDraftChange={setDraftValue}
        confirmLabel="Create file"
        pending={pending}
        onCancel={() => setDialog(null)}
        onConfirm={async () => {
          const path = draftValue.trim();
          if (!path.startsWith("deck/")) {
            setError("Paths must start with deck/");
            return;
          }
          if (await createFile(path, "")) setDialog(null);
        }}
      />

      <PathDialog
        open={dialog?.kind === "rename"}
        title={
          dialog?.kind === "rename" && dialog.folder
            ? "Rename slide"
            : "Rename file"
        }
        description={
          dialog?.kind === "rename" && dialog.folder
            ? "Renames the slide folder and every file inside it. The number stays."
            : "Renames the file in place."
        }
        label={
          dialog?.kind === "rename" && dialog.folder ? "Slide name" : "Path"
        }
        preview={
          renameFolderPreview ? (
            <p className="truncate font-ui-mono text-[10px] text-muted-foreground">
              {renameFolderPreview}
            </p>
          ) : null
        }
        draft={draftValue}
        onDraftChange={setDraftValue}
        confirmLabel="Rename"
        pending={pending}
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          if (dialog?.kind === "rename") {
            if (dialog.folder && !draftValue.trim()) {
              setError("Folder name is required.");
              return;
            }
            const to = dialog.folder
              ? renamedFolderPath(dialog.path, draftValue)
              : draftValue.trim();
            void renamePath(dialog.path, to);
          }
        }}
      />

      <Dialog
        open={dialog?.kind === "delete"}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog?.kind === "delete" && dialog.folder
                ? "Delete folder?"
                : "Delete file?"}
            </DialogTitle>
            <DialogDescription>
              {dialog?.kind === "delete" && dialog.folder
                ? `This removes ${deleteSubtreeCount} file${deleteSubtreeCount === 1 ? "" : "s"} under ${dialog.path}. This cannot be undone.`
                : "This permanently removes the file from the deck."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={pending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => {
                if (dialog?.kind === "delete") {
                  void deletePath(dialog.path, dialog.folder);
                }
              }}
            >
              {pending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog?.kind === "media"}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-ui-mono text-sm">
              {dialog?.kind === "media" ? dialog.name : ""}
            </DialogTitle>
            <DialogDescription>
              Use it in any slide with{" "}
              <span className="font-ui-mono text-xs">
                media(&quot;{dialog?.kind === "media" ? dialog.name : ""}&quot;)
              </span>
            </DialogDescription>
          </DialogHeader>
          {dialog?.kind === "media" ? (
            <div className="overflow-hidden rounded-md border border-border bg-deck-bg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/decks/${deckId}/media/${encodeURIComponent(dialog.name)}`}
                alt={dialog.name}
                className="max-h-96 w-full object-contain"
              />
            </div>
          ) : null}
          <DialogFooter>
            {dialog?.kind === "media" ? (
              <Button
                variant="destructive"
                onClick={() => void deleteMedia(dialog.name)}
              >
                Delete
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => setDialog(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PathDialog({
  open,
  title,
  description,
  label = "Path",
  preview,
  draft,
  onDraftChange,
  confirmLabel,
  pending,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  label?: string;
  preview?: ReactNode;
  draft: string;
  onDraftChange: (value: string) => void;
  confirmLabel: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="deck-path">{label}</Label>
          <Input
            id="deck-path"
            value={draft}
            autoFocus
            spellCheck={false}
            className="font-ui-mono text-xs"
            onChange={(event) => onDraftChange(event.target.value)}
            onFocus={(event) => event.target.select()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void onConfirm();
              }
            }}
          />
          {preview}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={() => void onConfirm()} disabled={pending}>
            {pending ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
